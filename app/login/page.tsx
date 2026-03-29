'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Youtube, Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ title: string; message: string } | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/dashboard/settings`,
        });
        if (error) throw error;
        setSuccessMessage({
          title: 'Đã gửi liên kết đặt lại',
          message: 'Một liên kết đặt lại mật khẩu an toàn đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
        });
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        setSuccessMessage({
          title: 'Xác minh email',
          message: 'Tài khoản đã được tạo. Vui lòng kiểm tra email và xác nhận địa chỉ để kích hoạt tài khoản.',
        });
        setEmail('');
        setPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getTitle = () => {
    if (isForgotPassword) return 'Quên mật khẩu?';
    if (isSignUp) return 'Tạo tài khoản';
    return 'Chào mừng trở lại';
  };

  const getSubtitle = () => {
    if (isForgotPassword) return 'Nhập email để nhận liên kết đặt lại mật khẩu.';
    if (isSignUp) return 'Đăng ký để bắt đầu tự động hóa kênh YouTube của bạn.';
    return 'Đăng nhập để tiếp tục quản lý kênh của bạn.';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        .login-page {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background-color: #f5f4f0;
          background-image:
            radial-gradient(ellipse 60% 50% at 70% 20%, rgba(220, 38, 38, 0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 20% 80%, rgba(220, 38, 38, 0.05) 0%, transparent 55%);
          display: flex;
          position: relative;
          overflow: hidden;
        }

        /* Grid pattern */
        .login-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 80%);
          pointer-events: none;
        }

        /* Left decorative panel */
        .left-panel {
          display: none;
          flex: 1;
          align-items: center;
          justify-content: center;
          padding: 60px;
          position: relative;
        }

        @media (min-width: 1024px) {
          .left-panel { display: flex; }
        }

        .left-deco-circle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        /* Right form panel */
        .right-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          position: relative;
          z-index: 10;
        }

        @media (min-width: 1024px) {
          .right-panel {
            flex: 0 0 480px;
            padding: 48px 48px;
            border-left: 1px solid rgba(0,0,0,0.06);
            background: rgba(255,255,255,0.65);
            backdrop-filter: blur(20px);
          }
        }

        .form-card {
          width: 100%;
          max-width: 400px;
        }

        /* Logo */
        .logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 36px;
        }

        .logo-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #dc2626, #991b1b);
          box-shadow: 0 4px 16px rgba(220,38,38,0.35), 0 1px 0 rgba(255,255,255,0.2) inset;
          display: flex; align-items: center; justify-content: center;
          transition: box-shadow 0.3s;
        }

        .logo-badge:hover .logo-icon {
          box-shadow: 0 6px 24px rgba(220,38,38,0.5), 0 1px 0 rgba(255,255,255,0.2) inset;
        }

        .logo-text {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 0.08em;
          color: #111;
        }

        .logo-text span { color: #dc2626; }

        /* Heading */
        .form-heading {
          font-size: 28px;
          font-weight: 700;
          color: #0f0f0f;
          margin: 0 0 6px;
          letter-spacing: -0.3px;
        }

        .form-subheading {
          font-size: 14px;
          color: #888;
          margin: 0 0 32px;
          font-weight: 400;
        }

        /* Input group */
        .input-group { margin-bottom: 18px; }

        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #444;
          margin-bottom: 6px;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px; top: 50%;
          transform: translateY(-50%);
          color: #bbb;
          transition: color 0.2s;
          pointer-events: none;
        }

        .input-wrap:focus-within .input-icon { color: #dc2626; }

        .styled-input {
          width: 100%;
          padding: 11px 14px 11px 38px;
          border: 1.5px solid #e2e1dc;
          border-radius: 10px;
          background: #fff;
          font-size: 14px;
          color: #111;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }

        .styled-input::placeholder { color: #ccc; }

        .styled-input:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
        }

        /* Row between label and forgot */
        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .forgot-btn {
          font-size: 12px;
          color: #dc2626;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          padding: 0;
          transition: color 0.2s;
        }
        .forgot-btn:hover { color: #b91c1c; }

        /* Primary button */
        .btn-submit {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 16px rgba(220,38,38,0.35), 0 1px 0 rgba(255,255,255,0.15) inset;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
          margin-top: 24px;
        }

        .btn-submit::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transition: left 0.5s;
        }

        .btn-submit:hover::before { left: 100%; }
        .btn-submit:hover {
          box-shadow: 0 6px 24px rgba(220,38,38,0.5), 0 1px 0 rgba(255,255,255,0.15) inset;
          transform: translateY(-1px);
        }

        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        /* Divider */
        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 24px 0;
        }
        .divider-line { flex: 1; height: 1px; background: #e8e7e2; }
        .divider-text { font-size: 11px; color: #bbb; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }

        /* Google btn */
        .btn-google {
          width: 100%;
          padding: 11px 20px;
          background: #fff;
          border: 1.5px solid #e2e1dc;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .btn-google:hover {
          border-color: #ccc;
          box-shadow: 0 3px 12px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }

        /* Error */
        .error-box {
          padding: 10px 14px;
          background: #fff1f1;
          border: 1px solid rgba(220,38,38,0.2);
          border-radius: 8px;
          color: #dc2626;
          font-size: 13px;
          display: flex; align-items: flex-start; gap: 8px;
          margin-bottom: 16px;
        }

        /* Footer */
        .form-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 13px;
          color: #999;
        }

        .form-footer button {
          background: none; border: none;
          color: #dc2626; font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          padding: 0;
          transition: color 0.2s;
        }
        .form-footer button:hover { color: #b91c1c; }

        /* Success state */
        .success-card {
          text-align: center;
          padding: 48px 32px;
        }

        .success-icon {
          width: 72px; height: 72px;
          margin: 0 auto 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border: 2px solid rgba(34,197,94,0.3);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(34,197,94,0.2);
        }

        .success-title {
          font-size: 22px; font-weight: 700;
          color: #0f0f0f; margin: 0 0 8px;
        }

        .success-msg {
          font-size: 14px; color: #888;
          line-height: 1.6; margin: 0 0 28px;
        }

        .btn-back {
          padding: 11px 28px;
          border: 1.5px solid #e2e1dc;
          border-radius: 10px;
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          color: #555; cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .btn-back:hover { border-color: #ccc; box-shadow: 0 3px 12px rgba(0,0,0,0.09); }

        /* Left panel decorations */
        .feature-pill {
          display: flex; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px;
          padding: 14px 18px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          margin-bottom: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .feature-pill:hover {
          transform: translateX(4px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.1);
        }

        .pill-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          flex-shrink: 0;
        }

        .pill-title { font-size: 13px; font-weight: 600; color: #111; }
        .pill-desc { font-size: 11px; color: #999; margin-top: 1px; }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .float-anim { animation: float-slow 6s ease-in-out infinite; }
        .float-anim-2 { animation: float-slow 7s ease-in-out infinite 1s; }
      `}</style>

      <div className="login-page">
        {/* Left decorative panel */}
        <div className="left-panel">
          {/* Background circles */}
          <div className="left-deco-circle float-anim" style={{
            width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)',
            top: '10%', left: '5%',
          }} />
          <div className="left-deco-circle float-anim-2" style={{
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)',
            bottom: '10%', right: '10%',
          }} />

          <div style={{ maxWidth: 380, position: 'relative', zIndex: 1 }}>
            {/* Big headline */}
            <div style={{ marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: '#dc2626', textTransform: 'uppercase', marginBottom: 12 }}>
                ✦ Nền tảng số 1
              </p>
              <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 56, lineHeight: 1, color: '#0f0f0f', margin: '0 0 16px', letterSpacing: '0.02em' }}>
                TỰ ĐỘNG HÓA<br />
                <span style={{ color: '#dc2626' }}>YOUTUBE</span><br />
                CHUYÊN NGHIỆP
              </h2>
              <p style={{ fontSize: 15, color: '#888', lineHeight: 1.7, margin: 0 }}>
                Kết nối Google Drive, lên lịch và phát hành video tự động — không cần thao tác thủ công.
              </p>
            </div>

            {/* Feature pills */}
            {[
              { icon: '⚡', title: 'Đăng hàng loạt', desc: 'Upload nhiều video cùng lúc từ Drive' },
              { icon: '🕐', title: 'Lên lịch thông minh', desc: 'Tự động phát hành vào khung giờ vàng' },
              { icon: '🔒', title: 'Bảo mật OAuth 2.0', desc: 'Kết nối an toàn, không lưu mật khẩu' },
            ].map(({ icon, title, desc }) => (
              <div className="feature-pill" key={title}>
                <div className="pill-icon">
                  <span style={{ fontSize: 16 }}>{icon}</span>
                </div>
                <div>
                  <div className="pill-title">{title}</div>
                  <div className="pill-desc">{desc}</div>
                </div>
              </div>
            ))}

            {/* Stats */}
            <div style={{ display: 'flex', gap: 32, marginTop: 36, paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {[['100%', 'Tự động'], ['24/7', 'Hoạt động'], ['SSL', 'Bảo mật']].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: '#0f0f0f', letterSpacing: '0.05em' }}>{val}</div>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="right-panel">
          <div className="form-card">
            {/* Logo */}
            <Link href="/" className="logo-badge">
              <div className="logo-icon">
                <Youtube style={{ width: 22, height: 22, color: '#fff' }} />
              </div>
              <span className="logo-text">TUBE<span>SYNC</span> PRO</span>
            </Link>

            <AnimatePresence mode="wait">
              {successMessage ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e7e2', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}
                >
                  <div className="success-card">
                    <div className="success-icon">
                      <Mail style={{ width: 30, height: 30, color: '#16a34a' }} />
                    </div>
                    <h3 className="success-title">{successMessage.title}</h3>
                    <p className="success-msg">{successMessage.message}</p>
                    <button
                      className="btn-back"
                      onClick={() => {
                        setSuccessMessage(null);
                        if (isForgotPassword) setIsForgotPassword(false);
                        if (isSignUp) setIsSignUp(false);
                      }}
                    >
                      ← Quay lại đăng nhập
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`form-${isSignUp}-${isForgotPassword}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <h1 className="form-heading">{getTitle()}</h1>
                  <p className="form-subheading">{getSubtitle()}</p>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        className="error-box"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleAuth}>
                    {/* Email */}
                    <div className="input-group">
                      <label className="input-label">Địa chỉ email</label>
                      <div className="input-wrap">
                        <Mail className="input-icon" style={{ width: 15, height: 15 }} />
                        <input
                          className="styled-input"
                          type="email"
                          placeholder="ten@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    {!isForgotPassword && (
                      <div className="input-group">
                        <div className="label-row">
                          <label className="input-label" style={{ margin: 0 }}>Mật khẩu</label>
                          {!isSignUp && (
                            <button
                              type="button"
                              className="forgot-btn"
                              onClick={() => { setIsForgotPassword(true); setError(null); setSuccessMessage(null); }}
                            >
                              Quên mật khẩu?
                            </button>
                          )}
                        </div>
                        <div className="input-wrap">
                          <Lock className="input-icon" style={{ width: 15, height: 15 }} />
                          <input
                            className="styled-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Submit */}
                    <button type="submit" className="btn-submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <>
                          {isForgotPassword ? 'Gửi liên kết đặt lại' : isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'}
                          <ArrowRight style={{ width: 15, height: 15 }} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Google OAuth */}
                  {!isForgotPassword && (
                    <>
                      <div className="divider">
                        <div className="divider-line" />
                        <span className="divider-text">hoặc tiếp tục với</span>
                        <div className="divider-line" />
                      </div>

                      <button type="button" className="btn-google" onClick={handleGoogleLogin}>
                        <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Đăng nhập với Google
                      </button>
                    </>
                  )}

                  {/* Footer links */}
                  <div className="form-footer">
                    {isForgotPassword ? (
                      <button onClick={() => { setIsForgotPassword(false); setError(null); }}>
                        ← Quay lại đăng nhập
                      </button>
                    ) : (
                      <>
                        {isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
                        <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMessage(null); }}>
                          {isSignUp ? 'Đăng nhập' : 'Đăng ký miễn phí'}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}