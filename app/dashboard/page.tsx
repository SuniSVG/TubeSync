'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, Calendar, TrendingUp, Users, Clock, CheckCircle2,
  ArrowRight, Video, AlertCircle, Loader2, Zap, Coins, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

interface DashboardStats {
  totalUploaded: number;
  pendingSchedule: number;
  subscribers: number;
  quotaUsed: number;
  quotaLimit: number;
  totalCredits: number;
  dailyCredits: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVideos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    setMounted(true);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUserName(session.user.email?.split('@')[0] || 'User');

    // 1. Lấy thông tin Quota từ Profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('quota_limit, quota_used, total_credits, daily_credits')
      .eq('id', session.user.id)
      .single();

    // 2. Lấy thống kê từ các kênh đã kết nối
    const { data: channels } = await supabase
      .from('youtube_channels')
      .select('subscribers')
      .eq('user_id', session.user.id);

    const totalSubs = channels?.reduce((acc, curr) => acc + (curr.subscribers || 0), 0) || 0;

    // 3. Đếm số lượng video theo trạng thái
    const { count: uploadedCount } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('status', 'uploaded');

    const { count: pendingCount } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('status', 'pending');

    // 4. Lấy 5 video mới nhất
    const { data: recent } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setStats({
      totalUploaded: uploadedCount || 0,
      pendingSchedule: pendingCount || 0,
      subscribers: totalSubs,
      quotaUsed: profile?.quota_used || 0,
      quotaLimit: profile?.quota_limit || 10,
      totalCredits: profile?.total_credits || 0,
      dailyCredits: profile?.daily_credits || 0
    });
    setVideos(recent || []);
    setLoading(false);
  };

  // Dữ liệu mẫu cho biểu đồ (trong thực tế có thể query từ database)
  const chartData = [
    { name: 'T2', videos: 4 },
    { name: 'T3', videos: 7 },
    { name: 'T4', videos: 5 },
    { name: 'T5', videos: 8 },
    { name: 'T6', videos: 12 },
    { name: 'T7', videos: 9 },
    { name: 'CN', videos: 6 },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const quotaPercent = stats ? Math.round((stats.quotaUsed / stats.quotaLimit) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Chào mừng trở lại, {userName}!</h2>
        <p className="text-slate-500 text-sm">Đây là cái nhìn tổng quan về hiệu suất và lịch trình của bạn hôm nay.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đã đăng tải</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats?.totalUploaded}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đang chờ</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats?.pendingSchedule}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscribers</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats?.subscribers?.toLocaleString() ?? '0'}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quota tháng</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">{quotaPercent}%</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Zap className="h-6 w-6 text-slate-600" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
              <div 
                className={`h-full bg-slate-900 transition-all duration-1000 ${quotaPercent > 80 ? 'bg-red-500' : ''}`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit hôm nay</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats?.dailyCredits}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Credits</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats?.totalCredits?.toLocaleString()}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Coins className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Hiệu suất đăng tải</CardTitle>
              <CardDescription className="text-xs mt-0.5">Số lượng video được xử lý thành công trong tuần này</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
              <Link href="/dashboard/library">Xem thư viện</Link>
            </Button>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="videos" radius={[6, 6, 0, 0]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 4 ? '#dc2626' : '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Call to Action */}
          <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
            <CardContent className="p-6 relative z-10">
              <h4 className="font-bold text-lg mb-2">Thêm nội dung</h4>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">Tải video lên Drive và TubeSync sẽ lo phần còn lại theo lịch trình của bạn.</p>
              <div className="grid grid-cols-2 gap-3">
                <Button className="bg-white text-slate-900 hover:bg-slate-100 font-bold h-9 text-xs" asChild>
                  <Link href="/dashboard/upload"><Upload className="mr-2 h-3.5 w-3.5" /> Upload</Link>
                </Button>
                <Button className="bg-red-600 text-white hover:bg-red-700 border-none font-bold h-9 text-xs" asChild>
                  <Link href="/dashboard/schedule"><Calendar className="mr-2 h-3.5 w-3.5" /> Lên lịch</Link>
                </Button>
              </div>
            </CardContent>
            <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-red-600/10 rounded-full blur-2xl" />
          </Card>

          {/* Recent Activity */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-base font-bold text-slate-900">Hoạt động mới nhất</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {recentVideos.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Chưa có hoạt động nào</p>
                ) : (
                  recentVideos.map((video) => (
                    <div key={video.id} className="flex items-center gap-3 p-4 group hover:bg-slate-50/50 transition-colors">
                      <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all">
                        <Video className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{video.title}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          {video.status === 'uploaded' ? (
                            <><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Hoàn thành</>
                          ) : video.status === 'failed' ? (
                            <><AlertCircle className="h-2.5 w-2.5 text-red-500" /> Thất bại</>
                          ) : (
                            <><Clock className="h-2.5 w-2.5 text-amber-500" /> Đang chờ</>
                          )}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-slate-600" asChild>
                        <Link href="/dashboard/schedule"><ArrowRight className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}