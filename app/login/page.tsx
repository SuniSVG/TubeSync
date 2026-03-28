'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Youtube, Mail, Lock, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{title: string, message: string} | null>(null);
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
          title: 'Reset Link Dispatched',
          message: 'A secure password reset link has been transmitted to your email address. Please verify your inbox to proceed.'
        });
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        if (error) throw error;
        setSuccessMessage({
          title: 'Verification Required',
          message: 'Your credentials have been registered. A verification protocol has been sent to your email. Please confirm your identity to activate your account.'
        });
        setEmail('');
        setPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
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
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md space-y-8 z-10"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link href="/" className="flex items-center justify-center mb-6 group">
              <div className="bg-red-600/10 border border-red-500/30 p-3 rounded-2xl mr-3 shadow-[0_0_30px_rgba(220,38,38,0.3)] group-hover:shadow-[0_0_40px_rgba(220,38,38,0.5)] transition-all duration-300">
                <Youtube className="h-8 w-8 text-red-500" />
              </div>
              <span className="font-bold text-3xl tracking-tight text-white">TubeSync Pro</span>
            </Link>
          </motion.div>
          
          {!successMessage && (
            <>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                {isForgotPassword ? 'Reset Password' : isSignUp ? 'Initialize Access' : 'System Login'}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {isForgotPassword ? 'Enter your email to receive a reset link.' : isSignUp ? 'Create your secure credentials to proceed.' : 'Authenticate to access your dashboard.'}
              </p>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          {successMessage ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-black/60 border-emerald-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0"></div>
                <CardContent className="pt-10 pb-10 px-8 flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <Mail className="h-10 w-10 text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight">{successMessage.title}</h3>
                    <p className="text-slate-400 leading-relaxed">
                      {successMessage.message}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-white/10 text-white hover:bg-white/5 w-full"
                    onClick={() => {
                      setSuccessMessage(null);
                      if (isForgotPassword) setIsForgotPassword(false);
                      if (isSignUp) setIsSignUp(false);
                    }}
                  >
                    Return to Login
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white">{isForgotPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In'}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {isForgotPassword ? 'We will send you a secure link to reset your password.' : isSignUp ? 'Enter your details below to create your account.' : 'Enter your email and password to access your dashboard.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAuth} className="space-y-5">
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg flex items-start"
                        >
                          <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-red-400 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {!isForgotPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    {!isSignUp && (
                      <button 
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-red-400 transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center">
                    {isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Initialize Account' : 'Authenticate'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {!isForgotPassword && (
              <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="px-2 bg-[#0a0a0a] text-slate-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white/5 text-white hover:bg-white/10 border-white/10 transition-all"
                  onClick={handleGoogleLogin}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Google Authentication
                </Button>
              </div>
            </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/10 pt-6">
            <p className="text-sm text-slate-400">
              {isForgotPassword ? (
                <button
                  type="button"
                  className="font-medium text-red-400 hover:text-red-300 transition-colors"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  Back to login
                </button>
              ) : (
                <>
                  {isSignUp ? 'Already have credentials?' : "Don't have credentials?"}{' '}
                  <button
                    type="button"
                    className="font-medium text-red-400 hover:text-red-300 transition-colors"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                  >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </button>
                </>
              )}
            </p>
          </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
