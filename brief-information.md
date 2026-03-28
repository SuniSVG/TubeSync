# TubeSync Pro - Hệ Thống Tự Động Hóa YouTube

Tài liệu tóm tắt các tính năng, quy trình và cấu trúc hệ thống của dự án TubeSync Pro.

## 1. Kiến Trúc Hệ Thống (Architecture)
Hệ thống được xây dựng theo mô hình Hybrid Cloud bao gồm:
- **Frontend**: Next.js (App Router), Tailwind CSS, Shadcn UI (Dashboard người dùng).
- **Backend (API Proxy)**: Node.js (Express) chạy HTTPS, xử lý trung gian giữa Frontend và Google Drive/YouTube API.
- **Database & Auth**: Supabase (PostgreSQL) lưu trữ metadata, trạng thái video và quản lý phiên đăng nhập.
- **Storage**: Google Drive (Sử dụng như một CDN tạm thời để lưu trữ video trước khi đăng).
- **Background Worker**: Python Script chạy ngầm để thực hiện tác vụ nặng (Download từ Drive và Upload lên YouTube).

## 2. Các Tính Năng Chính (Features)

### Quản lý Kênh & Tài khoản
- **Kết nối YouTube OAuth2**: Liên kết nhiều kênh YouTube vào một tài khoản.
- **Quản lý Quota**: Theo dõi hạn mức upload video hàng tháng dựa trên gói dịch vụ (Starter, Pro, v.v.).
- **Thống kê Kênh**: Hiển thị số lượng sub, view, và video trực tiếp từ YouTube API.

### Tải lên & Quản lý Metadata
- **Quick Upload**: Tải nhanh 1 video và đưa vào hàng chờ "Đăng ngay".
- **Bulk Upload**: Tải lên hàng loạt nhiều video cùng lúc.
- **Metadata Template**: Sử dụng cú pháp `{filename}` để tự động tạo tiêu đề video từ tên file.
- **Quản lý Thẻ (Tags)**: Hỗ trợ gắn tag hàng loạt và phân tích các tag phổ biến.

### Lên lịch Đăng bài nâng cao (Advanced Scheduling)
Hỗ trợ 4 chế độ lên lịch:
1. **Single Post**: Đăng vào một thời điểm cố định.
2. **Recurring**: Đăng lặp lại (Hàng ngày, hàng tuần, hàng tháng).
3. **Continuous**: Đăng liên tục cách nhau mỗi X giờ.
4. **Randomized**: Đăng ngẫu nhiên trong một khoảng thời gian (Start Date - End Date).

### Quản lý Lịch trình (Schedule Manager)
- **List View**: Danh sách chi tiết video kèm trạng thái (Pending, Processing, Uploaded, Failed).
- **Calendar View**: Trực quan hóa lịch đăng video theo tháng.
- **Publish Now**: Can thiệp ưu tiên đẩy video lên đầu hàng đợi để đăng ngay lập tức.

## 3. Quy Trình Vận Hành (Workflows)

### Quy trình Upload Video
1. **Frontend**: Người dùng chọn file -> Gửi qua API `/upload` của Node.js Backend.
2. **Backend**:
   - Xác thực JWT từ Supabase.
   - Refresh Google Access Token nếu cần.
   - Stream file trực tiếp lên Google Drive.
   - Thiết lập quyền "Anyone with link can view" cho file đó.
3. **Database**: Lưu metadata vào bảng `videos` trong Supabase với trạng thái `pending`.

### Quy trình Python Worker (Background Task)
1. **Scan**: Mỗi 5 phút, worker quét DB tìm video có `status = 'pending'` và `scheduled_for <= NOW()`.
2. **Download**: Tải video từ Google Drive về thư mục tạm trên server (có hỗ trợ Resume download nếu lỗi mạng).
3. **Upload**: Sử dụng YouTube Data API v3 để đẩy video lên kênh tương ứng.
4. **Cleanup**: Xóa file tạm, cập nhật `youtube_video_id` và chuyển trạng thái thành `uploaded`.

## 4. Các Phương Pháp Kỹ Thuật (Methods)

### Xử lý File lớn
- **Streaming**: Sử dụng `fs.createReadStream` trong Node.js và `MediaFileUpload` (resumable) trong Python để không làm tràn bộ nhớ RAM khi xử lý video dung lượng lớn (lên tới 5GB+).
- **Chunking**: Chia nhỏ file khi upload lên YouTube (10MB mỗi chunk).

### Bảo mật & Xác thực
- **OAuth2 Rotation**: Tự động sử dụng `refresh_token` để lấy `access_token` mới mà không cần người dùng can thiệp lại.
- **HTTPS**: Toàn bộ giao tiếp giữa Frontend và Backend chạy trên SSL (key.pem/cert.pem).
- **RLS (Row Level Security)**: Supabase đảm bảo người dùng chỉ có thể xem/sửa video của chính họ.

### Độ tin cậy (Reliability)
- **Retry Logic**: Worker có chiến lược Exponential Backoff khi tải file từ Drive gặp lỗi mạng.
- **Error Classification**: Phân loại lỗi (Hết quota, lỗi token, lỗi file) để hiển thị thông báo chính xác trên Dashboard cho người dùng.

## 5. Cấu Trúc Cơ Sở Dữ Liệu (Supabase Schema)
- `profiles`: Thông tin user, cấp độ gói (tier), hạn mức (quota_limit).
- `youtube_channels`: Lưu token (access/refresh), ID kênh, tên kênh, avatar.
- `videos`: Bảng trung tâm lưu:
  - Metadata: `title`, `description`, `tags`.
  - Drive Info: `drive_file_id`, `drive_file_url`.
  - Schedule: `schedule_type`, `scheduled_for`, `publish_now`.
  - Status: `status`, `error_message`, `youtube_video_id`.

---
*Tài liệu này được tạo tự động dựa trên cấu trúc code hiện tại của TubeSync Pro.*