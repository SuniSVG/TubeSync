'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Youtube, CheckCircle2, Shield, Eye, EyeOff,
  Unlink, Link2, RefreshCw, Users, PlaySquare, BarChart3,
  Lock, AlertTriangle, Zap, Loader2, Tv2, KeyRound, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChannelStats {
  subscriberCount: string;
  viewCount: string;
  videoCount: string;
  hiddenSubscriberCount: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCompact = (n: string | number) => {
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }: {
  icon: any; label: string; value: string; accent: string;
}) {
  return (
    <div className={cn(
      "group relative flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300",
      "bg-white hover:shadow-lg hover:-translate-y-0.5",
      "border-slate-100 hover:border-slate-200"
    )}>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Security Bullet ──────────────────────────────────────────────────────────
function SecurityBullet({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="group flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 hover:border-emerald-200 hover:from-emerald-50/40 transition-all duration-200">
      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-200 transition-colors">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Step Item ────────────────────────────────────────────────────────────────
function StepItem({ num, text }: { num: number; text: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4 group">
      <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-slate-900 text-white text-[11px] font-black flex items-center justify-center mt-0.5 group-hover:bg-red-600 transition-colors duration-200">
        {num}
      </span>
      <span className="text-sm text-slate-600 leading-relaxed pt-0.5">{text}</span>
    </li>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white text-sm font-medium px-5 py-3.5 rounded-2xl shadow-2xl shadow-slate-900/20 animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="h-3 w-3 text-white" />
      </div>
      {message}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, badge }: {
  icon: any; title: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <span className="text-sm font-semibold text-slate-700">{title}</span>
      {badge && <div className="ml-auto">{badge}</div>}
    </div>
  );
}

// ─── Active Badge ─────────────────────────────────────────────────────────────
function ActiveBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Đang hoạt động
    </span>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const labels = ['', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh'];
  const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'];
  const textColors = ['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-emerald-600'];

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= score ? colors[score] : 'bg-slate-200'
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs font-medium", textColors[score])}>
        Độ mạnh mật khẩu: {labels[score]}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  // Validate password match on change
  useEffect(() => {
    if (!confirmPassword) { setPasswordMatch(null); return; }
    setPasswordMatch(newPassword === confirmPassword);
  }, [newPassword, confirmPassword]);

  // ── Auth / Channel check ──────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError && sessionError.message.includes('Refresh Token Not Found')) {
        await supabase.auth.signOut();
        window.location.href = '/login';
        return;
      }

      if (session) {
        setUserEmail(session.user.email || null);
        const { data: channelData } = await supabase
          .from('youtube_channels')
          .select('*')
          .eq('user_id', session.user.id);

        if (session.provider_token) {
          fetchYouTubeStats(session.provider_token, session.provider_refresh_token || undefined);
        } else if (channelData && channelData.length > 0) {
          const primary = channelData[0];
          setIsConnected(true);
          setChannelName(primary.channel_name);
          if (primary.access_token) fetchYouTubeStats(primary.access_token);
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUserEmail(session.user.email || null);
        const { data: channelData } = await supabase
          .from('youtube_channels').select('*').eq('user_id', session.user.id);

        if (session.provider_token) {
          fetchYouTubeStats(session.provider_token, session.provider_refresh_token || undefined);
        } else if (channelData && channelData.length > 0) {
          const primary = channelData[0];
          setIsConnected(true);
          setChannelName(primary.channel_name);
          if (primary.access_token) fetchYouTubeStats(primary.access_token);
        }
      } else {
        setIsConnected(false); setUserEmail(null); setChannelName(null); setStats(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch YouTube Stats ───────────────────────────────────────────────────
  const fetchYouTubeStats = async (token: string, refreshToken?: string) => {
    setLoadingStats(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.items?.length > 0) {
        setStats(data.items[0].statistics);
        setChannelName(data.items[0].snippet.title);
        setIsConnected(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const upsertArray = data.items.map((item: any) => {
            const rec: any = {
              user_id: session.user.id,
              youtube_channel_id: item.id,
              channel_name: item.snippet.title,
              avatar_url: item.snippet.thumbnails?.default?.url,
              access_token: token,
            };
            if (refreshToken) rec.refresh_token = refreshToken;
            return rec;
          });
          const { error } = await supabase
            .from('youtube_channels')
            .upsert(upsertArray, { onConflict: 'youtube_channel_id' });
          if (error) console.error('Upsert error:', error.message);
        }
      }
    } catch (err) {
      console.error('Failed to fetch YT stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // ── Connect ───────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    setIsConnecting(true);
    const SCOPES = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ].join(' ');

    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          scopes: SCOPES,
          redirectTo: `${window.location.origin}/dashboard/settings`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: SCOPES,
            redirectTo: `${window.location.origin}/dashboard/settings`,
            queryParams: { access_type: 'offline', prompt: 'consent' },
          },
        });
        if (signInError) throw signInError;
      }
    } catch (error: any) {
      alert('Lỗi kết nối: ' + error.message);
      setIsConnecting(false);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn ngắt kết nối kênh này?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.from('youtube_channels').delete().eq('user_id', session.user.id);
      if (error) throw error;
      setIsConnected(false); setChannelName(null); setStats(null);
      showToast('Đã ngắt kết nối kênh.');
    } catch (error: any) {
      alert('Lỗi ngắt kết nối: ' + error.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { alert('Mật khẩu xác nhận không khớp!'); return; }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert('Lỗi: ' + error.message);
    } else {
      showToast('Đã cập nhật mật khẩu mới!');
      setNewPassword(''); setConfirmPassword('');
    }
    setIsUpdatingPassword(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          <span>Dashboard</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Settings</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Cài đặt</h1>
        <p className="text-slate-500 text-sm">Quản lý kênh YouTube, bảo mật tài khoản và tích hợp.</p>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        {/* Tab nav */}
        <TabsList className="h-11 p-1 bg-slate-100/80 rounded-2xl w-full grid grid-cols-2 gap-1">
          <TabsTrigger
            value="channels"
            className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 text-slate-500 transition-all duration-200 flex items-center gap-2"
          >
            <Tv2 className="h-4 w-4" />
            Kênh đã kết nối
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 text-slate-500 transition-all duration-200 flex items-center gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Bảo mật & Mật khẩu
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Channels
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="channels" className="mt-6 space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">

          {/* Main connection card */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <SectionHeader
              icon={Youtube}
              title="YouTube Integration"
              badge={isConnected ? <ActiveBadge /> : undefined}
            />

            {isConnected ? (
              <div className="p-6 space-y-6">
                {/* Channel identity */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 flex items-center justify-center">
                      <Youtube className="h-7 w-7 text-red-500" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-base truncate">{channelName || 'Kênh đã kết nối'}</p>
                    <p className="text-sm text-slate-400 mt-0.5 truncate">{userEmail}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 text-xs font-semibold rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                      onClick={() => stats && fetchYouTubeStats('')}
                      disabled={loadingStats}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", loadingStats && 'animate-spin')} />
                      Làm mới
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 text-xs font-semibold rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all"
                      onClick={handleDisconnect}
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      Ngắt kết nối
                    </Button>
                  </div>
                </div>

                {/* Stats grid */}
                {loadingStats ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={Users} label="Subscribers" value={fmtCompact(stats.subscriberCount)} accent="bg-red-100 text-red-500" />
                    <StatCard icon={BarChart3} label="Lượt xem" value={fmtCompact(stats.viewCount)} accent="bg-blue-100 text-blue-500" />
                    <StatCard icon={PlaySquare} label="Videos" value={fmtCompact(stats.videoCount)} accent="bg-violet-100 text-violet-500" />
                  </div>
                ) : null}

                {/* Permissions */}
                <div className="flex items-start gap-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 px-4 py-3.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-0.5">Quyền truy cập đang được cấp</p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      <strong>YouTube Upload</strong> · <strong>YouTube Readonly</strong> · <strong>Google Drive File</strong>.
                      Token được lưu mã hóa trong Supabase. Chúng tôi không lưu mật khẩu của bạn.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty / not connected */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center">
                    <Youtube className="h-9 w-9 text-slate-300" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                    <Link2 className="h-3 w-3 text-slate-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Chưa kết nối kênh nào</h3>
                <p className="text-sm text-slate-400 max-w-sm mt-2 mb-8 leading-relaxed">
                  Kết nối kênh YouTube để bắt đầu lên lịch và tự động đăng video của bạn.
                </p>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="gap-2.5 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-8 h-11 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/35 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {isConnecting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Đang kết nối…</>
                  ) : (
                    <><Link2 className="h-4 w-4" /> Kết nối kênh YouTube</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* How-to guide */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <SectionHeader icon={Zap} title="Hướng dẫn kết nối" />
            <div className="p-6">
              <ol className="space-y-4">
                <StepItem num={1} text={<>Nhấn <strong>"Kết nối kênh YouTube"</strong> ở trên.</>} />
                <StepItem num={2} text="Bạn sẽ được chuyển đến trang đăng nhập bảo mật của Google." />
                <StepItem num={3} text="Chọn tài khoản Google liên kết với kênh YouTube bạn muốn quản lý." />
                <StepItem num={4} text={<>Xem lại quyền truy cập. TubeSync cần quyền <strong>"Quản lý video YouTube"</strong> để lên lịch và đăng nội dung.</>} />
                <StepItem num={5} text={<>Nhấn <strong>"Cho phép"</strong> để cấp quyền truy cập.</>} />
                <StepItem num={6} text='Bạn sẽ được chuyển trở lại trang này và kênh sẽ hiện trạng thái "Đang hoạt động".' />
              </ol>

              <div className="mt-6 flex items-start gap-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 px-4 py-3.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Lưu ý bảo mật</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Chúng tôi chỉ yêu cầu quyền tối thiểu cần thiết để upload và quản lý video. Chúng tôi không có quyền truy cập vào mật khẩu Google hay dữ liệu cá nhân khác ngoài hồ sơ kênh YouTube.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Security
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="security" className="mt-6 space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">

          {/* Password change */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <SectionHeader icon={Lock} title="Thay đổi mật khẩu" />

            <form onSubmit={handleChangePassword} className="p-6 space-y-5">
              {/* New password */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Mật khẩu mới
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="h-11 text-sm pr-11 rounded-xl border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrength password={newPassword} />
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Xác nhận mật khẩu mới
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className={cn(
                      "h-11 text-sm rounded-xl transition-all border",
                      confirmPassword && passwordMatch === true && "border-emerald-400 focus:border-emerald-400 bg-emerald-50/30",
                      confirmPassword && passwordMatch === false && "border-red-300 focus:border-red-300 bg-red-50/30",
                      !confirmPassword && "border-slate-200"
                    )}
                    required
                  />
                  {confirmPassword && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {passwordMatch
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <div className="h-4 w-4 rounded-full border-2 border-red-400 flex items-center justify-center">
                            <span className="text-[9px] font-black text-red-400">!</span>
                          </div>
                      }
                    </div>
                  )}
                </div>
                {confirmPassword && passwordMatch === false && (
                  <p className="text-xs text-red-500 font-medium">Mật khẩu xác nhận không khớp</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isUpdatingPassword || !newPassword || passwordMatch === false}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-2.5 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
              >
                {isUpdatingPassword ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang cập nhật…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Cập nhật mật khẩu</>
                )}
              </Button>
            </form>
          </div>

          {/* Security info */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <SectionHeader icon={Shield} title="Bảo mật & Quyền riêng tư" />
            <div className="p-6 space-y-3">
              <SecurityBullet
                title="Token mã hóa"
                desc="Access token OAuth được lưu mã hóa trong Supabase, không bao giờ lộ ra client."
              />
              <SecurityBullet
                title="Quyền tối thiểu"
                desc="Chúng tôi chỉ yêu cầu các scope cần thiết để upload và quản lý video theo lịch."
              />
              <SecurityBullet
                title="Không lưu mật khẩu"
                desc="TubeSync không bao giờ nhìn thấy hay lưu mật khẩu Google của bạn."
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}