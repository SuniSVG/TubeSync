'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Youtube, CheckCircle2, Shield, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChannelStats {
  subscriberCount: string;
  viewCount: string;
  videoCount: string;
  hiddenSubscriberCount: boolean;
}

export default function SettingsPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<ChannelStats | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserEmail(session.user.email || null);
        
        // Check if user has a connected channel
        const { data: channelData, error } = await supabase
          .from('youtube_channels')
          .select('*')
          .eq('user_id', session.user.id);
          
        // QUAN TRỌNG: Nếu có provider_token trong session (vừa redirect về), ưu tiên xử lý để lưu DB
        if (session.provider_token) {
          fetchYouTubeStats(session.provider_token, session.provider_refresh_token || undefined);
        } else if (channelData && channelData.length > 0) {
          const primaryChannel = channelData[0];
          setIsConnected(true);
          setChannelName(primaryChannel.channel_name);
          if (primaryChannel.access_token) {
            fetchYouTubeStats(primaryChannel.access_token);
          }
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUserEmail(session.user.email || null);
        
        const { data: channelData } = await supabase
          .from('youtube_channels')
          .select('*')
          .eq('user_id', session.user.id);
          
        // Nếu vừa đăng nhập/link identity xong, session sẽ có provider_token
        if (session.provider_token) {
          fetchYouTubeStats(session.provider_token, session.provider_refresh_token || undefined);
        } else if (channelData && channelData.length > 0) {
          const primaryChannel = channelData[0];
          setIsConnected(true);
          setChannelName(primaryChannel.channel_name);
          if (primaryChannel.access_token) fetchYouTubeStats(primaryChannel.access_token);
        }
      } else {
        setIsConnected(false);
        setUserEmail(null);
        setChannelName(null);
        setStats(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchYouTubeStats = async (token: string, refreshToken?: string) => {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        // Hiển thị thông tin kênh đầu tiên lên UI Settings làm đại diện
        setStats(data.items[0].statistics);
        setChannelName(data.items[0].snippet.title);
        setIsConnected(true);
        
        // Lưu hoặc cập nhật TẤT CẢ các kênh trả về
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const upsertArray = data.items.map((item: any) => {
            const channelRecord: any = {
              user_id: session.user.id,
              youtube_channel_id: item.id,
              channel_name: item.snippet.title,
              avatar_url: item.snippet.thumbnails?.default?.url,
              access_token: token,
            };
            
            // Refresh token dùng chung cho các kênh cùng account
            if (refreshToken) {
              channelRecord.refresh_token = refreshToken;
            }
            return channelRecord;
          });

          const { error: upsertError } = await supabase
            .from('youtube_channels')
            .upsert(upsertArray, { onConflict: 'youtube_channel_id' });
            
          if (upsertError) console.error("Error saving tokens to DB:", upsertError.message);
        }
      }
    } catch (err) {
      console.error("Failed to fetch YT stats", err);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    // Scope đầy đủ: YouTube upload + readonly + Google Drive (để upload file lên Drive)
    const SCOPES = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/drive.file', // ← THÊM: cho phép upload lên Google Drive
    ].join(' ');

    try {
      // Sử dụng linkIdentity để gắn tài khoản Google/YouTube vào user hiện tại đang đăng nhập
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          scopes: SCOPES,
          redirectTo: `${window.location.origin}/dashboard/settings`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      // Nếu Google identity đã từng được link với account này rồi, hàm linkIdentity sẽ ném lỗi.
      // Khi đó ta fallback lại dùng signInWithOAuth để cấp lại Token.
      if (error) {
        console.log("Fallback to signInWithOAuth due to:", error.message);
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: SCOPES,
            redirectTo: `${window.location.origin}/dashboard/settings`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        if (signInError) throw signInError;
      }
    } catch (error: any) {
      console.error('Error connecting to Google:', error);
      alert('Lỗi kết nối: ' + error.message);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn ngắt kết nối kênh này?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Chỉ xóa liên kết trong CSDL, KHÔNG đăng xuất tài khoản
      const { error } = await supabase.from('youtube_channels').delete().eq('user_id', session.user.id);
      if (error) throw error;

      setIsConnected(false);
      setChannelName(null);
    } catch (error: any) {
      alert('Lỗi ngắt kết nối: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-slate-500">Manage your account, connected channels, and billing.</p>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="channels">Connected Channels</TabsTrigger>
          <TabsTrigger value="api">API & Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>YouTube Integrations</CardTitle>
              <CardDescription>Connect your YouTube channels to enable automated publishing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                        <Youtube className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{channelName || 'Connected Account'}</p>
                        <p className="text-sm text-slate-500">{userEmail}</p>
                      </div>
                    </div>
                    {stats && (
                      <div className="hidden md:flex gap-6 border-l pl-6">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase font-bold">Subscribers</p>
                          <p className="text-lg font-mono text-red-600">{Number(stats.subscriberCount).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase font-bold">Views</p>
                          <p className="text-lg font-mono text-slate-900">{Number(stats.viewCount).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase font-bold">Videos</p>
                          <p className="text-lg font-mono text-slate-900">{stats.videoCount}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center text-sm text-emerald-600 font-medium">
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Active
                      </span>
                      <Button onClick={handleDisconnect} variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <Youtube className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No channels connected</h3>
                  <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">
                    Connect your YouTube channel to start scheduling and automating your video uploads.
                  </p>
                  <Button onClick={handleConnect} disabled={isConnecting} className="bg-red-600 hover:bg-red-700 text-white">
                    {isConnecting ? 'Connecting...' : 'Connect YouTube Channel'}
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4">
              <div className="flex items-center text-sm text-slate-500">
                <Shield className="h-4 w-4 mr-2 text-slate-400" />
                We use Supabase OAuth to securely store your access tokens. We never see your password.
              </div>
            </CardFooter>
          </Card>

          <Card className="mt-6 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">How to connect your YouTube Channel</CardTitle>
              <CardDescription>Follow these steps to authorize TubeSync Pro to upload videos on your behalf.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <ol className="list-decimal pl-5 space-y-3">
                <li>Click the <strong>&quot;Connect YouTube Channel&quot;</strong> button above.</li>
                <li>You will be redirected to Google&apos;s secure login page.</li>
                <li>Select the Google account associated with the YouTube channel you want to manage.</li>
                <li>Review the permissions requested by TubeSync Pro. We need access to <strong>&quot;Manage your YouTube videos&quot;</strong> to schedule and publish your content.</li>
                <li>Click <strong>&quot;Allow&quot;</strong> to grant access.</li>
                <li>You will be redirected back to this page, and your channel will appear as &quot;Active&quot;.</li>
              </ol>
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex items-start">
                <Shield className="h-5 w-5 mr-3 shrink-0 mt-0.5 text-blue-500" />
                <p>
                  <strong>Privacy Note:</strong> We only request the minimum permissions necessary to upload and manage videos you schedule through our platform. We do not have access to your Google password or other personal data outside of your YouTube channel profile.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>Manage your API keys for custom integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Your Personal API Key</Label>
                <div className="flex space-x-2">
                  <Input id="api-key" value="sk_test_1234567890abcdef1234567890abcdef" readOnly className="font-mono text-sm bg-slate-50 text-slate-500" />
                  <Button variant="outline">Copy</Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Use this key to authenticate with our API. Do not share it publicly.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-200 pt-6">
              <Button variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 border">
                Revoke Key
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}