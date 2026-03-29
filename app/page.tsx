'use client';

import Link from 'next/link';
import { Youtube, ArrowRight, Loader2, Zap, Shield, Clock, Star, TrendingUp, Play, CheckCircle, Users, Eye, ThumbsUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard');
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) router.push('/dashboard');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-ring { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2.2);opacity:0} }
        `}</style>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 56, height: 56, borderRadius: '50%', border: '1.5px solid rgba(220,38,38,0.3)', animation: 'pulse-ring 1.6s ease-out infinite' }} />
          <Loader2 style={{ width: 22, height: 22, color: '#dc2626', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  const testimonials = [
    {
      name: 'Minh Tuấn', handle: '@minhtuancreator', avatar: 'MT', role: 'Content Creator · 42K Subs', rating: 5,
      text: 'TubeSync Pro thay đổi hoàn toàn cách mình vận hành kênh. Trước đây mất 3–4 tiếng mỗi ngày để upload thủ công, giờ chỉ cần chuẩn bị video rồi để hệ thống tự làm hết.',
    },
    {
      name: 'Phương Linh', handle: '@phuonglinh.official', avatar: 'PL', role: 'Lifestyle Vlogger · 18K Subs', rating: 5,
      text: 'Mình thử 3 tool khác nhau trước khi dùng TubeSync. Cái này vừa dễ dùng vừa ổn định nhất. Tính năng lên lịch theo giờ vàng thực sự hiệu quả — tỷ lệ tiếp cận tăng rõ rệt.',
    },
    {
      name: 'Hoàng Nam', handle: '@techvietnam.hn', avatar: 'HN', role: 'Tech Reviewer · 87K Subs', rating: 5,
      text: 'Quản lý 2 kênh cùng lúc mà không bị rối — đó là thứ mình cần. TubeSync cho phép kết nối nhiều kênh trong một tài khoản, bảo mật OAuth chuẩn chỉnh, không lo bị khóa.',
    },
  ];

  const steps = [
    { num: '01', title: 'Kết nối Google Drive', desc: 'Authorize một lần qua OAuth 2.0. Chọn thư mục chứa video — TubeSync theo dõi mọi thay đổi trong thời gian thực.' },
    { num: '02', title: 'Cấu hình kênh YouTube', desc: 'Liên kết tài khoản YouTube, đặt tiêu đề mẫu, mô tả, tags và cài đặt quyền riêng tư cho từng kênh.' },
    { num: '03', title: 'Lên lịch tự động', desc: 'Chọn khung giờ đăng hoặc để AI phân tích và gợi ý thời điểm tối ưu dựa trên audience của bạn.' },
    { num: '04', title: 'Theo dõi & tối ưu', desc: 'Dashboard real-time hiển thị trạng thái upload, lịch sắp tới và số liệu tăng trưởng của kênh.' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        .lp{font-family:'DM Sans',sans-serif;background-color:#f5f4f0;min-height:100vh;position:relative;overflow-x:hidden}
        .lp-grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(0,0,0,0.032) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.032) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(ellipse 90% 80% at 50% 30%,black 10%,transparent 80%)}
        .lp-noise{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");opacity:0.016;mix-blend-mode:multiply}
        .lp-blob1{position:fixed;width:700px;height:500px;border-radius:50%;background:radial-gradient(ellipse,rgba(220,38,38,0.07) 0%,transparent 70%);top:-15%;left:50%;transform:translateX(-50%);pointer-events:none;z-index:0}
        .lp-blob2{position:fixed;width:400px;height:400px;border-radius:50%;background:radial-gradient(ellipse,rgba(220,38,38,0.05) 0%,transparent 70%);bottom:10%;right:-5%;pointer-events:none;z-index:0}

        /* NAV */
        .lp-nav{position:sticky;top:0;z-index:100;background:rgba(245,244,240,0.88);backdrop-filter:blur(16px);border-bottom:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:64px}
        @media(max-width:640px){.lp-nav{padding:0 20px}}
        .lp-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .lp-logo-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#dc2626,#991b1b);box-shadow:0 3px 12px rgba(220,38,38,0.35),0 1px 0 rgba(255,255,255,0.15) inset;display:flex;align-items:center;justify-content:center;transition:box-shadow 0.3s}
        .lp-logo:hover .lp-logo-icon{box-shadow:0 5px 20px rgba(220,38,38,0.5),0 1px 0 rgba(255,255,255,0.15) inset}
        .lp-logo-text{font-family:'Bebas Neue';font-size:19px;letter-spacing:0.1em;color:#111}
        .lp-logo-text span{color:#dc2626}
        .lp-badge-sm{font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:2px 7px;border-radius:20px;background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.2);color:#dc2626}
        .nav-right{display:flex;align-items:center;gap:6px}
        .nav-links{display:flex;align-items:center;gap:4px;margin-right:12px}
        .lp-nav-link{font-size:13px;font-weight:500;color:#666;text-decoration:none;padding:6px 12px;border-radius:20px;transition:all 0.2s}
        .lp-nav-link:hover{color:#111;background:rgba(0,0,0,0.04)}
        @media(max-width:768px){.lp-nav-link{display:none}}
        .lp-nav-cta{font-family:'DM Sans';font-size:13px;font-weight:600;color:#fff;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;border-radius:20px;padding:8px 20px;cursor:pointer;text-decoration:none;box-shadow:0 3px 12px rgba(220,38,38,0.35);transition:all 0.2s}
        .lp-nav-cta:hover{box-shadow:0 5px 20px rgba(220,38,38,0.5);transform:translateY(-1px)}

        /* SHARED */
        .section{position:relative;z-index:10}
        .container{max-width:1100px;margin:0 auto;padding:0 36px}
        @media(max-width:640px){.container{padding:0 20px}}
        .section-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#dc2626;background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.18);border-radius:20px;padding:5px 14px;margin-bottom:14px}
        .section-title{font-family:'Bebas Neue';font-size:clamp(36px,5vw,54px);letter-spacing:0.03em;color:#0f0f0f;margin-bottom:10px;line-height:1.02}
        .section-desc{font-size:15px;color:#888;line-height:1.75;max-width:520px}

        /* HERO */
        .hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:72px 24px 64px}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        .hero-logomark{width:84px;height:84px;border-radius:22px;background:#fff;border:1px solid rgba(220,38,38,0.12);box-shadow:0 0 0 1px rgba(220,38,38,0.07),0 8px 32px rgba(220,38,38,0.12),0 20px 50px rgba(0,0,0,0.07);display:flex;align-items:center;justify-content:center;margin-bottom:32px;animation:float 5s ease-in-out infinite}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#dc2626;background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.18);border-radius:20px;padding:5px 14px;margin-bottom:22px}
        .hero-h1{font-family:'Bebas Neue';line-height:0.93;letter-spacing:0.02em;color:#0f0f0f;margin-bottom:6px}
        .hero-h1-accent{background:linear-gradient(90deg,#dc2626,#ea580c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-sub{font-family:'Bebas Neue';letter-spacing:0.18em;color:#c0bfba;margin-bottom:24px}
        .hero-desc{max-width:480px;font-size:15px;color:#888;line-height:1.8;margin-bottom:36px}
        .hero-desc strong{color:#444;font-weight:500}

        .cta-group{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:44px}
        .btn-primary{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans';font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;border-radius:24px;padding:13px 28px;cursor:pointer;text-decoration:none;box-shadow:0 4px 18px rgba(220,38,38,0.38),0 1px 0 rgba(255,255,255,0.15) inset;transition:all 0.25s;position:relative;overflow:hidden}
        .btn-primary::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent);transition:left 0.5s}
        .btn-primary:hover::before{left:100%}
        .btn-primary:hover{box-shadow:0 6px 28px rgba(220,38,38,0.52),0 1px 0 rgba(255,255,255,0.15) inset;transform:translateY(-1px)}
        .btn-secondary{display:inline-flex;align-items:center;gap:6px;font-family:'DM Sans';font-size:14px;font-weight:500;color:#666;background:#fff;border:1.5px solid #e2e1dc;border-radius:24px;padding:12px 24px;cursor:pointer;text-decoration:none;box-shadow:0 1px 4px rgba(0,0,0,0.06);transition:all 0.2s}
        .btn-secondary:hover{border-color:#ccc;color:#333;box-shadow:0 4px 16px rgba(0,0,0,0.1);transform:translateY(-1px)}

        /* STATS */
        .stats-pill{display:flex;background:#fff;border:1px solid #e8e7e2;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;transition:box-shadow 0.3s}
        .stats-pill:hover{box-shadow:0 8px 36px rgba(0,0,0,0.09)}
        .stat-item{flex:1;text-align:center;padding:18px 24px;position:relative}
        .stat-item+.stat-item::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:1px;background:linear-gradient(to bottom,transparent,#e2e1dc,transparent)}
        .stat-val{font-family:'Bebas Neue';font-size:26px;letter-spacing:0.05em;color:#0f0f0f;display:block}
        .stat-lbl{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#bbb;display:block;margin-top:2px}

        /* FEATURES */
        .features-section{padding:80px 0}
        .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:44px}
        @media(max-width:768px){.features-grid{grid-template-columns:1fr}}
        .feature-card{background:#fff;border:1px solid #e8e7e2;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.04);transition:all 0.25s}
        .feature-card:hover{border-color:rgba(220,38,38,0.2);box-shadow:0 8px 28px rgba(0,0,0,0.09),0 0 0 1px rgba(220,38,38,0.08);transform:translateY(-3px)}
        .feature-icon-wrap{width:40px;height:40px;border-radius:11px;background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.14);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
        .feature-title{font-size:14px;font-weight:600;color:#111;margin-bottom:6px}
        .feature-desc{font-size:13px;color:#999;line-height:1.7}

        /* HOW IT WORKS */
        .how-section{padding:80px 0;background:#fff;border-top:1px solid #eeede9;border-bottom:1px solid #eeede9}
        .steps-grid{display:grid;grid-template-columns:repeat(4,1fr);margin-top:44px}
        @media(max-width:900px){.steps-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.steps-grid{grid-template-columns:1fr}}
        .step-item{padding:28px 24px;position:relative}
        .step-item+.step-item::before{content:'';position:absolute;left:0;top:24px;bottom:24px;width:1px;background:linear-gradient(to bottom,transparent,#e2e1dc 30%,#e2e1dc 70%,transparent)}
        @media(max-width:900px){.step-item+.step-item::before{display:none}}
        .step-num{font-family:'Bebas Neue';font-size:52px;color:rgba(220,38,38,0.11);line-height:1;margin-bottom:12px}
        .step-title{font-size:14px;font-weight:600;color:#111;margin-bottom:8px}
        .step-desc{font-size:13px;color:#999;line-height:1.7}

        /* CASE STUDY */
        .case-section{padding:80px 0}
        .case-card{background:#fff;border:1px solid #e8e7e2;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.07)}
        .case-top{background:linear-gradient(135deg,#0f0f0f 0%,#1a0505 100%);padding:40px 48px;display:flex;align-items:flex-start;gap:32px;position:relative;overflow:hidden}
        @media(max-width:768px){.case-top{flex-direction:column;padding:28px 24px;gap:20px}}
        .case-top::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:32px 32px}
        .case-top-badge{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f87171;background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.3);border-radius:20px;padding:4px 12px;margin-bottom:12px}
        .case-title{font-family:'Bebas Neue';font-size:clamp(28px,4vw,44px);color:#fff;letter-spacing:0.03em;line-height:1;margin-bottom:10px}
        .case-subtitle{font-size:14px;color:rgba(255,255,255,0.45);line-height:1.65;max-width:380px}
        .case-channel-badge{flex-shrink:0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:16px 20px;text-align:center;min-width:160px;position:relative;z-index:1}
        .case-channel-icon{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#991b1b);display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
        .case-metrics{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #eeede9}
        @media(max-width:600px){.case-metrics{grid-template-columns:1fr}}
        .case-metric{padding:28px 24px;text-align:center;position:relative}
        .case-metric+.case-metric::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:1px;background:linear-gradient(to bottom,transparent,#e2e1dc,transparent)}
        @media(max-width:600px){.case-metric+.case-metric::before{display:none}.case-metric{border-top:1px solid #eeede9}}
        .metric-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
        .metric-val{font-family:'Bebas Neue';font-size:38px;letter-spacing:0.05em;color:#0f0f0f;display:block;line-height:1}
        .metric-lbl{font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#bbb;display:block;margin-top:4px}
        .metric-change{font-size:12px;color:#16a34a;font-weight:600;margin-top:4px;display:block}
        .case-bottom{padding:32px 40px;display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}
        @media(max-width:768px){.case-bottom{grid-template-columns:1fr;padding:24px;gap:24px}}
        .case-section-label{font-size:12px;font-weight:700;color:#111;margin-bottom:14px;letter-spacing:0.05em;text-transform:uppercase}
        .timeline{display:flex;flex-direction:column;gap:16px}
        .timeline-item{display:flex;gap:14px;align-items:flex-start}
        .tl-dot-col{display:flex;flex-direction:column;align-items:center;padding-top:4px}
        .tl-dot{width:10px;height:10px;border-radius:50%;background:#dc2626;flex-shrink:0}
        .tl-line{width:1px;flex:1;background:linear-gradient(to bottom,#e2e1dc,transparent);min-height:24px;margin-top:4px}
        .tl-month{font-size:11px;font-weight:700;color:#dc2626;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px}
        .tl-event{font-size:13px;color:#555;line-height:1.6}
        .case-quote-block{display:flex;flex-direction:column;gap:14px}
        .case-quote{background:#f9f8f6;border:1px solid #eeede9;border-radius:14px;padding:20px 20px 20px 24px;font-size:14px;color:#555;line-height:1.75;font-style:italic;position:relative}
        .case-quote::before{content:'"';position:absolute;top:-10px;left:14px;font-size:52px;color:rgba(220,38,38,0.13);font-family:'Georgia',serif;line-height:1}
        .case-author{display:flex;align-items:center;gap:12px}
        .case-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#991b1b);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
        .check-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
        .check-item{display:flex;align-items:center;gap:8px;font-size:13px;color:#555}

        /* TESTIMONIALS */
        .testimonials-section{padding:80px 0;background:#fff;border-top:1px solid #eeede9}
        .testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:44px}
        @media(max-width:768px){.testimonials-grid{grid-template-columns:1fr}}
        .testi-card{background:#f9f8f6;border:1px solid #eeede9;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:14px;transition:all 0.25s}
        .testi-card:hover{border-color:rgba(220,38,38,0.15);box-shadow:0 6px 24px rgba(0,0,0,0.07);transform:translateY(-2px)}
        .testi-stars{display:flex;gap:3px}
        .testi-text{font-size:13px;color:#555;line-height:1.75;flex:1;font-style:italic}
        .testi-author{display:flex;align-items:center;gap:12px;padding-top:4px;border-top:1px solid #eeede9;margin-top:auto}
        .testi-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#7f1d1d);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
        .testi-name{font-size:13px;font-weight:600;color:#111}
        .testi-handle{font-size:11px;color:#dc2626}
        .testi-role{font-size:11px;color:#aaa}

        /* FINAL CTA */
        .final-cta{padding:80px 0 100px}
        .final-cta-card{background:linear-gradient(135deg,#0f0f0f 0%,#1c0303 100%);border-radius:24px;padding:64px 40px;text-align:center;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.15)}
        .final-cta-card::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px);background-size:40px 40px}
        .final-cta-card::after{content:'';position:absolute;top:-30%;left:50%;transform:translateX(-50%);width:600px;height:400px;border-radius:50%;background:radial-gradient(ellipse,rgba(220,38,38,0.18) 0%,transparent 70%);pointer-events:none}
        .final-cta-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#f87171;background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.25);border-radius:20px;padding:5px 14px;margin-bottom:20px;position:relative;z-index:1}
        .final-cta-title{font-family:'Bebas Neue';font-size:clamp(40px,6vw,72px);color:#fff;letter-spacing:0.03em;line-height:1;margin-bottom:14px;position:relative;z-index:1}
        .final-cta-desc{font-size:15px;color:rgba(255,255,255,0.45);line-height:1.75;max-width:420px;margin:0 auto 36px;position:relative;z-index:1}
        .final-cta-group{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;position:relative;z-index:1}
        .btn-primary-lg{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans';font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;border-radius:28px;padding:15px 32px;cursor:pointer;text-decoration:none;box-shadow:0 4px 20px rgba(220,38,38,0.45),0 1px 0 rgba(255,255,255,0.15) inset;transition:all 0.25s;position:relative;overflow:hidden}
        .btn-primary-lg::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent);transition:left 0.5s}
        .btn-primary-lg:hover::before{left:100%}
        .btn-primary-lg:hover{box-shadow:0 8px 32px rgba(220,38,38,0.6),0 1px 0 rgba(255,255,255,0.15) inset;transform:translateY(-2px)}
        .btn-ghost-lg{display:inline-flex;align-items:center;gap:6px;font-family:'DM Sans';font-size:15px;font-weight:500;color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.12);border-radius:28px;padding:14px 28px;cursor:pointer;text-decoration:none;transition:all 0.2s}
        .btn-ghost-lg:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.9)}

        /* FOOTER */
        .lp-footer{border-top:1px solid #eeede9;padding:28px 36px;display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto}
        @media(max-width:640px){.lp-footer{flex-direction:column;gap:12px;text-align:center}}
        .footer-copy{font-size:12px;color:#bbb}
        .footer-links{display:flex;gap:20px}
        .footer-link{font-size:12px;color:#bbb;text-decoration:none;transition:color 0.2s}
        .footer-link:hover{color:#555}

        /* ANIMATIONS */
        @keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .a1{animation:fade-up .55s ease both .08s}
        .a2{animation:fade-up .55s ease both .2s}
        .a3{animation:fade-up .55s ease both .32s}
        .a4{animation:fade-up .55s ease both .44s}
        .a5{animation:fade-up .55s ease both .56s}
        .a6{animation:fade-up .55s ease both .68s}
      `}</style>

      <div className="lp" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s' }}>
        <div className="lp-grid" />
        <div className="lp-noise" />
        <div className="lp-blob1" />
        <div className="lp-blob2" />

        {/* NAV */}
        <nav className="lp-nav">
          <Link href="/" className="lp-logo">
            <div className="lp-logo-icon"><Youtube style={{ width: 18, height: 18, color: '#fff' }} /></div>
            <span className="lp-logo-text">TUBE<span>SYNC</span></span>
            <span className="lp-badge-sm">PRO</span>
          </Link>
          <div className="nav-right">
            <div className="nav-links">
              <a href="#how" className="lp-nav-link">Tính năng</a>
              <a href="#case" className="lp-nav-link">Thành công</a>
              <Link href="/about" className="lp-nav-link">Đội ngũ</Link>
              <Link href="/dashboard/tags" className="lp-nav-link">Xu hướng</Link>
            </div>
            <Link href="/login" className="lp-nav-cta shadow-red-500/20">Dùng thử ngay</Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="section">
          <div className="hero">
            <div className="hero-logomark a1"><Youtube style={{ width: 42, height: 42, color: '#dc2626' }} /></div>
            <div className="hero-eyebrow a2">✦ Tự động hóa YouTube chuyên nghiệp</div>
            <div className="a3">
              <h1 className="hero-h1" style={{ fontSize: 'clamp(58px,11vw,118px)' }}>
                TUBE<span className="hero-h1-accent">SYNC</span>
              </h1>
              <p className="hero-sub" style={{ fontSize: 'clamp(13px,2.5vw,20px)' }}>AUTOMATION PLATFORM</p>
            </div>
            <p className="hero-desc a4">
              Tải video từ <strong>Google Drive</strong> lên YouTube hoàn toàn tự động.
              Lên lịch hàng loạt, quản lý đa kênh, hoạt động <strong>24/7</strong> không cần can thiệp thủ công.
            </p>
            <div className="cta-group a5">
              <Link href="/login" className="btn-primary">
                Bắt đầu miễn phí <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
              <button className="btn-secondary">
                <Play style={{ width: 13, height: 13, fill: 'currentColor' }} /> Xem demo
              </button>
            </div>
            <div className="stats-pill a6">
              {[['100%','Tự Động'],['24/7','Hoạt Động'],['OAuth','Bảo Mật'],['Free','Bắt Đầu']].map(([v,l]) => (
                <div className="stat-item" key={l}>
                  <span className="stat-val">{v}</span>
                  <span className="stat-lbl">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section features-section">
          <div className="container">
            <div className="section-eyebrow">⚡ Tính năng</div>
            <h2 className="section-title">MỌI THỨ BẠN CẦN<br />ĐỂ SCALE KÊNH</h2>
            <p className="section-desc">Từ upload tự động đến lên lịch thông minh — TubeSync xử lý toàn bộ khâu kỹ thuật để bạn tập trung vào nội dung.</p>
            <div className="features-grid">
              {[
                { icon: <Zap style={{width:18,height:18,color:'#dc2626'}} />, title: 'Upload hàng loạt', desc: 'Đặt thư mục Drive, TubeSync tự phát hiện video mới và upload ngay lập tức — không giới hạn số lượng.' },
                { icon: <Clock style={{width:18,height:18,color:'#dc2626'}} />, title: 'Lên lịch thông minh', desc: 'Phân tích audience của kênh, gợi ý và tự động đăng video vào khung giờ có lượt xem cao nhất.' },
                { icon: <Shield style={{width:18,height:18,color:'#dc2626'}} />, title: 'Bảo mật OAuth 2.0', desc: 'Kết nối an toàn qua Google OAuth chuẩn. Không lưu mật khẩu, không rủi ro bị khóa tài khoản.' },
                { icon: <Users style={{width:18,height:18,color:'#dc2626'}} />, title: 'Đa kênh', desc: 'Quản lý nhiều kênh YouTube trong một giao diện. Mỗi kênh có cài đặt riêng biệt, phân quyền linh hoạt.' },
                { icon: <TrendingUp style={{width:18,height:18,color:'#dc2626'}} />, title: 'Dashboard Analytics', desc: 'Theo dõi trạng thái upload, lịch đăng sắp tới và số liệu tăng trưởng theo thời gian thực.' },
                { icon: <CheckCircle style={{width:18,height:18,color:'#dc2626'}} />, title: 'Metadata tự động', desc: 'Đặt template tiêu đề, mô tả, tags và thumbnail mặc định. Áp dụng hàng loạt chỉ trong một click.' },
              ].map(({ icon, title, desc }) => (
                <div className="feature-card" key={title}>
                  <div className="feature-icon-wrap">{icon}</div>
                  <div className="feature-title">{title}</div>
                  <div className="feature-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section how-section" id="how">
          <div className="container">
            <div className="section-eyebrow">🔄 Quy trình</div>
            <h2 className="section-title">HOẠT ĐỘNG NHƯ THẾ NÀO?</h2>
            <p className="section-desc">Chỉ cần 4 bước đơn giản để hệ thống tự vận hành kênh của bạn.</p>
            <div className="steps-grid">
              {steps.map(({ num, title, desc }) => (
                <div className="step-item" key={num}>
                  <div className="step-num">{num}</div>
                  <div className="step-title">{title}</div>
                  <div className="step-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CASE STUDY */}
        <section className="section case-section" id="case">
          <div className="container">
            <div className="section-eyebrow">📈 Case Study</div>
            <h2 className="section-title">TỪ 0 LÊN 8.000 SUBS<br />CHỈ TRONG 3 THÁNG</h2>
            <p className="section-desc" style={{ marginBottom: 32 }}>Kênh Shorts tự động hóa hoàn toàn với TubeSync — không cần đội ngũ, không cần upload thủ công.</p>
            <div className="case-card">
              {/* Dark header */}
              <div className="case-top">
                <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                  <div className="case-top-badge"><TrendingUp style={{width:10,height:10}} /> Success Story · Q1 2025</div>
                  <div className="case-title">KÊNH SHORTS<br />PHÁT TRIỂN TỰ ĐỘNG</div>
                  <div className="case-subtitle">Một creator solo, không có kinh nghiệm YouTube, dùng TubeSync để xây dựng kênh Shorts từ số 0 — hoàn toàn tự động hóa từ ngày đầu tiên.</div>
                </div>
                <div className="case-channel-badge">
                  <div className="case-channel-icon"><Youtube style={{width:22,height:22,color:'#fff'}} /></div>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:3}}>@AnhTuanShorts</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Lifestyle Shorts</div>
                  <div style={{marginTop:12,fontSize:11,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Thời gian</div>
                  <div style={{fontSize:14,fontWeight:600,color:'#fff',marginTop:2}}>01 – 03 / 2025</div>
                </div>
              </div>

              {/* Metrics */}
              <div className="case-metrics">
                {[
                  { icon: <Users style={{width:18,height:18,color:'#dc2626'}} />, bg:'rgba(220,38,38,0.08)', val:'8.000', lbl:'Subscribers', change:'↑ Từ 0 subs' },
                  { icon: <ThumbsUp style={{width:18,height:18,color:'#f59e0b'}} />, bg:'rgba(245,158,11,0.08)', val:'15.000', lbl:'Lượt thích', change:'↑ 15K trong 3 tháng' },
                  { icon: <Eye style={{width:18,height:18,color:'#3b82f6'}} />, bg:'rgba(59,130,246,0.08)', val:'2.1M+', lbl:'Lượt xem Shorts', change:'↑ Tháng 3 tăng 340%' },
                ].map(({ icon, bg, val, lbl, change }) => (
                  <div className="case-metric" key={lbl}>
                    <div className="metric-icon" style={{background:bg}}>{icon}</div>
                    <span className="metric-val">{val}</span>
                    <span className="metric-lbl">{lbl}</span>
                    <span className="metric-change">{change}</span>
                  </div>
                ))}
              </div>

              {/* Detail */}
              <div className="case-bottom">
                <div>
                  <div className="case-section-label">📅 Timeline phát triển</div>
                  <div className="timeline">
                    {[
                      { month: 'Tháng 1', event: 'Setup TubeSync, kết nối Drive + YouTube. Bắt đầu upload 3 Shorts/ngày tự động. Kết thúc tháng đạt 120 subs đầu tiên.' },
                      { month: 'Tháng 2', event: 'Tối ưu lịch đăng theo giờ vàng 7h30 sáng. Một video đạt 180K views. Tổng kênh vượt 2.000 subs.' },
                      { month: 'Tháng 3', event: 'Video viral đạt 950K views. Kênh tăng 6.000 subs chỉ trong 2 tuần. Đủ điều kiện bật Monetization.' },
                    ].map(({ month, event }, i) => (
                      <div className="timeline-item" key={month}>
                        <div className="tl-dot-col">
                          <div className="tl-dot" />
                          {i < 2 && <div className="tl-line" />}
                        </div>
                        <div>
                          <div className="tl-month">{month}</div>
                          <div className="tl-event">{event}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="case-quote-block">
                  <div>
                    <div className="case-section-label">💬 Creator nói gì</div>
                    <div className="case-quote">
                      Mình chỉ cần chuẩn bị video trong Drive, TubeSync lo hết phần còn lại. Tháng đầu gần như không động vào kênh mà vẫn thấy số liệu tăng đều. Đến tháng 3 thì thực sự bất ngờ — một video viral và kênh bùng lên hoàn toàn.
                    </div>
                    <div className="case-author" style={{marginTop:14}}>
                      <div className="case-avatar">AT</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:'#111'}}>Anh Tuấn</div>
                        <div style={{fontSize:12,color:'#aaa'}}>Solo Creator · @AnhTuanShorts</div>
                      </div>
                    </div>
                  </div>
                  <div style={{background:'#f9f8f6',border:'1px solid #eeede9',borderRadius:12,padding:'16px 20px'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#111',marginBottom:10,letterSpacing:'0.05em',textTransform:'uppercase'}}>Cấu hình sử dụng</div>
                    <div className="check-list">
                      {['3 Shorts / ngày · tự động từ Drive','Lịch đăng: 7h30 sáng mỗi ngày','Metadata template cho toàn bộ Shorts','Không upload thủ công một lần nào'].map(t => (
                        <div className="check-item" key={t}>
                          <CheckCircle style={{width:14,height:14,color:'#16a34a',flexShrink:0}} />
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="section testimonials-section" id="reviews">
          <div className="container">
            <div className="section-eyebrow">⭐ Đánh giá</div>
            <h2 className="section-title">CREATOR NÓI GÌ<br />VỀ TUBESYNC?</h2>
            <p className="section-desc">Hơn 500+ kênh YouTube đang sử dụng TubeSync để tự động hóa quy trình đăng tải.</p>
            <div className="testimonials-grid">
              {testimonials.map(({ name, handle, avatar, role, rating, text }) => (
                <div className="testi-card" key={handle}>
                  <div className="testi-stars">
                    {Array.from({ length: rating }).map((_, i) => (
                      <Star key={i} style={{width:13,height:13,fill:'#f59e0b',color:'#f59e0b'}} />
                    ))}
                  </div>
                  <div className="testi-text">"{text}"</div>
                  <div className="testi-author">
                    <div className="testi-avatar">{avatar}</div>
                    <div>
                      <div className="testi-name">{name}</div>
                      <div className="testi-handle">{handle}</div>
                      <div className="testi-role">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section final-cta">
          <div className="container">
            <div className="final-cta-card">
              <div className="final-cta-badge">🚀 Sẵn sàng chưa?</div>
              <div className="final-cta-title">BẮT ĐẦU SCALE KÊNH<br />NGAY HÔM NAY</div>
              <div className="final-cta-desc">Miễn phí để bắt đầu. Không cần thẻ tín dụng. Cài đặt xong trong 5 phút.</div>
              <div className="final-cta-group">
                <Link href="/login" className="btn-primary-lg">
                  Tạo tài khoản miễn phí <ArrowRight style={{width:16,height:16}} />
                </Link>
                <button className="btn-ghost-lg">
                  <Play style={{width:14,height:14,fill:'currentColor'}} /> Xem demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="lp-footer">
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Youtube style={{width:16,height:16,color:'#dc2626'}} />
              <span className="footer-copy">© 2026 TubeSync Pro. All rights reserved.</span>
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link">Điều khoản</a>
              <a href="#" className="footer-link">Bảo mật</a>
              <a href="#" className="footer-link">Liên hệ</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}