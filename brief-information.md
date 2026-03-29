# TubeSync Pro - YouTube Automation Platform

Nền tảng tự động hóa quản lý và đăng tải video YouTube đa kênh dành cho các Agency và Content Creator.

## 1. Tính Năng Startup Mới Cập Nhật
- **Tags Ranking System**: Tự động xếp hạng và gợi ý các thẻ video hiệu quả nhất dựa trên dữ liệu hệ thống.
- **Team Management**: Hỗ trợ mời thành viên (Editor/Admin) cùng quản lý kênh mà không cần chia sẻ mật khẩu Google.
- **Daily Limit Management**: Hệ thống tự động theo dõi `used_today` và reset về 0 sau 12:00 AM mỗi ngày để đảm bảo công bằng hạn mức.
- **Professional UI/UX**: Dashboard hiện đại, hỗ trợ đa chế độ xem (Grid/List/Calendar).
- **Company Showcase**: Trang giới thiệu đội ngũ nhân sự và sứ mệnh công ty.

## 2. Các Trang Thông Tin Chính
- `/dashboard/tags`: Xếp hạng xu hướng từ khóa.
- `/dashboard/teams`: Quản lý cộng tác viên.
- `/about`: Giới thiệu công ty và đội ngũ sáng lập.
- `/terms`: Điều khoản dịch vụ chuẩn startup.
- `/privacy`: Chính sách bảo mật dữ liệu người dùng.

## 3. Kiến Trúc Dữ Liệu
Sử dụng Supabase với các Trigger thông minh:
- `handle_video_quota`: Tự động kiểm tra và trừ hạn mức khi có video mới.
- `increment_user_stats`: Tích điểm (Credits) cho người dùng mỗi khi upload thành công qua Python Worker.

---
*Dự án đang trong giai đoạn tăng trưởng - TubeSync Pro v2.5*