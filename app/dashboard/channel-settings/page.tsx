'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { updateChannelStats } from '@/lib/youtube';

export default function ChannelSettingsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const response = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', session.user.id);
      setChannels(response.data || []);
    }
    setLoading(false);
  };

  const refreshStats = async (channel: any) => {
    await updateChannelStats(channel.youtube_channel_id, channel.access_token);
    loadChannels();
  };

  if (loading) return <div>Loading channels...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Channel Settings</h1>
      <div className="grid gap-4">
        {channels.map((channel) => (
          <Card key={channel.id}>
            <CardHeader>
              <CardTitle>{channel.channel_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Subscribers</p>
                  <p className="font-bold">{channel.subscribers?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Videos</p>
                  <p className="font-bold">{channel.total_videos || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge>Connected</Badge>
                </div>
              </div>
              <Button onClick={() => refreshStats(channel)} size="sm">
                Refresh Stats
              </Button>
            </CardContent>
          </Card>
        ))}
        {channels.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p>No channels connected. Go to Settings &gt; Channels to connect.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
