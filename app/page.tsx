'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Youtube, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        router.push('/dashboard');
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-100">
            <Youtube className="w-16 h-16 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            TubeSync <span className="text-red-600">Pro</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Giải pháp tự động hóa đăng video YouTube từ Google Drive. 
            Lên lịch hàng loạt, quản lý kênh chuyên nghiệp.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/login">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-red-500/20 transition-all hover:scale-105">
              Bắt đầu ngay <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="px-8 py-6 text-lg rounded-full border-slate-200 hover:bg-white">
            Tìm hiểu thêm
          </Button>
        </div>

        <div className="pt-12 grid grid-cols-3 gap-8 text-slate-400">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900">100%</p>
            <p className="text-xs uppercase tracking-widest font-semibold">Tự động</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900">24/7</p>
            <p className="text-xs uppercase tracking-widest font-semibold">Hoạt động</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900">Secure</p>
            <p className="text-xs uppercase tracking-widest font-semibold">Bảo mật</p>
          </div>
        </div>
      </div>
    </div>
  );
}
