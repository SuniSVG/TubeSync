# Hướng Dẫn Triển Khai Hệ Thống TubeSync Pro với PM2

Tài liệu này hướng dẫn cách thiết lập và vận hành toàn bộ các thành phần của dự án TubeSync Pro bằng PM2.

## 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18.x trở lên.
- **Python**: Phiên bản 3.9 trở lên.
- **PM2**: Đã cài đặt global (`npm install pm2 -g`).
- **SSL Certificates**: `key.pem` và `cert.pem` đặt trong thư mục `backend/`.

## 2. Chuẩn bị môi trường

### 2.1. Cấu trúc thư mục cần thiết
Đảm bảo các thư mục sau tồn tại để tránh lỗi runtime:
```bash
mkdir -p backend/logs
mkdir -p python-worker/logs
mkdir -p python-worker/temp
mkdir -p python-worker/videos/pending
mkdir -p python-worker/videos/success
mkdir -p python-worker/videos/failed
mkdir -p uploads
```

### 2.2. Cài đặt Dependencies
**Cho Backend:**
```bash
cd backend
npm install
```

**Cho Python Worker:**
Nên sử dụng Virtual Environment:
```bash
cd python-worker
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install requests supabase google-api-python-client google-auth-oauthlib google-auth-httplib2 python-dotenv
```
*Lưu ý: Cập nhật đường dẫn `interpreter` trong `ecosystem.config.js` nếu bạn dùng venv.*

### 2.3. Cấu hình .env
Đảm bảo file `.env` ở gốc dự án hoặc trong các thư mục tương ứng có đầy đủ:
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REDIRECT_URI`
- `FRONTEND_URL`

## 3. Triển khai với PM2

Tại thư mục gốc của dự án (nơi có file `ecosystem.config.js`), chạy lệnh:

```bash
pm2 start ecosystem.config.js
```

Lệnh này sẽ khởi chạy 4 dịch vụ:
1. `tubesync-scanner`: Quét video cục bộ (tự động restart mỗi 15 phút).
2. `tubesync-scheduler`: Chọn video ngẫu nhiên để đăng theo khung giờ.
3. `tubesync-worker`: Tải video từ Drive/Cục bộ và upload lên YouTube.
4. `tubesync-backend`: API Server xử lý upload và OAuth.

## 4. Các lệnh quản lý thông dụng

- **Xem trạng thái**: `pm2 status`
- **Xem log realtime**: `pm2 logs`
- **Xem log riêng cho worker**: `pm2 logs tubesync-worker`
- **Dừng tất cả**: `pm2 stop all`
- **Khởi động lại tất cả**: `pm2 restart all`
- **Lưu danh sách dịch vụ để tự khởi động cùng OS**: 
  ```bash
  pm2 save
  pm2 startup
  ```