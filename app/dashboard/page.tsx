'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Youtube, 
  Users, 
  Eye, 
  Video, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalViews: 0,
    totalVideos: 0,
    activeChannels: 0
  });
  const [profile, setProfile] = useState<any>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Fetch Profile & Quota
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);

      // 2. Fetch Channels Stats & Calculate Total Subscribers
      const { data: channels } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', session.user.id);

      if (channels) {
        const totalSubs = channels.reduce((acc, curr) => acc + (curr.subscriber_count || 0), 0);
        setStats({
          totalSubscribers: totalSubs,
          totalViews: 0,
          totalVideos: 0, // Sẽ được tính từ count videos nếu cần
          activeChannels: channels.length
        });
      }

      // 3. Fetch Recent Activity & Video Stats
      const { data: videos, count: videoCount } = await supabase
        .from('videos')
        .select('*, youtube_channels(channel_name)', { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentVideos(videos || []);
      setStats(prev => ({ ...prev, totalVideos: videoCount || 0 }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'uploaded': return { label: 'Success', color: 'bg-emerald-50 text-emerald-600', badge: 'default' };
      case 'failed': return { label: 'Failed', color: 'bg-red-50 text-red-600', badge: 'destructive' };
      case 'processing': return { label: 'Processing', color: 'bg-blue-50 text-blue-600', badge: 'secondary' };
      case 'pending': return { label: 'Scheduled', color: 'bg-amber-50 text-amber-600', badge: 'outline' };
      case 'warehouse': return { label: 'Warehouse', color: 'bg-slate-50 text-slate-600', badge: 'outline' };
      default: return { label: 'Unknown', color: 'bg-slate-50 text-slate-600', badge: 'secondary' };
    }
  };

  const quotaPercent = profile ? Math.min((profile.quota_used / profile.quota_limit) * 100, 100) : 0;

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center">Loading dashboard overview...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Hello, {profile?.email?.split('@')[0]}!</h2>
          <p className="text-slate-500 text-lg">Here is your system performance for today.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200">
            <Link href="/dashboard/upload">
              <Plus className="w-4 h-4 mr-2" /> Upload Video
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Subscribers</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-emerald-600 font-medium flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Connect YouTube to view
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Views</CardTitle>
            <Eye className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVideos}</div>
            <p className="text-xs text-slate-400 mt-1 italic">Total videos in system</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Channels</CardTitle>
            <Youtube className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeChannels}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Out of plan limit</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Monthly Quota</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quotaPercent.toFixed(0)}%</div>
            <div className="mt-3">
              <Progress value={quotaPercent} className="h-2 bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Sync */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader className="border-b border-slate-50 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Recent Activity
            </CardTitle>
            <CardDescription>Status of your most recently uploaded videos.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {recentVideos.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No recent activity. Try uploading your first video!</div>
              ) : (
                recentVideos.map((video) => {
                  const config = getStatusConfig(video.status);
                  return (
                  <div key={video.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Video className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-slate-900 truncate">{video.title}</p>
                        <p className="text-xs text-slate-500">
                          {video.youtube_channels?.channel_name ? `${video.youtube_channels.channel_name} • ` : ''}
                          {new Date(video.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={config.badge as any} className="capitalize">
                      {config.label}
                    </Badge>
                  </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips/Status */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-red-600 to-orange-600 text-white">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Subscription Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-red-100 text-sm uppercase font-bold tracking-wider">Current Plan</p>
              <p className="text-3xl font-black mt-1 capitalize">{profile?.subscription_tier || 'Starter'}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-100">Videos Used</span>
                <span className="font-bold">{profile?.quota_used} / {profile?.quota_limit}</span>
              </div>
              <Progress value={quotaPercent} className="h-2 bg-white/20" />
            </div>
            <Button asChild variant="secondary" className="w-full bg-white text-red-600 hover:bg-red-50 font-bold">
              <Link href="/dashboard/billing">Upgrade Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
