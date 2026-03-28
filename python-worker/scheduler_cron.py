import os
import sys
import time
import random
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Fix Vietnamese encoding for Windows console/PM2
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)

def schedule_random_videos():
    log.info("🔔 Đang chọn video ngẫu nhiên để đăng...")
    
    # 1. Lấy danh sách video đang ở trong kho (warehouse)
    res = supabase.table("videos").select("*").eq("status", "warehouse").execute()
    warehouse_videos = res.data
    
    if not warehouse_videos:
        log.warning("⚠️ Kho không còn video để đăng!")
        return

    # 2. Lấy danh sách tất cả các kênh YouTube hiện có
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

if __name__ == "__main__":
    log.info("Scheduler started. Watching for 00:00, 06:00, 12:00, 18:00, 21:00...")
    while True:
        now = datetime.now().strftime("%H:%M")
        # Kiểm tra khung giờ (chỉ chạy 1 lần vào phút đầu tiên của giờ đó)
        if now in ["00:00", "06:00", "12:00", "18:00", "21:00"]:
            try:
                schedule_random_videos()
            except Exception as e:
                log.error(f"Error in scheduler: {e}")
            finally:
                # Đảm bảo đợi qua phút đó kể cả khi có lỗi để tránh lặp lại mỗi 30s
                time.sleep(65)
        time.sleep(30)