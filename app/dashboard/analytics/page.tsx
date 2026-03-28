'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, Area, AreaChart,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Video {
  id: string;
  created_at: string;
  status: 'uploaded' | 'pending' | 'processing' | 'failed';
  app_uploaded: boolean;
  user_id: string;
  title?: string;
}

interface AnalyticsData {
  videos: Video[];
  statusCounts: Record<string, number>;
  chartData: { date: string; uploads: number }[];
  monthlyData: { name: string; count: number }[];
  quota: number;
  successRate: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  uploaded:   '#22c55e',
  pending:    '#f59e0b',
  processing: '#3b82f6',
  failed:     '#ef4444',
};

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const MOCK_CHANNEL_GROWTH = [
  { month: 'T1', subs: 980 },
  { month: 'T2', subs: 1120 },
  { month: 'T3', subs: 1340 },
  { month: 'T4', subs: 1280 },
  { month: 'T5', subs: 1590 },
  { month: 'T6', subs: 1820 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByMonth(videos: Video[]) {
  const groups: Record<string, number> = {};
  videos.forEach((v) => {
    const key = new Date(v.created_at).toLocaleDateString('vi', {
      month: 'short',
      year: 'numeric',
    });
    groups[key] = (groups[key] || 0) + 1;
  });
  return Object.entries(groups)
    .map(([name, count]) => ({ name, count }))
    .slice(-6);
}

function groupByDay(videos: Video[], days = 30) {
  const map: Record<string, number> = {};
  const now = Date.now();
  videos.forEach((v) => {
    const d = new Date(v.created_at);
    if (now - d.getTime() > days * 86_400_000) return;
    const key = d.toLocaleDateString('vi', { day: '2-digit', month: '2-digit' });
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([date, uploads]) => ({ date, uploads }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, sub, accent = '#6366f1', icon }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border border-white/10 bg-[#0f1117] shadow-xl">
      <div
        className="absolute inset-0 opacity-10 blur-2xl rounded-full"
        style={{ background: accent, transform: 'translate(30%,-30%) scale(1.5)' }}
      />
      <CardContent className="pt-5 pb-4 px-5 flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-1">{title}</p>
          <p className="text-4xl font-black text-white leading-none">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
          style={{ background: accent + '33', border: `1px solid ${accent}55` }}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d27] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 shadow-2xl">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    videos: [],
    statusCounts: {},
    chartData: [],
    monthlyData: [],
    quota: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Chưa đăng nhập.');
        return;
      }

      const { data: videosData, error: dbErr } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (dbErr) throw dbErr;

      const videos: Video[] = videosData ?? [];

      const statusCounts = videos.reduce<Record<string, number>>((acc, v) => {
        acc[v.status] = (acc[v.status] || 0) + 1;
        return acc;
      }, {});

      const total = videos.length;
      const successRate = total > 0
        ? Math.round((statusCounts['uploaded'] ?? 0) / total * 100)
        : 0;

      // Quota from profiles table (fallback 0)
      const { data: profile } = await supabase
        .from('profiles')
        .select('quota_used')
        .eq('id', session.user.id)
        .single();

      setData({
        videos,
        statusCounts,
        chartData: groupByDay(videos, 30),
        monthlyData: groupByMonth(videos),
        quota: profile?.quota_used ?? 0,
        successRate,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const { videos, statusCounts, chartData, monthlyData, quota, successRate } = data;
  const total = videos.length;

  const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const quotaPieData = [
    { name: 'Đã dùng', value: quota },
    { name: 'Còn lại', value: Math.max(0, 100 - quota) },
  ];
  const successPieData = [
    { name: 'Thành công', value: statusCounts['uploaded'] ?? 0 },
    { name: 'Thất bại',   value: statusCounts['failed']   ?? 0 },
  ];
  const appPieData = [
    { name: 'TubeSync', value: videos.filter(v => v.app_uploaded).length },
    { name: 'Thủ công', value: videos.filter(v => !v.app_uploaded).length },
  ];
  const queueBarData = [
    { name: 'Hàng chờ', pending: statusCounts['pending'] ?? 0, processing: statusCounts['processing'] ?? 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Đang tải dữ liệu…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080a10] flex items-center justify-center">
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl px-8 py-6 text-center max-w-sm">
          <p className="text-red-400 font-semibold mb-1">Lỗi tải dữ liệu</p>
          <p className="text-zinc-400 text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#080a10] text-white px-6 py-8 space-y-8"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">Analytics</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Tổng quan hoạt động kênh YouTube của bạn</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-medium transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Làm mới
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng video"
          value={total}
          sub="Tất cả thời gian"
          accent="#6366f1"
          icon={<span>🎬</span>}
        />
        <StatCard
          title="Tỷ lệ thành công"
          value={`${successRate}%`}
          sub={`${statusCounts['uploaded'] ?? 0} / ${total} video`}
          accent="#22c55e"
          icon={<span>✅</span>}
        />
        <StatCard
          title="Hàng chờ"
          value={(statusCounts['pending'] ?? 0) + (statusCounts['processing'] ?? 0)}
          sub={`${statusCounts['pending'] ?? 0} chờ · ${statusCounts['processing'] ?? 0} xử lý`}
          accent="#f59e0b"
          icon={<span>⏳</span>}
        />
        <StatCard
          title="Quota đã dùng"
          value={`${quota}%`}
          sub="Giới hạn YouTube API"
          accent="#ef4444"
          icon={<span>📊</span>}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 1. Uploads over time */}
        <ChartCard title="Lượt tải lên (30 ngày gần nhất)" subtitle="Theo ngày">
          {chartData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff08" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="uploads" name="Tải lên" stroke="#6366f1" strokeWidth={2} fill="url(#uploadGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 2. Status Distribution */}
        <ChartCard title="Trạng thái video" subtitle="Phân bổ theo trạng thái">
          {statusPieData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {statusPieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 3. Monthly uploads */}
        <ChartCard title="Video theo tháng" subtitle="6 tháng gần nhất">
          {monthlyData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff08" />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Video" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 4. Quota Usage */}
        <ChartCard title="Quota API" subtitle="YouTube Data API v3">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={quotaPieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} startAngle={90} endAngle={-270}>
                <Cell fill="#ef4444" />
                <Cell fill="#ffffff0a" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center -mt-4 text-2xl font-black text-white">{quota}%</p>
        </ChartCard>

        {/* 5. Success vs Failed */}
        <ChartCard title="Thành công vs Thất bại" subtitle="Theo trạng thái cuối">
          {(successPieData[0].value + successPieData[1].value) === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={successPieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 6. Queue Status */}
        <ChartCard title="Hàng chờ hiện tại" subtitle="Đang chờ & đang xử lý">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={queueBarData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
              <Bar dataKey="pending"    name="Chờ"    fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="processing" name="Xử lý"  fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 7. App vs Manual */}
        <ChartCard title="Nguồn tải lên" subtitle="TubeSync vs Thủ công">
          {total === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={appPieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {appPieData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 8. Channel Growth */}
        <ChartCard title="Tăng trưởng kênh" subtitle="Người đăng ký (mock)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={MOCK_CHANNEL_GROWTH} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="subsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="subs" name="Subscribers" stroke="#22c55e" strokeWidth={2} fill="url(#subsGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-zinc-600 pb-4">
        Dữ liệu được tải lúc {new Date().toLocaleTimeString('vi')} · Tăng trưởng kênh là dữ liệu giả (mock)
      </p>
    </div>
  );
}

// ─── Shared chart wrapper ─────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="border border-white/8 bg-[#0f1117] shadow-xl overflow-hidden">
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-base font-bold text-white">{title}</CardTitle>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </CardHeader>
      <CardContent className="px-3 pb-4">{children}</CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-zinc-600">
      <svg className="w-8 h-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 9h6M9 13h4" />
      </svg>
      <p className="text-sm">Chưa có dữ liệu</p>
    </div>
  );
}