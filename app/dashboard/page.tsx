'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload, Calendar, TrendingUp, Users, Clock, CheckCircle2,
  ArrowRight, Video, AlertCircle, Loader2, Zap, Coins,
  Flame, BarChart3, RefreshCw, Target, Play, 
  ChevronUp, ChevronDown, Sparkles, Settings,
  Activity, Award, ArrowUpRight, Hash, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalUploaded: number;
  pendingSchedule: number;
  subscribers: number;
  quotaUsed: number;
  quotaLimit: number;
  totalCredits: number;
  dailyCredits: number;
}

interface AIInsight {
  type: 'tip' | 'warning' | 'success';
  message: string;
  action?: string;
  actionHref?: string;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease out quart
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  suffix?: string;
  change?: number;
  extra?: React.ReactNode;
  delay?: number;
}

function StatCard({ label, value, icon, iconBg, iconColor, suffix, change, extra, delay = 0 }: StatCardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={cn(
        'group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
      style={{ transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, box-shadow 0.2s, border-color 0.2s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl transition-transform group-hover:scale-110', iconBg)}>
          <div className={iconColor}>{icon}</div>
        </div>
        {change !== undefined && (
          <div className={cn('flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full',
            change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          )}>
            {change >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 leading-none">
        {visible ? <AnimatedNumber value={value} /> : '0'}
        {suffix && <span className="text-lg font-bold text-slate-400 ml-1">{suffix}</span>}
      </h3>
      {extra && <div className="mt-3">{extra}</div>}
    </div>
  );
}

// ─── AI Insight Card ──────────────────────────────────────────────────────────
function AIInsightBanner({ insights }: { insights: AIInsight[] }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const rotate = useCallback((dir: 1 | -1) => {
    setFade(false);
    setTimeout(() => {
      setIdx(i => (i + dir + insights.length) % insights.length);
      setFade(true);
    }, 200);
  }, [insights.length]);

  useEffect(() => {
    const t = setInterval(() => rotate(1), 6000);
    return () => clearInterval(t);
  }, [rotate]);

  if (!insights.length) return null;
  const ins = insights[idx];
  const colors = {
    tip: 'from-blue-500/10 to-indigo-500/5 border-blue-200',
    warning: 'from-amber-500/10 to-orange-500/5 border-amber-200',
    success: 'from-emerald-500/10 to-teal-500/5 border-emerald-200',
  };
  const iconColors = { tip: 'text-blue-500', warning: 'text-amber-500', success: 'text-emerald-500' };

  return (
    <div className={cn('relative rounded-2xl border bg-gradient-to-r p-4 flex items-center gap-4', colors[ins.type])}>
      <div className={cn('flex-shrink-0 p-2 bg-white rounded-xl shadow-sm', iconColors[ins.type])}>
        <Sparkles className="h-4 w-4" />
      </div>
      <div className={cn('flex-1 transition-opacity duration-200', fade ? 'opacity-100' : 'opacity-0')}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">AI Insight</p>
        <p className="text-sm font-semibold text-slate-800">{ins.message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {ins.action && ins.actionHref && (
          <Button size="sm" variant="outline" asChild className="h-7 text-xs bg-white">
            <Link href={ins.actionHref}>{ins.action}</Link>
          </Button>
        )}
        <div className="flex gap-1">
          {insights.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 200); }}
              className={cn('h-1.5 rounded-full transition-all', i === idx ? 'w-4 bg-slate-600' : 'w-1.5 bg-slate-300')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold mb-1">{label}</p>
      <p>{payload[0].value} video</p>
    </div>
  );
}

// ─── Goal Tracker ─────────────────────────────────────────────────────────────
function GoalTracker({ uploaded, target = 20 }: { uploaded: number; target?: number }) {
  const pct = Math.min(Math.round((uploaded / target) * 100), 100);
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-red-400" />
          <span className="text-sm font-bold">Mục tiêu tháng</span>
        </div>
        <span className="text-xs text-slate-400">{uploaded}/{target} video</span>
      </div>

      {/* Circular progress */}
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 flex-shrink-0">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#334155" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="32" fill="none"
              stroke={pct >= 100 ? '#10b981' : '#ef4444'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black">{pct}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-slate-400 leading-relaxed">
            {pct < 50 ? 'Hãy tăng tốc để đạt mục tiêu!' :
              pct < 100 ? 'Gần đạt mục tiêu rồi!' :
                '🎉 Đã hoàn thành mục tiêu!'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-400">Còn lại</p>
              <p className="font-bold text-sm">{Math.max(0, target - uploaded)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-400">Hôm nay</p>
              <p className="font-bold text-sm text-red-400">+0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
function QuickActions() {
  const actions = [
    { icon: <Upload className="h-4 w-4" />, label: 'Upload Video', href: '/dashboard/upload', color: 'bg-red-500 hover:bg-red-600' },
    { icon: <Calendar className="h-4 w-4" />, label: 'Lên lịch', href: '/dashboard/schedule', color: 'bg-blue-500 hover:bg-blue-600' },
    { icon: <Hash className="h-4 w-4" />, label: 'Quản lý Tags', href: '/dashboard/tags', color: 'bg-violet-500 hover:bg-violet-600' },
    { icon: <Settings className="h-4 w-4" />, label: 'Cài đặt', href: '/dashboard/settings', color: 'bg-slate-600 hover:bg-slate-700' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((a, i) => (
        <Link key={i} href={a.href}>
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-95 cursor-pointer',
            a.color
          )}>
            {a.icon}
            {a.label}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    uploaded: { label: 'Hoàn thành', cls: 'text-emerald-600 bg-emerald-50', icon: <CheckCircle2 className="h-3 w-3" /> },
    failed: { label: 'Thất bại', cls: 'text-red-500 bg-red-50', icon: <AlertCircle className="h-3 w-3" /> },
    pending: { label: 'Đang chờ', cls: 'text-amber-600 bg-amber-50', icon: <Clock className="h-3 w-3" /> },
    processing: { label: 'Xử lý', cls: 'text-blue-600 bg-blue-50', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', s.cls)}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVideos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [mounted, setMounted] = useState(false);
  const [activeChart, setActiveChart] = useState<'bar' | 'area'>('bar');
  const [chartData, setChartData] = useState([
    { name: 'T2', videos: 0 }, { name: 'T3', videos: 0 }, { name: 'T4', videos: 0 },
    { name: 'T5', videos: 0 }, { name: 'T6', videos: 0 }, { name: 'T7', videos: 0 },
    { name: 'CN', videos: 0 },
  ]);

  // AI insights derived from stats
  const [insights, setInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    fetchDashboardData();
    setMounted(true);
  }, []);

  // Build insights when stats change
  useEffect(() => {
    if (!stats) return;
    const list: AIInsight[] = [];
    const quotaPercent = Math.round((stats.quotaUsed / stats.quotaLimit) * 100);

    if (quotaPercent > 80)
      list.push({ type: 'warning', message: `Quota tháng đã dùng ${quotaPercent}% — cân nhắc nâng gói.`, action: 'Nâng cấp', actionHref: '/dashboard/billing' });
    if (stats.pendingSchedule > 0)
      list.push({ type: 'tip', message: `Bạn có ${stats.pendingSchedule} video đang chờ lên lịch đăng.`, action: 'Lên lịch ngay', actionHref: '/dashboard/schedule' });
    if (stats.totalUploaded === 0)
      list.push({ type: 'tip', message: 'Bắt đầu bằng cách upload video đầu tiên của bạn!', action: 'Upload', actionHref: '/dashboard/upload' });
    if (stats.dailyCredits > 50)
      list.push({ type: 'success', message: `Tuyệt vời! Bạn đã tích lũy ${stats.dailyCredits} credit hôm nay.` });
    if (list.length === 0)
      list.push({ type: 'tip', message: 'Tip: Đặt lịch đăng video vào 19h–21h để tăng tương tác.', action: 'Lên lịch', actionHref: '/dashboard/schedule' });

    setInsights(list);
  }, [stats]);

  const fetchDashboardData = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User');

    const [profileRes, channelsRes, uploadedRes, pendingRes, recentRes, weeklyRes] = await Promise.all([
      supabase.from('profiles').select('quota_limit,quota_used,total_credits,daily_credits').eq('id', session.user.id).single(),
      supabase.from('youtube_channels').select('subscribers').eq('user_id', session.user.id),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('status', 'uploaded'),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('status', 'pending'),
      supabase.from('videos').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('videos').select('created_at').eq('user_id', session.user.id).eq('status', 'uploaded')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    const totalSubs = channelsRes.data?.reduce((a, c) => a + (c.subscribers || 0), 0) ?? 0;
    const profile = profileRes.data;

    const dayMap: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };
    const chart = [
      { name: 'T2', videos: 0 }, { name: 'T3', videos: 0 }, { name: 'T4', videos: 0 },
      { name: 'T5', videos: 0 }, { name: 'T6', videos: 0 }, { name: 'T7', videos: 0 },
      { name: 'CN', videos: 0 },
    ];
    weeklyRes.data?.forEach(v => {
      const label = dayMap[new Date(v.created_at).getDay()];
      const item = chart.find(d => d.name === label);
      if (item) item.videos++;
    });

    setChartData(chart);
    setStats({
      totalUploaded: uploadedRes.count ?? 0,
      pendingSchedule: pendingRes.count ?? 0,
      subscribers: totalSubs,
      quotaUsed: profile?.quota_used ?? 0,
      quotaLimit: profile?.quota_limit ?? 10,
      totalCredits: profile?.total_credits ?? 0,
      dailyCredits: profile?.daily_credits ?? 0,
    });
    setVideos(recentRes.data ?? []);
    isRefresh ? setRefreshing(false) : setLoading(false);
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm font-medium">Đang tải dashboard...</span>
      </div>
    );
  }

  const quotaPercent = stats ? Math.round((stats.quotaUsed / stats.quotaLimit) * 100) : 0;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{greeting} 👋</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{userName}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="gap-1.5 text-xs shadow-sm"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            {refreshing ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button size="sm" asChild className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs shadow-sm">
            <Link href="/dashboard/upload"><Plus className="h-3.5 w-3.5" /> Upload mới</Link>
          </Button>
        </div>
      </div>

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      {insights.length > 0 && <AIInsightBanner insights={insights} />}

      {/* ── Stats Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Đã đăng tải" value={stats?.totalUploaded ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-emerald-50" iconColor="text-emerald-600"
          change={12} delay={0}
        />
        <StatCard
          label="Đang chờ" value={stats?.pendingSchedule ?? 0}
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-amber-50" iconColor="text-amber-600"
          delay={80}
        />
        <StatCard
          label="Subscribers" value={stats?.subscribers ?? 0}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-red-50" iconColor="text-red-600"
          change={5} delay={160}
        />
        <StatCard
          label="Quota tháng" value={quotaPercent} suffix="%"
          icon={<Zap className="h-5 w-5" />}
          iconBg="bg-violet-50" iconColor="text-violet-600"
          delay={240}
          extra={
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-1000',
                  quotaPercent > 80 ? 'bg-red-500' : quotaPercent > 50 ? 'bg-amber-400' : 'bg-emerald-500'
                )}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          }
        />
        <StatCard
          label="Credit hôm nay" value={stats?.dailyCredits ?? 0}
          icon={<Flame className="h-5 w-5" />}
          iconBg="bg-orange-50" iconColor="text-orange-500"
          change={8} delay={320}
        />
        <StatCard
          label="Tổng Credits" value={stats?.totalCredits ?? 0}
          icon={<Coins className="h-5 w-5" />}
          iconBg="bg-yellow-50" iconColor="text-yellow-600"
          delay={400}
        />
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Hiệu suất đăng tải</h2>
                <p className="text-xs text-slate-400 mt-0.5">Video xử lý thành công trong 7 ngày qua</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveChart('bar')}
                    className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors',
                      activeChart === 'bar' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveChart('area')}
                    className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors',
                      activeChart === 'area' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                  <Link href="/dashboard/library">Thư viện</Link>
                </Button>
              </div>
            </div>

            <div className="h-[260px] p-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {activeChart === 'bar' ? (
                    <BarChart data={chartData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={8} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                      <Bar dataKey="videos" radius={[8, 8, 0, 0]} barSize={28}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i === todayIndex ? '#dc2626' : '#e2e8f0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={8} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="videos" stroke="#dc2626" strokeWidth={2.5}
                        fill="url(#areaGrad)" dot={{ fill: '#dc2626', r: 4 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart legend */}
            <div className="flex items-center gap-4 px-5 pb-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-slate-500">Hôm nay</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="text-xs text-slate-500">Ngày khác</span>
              </div>
              <div className="ml-auto text-xs text-slate-400">
                Tổng tuần: <span className="font-bold text-slate-700">
                  {chartData.reduce((a, c) => a + c.videos, 0)} video
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <h2 className="text-base font-bold text-slate-900">Hoạt động mới nhất</h2>
              </div>
              <Link href="/dashboard/library" className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-50">
              {recentVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                    <Video className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">Chưa có video nào</p>
                  <Button size="sm" asChild className="bg-red-600 hover:bg-red-700 text-white text-xs">
                    <Link href="/dashboard/upload"><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload ngay</Link>
                  </Button>
                </div>
              ) : (
                recentVideos.map((video, i) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 px-5 py-3.5 group hover:bg-slate-50/70 transition-colors"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 group-hover:from-red-50 group-hover:to-red-100 transition-all">
                      <Play className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{video.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={video.status} />
                        <span className="text-[10px] text-slate-400">
                          {new Date(video.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" asChild>
                      <Link href="/dashboard/schedule"><ArrowUpRight className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">

          {/* Goal Tracker */}
          <GoalTracker uploaded={stats?.totalUploaded ?? 0} target={20} />

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Thao tác nhanh</h2>
            </div>
            <QuickActions />
          </div>

          {/* Quota Detail */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Sử dụng tài nguyên</h2>
              </div>
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                quotaPercent > 80 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              )}>
                {quotaPercent}%
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Quota video/tháng', used: stats?.quotaUsed ?? 0, limit: stats?.quotaLimit ?? 10, color: 'bg-red-500' },
                { label: 'Credits tháng', used: stats?.totalCredits ?? 0, limit: 1000, color: 'bg-blue-500' },
              ].map((r, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">{r.label}</span>
                    <span className="text-slate-400">{r.used}/{r.limit}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-1000', r.color)}
                      style={{ width: `${Math.min((r.used / r.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" asChild className="w-full mt-4 text-xs h-8">
              <Link href="/dashboard/billing">
                <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Nâng cấp gói
              </Link>
            </Button>
          </div>

          {/* Achievement / Streak */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4" />
              <span className="text-sm font-bold">Thành tích</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Streak', value: '🔥 3', sub: 'ngày liên tiếp' },
                { label: 'Badge', value: '⭐ 2', sub: 'huy hiệu' },
                { label: 'Rank', value: '#42', sub: 'bảng xếp hạng' },
              ].map((a, i) => (
                <div key={i} className="bg-white/15 rounded-xl p-2">
                  <p className="font-black text-base">{a.value}</p>
                  <p className="text-[10px] text-white/70 mt-0.5 leading-tight">{a.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}