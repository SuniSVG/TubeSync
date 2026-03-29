import os
import sys
import hashlib
import random
import logging
import time
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials

# Cấu hình
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
env_path = os.path.join(ROOT_DIR, ".env")

if os.path.exists(env_path):
    load_dotenv(env_path)
    logging.info(f"Đã tải biến môi trường từ: {env_path}")
else:
    # Fallback to default search
    load_dotenv()

def get_clean_env(key, default=None):
    val = os.getenv(key, default)
    if val:
        return val.strip().strip("'").strip('"')
    return val

VIDEO_DIR = os.path.join(BASE_DIR, "videos", "pending")
SUPABASE_URL = get_clean_env("SUPABASE_URL")
SUPABASE_KEY = get_clean_env("SUPABASE_SERVICE_KEY")
INTERVAL_MINUTES = 5  # Giãn cách mỗi video 5 phút
GOOGLE_CLIENT_ID = get_clean_env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = get_clean_env("GOOGLE_CLIENT_SECRET")

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)

if not SUPABASE_URL or not SUPABASE_KEY:
    log.error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong môi trường.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_drive_service(channel_data):
    creds = Credentials(
        token=channel_data["access_token"],
        refresh_token=channel_data["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )
    return build("drive", "v3", credentials=creds)

def upload_to_drive(service, file_path, filename):
    file_metadata = {'name': filename}
    media = MediaFileUpload(file_path, resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    # Set permission công khai để worker có thể tải
    service.permissions().create(fileId=file.get('id'), body={'role': 'reader', 'type': 'anyone'}).execute()
    return file.get('id'), file.get('webViewLink')

def get_file_hash(file_path):
    """Tạo mã MD5 để nhận diện file duy nhất."""
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def scan_and_register():
    if not os.path.exists(VIDEO_DIR):
        os.makedirs(VIDEO_DIR, exist_ok=True)
        log.info(f"Đã tạo thư mục: {VIDEO_DIR}")
        return

    abs_path = os.path.abspath(VIDEO_DIR)
    log.info(f"--- Bắt đầu quét thư mục: {abs_path} ---")
    
    all_files_in_dir = os.listdir(VIDEO_DIR)
    log.info(f"Tìm thấy tổng cộng {len(all_files_in_dir)} file trong thư mục (chưa lọc định dạng).")
    
    # 1. Lấy thông tin kênh một lần duy nhất (Fix lỗi user_id null và tiết kiệm Quota)
    channel_res = supabase.table("youtube_channels").select("id, user_id").limit(1).execute()
    if not channel_res.data:
        log.error("Không tìm thấy kênh YouTube nào trong DB. Vui lòng kết nối kênh trước.")
        return
    
    channel = channel_res.data[0]
    user_id = channel['user_id']
    channel_id = channel['id']

    # Lấy thời gian của video cuối cùng đã lên lịch để nối tiếp
    res = supabase.table("videos").select("scheduled_for").order("scheduled_for", desc=True).limit(1).execute()
    
    last_schedule = datetime.now(timezone.utc)
    if res.data and res.data[0]['scheduled_for']:
        last_schedule = datetime.fromisoformat(res.data[0]['scheduled_for'].replace('Z', '+00:00'))

    # Mở rộng danh sách định dạng video
    valid_extensions = ('.mp4', '.mkv', '.mov', '.avi', '.webm', '.wmv', '.flv', '.mpg', '.mpeg', '.m4v')
    all_files = os.listdir(VIDEO_DIR)
    files = [f for f in all_files if f.lower().endswith(valid_extensions)]
    
    log.info(f"Lọc định dạng: {len(files)}/{len(all_files)} file hợp lệ (Định dạng hỗ trợ: {valid_extensions})")
    
    # 1. Lấy toàn bộ danh sách hash đã tồn tại (Chỉ tốn 1 Request duy nhất thay vì 430)
    res_existing = supabase.table("videos").select("file_hash").execute()
    existing_hashes = {r['file_hash'] for r in res_existing.data if r.get('file_hash')}
    
    videos_to_insert = []
    for filename in files:
        file_path = os.path.join(VIDEO_DIR, filename)
        file_hash = get_file_hash(file_path)

        if file_hash in existing_hashes:
            continue

        # Tính toán thời gian đăng (Vẫn giữ logic cách nhau 5 phút)
        if last_schedule < datetime.now(timezone.utc):
            next_run = datetime.now(timezone.utc) + timedelta(minutes=5)
        else:
            # Thêm ngẫu nhiên từ 0-120 giây để tránh bị nhận diện là bot upload đồng loạt
            jitter = random.randint(0, 120)
            next_run = last_schedule + timedelta(minutes=INTERVAL_MINUTES) + timedelta(seconds=jitter)
        
        last_schedule = next_run
        title = os.path.splitext(filename)[0]
        
        # Truncate title to 100 characters (YouTube limit and typical DB constraint)
        if len(title) > 100:
            title = title[:97] + "..."

        videos_to_insert.append({
            "title": title,
            "file_path": file_path[:512],  # Adjust based on your DB schema (e.g., 255 or 512)
            "file_hash": file_hash,
            "user_id": user_id,
            "status": "warehouse",  # Đưa vào kho thay vì hàng chờ đăng ngay
            "scheduled_for": next_run.isoformat(),
            "channel_id": channel_id,
            "description": f"Video {title} được tải lên tự động."[:1000],
            "tags": ["#shorts", "#auto-upload"]
        })
        # Tránh trùng lặp ngay trong cùng đợt quét
        existing_hashes.add(file_hash)

    # 2. Batch Insert: Chia nhỏ 50 video mỗi đợt để an toàn tuyệt đối cho Quota
    if videos_to_insert:
        log.info(f"🚀 Tìm thấy {len(videos_to_insert)} video mới. Đang chuẩn bị lưu...")
        chunk_size = 50
        for i in range(0, len(videos_to_insert), chunk_size):
            chunk = videos_to_insert[i:i + chunk_size]
            try:
                supabase.table("videos").insert(chunk).execute()
                log.info(f"✅ Đã lưu lô {i//chunk_size + 1} thành công.")
                time.sleep(2) # Nghỉ giữa các lô để Supabase "thở"
            except Exception as e:
                log.error(f"❌ Lỗi khi chèn lô {i//chunk_size + 1}: {e}")
                log.error("👉 Gợi ý: Hãy kiểm tra xem giá trị 'warehouse' đã được thêm vào Enum video_status trong SQL chưa.")
    else:
        log.info("✨ Không có video mới nào cần thêm.")

    log.info(f"--- Hoàn tất quá trình quét ---")

if __name__ == "__main__":
    log.info("🚀 Scanner Service đã khởi động...")
    while True:
        try:
            scan_and_register()
        except Exception as e:
            log.error(f"❌ Lỗi không mong muốn trong vòng lặp: {e}")
        
        # Đợi 30 phút (1800 giây) trước khi quét lại
        log.info("💤 Đang nghỉ 30 phút trước đợt quét tiếp theo...")
        time.sleep(1800)