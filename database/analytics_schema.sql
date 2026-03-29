-- Bảng lưu lịch sử chỉ số kênh theo ngày
CREATE TABLE channel_stats_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES youtube_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recorded_at DATE DEFAULT CURRENT_DATE,
    subscriber_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    
    -- Đảm bảo mỗi kênh chỉ có 1 bản ghi mỗi ngày
    UNIQUE(channel_id, recorded_at)
);

CREATE INDEX idx_stats_history_date ON channel_stats_history(recorded_at);