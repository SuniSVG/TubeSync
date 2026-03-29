import os
import sys
import time
import random
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

# Cấu hình đường dẫn .env chính xác
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
env_path = os.path.join(ROOT_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# Fix Vietnamese encoding for Windows console/PM2
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def get_clean_env(key, default=None):
    """Lấy biến môi trường và loại bỏ khoảng trắng, dấu ngoặc kép dư thừa."""
    val = os.environ.get(key, default)
    if val:
        return val.strip().strip("'").strip('"')
    return val

SUPABASE_URL = get_clean_env("SUPABASE_URL")
SUPABASE_KEY = get_clean_env("SUPABASE_SERVICE_KEY")

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)

if not SUPABASE_URL or not SUPABASE_KEY:
    log.error(f"❌ Không tìm thấy SUPABASE_URL hoặc SUPABASE_SERVICE_KEY tại: {env_path}")
    sys.exit(1)

log.info(f"🔗 Kết nối Supabase: {SUPABASE_URL}")
# Kiểm tra độ dài key để tránh dùng nhầm anon key (thường ngắn hơn service_role)
log.info(f"Độ dài API Key: {len(SUPABASE_KEY) if SUPABASE_KEY else 0} ký tự")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def schedule_random_videos():
    log.info("🔔 Đang chọn video ngẫu nhiên để đăng...")
    
    # 1. Lấy danh sách video đang ở trong kho (warehouse)
    res = supabase.table("videos").select("*").eq("status", "warehouse").execute()
    warehouse_videos = res.data
    
    if not warehouse_videos:
        log.warning("⚠️ Kho không còn video để đăng!")
        return

    # 2. Lấy danh sách kênh và khung giờ từ profile
    # Ở đây giả sử bạn có 1 user chính, nếu đa user cần loop qua từng profile
    profile_res = supabase.table("profiles").select("id, preferred_post_times").limit(1).execute()
    if not profile_res.data:
        log.error("❌ Không tìm thấy thông tin profile người dùng.")
        return
    
    channel_res = supabase.table("youtube_channels").select("id").limit(1).execute()
    channels = channel_res.data
    
    if not channels:
        log.error("❌ Không tìm thấy kênh nào trong database.")
        return

    # 3. Chọn ngẫu nhiên DUY NHẤT 1 video (Thay vì 3)
    selected_videos = random.sample(warehouse_videos, 1)
    
    for video in selected_videos:
        # Xoay vòng tài khoản (mỗi video chọn ngẫu nhiên 1 kênh)
        target_channel = random.choice(channels)
        
        supabase.table("videos").update({
            "status": "pending",
            "channel_id": target_channel["id"],
            "scheduled_for": datetime.now(timezone.utc).isoformat(),
            "publish_now": True
        }).eq("id", video["id"]).execute()
        
        log.info(f"🚀 Đã kích hoạt video '{video['title']}' cho kênh {target_channel['id']}")

def get_user_schedule():
    try:
        res = supabase.table("profiles").select("preferred_post_times").limit(1).execute()
        if res.data and res.data[0].get('preferred_post_times'):
            return res.data[0]['preferred_post_times']
    except Exception as e:
        log.error(f"Không thể lấy lịch đăng từ DB (Lỗi: {e}). Sử dụng lịch mặc định.")
    return ["08:00", "12:00", "18:00", "22:00"]

if __name__ == "__main__":
    log.info("🚀 Scheduler đã khởi động. Đang tải lịch đăng từ Database...")
    while True:
        try:
            now = datetime.now().strftime("%H:%M")
            dynamic_times = get_user_schedule()
            
            # Kiểm tra khung giờ
            if now in dynamic_times:
                schedule_random_videos()
                time.sleep(65)
        except Exception as e:
            log.error(f"Lỗi trong vòng lặp chính: {e}")
            
        time.sleep(30)