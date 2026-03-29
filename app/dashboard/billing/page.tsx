'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard, Check, AlertCircle, Clock, TrendingUp,
  Receipt, User, Zap, Crown, Coins, Star, X, Info, Shield,
  Youtube, Monitor,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  subscription_tier: string | null;
  quota_limit: number;
  quota_used: number;
  daily_video_limit: number;
  daily_quota_used: number;
  total_credits: number;
  daily_credits: number;
  money: number;
  email: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIERS = [
  {
    key: 'starter',
    name: 'Starter',
    desc: 'Dùng thử miễn phí',
    price: 0,
    quota: 10,
    daily_videos: 1,
    channels: 1,
    features: ['Lên lịch cơ bản', 'Hỗ trợ email', '1 kênh YouTube'],
    icon: User,
    accent: 'bg-slate-100 text-slate-600',
    featured: false,
    contact: false,
  },
  {
    key: 'basic',
    name: 'Basic',
    desc: 'Cho người mới bắt đầu',
    price: 199000,
    quota: 50,
    daily_videos: 2,
    channels: 3,
    features: ['Bulk Upload', 'Lên lịch nâng cao', '3 kênh YouTube'],
    icon: TrendingUp,
    accent: 'bg-blue-50 text-blue-600',
    featured: false,
    contact: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    desc: 'Phổ biến nhất',
    price: 499000,
    quota: 100,
    daily_videos: 5,
    channels: 10,
    features: ['Ưu tiên xử lý', 'API Access', '10 kênh YouTube'],
    icon: Zap,
    accent: 'bg-violet-50 text-violet-600',
    featured: true,
    contact: false,
  },
  {
    key: 'elite',
    name: 'Elite',
    desc: 'Không giới hạn',
    price: 799000,
    quota: 250,
    daily_videos: Infinity,
    channels: Infinity,
    features: ['Không giới hạn kênh', 'Hỗ trợ 24/7', 'API Full Access'],
    icon: Crown,
    accent: 'bg-amber-50 text-amber-600',
    featured: false,
    contact: false,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    desc: 'Cho doanh nghiệp lớn',
    price: -1,
    quota: 1000,
    daily_videos: Infinity,
    channels: Infinity,
    features: ['Hạn mức riêng', 'Hỗ trợ 1-1', 'Thanh toán linh hoạt'],
    icon: Shield,
    accent: 'bg-slate-900 text-white',
    featured: false,
    contact: true,
  },
] as const;

const DEFAULT_PROFILE: Omit<Profile, 'id' | 'email'> = {
  subscription_tier: 'starter',
  quota_limit: 10,
  quota_used: 0,
  daily_video_limit: 1,
  daily_quota_used: 0,
  total_credits: 0,
  daily_credits: 0,
  money: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const resolveTier = (profile: Profile | null) => {
  const key = (profile?.subscription_tier ?? '').toLowerCase();
  return TIERS.find(t => t.key === key) ?? TIERS[0];
};

const fmtVND = (n: number) => n.toLocaleString('vi-VN');

// ─── Deposit Modal ────────────────────────────────────────────────────────────
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentMoney: number;
  onSuccess: () => void;
}

const DepositModal = ({ isOpen, onClose, userId, currentMoney, onSuccess }: DepositModalProps) => {
  const [amount, setAmount] = useState(100000);
  const description = `NAPTIEN${userId?.slice(-6).toUpperCase()}`;
  const qrUrl = `https://qr.sepay.vn/img?acc=VQRQAFCMX0448&bank=MBBank&amount=${amount}&des=${encodeURIComponent(description)}`;

  useEffect(() => {
    if (!isOpen) return;
    let count = 0;
    const iv = setInterval(async () => {
      if (++count > 60) { clearInterval(iv); onClose(); return; }
      const { data } = await supabase.from('profiles').select('money').eq('id', userId).single();
      if (data && data.money > currentMoney) { onSuccess(); clearInterval(iv); }
    }, 3000);
    return () => clearInterval(iv);
  }, [isOpen, currentMoney, userId, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">Nạp tiền qua QR</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <div className="space-y-2">
            <Label>Số tiền cần nạp (VNĐ)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(10000, parseInt(e.target.value) || 0))}
              className="text-center text-2xl font-bold h-12"
            />
          </div>
          <div className="inline-block p-4 bg-white rounded-xl border-2 border-slate-100 shadow-inner">
            <img src={qrUrl} alt="SePay QR" className="w-56 h-56 mx-auto" />
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 text-left flex gap-3">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <p>Hệ thống tự động cập nhật sau 3–5s khi nhận được tiền. Nội dung chuyển khoản: <strong>{description}</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Plan Cards ───────────────────────────────────────────────────────────────
interface PlanCardsProps {
  profile: Profile | null;
  upgrading: string | null;
  onUpgrade: (key: string) => void;
  onContact: () => void;
}

function PlanCards({ profile, upgrading, onUpgrade, onContact }: PlanCardsProps) {
  const [isYearly, setIsYearly] = useState(false);
  const currentKey = (profile?.subscription_tier ?? 'starter').toLowerCase();

  const getPrice = (price: number) => {
    if (price <= 0) return price;
    return isYearly ? Math.round(price * 0.8) : price;
  };

  return (
    <section className="space-y-6">
      {/* Header + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Chọn gói phù hợp</h2>
          <p className="text-sm text-slate-500 mt-0.5">Tất cả gói bao gồm dashboard phân tích và hỗ trợ email</p>
        </div>

        {/* Billing toggle */}
        <div className="inline-flex items-center self-start sm:self-auto bg-slate-100 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setIsYearly(false)}
            className={cn(
              'px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
              !isYearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Hàng tháng
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
              isYearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Hàng năm
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full leading-none">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {TIERS.map(tier => {
          const isCurrent = currentKey === tier.key;
          const isUpgrading = upgrading === tier.key;
          const price = getPrice(tier.price);
          const origPrice = isYearly && tier.price > 0 ? tier.price : null;
          const Icon = tier.icon;

          return (
            <div
              key={tier.key}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-white p-5 transition-all duration-200',
                isCurrent
                  ? 'border-2 border-red-400 shadow-lg shadow-red-50 ring-1 ring-red-300'
                  : tier.featured
                  ? 'border-2 border-violet-400 shadow-lg shadow-violet-50 ring-1 ring-violet-300'
                  : 'border border-slate-200 hover:border-slate-300 hover:shadow-md'
              )}
            >
              {/* Top badge */}
              {(isCurrent || tier.featured) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={cn(
                    'text-[10px] font-bold px-3 py-1 rounded-full shadow text-white',
                    isCurrent ? 'bg-red-500' : 'bg-violet-600'
                  )}>
                    {isCurrent ? 'Gói hiện tại' : 'Phổ biến nhất'}
                  </span>
                </div>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-3 mb-5">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', tier.accent)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{tier.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{tier.desc}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                {tier.price === -1 ? (
                  <p className="text-2xl font-black text-slate-900">Liên hệ</p>
                ) : tier.price === 0 ? (
                  <p className="text-2xl font-black text-slate-900">Miễn phí</p>
                ) : (
                  <div>
                    {origPrice && (
                      <p className="text-xs text-slate-400 line-through mb-0.5">{fmtVND(origPrice)}đ</p>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{fmtVND(price)}đ</span>
                      <span className="text-xs text-slate-400">/tháng</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 mb-4" />

              {/* Specs */}
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Monitor className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span><span className="font-semibold text-slate-800">{tier.quota === Infinity ? '∞' : tier.quota}</span> video/tháng</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span><span className="font-semibold text-slate-800">{tier.daily_videos === Infinity ? '∞' : tier.daily_videos}</span> video/ngày</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Youtube className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span><span className="font-semibold text-slate-800">{tier.channels === Infinity ? '∞' : tier.channels}</span> kênh</span>
                </div>
              </div>

              <div className="border-t border-slate-100 mb-4" />

              {/* Features */}
              <ul className="space-y-2 mb-5 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => tier.contact ? onContact() : onUpgrade(tier.key)}
                disabled={isCurrent || isUpgrading}
                className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : tier.contact
                    ? 'bg-slate-900 text-white hover:bg-slate-700 active:scale-95'
                    : tier.featured
                    ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 active:scale-95'
                    : 'bg-slate-900 text-white hover:bg-slate-700 active:scale-95'
                )}
              >
                {isUpgrading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </span>
                ) : isCurrent ? 'Đang sử dụng'
                  : tier.contact ? 'Liên hệ hỗ trợ'
                  : `Nâng cấp ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [extraQuota, setExtraQuota] = useState(10);
  const [payments, setPayments] = useState<any[]>([]);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const checkQuotaLimit = useCallback((p: Profile) => {
    if (p.daily_quota_used >= p.daily_video_limit) {
      toast({
        variant: 'destructive',
        title: 'Hết Quota ngày',
        description: 'Bạn đã đạt giới hạn đăng video hôm nay. Vui lòng nâng cấp hoặc đợi ngày mai.',
      });
    }
  }, [toast]);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single();

      const { data: paymentsData } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const finalProfile: Profile = profileData
        ? { ...profileData, subscription_tier: profileData.subscription_tier ?? 'starter' }
        : { id: session.user.id, email: session.user.email ?? '', ...DEFAULT_PROFILE };

      setProfile(finalProfile);
      setPayments(paymentsData || []);
      checkQuotaLimit(finalProfile);
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tải được dữ liệu billing' });
    } finally {
      setLoading(false);
    }
  }, [router, toast, checkQuotaLimit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpgrade = async (tierKey: string) => {
    const currentKey = (profile?.subscription_tier ?? '').toLowerCase();
    if (currentKey === tierKey) return;

    const tier = TIERS.find(t => t.key === tierKey);
    if (!tier) return;
    if (tier.contact) { window.open('https://zalo.me/tubesync', '_blank'); return; }

    const money = profile?.money ?? 0;
    if (money < tier.price) {
      toast({
        variant: 'destructive',
        title: 'Số dư không đủ',
        description: `Bạn cần nạp thêm ${fmtVND(tier.price - money)}đ để nâng cấp ${tier.name}.`,
      });
      setIsQRModalOpen(true);
      return;
    }

    setUpgrading(tierKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Không tìm thấy session');

      const newQuota = tier.quota === Infinity ? 9999 : tier.quota;
      const newDaily = tier.daily_videos === Infinity ? 9999 : tier.daily_videos;

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: tierKey, quota_limit: newQuota, daily_video_limit: newDaily, quota_used: 0, money: money - tier.price })
        .eq('id', session.user.id);

      if (error) throw error;

      await supabase.from('payment_history').insert({
        user_id: session.user.id,
        old_tier: profile?.subscription_tier ?? 'starter',
        new_tier: tierKey,
        amount: tier.price,
        status: 'completed',
      });

      toast({ title: `Nâng cấp ${tier.name} thành công!`, description: `Quota mới: ${newQuota.toLocaleString()} video/tháng` });
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Lỗi nâng cấp', description: err.message });
    } finally {
      setUpgrading(null);
    }
  };

  const handleDepositSuccess = async () => {
    setIsQRModalOpen(false);
    await fetchData();
    toast({ title: 'Nạp tiền thành công!', description: 'Số dư đã được cập nhật.' });
  };

  const currentTier   = resolveTier(profile);
  const quotaPercent  = profile ? Math.min((profile.quota_used / profile.quota_limit) * 100, 100) : 0;
  const dailyPercent  = profile ? Math.min((profile.daily_quota_used / profile.daily_video_limit) * 100, 100) : 0;
  const remainingQuota = profile ? profile.quota_limit - profile.quota_used : 0;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Đang tải thông tin billing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-10">

      {/* ── Header card ── */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-5">
          Billing & Subscriptions
        </h1>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-3">
                <Badge className="font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white">
                  {currentTier.name}
                </Badge>
                <span className="text-xl font-bold text-slate-900">
                  {currentTier.price === -1 ? 'Liên hệ' : currentTier.price === 0 ? 'Miễn phí' : `${fmtVND(currentTier.price)}đ/tháng`}
                </span>
              </div>
              <p className="text-sm font-semibold text-emerald-600">Số dư: {fmtVND(profile?.money ?? 0)}đ</p>
              <p className="text-sm text-slate-500">Email: {profile?.email}</p>
            </div>
            <div className="w-52 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Quota tháng</span>
                <span>{profile?.quota_used ?? 0} / {profile?.quota_limit ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', quotaPercent > 80 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-red-500 to-orange-400')}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              {remainingQuota < 50 && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Quota sắp hết!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Credits ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20"><Coins className="text-white h-5 w-5" /></div>
              <div>
                <p className="text-sm font-medium text-amber-800">Tổng Credits</p>
                <p className="text-2xl font-bold text-amber-900">{(profile?.total_credits ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200">+1 mỗi video</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20"><Star className="text-white h-5 w-5" /></div>
              <div>
                <p className="text-sm font-medium text-blue-800">Credits Hôm nay</p>
                <p className="text-2xl font-bold text-blue-900">{(profile?.daily_credits ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <Badge className="bg-blue-200 text-blue-900 hover:bg-blue-200">Reset lúc 00:00</Badge>
          </CardContent>
        </Card>
      </div>

      {/* ── Plan Cards ── */}
      <PlanCards
        profile={profile}
        upgrading={upgrading}
        onUpgrade={handleUpgrade}
        onContact={() => window.open('https://zalo.me/tubesync', '_blank')}
      />

      {/* ── Usage Analytics ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="w-4 h-4" /> Phân tích hạn mức
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-8">
            <svg viewBox="0 0 36 36" className="w-36 h-36 flex-shrink-0 -rotate-90">
              <path className="text-slate-100 stroke-[3.5px] fill-none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path
                className={cn('stroke-[3.5px] fill-none transition-all duration-1000',
                  quotaPercent > 80 ? 'stroke-red-500' : quotaPercent > 50 ? 'stroke-orange-500' : 'stroke-emerald-500'
                )}
                strokeDasharray="100 100"
                strokeDashoffset={100 - quotaPercent}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.5" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor">{Math.round(quotaPercent)}%</text>
            </svg>
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-sm text-slate-600">Còn lại: <strong>{remainingQuota.toLocaleString()}</strong> video</p>
              <p className={cn('text-sm font-bold', remainingQuota < 50 ? 'text-red-600' : remainingQuota < 100 ? 'text-orange-500' : 'text-emerald-600')}>
                {remainingQuota < 50 ? '⚠️ Sắp hết hạn mức!' : remainingQuota < 100 ? '🔄 Cảnh báo' : '✅ An toàn'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="w-4 h-4" /> Thời gian reset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Đã dùng</p>
                <p className="text-2xl font-bold text-slate-900">{(profile?.quota_used ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Hạn mức tháng</p>
                <p className="text-2xl font-bold text-slate-900">{(profile?.quota_limit ?? 0) === Infinity ? '∞' : (profile?.quota_limit ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">Reset tự động ngày 1 mỗi tháng</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Quota hôm nay</span>
                <span>{profile?.daily_quota_used ?? 0} / {profile?.daily_video_limit ?? 1}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', dailyPercent > 80 ? 'bg-red-500' : 'bg-blue-500')}
                  style={{ width: `${dailyPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Extra Quota ── */}
      <Card className="border-2 border-dashed border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Nạp tiền & Mua thêm Quota</CardTitle>
          <CardDescription>Nạp tiền vào tài khoản để mua gói hoặc credits lẻ qua QR SePay.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
            <div className="flex-1 space-y-4">
              <div>
                <Label className="text-sm font-bold">Số lượng video</Label>
                <Input
                  type="number" min={1} value={extraQuota}
                  onChange={e => setExtraQuota(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-2 text-xl h-14 font-bold"
                />
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400">Thành tiền</p>
                  <p className="text-3xl font-black text-slate-900">{fmtVND(extraQuota * 4999)}đ</p>
                </div>
                <p className="text-xs text-slate-400 text-right">4.999đ/video<br />Giảm 50% so với lẻ</p>
              </div>
            </div>
            <Button
              onClick={() => setIsQRModalOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-10 h-14 text-base shadow-lg"
            >
              <CreditCard className="w-5 h-5 mr-2" /> Nạp tiền ngay
            </Button>
          </div>
          <div className="border-t px-8 py-5 bg-slate-50 rounded-b-xl grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Không giới hạn thời gian', 'Cộng dồn tài khoản', 'Hỗ trợ hóa đơn VAT', 'Giá rẻ hơn mua lẻ'].map(t => (
              <div key={t} className="flex items-center gap-2 text-xs text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{t}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Payment History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Receipt className="w-4 h-4" /> Lịch sử giao dịch gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Gói mới</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{new Date(p.created_at).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{p.new_tier}</Badge></TableCell>
                    <TableCell className="font-mono font-bold">{fmtVND(p.amount ?? 0)}đ</TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-800">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── FAQ ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Câu hỏi thường gặp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
            <h3 className="font-bold text-sm mb-2">Khi nào quota được reset?</h3>
            <p className="text-sm text-slate-600">Quota tự động reset vào 00:00 ngày 1 mỗi tháng. Nâng cấp giữa tháng sẽ reset ngay lập tức.</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
            <h3 className="font-bold text-sm mb-2">Thanh toán bằng gì?</h3>
            <p className="text-sm text-slate-600">Hỗ trợ VNPay, Momo, ZaloPay, thẻ quốc tế. Hóa đơn VAT gửi tự động qua email.</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl md:col-span-2">
            <h3 className="font-bold text-sm mb-2">Liên hệ hỗ trợ</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>Email: support@tubesync.vn</span>
              <span className="hidden md:inline text-slate-300">•</span>
              <span>Zalo: @tubesync</span>
              <span className="hidden md:inline text-slate-300">•</span>
              <span>Hotline: 1900 636 868</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deposit Modal ── */}
      {profile && (
        <DepositModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          userId={profile.id}
          currentMoney={profile.money}
          onSuccess={handleDepositSuccess}
        />
      )}
    </div>
  );
}