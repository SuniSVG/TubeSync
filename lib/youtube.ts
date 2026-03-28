import { supabase } from './supabase';

export async function getUserChannels(userId: string) {
  const { data: channelData } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('user_id', userId);

  return channelData || [];
}

export async function fetchChannelStats(channelId: string, accessToken: string) {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${accessToken}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return await response.json();
  } catch (error) {
    console.error('YT API error:', error);
    return null;
  }
}

export async function getChannelAnalytics(userId: string) {
  const channels = await getUserChannels(userId);
  const stats = [];
  for (const channel of channels) {
    const data = await fetchChannelStats(channel.youtube_channel_id, channel.access_token);
    if (data.items[0]) {
      stats.push({
        ...channel,
        subscribers: parseInt(data.items[0].statistics.subscriberCount || '0'),
        videos: parseInt(data.items[0].statistics.videoCount || '0'),
      });
    }
  }
  return stats;
}

// Update channel stats in DB
export async function updateChannelStats(channelId: string, accessToken: string) {
  const stats = await fetchChannelStats(channelId, accessToken);
  if (stats.items[0]) {
    const { error } = await supabase
      .from('youtube_channels')
      .update({
        subscribers: parseInt(stats.items[0].statistics.subscriberCount || '0'),
        total_videos: parseInt(stats.items[0].statistics.videoCount || '0'),
      })
      .eq('youtube_channel_id', channelId);
    return error ? null : stats.items[0];
  }
  return null;
}

