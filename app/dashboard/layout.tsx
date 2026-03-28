'use client';

import Link from 'next/link';
import { Youtube, LayoutDashboard, Upload, CalendarClock, Settings, LogOut, CreditCard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setIsLoading(false);
        // Lấy avatar từ kênh đầu tiên
        const { data: channel } = await supabase
          .from('youtube_channels')
          .select('thumbnail_url')
          .limit(1)
          .single();
        if (channel?.thumbnail_url) setAvatarUrl(channel.thumbnail_url);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Link className="flex items-center justify-center" href="/dashboard">
            <Youtube className="h-6 w-6 text-red-600 mr-2" />
            <span className="font-bold text-xl tracking-tight">TubeSync Pro</span>
          </Link>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center px-4 py-3 text-slate-700 bg-slate-100 rounded-lg font-medium">
            <LayoutDashboard className="h-5 w-5 mr-3 text-slate-500" />
            Dashboard
          </Link>
          <Link href="/dashboard/upload" className="flex items-center px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Upload className="h-5 w-5 mr-3 text-slate-400" />
            Bulk Upload
          </Link>
          <Link href="/dashboard/schedule" className="flex items-center px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <CalendarClock className="h-5 w-5 mr-3 text-slate-400" />
            Schedule
          </Link>
          <Link href="/dashboard/billing" className="flex items-center px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <CreditCard className="h-5 w-5 mr-3 text-slate-400" />
            Billing & Subscriptions
          </Link>
          <Link href="/dashboard/settings" className="flex items-center px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Settings className="h-5 w-5 mr-3 text-slate-400" />
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button onClick={handleSignOut} className="flex items-center w-full px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 bg-white border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-800">Overview</h1>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    'U'
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
