-- 1. Khởi tạo Custom Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_status') THEN
        CREATE TYPE public.video_status AS ENUM ('warehouse', 'pending', 'processing', 'uploaded', 'failed');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
ALTER TYPE public.video_status ADD VALUE IF NOT EXISTS 'warehouse' BEFORE 'pending';

-- 2. Cấu trúc bảng

-- Bảng Profile người dùng (Quản lý hạn mức đăng bài)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  subscription_tier TEXT DEFAULT 'starter',
  quota_limit INTEGER DEFAULT 500, -- Tăng hạn mức mặc định lên 500 video
  quota_used INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Kênh YouTube (Lưu trữ OAuth Tokens)
CREATE TABLE IF NOT EXISTS public.youtube_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  youtube_channel_id TEXT,
  channel_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_channel UNIQUE(user_id)
);

-- Bảng Video (Cập nhật đầy đủ các cột cho Scheduler và Scanner)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES youtube_channels ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  file_path TEXT, -- Đường dẫn cục bộ (Scanner dùng)
  file_hash TEXT, -- MD5 để tránh trùng
  drive_file_id TEXT DEFAULT NULL, -- Phải cho phép NULL để Scanner hoạt động
  drive_file_url TEXT DEFAULT NULL,
  status public.video_status DEFAULT 'warehouse',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  publish_now BOOLEAN DEFAULT FALSE,
  youtube_video_id TEXT,
  error_message TEXT,
  app_uploaded BOOLEAN DEFAULT FALSE,
  schedule_type TEXT DEFAULT 'single',
  recurring_interval TEXT,
  continuous_interval_hours INTEGER,
  random_start_date TIMESTAMP WITH TIME ZONE,
  random_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Row Level Security (RLS) & Clean up Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Xóa và tạo lại Policy để tránh lỗi "already exists"
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own channels" ON public.youtube_channels;
CREATE POLICY "Users can view own channels" ON public.youtube_channels FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own videos" ON public.videos;
CREATE POLICY "Users can manage own videos" ON public.videos FOR ALL USING (auth.uid() = user_id);

-- 4. CHIẾN DỊCH "QUÉT SẠCH" TRIGGER LỖI (Sửa lỗi r2_key)
-- Đoạn code này sẽ tự động tìm và xóa TẤT CẢ trigger đang bám trên bảng videos 
-- để loại bỏ triệt để các trigger cũ không rõ tên.
DO $$
DECLARE
    trig_record RECORD;
BEGIN
    FOR trig_record IN (SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.videos'::regclass AND NOT tgisinternal) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig_record.tgname) || ' ON public.videos';
    END LOOP;
END $$;

-- 5. Thiết lập lại Logic Quota (Trigger mới)
-- Hàm kiểm tra hạn mức trước khi chèn video mới
CREATE OR REPLACE FUNCTION public.handle_video_quota() 
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    user_used INTEGER;
BEGIN
    -- Lấy thông tin hạn mức hiện tại của user
    SELECT quota_limit, quota_used INTO user_limit, user_used
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Nếu hết hạn mức, báo lỗi P0001 (Quota exceeded)
    IF user_used >= user_limit THEN
        RAISE EXCEPTION 'Quota exceeded' USING ERRCODE = 'P0001';
    END IF;

    -- Nếu còn hạn mức, tăng số lượng đã dùng lên 1
    UPDATE public.profiles 
    SET quota_used = quota_used + 1 
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gán trigger vào bảng videos
DROP TRIGGER IF EXISTS tr_check_video_quota ON public.videos;
CREATE TRIGGER tr_check_video_quota
BEFORE INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.handle_video_quota();

-- 5. Tự động tạo Profile khi đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, quota_limit)
  VALUES (new.id, new.email, 500);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Sửa lỗi ràng buộc Drive ID (Dành cho Scanner)
ALTER TABLE public.videos ALTER COLUMN drive_file_id DROP NOT NULL;
ALTER TABLE public.videos ALTER COLUMN drive_file_url DROP NOT NULL;

-- 7. Reset Quota cho user hiện tại để tiếp tục quét
UPDATE public.profiles SET quota_used = 0 WHERE quota_used > 0;
UPDATE public.profiles SET quota_limit = 5000 WHERE quota_limit < 5000;