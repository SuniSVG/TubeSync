'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, CreditCard, Check, AlertCircle, Clock, TrendingUp, Receipt, User, Zap, Crown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TIERS = [ // Updated quota and added daily_videos limits
  { name: 'Starter', price: 0, quota: 10, daily_videos: 1, channels: 1, features: ['Lên lịch cơ bản', 'Hỗ trợ email', '1 Kênh'], color: 'slate', icon: User },
  { name: 'Basic', price: 199000, quota: 50, daily_videos: 2, channels: 3, features: ['Bulk Upload', 'Lên lịch nâng cao', '3 Kênh'], color: 'blue', icon: TrendingUp },
  { name: 'Pro', price: 499000, quota: 100, daily_videos: 5, channels: 10, features: ['Ưu tiên xử lý', 'API Access', '10 Kênh'], color: 'purple', icon: Zap },
  { name: 'Elite', price: 799000, quota: 250, daily_videos: 10, channels: Infinity, features: ['Không giới hạn', 'Hỗ trợ 24/7', 'API Full'], color: 'gold', icon: Crown }
] as const;

export default function BillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ subscription_tier: string; quota_limit: number; quota_used: number; email: string; daily_video_limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [extraQuota, setExtraQuota] = useState(10);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_tier, quota_limit, quota_used, email, daily_video_limit')
        .eq('id', session.user.id)
        .single();

      const { data: paymentsData } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setProfile(profileData || { subscription_tier: 'starter', quota_limit: 10, quota_used: 0, email: session.user.email, daily_video_limit: 1 });
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tải được dữ liệu billing' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (profile?.subscription_tier === tier) return;

    setUpgrading(tier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Không tìm thấy session');

      // Map tier to quota
      const newQuota = TIERS.find(t => t.name.toLowerCase() === tier.toLowerCase())?.quota ?? 10;
      const newDailyVideoLimit = TIERS.find(t => t.name.toLowerCase() === tier.toLowerCase())?.daily_videos ?? 1;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: tier, 
          quota_limit: newQuota,
          daily_video_limit: newDailyVideoLimit,
          quota_used: 0 // Reset usage on upgrade
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // Log payment (simulate for now)
      await supabase.from('payment_history').insert({
        user_id: session.user.id,
        old_tier: profile?.subscription_tier,
        new_tier: tier,
        amount: TIERS.find(t => t.name.toLowerCase() === tier.toLowerCase())?.price || 0,
        status: 'completed'
      });

      toast({ title: `Nâng cấp ${tier} thành công!`, description: `Quota mới: ${newQuota.toLocaleString()} video/tháng` });
      fetchData(); // Refresh
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Lỗi nâng cấp', description: error.message });
    } finally {
      setUpgrading(null);
    }
  };

  const handleBuyExtraQuota = async () => {
    // TODO: Integrate real payment gateway (VNPay/Momo/Stripe)
    toast({ title: 'Chức năng sắp có', description: `Sẽ mua ${extraQuota} quota với giá ${(extraQuota * 4999).toLocaleString()}đ` });
  };

  const currentTier = profile ? TIERS.find(t => t.name.toLowerCase() === profile.subscription_tier.toLowerCase()) || TIERS[0] : TIERS[0];
  const quotaPercent = profile ? Math.min((profile.quota_used / profile.quota_limit) * 100, 100) : 0; // Monthly quota percent
  const remainingQuota = profile ? profile.quota_limit - profile.quota_used : 500;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-20">Đang tải thông tin billing...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-4">
          Billing & Subscriptions
        </h1>
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="text-lg px-4 py-2 font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white">
                  {currentTier.name}
                </Badge>
                <span className="text-2xl font-bold text-slate-900">{currentTier.price.toLocaleString('vi-VN')}đ/tháng</span>
              </div>
              <p className="text-slate-600">Email: {profile?.email}</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="w-48">
                <Label className="text-sm font-medium text-slate-700 mb-1 block text-right">Quota tháng này</Label>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className={`h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-1000 ${quotaPercent > 80 ? 'animate-pulse' : ''}`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              {remainingQuota < 50 && (
                <Badge variant="destructive" className="mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Quota sắp hết! Nâng cấp ngay
                </Badge>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Plan Cards */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Chọn gói phù hợp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => {
            const isCurrent = profile?.subscription_tier.toLowerCase() === tier.name.toLowerCase();
            const Icon = tier.icon;
            return (
              <Card key={tier.name} className={`relative group hover:shadow-2xl transition-all ${isCurrent ? 'ring-4 ring-red-500 ring-opacity-50 shadow-2xl' : 'hover:shadow-xl'}`}>
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                    GÓI HIỆN TẠI
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-br ${tier.color === 'gold' ? 'from-yellow-400 to-orange-500 shadow-yellow-500/25' : `from-${tier.color}-500 to-${tier.color}-600 shadow-${tier.color}-500/25`}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-center mt-2">{tier.name}</CardTitle>
                  <div className="text-3xl font-black text-center bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                    {tier.price.toLocaleString('vi-VN')}đ
                    <span className="text-lg font-normal text-slate-600">/tháng</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Package className="w-4 h-4" />
                    {tier.quota === Infinity ? 'Không giới hạn' : `${tier.quota.toLocaleString()} video/tháng`}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {tier.daily_videos === Infinity ? 'Không giới hạn' : `${tier.daily_videos.toLocaleString()} video/ngày`}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    {tier.channels === Infinity ? '∞' : tier.channels} kênh
                  </div>
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={() => handleUpgrade(tier.name.toLowerCase())}
                    disabled={isCurrent || upgrading === tier.name.toLowerCase()}
                    className="w-full font-bold h-12 text-lg group-hover:scale-[1.02] transition-transform"
                  >
                    {upgrading === tier.name.toLowerCase() ? (
                      <>
                        <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-r-transparent mr-2" />
                        Đang nâng cấp...
                      </>
                    ) : isCurrent ? (
                      'Đang sử dụng'
                    ) : (
                      `Nâng cấp ${tier.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Usage Analytics */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quota Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-64 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-48 h-48 -rotate-90">
                  <path
                    className="text-slate-200 stroke-[3px] fill-none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`stroke-[3px] fill-none ${quotaPercent > 80 ? 'stroke-red-500' : quotaPercent > 50 ? 'stroke-orange-500' : 'stroke-emerald-500'} transition-all duration-1000 origin-center`}
                    strokeDasharray="100 100"
                    strokeDashoffset={100 - quotaPercent}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text
                    x="18"
                    y="20.5"
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="currentColor"
                    className="text-2xl"
                  >
                    {Math.round(quotaPercent)}%
                  </text>
                </svg>
              </div>
              <div className="text-center space-y-2 mt-6">
                <p className="text-sm text-slate-600">Còn lại: {remainingQuota.toLocaleString()} video</p>
                <p className={`text-sm font-bold ${remainingQuota < 50 ? 'text-red-600' : remainingQuota < 100 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {remainingQuota < 50 ? '⚠️ Sắp hết hạn mức!' : remainingQuota < 100 ? '🔄 Cảnh báo' : '✅ An toàn'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Thời gian reset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Quota hiện tại</p>
                  <p className="font-bold text-2xl">{profile?.quota_used.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Hạn mức tháng</p>
                  <p className="font-bold text-2xl">{profile?.quota_limit === Infinity ? '∞' : profile?.quota_limit.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 text-center">
                Reset tự động ngày 1 mỗi tháng
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Extra Quota */}
      <section>
        <Card className="border-2 border-dashed border-slate-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Mua thêm Quota linh hoạt
            </CardTitle>
            <CardDescription>Không muốn nâng cấp gói? Mua thêm video lẻ với giá ưu đãi.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="extra-quota" className="text-lg font-bold">Số lượng video</Label>
                  <Input
                    id="extra-quota"
                    type="number"
                    min={1}
                    value={extraQuota}
                    onChange={(e) => setExtraQuota(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-2 text-2xl h-16"
                  />
                </div>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-2xl">
                  <div className="text-right">
                    <p className="text-4xl font-black text-slate-900">{(extraQuota * 4999).toLocaleString('vi-VN')}đ</p>
                    <p className="text-sm text-slate-500">4.999đ/video (giảm 50% so với lẻ)</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleBuyExtraQuota} size="lg" className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-12 h-16 text-lg flex-1 lg:flex-none shadow-xl">
                <CreditCard className="w-5 h-5 mr-2" />
                Thanh toán ngay
              </Button>
            </div>
            <div className="border-t p-6 bg-slate-50 rounded-b-2xl">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2">Tại sao mua thêm Quota?</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Không giới hạn thời gian sử dụng</div>
                <div className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Cộng dồn vào tài khoản chính</div>
                <div className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Hỗ trợ xuất hóa đơn VAT</div>
                <div className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Giá rẻ hơn mua lẻ</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Payment History */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Lịch sử giao dịch gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                Chưa có giao dịch nào
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
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{new Date(payment.created_at).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{payment.new_tier}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold">{payment.amount.toLocaleString('vi-VN')}đ</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800">{payment.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Câu hỏi thường gặp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-3">Khi nào quota được reset?</h3>
            <p className="text-slate-700">Quota tự động reset vào 00:00 ngày 1 mỗi tháng. Nâng cấp giữa tháng sẽ reset quota ngay lập tức.</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-3">Thanh toán bằng gì?</h3>
            <p className="text-slate-700">Hỗ trợ VNPay, Momo, ZaloPay, thẻ quốc tế. Hóa đơn VAT tự động gửi qua email.</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl md:col-span-2">
            <h3 className="font-bold text-lg mb-3">Làm sao để liên hệ hỗ trợ?</h3>
            <p className="text-slate-700 md:flex md:gap-4">
              <span>Email: support@tubesync.vn</span>
              <span className="hidden md:inline">•</span>
              <span>Zalo OA: @tubesync</span>
              <span className="hidden md:inline">•</span>
              <span>Hotline: 1900 636 868</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
