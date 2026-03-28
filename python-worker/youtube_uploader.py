import os
import sys
import time
import requests
import shutil
import logging
from datetime import datetime, timezone
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from supabase import create_client, Client
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.auth.transport.requests import Request
from dotenv import load_dotenv

# ==========================================
# LOGGING SETUP
# ==========================================
# Fix Vietnamese encoding for Windows console/PM2
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "worker.log")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
SUCCESS_DIR = os.path.join(BASE_DIR, "videos", "success")
FAILED_DIR = os.path.join(BASE_DIR, "videos", "failed")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8")
    ]
)
log = logging.getLogger(__name__)

load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
CHECK_INTERVAL_SECONDS = int(os.environ.get("CHECK_INTERVAL_SECONDS", "300"))
DAILY_LIMIT = 5

if not all([SUPABASE_URL, SUPABASE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET]):
    log.error("Thiếu biến môi trường. Kiểm tra lại: SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def download_from_drive(drive_file_id: str, output_path: str, max_retries: int = 3) -> bool:
    """
    Tải video từ Google Drive với retry tự động.
    - Timeout tăng lên phù hợp với file lớn
    - Retry tối đa 3 lần nếu gặp ECONNRESET hoặc lỗi mạng
    - Hỗ trợ resume download qua Content-Range (nếu server cho phép)
    """
    log.info(f"Đang tải video từ Drive (ID: {drive_file_id})...")

    session = requests.Session()

    # ---- Adapter retry ở tầng HTTP ----
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=2,                        # 2s, 4s, 8s giữa các lần retry
        status_forcelist=[500, 502, 503, 504],   # Retry khi server lỗi
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    # ---- FIX 2: Timeout lớn hơn cho file lớn ----
    # (connect_timeout=15s, read_timeout=300s — đủ cho file ~50MB)
    TIMEOUT = (15, 300)

    def _do_request(extra_params=None):
        params = {"export": "download", "id": drive_file_id}
        if extra_params:
            params.update(extra_params)
        return session.get(
            "https://docs.google.com/uc",
            params=params,
            stream=True,
            timeout=TIMEOUT,
        )

    # ---- Bước 1: Request đầu tiên ----
    response = _do_request()
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")
    if "text/html" in content_type:
        log.info("File lớn — đang lấy confirm token...")
        response = _do_request({"confirm": "t"})
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "")
        if "text/html" in content_type:
            raise Exception(
                f"Không thể tải file Drive (ID: {drive_file_id}). "
                "Kiểm tra: (1) File tồn tại, (2) Quyền 'Anyone with link can view', "
                "(3) File chưa bị Google chặn do virus scan."
            )

    # ---- FIX 3: Stream xuống disk với retry thủ công nếu bị ngắt giữa chừng ----
    total_bytes = 0
    attempt = 0

    while attempt < max_retries:
        try:
            with open(output_path, "ab") as f:  # "ab" để nối tiếp nếu retry
                for chunk in response.iter_content(chunk_size=2 * 1024 * 1024):  # 2MB chunks
                    if chunk:
                        f.write(chunk)
                        total_bytes += len(chunk)

                        # Log tiến độ mỗi 10MB
                        if total_bytes % (10 * 1024 * 1024) < 2 * 1024 * 1024:
                            log.info(f"  Đã tải: {total_bytes / (1024*1024):.1f} MB")
            break  # Tải xong, thoát vòng lặp retry

        except (requests.exceptions.ChunkedEncodingError,
                requests.exceptions.ConnectionError) as e:
            attempt += 1
            log.warning(f"Lỗi mạng khi tải (lần {attempt}/{max_retries}): {e}")

            if attempt >= max_retries:
                raise Exception(f"Tải thất bại sau {max_retries} lần thử: {e}")

            wait = 2 ** attempt  # 2s, 4s, 8s
            log.info(f"Thử lại sau {wait}s... (đã tải: {total_bytes / (1024*1024):.1f} MB)")
            time.sleep(wait)

            # Resume: gửi lại request với Range header nếu đã tải được một phần
            headers = {}
            if total_bytes > 0:
                headers["Range"] = f"bytes={total_bytes}-"
                log.info(f"Resume từ byte {total_bytes}...")

            response = session.get(
                "https://docs.google.com/uc",
                params={"export": "download", "id": drive_file_id, "confirm": "t"},
                headers=headers,
                stream=True,
                timeout=TIMEOUT,
            )
            response.raise_for_status()

    size_mb = total_bytes / (1024 * 1024)
    log.info(f"Tải xong! Kích thước: {size_mb:.1f} MB")

    if total_bytes < 1024:
        raise Exception(f"File tải về quá nhỏ ({total_bytes} bytes) — có thể bị lỗi hoặc sai định dạng.")

    return True


def get_youtube_client(channel: dict) -> tuple:
    """
    Trả về (youtube_client, creds) đã được refresh nếu cần.
    Chỉ dùng scope youtube.upload — không cần drive.file vì
    worker tải Drive qua requests thuần, không qua Drive API.
    """
    if not channel.get("access_token") or not channel.get("refresh_token"):
        raise Exception(
            "Thiếu Access Token hoặc Refresh Token. "
            "Vui lòng vào Settings → Kết nối lại kênh YouTube."
        )

    REQUIRED_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

    creds = Credentials(
        token=channel["access_token"],
        refresh_token=channel["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=REQUIRED_SCOPES,
        # Không truyền drive.file — token cũ không có scope này
        # sẽ gây lỗi "insufficient authentication scopes"
    )

    # Refresh token nếu hết hạn
    if creds.expired and creds.refresh_token:
        log.info("Access token hết hạn — đang refresh...")
        try:
            creds.refresh(Request())
        except Exception as e:
            err = str(e).lower()
            if "invalid_grant" in err or "token has been expired" in err:
                raise Exception(
                    "Refresh token không còn hiệu lực (bị thu hồi hoặc hết hạn). "
                    "Vui lòng vào Settings → Kết nối lại kênh YouTube."
                )
            raise Exception(f"Không thể refresh token: {e}")

        update_data = {"access_token": creds.token}
        if creds.refresh_token and creds.refresh_token != channel["refresh_token"]:
            log.info("Refresh token đã được rotate — cập nhật vào DB.")
            update_data["refresh_token"] = creds.refresh_token

        supabase.table("youtube_channels").update(update_data).eq("id", channel["id"]).execute()
        log.info("Đã cập nhật token mới vào database.")

    log.info(f"Scopes của token: {creds.scopes}")
    youtube = build("youtube", "v3", credentials=creds, static_discovery=False)
    return youtube, creds


def upload_to_youtube(youtube, video: dict, video_path: str) -> str:
    """
    Upload video lên YouTube. Trả về youtube_video_id.
    """
    log.info("Đang upload lên YouTube...")

    description = (video.get("description") or "").strip()
    if description:
        description += "\n\n---\nPublished via TubeSync Pro 🚀"
    else:
        description = "Published via TubeSync Pro 🚀"

    tags = video.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    body = {
        "snippet": {
            "title": video["title"],
            "description": description,
            "tags": tags,
            "categoryId": str(video.get("category_id", "22")),
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False,
        }
    }

    media = MediaFileUpload(
        video_path,
        chunksize=10 * 1024 * 1024,  # 10MB chunks
        resumable=True,
        mimetype="video/mp4"
    )

    insert_request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    last_progress = -1
    while response is None:
        status, response = insert_request.next_chunk()
        if status:
            progress = int(status.progress() * 100)
            if progress != last_progress:
                log.info(f"Upload YouTube: {progress}%")
                last_progress = progress

    video_id = response["id"]
    log.info(f"✅ Upload thành công! YouTube Video ID: {video_id}")
    return video_id


def move_processed_file(file_path, target_dir):
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)
    filename = os.path.basename(file_path)
    target_path = os.path.join(target_dir, filename)
    
    # Xử lý nếu file đã tồn tại ở đích (tránh lỗi)
    if os.path.exists(target_path):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        target_path = os.path.join(target_dir, f"{timestamp}_{filename}")
        
    shutil.move(file_path, target_path)
    log.info(f"Đã chuyển file vào: {target_dir}")


def process_pending_videos():
    log.info("Đang kiểm tra video cần upload...")
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        result = (
            supabase.table("videos")
            .select("*, youtube_channels!videos_channel_id_fkey(*)")
            .eq("status", "pending")
            .lte("scheduled_for", now_iso)
            .order("publish_now", desc=True)
            .order("scheduled_for", desc=False)
            .limit(1)  # Đảm bảo mỗi chu kỳ quét chỉ xử lý tối đa 1 video
            .execute()
        )
        videos = result.data
    except Exception as e:
        log.error(f"Lỗi khi query Supabase: {e}")
        return

    if not videos:
        log.info("Không có video nào đến giờ lên lịch.")
        return

    log.info(f"Tìm thấy {len(videos)} video cần xử lý.")

    for video in videos:
        video_id = video["id"]
        log.info(f"--- Đang xử lý: '{video['title']}' (ID: {video_id}) ---")

        video_path = ""
        is_local_file = False

        try:
            supabase.table("videos").update({"status": "processing", "error_message": None}).eq("id", video_id).execute()

            channels = video.get("youtube_channels")
            if not channels:
                raise Exception("Chưa kết nối kênh YouTube. Không tìm thấy token.")

            channel = channels[0] if isinstance(channels, list) else channels

            # 1. Kiểm tra nguồn file: Ưu tiên file cục bộ từ Scanner, nếu không thì tải từ Drive
            local_file_path = video.get("file_path")
            if local_file_path and os.path.exists(local_file_path):
                video_path = local_file_path
                is_local_file = True
                log.info(f"Sử dụng file cục bộ: {video_path}")
            elif video.get("drive_file_id"):
                os.makedirs(TEMP_DIR, exist_ok=True)
                video_path = os.path.join(TEMP_DIR, f"tubsync_{video['drive_file_id']}.mp4")
                download_from_drive(video["drive_file_id"], video_path)
            else:
                raise Exception("Không tìm thấy file nguồn (file_path trống hoặc drive_file_id trống)")

            # 2. Xác thực YouTube
            youtube, _ = get_youtube_client(channel)

            # 3. Upload YouTube
            yt_video_id = upload_to_youtube(youtube, video, video_path)

            # 4. Cập nhật DB — thành công
            supabase.table("videos").update({
                "status": "uploaded",
                "youtube_video_id": yt_video_id,
                "error_message": None,
            }).eq("id", video_id).execute()

            # 5. Di chuyển file vào thư mục success nếu là file cục bộ
            if is_local_file:
                move_processed_file(video_path, SUCCESS_DIR)

            log.info(f"✅ Đã cập nhật trạng thái 'uploaded' cho video: {video['title']}")

        except Exception as e:
            error_msg = str(e)
            err_lower = error_msg.lower()

            # Phân loại lỗi để hiển thị thông báo rõ ràng hơn trên dashboard
            if "insufficient authentication scopes" in err_lower:
                error_msg = (
                    "Token YouTube thiếu quyền (insufficient scopes). "
                    "Vui lòng vào Settings → Kết nối lại kênh YouTube."
                )
            elif "invalid_grant" in err_lower or "token has been expired" in err_lower:
                error_msg = (
                    "Token YouTube hết hạn hoặc bị thu hồi. "
                    "Vui lòng vào Settings → Kết nối lại kênh YouTube."
                )
            elif "quota" in err_lower:
                error_msg = (
                    "Đã đạt giới hạn quota YouTube API hôm nay. "
                    "Video sẽ được thử lại vào ngày mai."
                )
            elif "forbidden" in err_lower or "403" in error_msg:
                error_msg = (
                    "Không có quyền upload lên kênh này (403 Forbidden). "
                    "Kiểm tra lại tài khoản đã kết nối."
                )

            log.error(f"❌ Lỗi video '{video['title']}': {error_msg}")

            try:
                supabase.table("videos").update({
                    "status": "failed",
                    "error_message": error_msg[:1000], # Prevent truncation error 22001
                }).eq("id", video_id).execute()
            except Exception as db_err:
                log.error(f"⚠️ Không thể cập nhật trạng thái thất bại vào DB: {db_err}")

        finally:
            # Chỉ xóa nếu đó là file tạm tải từ Drive về
            if not is_local_file and video_path and os.path.exists(video_path):
                os.remove(video_path)
                log.info(f"Đã xóa file tạm: {video_path}")


if __name__ == "__main__":
    log.info("==========================================")
    log.info("  TubeSync Pro Python Worker — Khởi động  ")
    log.info(f"  Chu kỳ kiểm tra: {CHECK_INTERVAL_SECONDS}s  ")
    log.info("==========================================")

    while True:
        try:
            process_pending_videos()
        except Exception as e:
            log.critical(f"Lỗi nghiêm trọng ở vòng lặp chính: {e}", exc_info=True)

        log.info(f"💤 Đợi {CHECK_INTERVAL_SECONDS}s trước khi kiểm tra lại...")
        time.sleep(CHECK_INTERVAL_SECONDS)