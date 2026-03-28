module.exports = {
  apps: [
    {
      name: 'tubesync-scanner',
      script: './python-worker/scanner.py',
      interpreter: 'python3',
      autorestart: false, // Script này chạy xong rồi nghỉ (hoặc bạn có thể cho loop)
      cron_restart: '*/15 * * * *', // Tự động quét thư mục mỗi 15 phút
    },
    {
      name: 'tubesync-scheduler',
      script: './python-worker/scheduler_cron.py',
      interpreter: 'python3',
      autorestart: true,
      restart_delay: 10000,
    },
    {
      name: 'tubesync-worker',
      script: './python-worker/youtube_uploader.py',
      // Nếu bạn sử dụng Virtual Environment (venv), hãy trỏ interpreter tới python trong venv đó
      // Ví dụ: interpreter: './python-worker/venv/bin/python3'
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Cấu hình restart để tránh loop vô tận khi lỗi nghiêm trọng
      max_restarts: 10,
      restart_delay: 5000, 
      env: {
        NODE_ENV: 'production',
      },
      // Đường dẫn log riêng cho worker để dễ debug quá trình upload
      error_file: './python-worker/logs/worker-error.log',
      out_file: './python-worker/logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      name: 'tubesync-backend',
      script: './backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Đường dẫn log cho backend
      error_file: './backend/logs/backend-error.log',
      out_file: './backend/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    }
  ]
};