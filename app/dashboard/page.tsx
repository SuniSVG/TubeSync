'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Youtube, UploadCloud, PlaySquare, Clock, CheckCircle2, AlertCircle, Tag, Copy, ExternalLink, Loader2, Video, Trash2, Zap, Link as LinkIcon, History, Calendar, Users, Settings, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TabsContent } from '@/components/ui/tabs';
import DashboardTabs from '@/components/dashboard-tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

export default function ProfileStudioPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Preview Modal State
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  // Quick Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      // Fetch Profile (Dùng maybeSingle để không văng lỗi nếu user chưa có profile)
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      setProfile(profileData ? { ...profileData, email: session.user.email } : { email: session.user.email });

      // Fetch Channel (Dùng maybeSingle để không văng lỗi nếu user chưa kết nối kênh)
      const { data: channelData } = await supabase.from('youtube_channels').select('*').eq('user_id', session.user.id).maybeSingle();
      setChannel(channelData || null);

      // Fetch Videos
      const { data: videosData } = await supabase.from('videos').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (videosData) setVideos(videosData);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chủ:", error);
    } finally {
      setLoading(false); // Đảm bảo luôn tắt được trạng thái Loading dù thành công hay lỗi
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- QUICK UPLOAD LOGIC ---
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    if (acceptedFiles.length > 0 && !title) {
      setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, "")); // Default title to filename
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] },
    maxFiles: 1
  });

  const handleQuickUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Vui lòng đăng nhập.");
      
      if (!channel) {
        toast({
          variant: "destructive",
          title: "Chưa kết nối kênh",
          description: "Vui lòng vào Cài đặt để kết nối YouTube trước khi upload.",
        });
        return;
      }

      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session.user.id);
      
      setUploadProgress(40);
      
      // Tải lên Backend Node.js
      const backendUrl = 'https://127.0.0.1:3001/upload';
      const response = await fetch(backendUrl, {
        method: 'POST',
        mode: 'cors',
        body: formData,
        keepalive: true,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const uploadResult = await response.json();
      
      if (!uploadResult?.success) throw new Error(uploadResult?.error || 'Lỗi tải lên Google Drive.');
      setUploadProgress(80);
      //tubesync@gen-lang-client-0310053095.iam.gserviceaccount.com
      // Insert to Supabase with publish_now = true
      
      // Đảm bảo tiêu đề không quá 100 ký tự
      const finalTitle = title.length > 100 ? title.substring(0, 100) : title;
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

      const { error: dbError } = await supabase.from('videos').insert({
        user_id: session.user.id,
        channel_id: channel.id,
        title: finalTitle,
        description: description,
        tags: tagArray,
        drive_file_id: uploadResult.fileId,
        drive_file_url: uploadResult.fileUrl,
        app_uploaded: true,
        status: 'pending',
        publish_now: true,
        schedule_type: 'single',
        scheduled_for: new Date().toISOString()
      });

      if (dbError) throw new Error(dbError.message);

      setUploadProgress(100);
      setIsUploadModalOpen(false);
      setFiles([]);
      setTitle('');
      setDescription('');
      setTags('');
      fetchData(); // Refresh list
      toast({
        title: "Tải lên thành công",
        description: "Video đã được đưa vào hàng đợi Đăng Ngay!",
      });
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi upload",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // --- PUBLISH NOW LOGIC ---
  const handlePublishNow = async (e: React.MouseEvent, video: any) => {
    e.stopPropagation();
    
    if (!channel) {
      toast({
        variant: "destructive",
        title: "Lỗi kết nối",
        description: "Không tìm thấy kênh. Vui lòng kiểm tra lại cài đặt.",
      });
      return;
    }

    if (!window.confirm(`Đăng video "${video.title}" ngay lập tức?`)) return;

    setPublishingId(video.id);
    try {
      const { error } = await supabase.from('videos').update({
        status: 'pending',
        publish_now: true,
        channel_id: channel.id,
        scheduled_for: new Date().toISOString(),
      }).eq('id', video.id);

      if (error) throw new Error(error.message);
      
      // Cập nhật UI ngay lập tức
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: 'pending', publish_now: true } : v));
      toast({
        title: "Đã yêu cầu đăng",
        description: `Video "${video.title}" đã được ưu tiên đẩy lên hàng đợi.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi thực hiện",
        description: error.message,
      });
    } finally {
      setPublishingId(null);
    }
  };

  // --- DELETE LOGIC ---
  const handleDeleteVideo = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài làm mở Modal Preview
    if (!window.confirm('Bạn có chắc chắn muốn xóa video này khỏi hệ thống?')) return;
    
    try {
      const { error } = await supabase.from('videos').delete().eq('id', videoId);
      if (error) throw new Error(error.message);
      fetchData(); // Tải lại danh sách sau khi xóa thành công
      toast({
        title: "Đã xóa video",
        description: "Video đã được gỡ bỏ khỏi hệ thống.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi khi xóa",
        description: error.message,
      });
    }
  };

  // --- STATS ---
  const stats = {
    total: videos.length,
    uploaded: videos.filter(v => v.status === 'uploaded').length,
    pending: videos.filter(v => v.status === 'pending' || v.status === 'ready_to_publish').length,
    failed: videos.filter(v => v.status === 'failed').length
  };

  // Analytics Logic - Real data calculations
  const successRate = stats.total > 0 ? (stats.uploaded / stats.total) * 100 : 0;
  const today = new Date().toISOString().split('T')[0];
  const uploadsToday = videos.filter(v => v.created_at.startsWith(today)).length;
  
  const getAnalyticsData = () => {
    // Phân bổ loại lịch đăng (Real data)
    const scheduleDist = {
      immediate: videos.filter(v => v.schedule_type === 'immediate').length,
      single: videos.filter(v => v.schedule_type === 'single').length,
      recurring: videos.filter(v => v.schedule_type === 'recurring').length,
      other: videos.filter(v => !['immediate', 'single', 'recurring'].includes(v.schedule_type)).length
    };

    return { scheduleDist };
  };

  const analytics = getAnalyticsData();

  // Real Tag Analytics
  const tagCounts: Record<string, number> = videos.flatMap(v => v.tags || []).reduce((acc: any, tag: string) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  const topTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
  const maxTagCount = topTags.length > 0 ? topTags[0][1] : 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Đã Đăng</Badge>;
      case 'pending': 
      case 'ready_to_publish': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Clock className="w-3 h-3 mr-1" /> Đang Chờ</Badge>;
      case 'processing': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang Xử Lý</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertCircle className="w-3 h-3 mr-1" /> Thất Bại</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {channel?.avatar_url ? (
              <img src={channel.avatar_url} alt="Channel Avatar" className="w-full h-full object-cover" />
            ) : (
              <Youtube className="w-10 h-10 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{channel?.channel_name || 'Chưa kết nối kênh'}</h1>
              {!channel && (
                <Link href="/dashboard/settings">
                  <Button variant="link" className="text-red-600 p-0 h-auto flex items-center gap-1 text-sm"> <LinkIcon className="w-3 h-3" /> Kết nối ngay</Button>
                </Link>
              )}
            </div>
            <p className="text-slate-500">{profile?.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="uppercase text-xs tracking-wider font-semibold bg-slate-100">
                Gói {profile?.tier || 'Starter'}
              </Badge>
              <Badge variant="outline" className="text-xs text-slate-600">
                Đã dùng: {profile?.quota_used || 0}/{profile?.quota_limit || 5} Quota
              </Badge>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-6 shadow-lg shadow-red-500/20 shrink-0 w-full md:w-auto text-lg"
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          Upload & Đăng Ngay
        </Button>
      </div>

      <DashboardTabs>
        <TabsContent value="overview" className="space-y-6 outline-none mt-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="p-3 bg-slate-100 rounded-lg"><Video className="w-6 h-6 text-slate-600"/></div><div><p className="text-sm font-medium text-slate-500">Tổng Video</p><h3 className="text-2xl font-bold">{stats.total}</h3></div></div></CardContent></Card>
            <Card className="bg-white"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="p-3 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-6 h-6 text-emerald-600"/></div><div><p className="text-sm font-medium text-slate-500">Đã Đăng</p><h3 className="text-2xl font-bold">{stats.uploaded}</h3></div></div></CardContent></Card>
            <Card className="bg-white"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Clock className="w-6 h-6 text-blue-600"/></div><div><p className="text-sm font-medium text-slate-500">Đang Chờ</p><h3 className="text-2xl font-bold">{stats.pending}</h3></div></div></CardContent></Card>
            <Card className="bg-white"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="p-3 bg-red-100 rounded-lg"><AlertCircle className="w-6 h-6 text-red-600"/></div><div><p className="text-sm font-medium text-slate-500">Thất Bại</p><h3 className="text-2xl font-bold">{stats.failed}</h3></div></div></CardContent></Card>
          </div>

          {/* Video Studio List (Moved from original) */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Danh Sách Video Mới Nhất</h2>
            {loading ? (
              <div className="text-center py-10 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Đang tải...</div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Render video rows same as before */}
                {videos.slice(0, 10).map(video => (
                   <div key={video.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 cursor-pointer border-b" onClick={() => setSelectedVideo(video)}>
                      <div className="col-span-6 flex items-center gap-3">
                         <div className="w-12 h-8 bg-slate-200 rounded shrink-0 flex items-center justify-center"><PlaySquare className="w-4 h-4 text-slate-400"/></div>
                         <span className="font-medium truncate">{video.title}</span>
                      </div>
                      <div className="col-span-3">{getStatusBadge(video.status)}</div>
                      <div className="col-span-3 text-right flex justify-end gap-1">
                         {video.status !== 'uploaded' && (
                           <Button 
                            variant="default" 
                            size="sm" 
                            disabled={publishingId === video.id}
                            title="Ưu tiên đăng ngay lập tức"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-8 px-3 text-xs"
                            onClick={(e) => handlePublishNow(e, video)}
                           >
                            {publishingId === video.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 mr-1 fill-current"/>
                            )}
                            {publishingId === video.id ? 'Đang xử lý...' : 'Đăng Ngay'}
                           </Button>
                         )}
                         <Button variant="ghost" size="icon" onClick={(e) => handleDeleteVideo(e, video.id)}><Trash2 className="w-4 h-4 text-slate-400"/></Button>
                      </div>
                   </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 outline-none mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chart 1: Success Rate */}
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Tỷ Lệ Thành Công</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden"><div className="bg-emerald-500 h-2 transition-all duration-1000" style={{width: `${successRate}%`}}></div></div>
              </CardContent>
            </Card>
            {/* Chart 2: Today Uploads */}
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Upload Hôm Nay</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{uploadsToday} <span className="text-xs text-slate-500">video</span></div>
                <p className="text-xs text-slate-500 mt-1">Hạn mức còn lại: {profile?.quota_limit - profile?.quota_used}</p>
              </CardContent>
            </Card>
            {/* Chart 3: Schedule Types */}
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Loại Lịch Đăng</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex gap-1 h-2 rounded-full overflow-hidden mt-4">
                  <div className="bg-red-500" style={{width: `${(analytics.scheduleDist.immediate/stats.total)*100}%`}}></div>
                  <div className="bg-blue-500" style={{width: `${(analytics.scheduleDist.single/stats.total)*100}%`}}></div>
                  <div className="bg-purple-500" style={{width: `${(analytics.scheduleDist.recurring/stats.total)*100}%`}}></div>
                </div>
                <div className="flex justify-between text-[10px] mt-2">
                  <span>Ngay(R)</span><span>Đơn(B)</span><span>Lặp(P)</span>
                </div>
              </CardContent>
            </Card>
            {/* Chart 4: Quota Rings */}
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Sử Dụng Quota</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-16 h-16"><circle className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32"/><circle className="text-red-600" strokeWidth="4" strokeDasharray={175} strokeDashoffset={175 - (175 * (profile?.quota_used || 0) / (profile?.quota_limit || 1))} strokeLinecap="round" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32"/></svg>
                  <span className="absolute text-[10px] font-bold">{profile?.quota_used}/{profile?.quota_limit}</span>
                </div>
              </CardContent>
            </Card>

            {/* Chart 5: Status Comparison */}
            <Card className="md:col-span-2"><CardHeader><CardTitle className="text-sm">Video Processing Status</CardTitle></CardHeader>
              <CardContent className="h-[200px] flex items-end gap-2 pb-6 px-6">
                <div className="flex-1 bg-emerald-100 rounded-t-md relative group" style={{height: `${(stats.uploaded/stats.total)*100}%`}}><div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white p-1 rounded text-xs">Đã Đăng: {stats.uploaded}</div></div>
                <div className="flex-1 bg-blue-100 rounded-t-md relative group" style={{height: `${(stats.pending/stats.total)*100}%`}}><div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white p-1 rounded text-xs">Đang Chờ: {stats.pending}</div></div>
                <div className="flex-1 bg-red-100 rounded-t-md relative group" style={{height: `${(stats.failed/stats.total)*100}%`}}><div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white p-1 rounded text-xs">Thất Bại: {stats.failed}</div></div>
              </CardContent>
            </Card>

            {/* Chart 6: Tag Analytics */}
            <Card className="md:col-span-2"><CardHeader><CardTitle className="text-sm">Top Tags Được Sử Dụng</CardTitle></CardHeader>
              <CardContent className="pb-6">
                 <div className="space-y-2">
                   {topTags.map(([tag, count], i) => (
                     <div key={i} className="flex items-center justify-between text-xs">
                       <span className="font-medium">#{tag} <span className="text-slate-400 font-normal">({count})</span></span>
                       <div className="w-32 bg-slate-100 h-1.5 rounded-full"><div className="bg-red-500 h-1.5 rounded-full" style={{width: `${(count/maxTagCount)*100}%`}}></div></div>
                     </div>
                   ))}
                 </div>
              </CardContent>
            </Card>

            {/* Chart 7: Error Health Stat */}
            <Card className="md:col-span-2"><CardHeader><CardTitle className="text-sm">Sức Khỏe Hệ Thống</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center h-[100px]">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${stats.failed === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{stats.failed === 0 ? 'Ổn Định' : `Lỗi: ${stats.failed}`}</div>
                  <p className="text-xs text-slate-500 mt-1">Dựa trên kết quả chạy worker 24h qua</p>
                </div>
              </CardContent>
            </Card>

            {/* Chart 8: Activity Breakdown */}
            <Card className="md:col-span-2"><CardHeader><CardTitle className="text-sm">Phân Bổ Hoạt Động</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex justify-between text-xs"><span>Upload Tức Thì</span><span className="font-bold">{videos.filter(v => v.publish_now).length}</span></div>
                <div className="flex justify-between text-xs border-t pt-2"><span>Lên Lịch Trước</span><span className="font-bold">{videos.filter(v => !v.publish_now).length}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guide" className="outline-none mt-6">
          <Card>
            <CardHeader><CardTitle>Hướng Dẫn Vận Hành TubeSync Pro</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-slate-50">
                <h4 className="font-bold mb-2">Bước 1: Kết nối Google Drive</h4>
                <p className="text-sm">Đảm bảo thư mục video trên Drive của bạn có quyền "Anyone with the link can view".</p>
              </div>
              <div className="p-4 border rounded-lg bg-slate-50">
                <h4 className="font-bold mb-2">Bước 2: Cài đặt Python Worker</h4>
                <p className="text-sm">Tải code worker từ repo, cài `requirements.txt` và chạy lệnh `python youtube_uploader.py` trên server của bạn.</p>
              </div>
              <div className="p-4 border rounded-lg bg-slate-50">
                <h4 className="font-bold mb-2">Bước 3: Lên lịch video</h4>
                <p className="text-sm">Sử dụng chức năng "Upload & Đăng Ngay" hoặc "Lên Lịch" trong Studio. Worker sẽ quét dữ liệu mỗi 5 phút.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-slate-400"/> Kênh Đang Kết Nối</CardTitle></CardHeader>
              <CardContent>
                {channel ? (
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50">
                    <div className="flex items-center gap-4">
                      <img src={channel.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
                      <div>
                        <h3 className="font-bold text-lg">{channel.channel_name}</h3>
                        <p className="text-sm text-slate-500">ID: {channel.youtube_channel_id}</p>
                        <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-200 bg-emerald-50">Đang hoạt động</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-slate-400 uppercase font-bold mb-1">Cập nhật lúc</p>
                       <p className="text-sm font-medium">{new Date(channel.updated_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Youtube className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500">Chưa có kênh nào được kết nối.</p>
                    <Link href="/dashboard/settings"><Button variant="outline" className="mt-4">Kết nối ngay</Button></Link>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Thống Kê Kênh</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-slate-500 text-sm">Tổng Video Đã Đăng</span>
                  <span className="font-bold">{stats.uploaded}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-slate-500 text-sm">Video Trong Hàng Đợi</span>
                  <span className="font-bold">{stats.pending}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-slate-500 text-sm">Tỷ Lệ Thành Công</span>
                  <span className="font-bold text-emerald-600">{successRate.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Card className="border-2 border-red-100 bg-red-50/30">
            <CardContent className="p-10 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UploadCloud className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Sẵn Sàng Đăng Video?</h2>
                <p className="text-slate-600 mb-8">Bạn có thể đăng ngay một video đơn lẻ hoặc sử dụng công cụ Bulk Upload để lên lịch hàng loạt hàng trăm video cùng lúc.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700" onClick={() => setIsUploadModalOpen(true)}>
                    <Zap className="w-4 h-4 mr-2" /> Đăng Nhanh
                  </Button>
                  <Link href="/dashboard/upload">
                    <Button size="lg" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                       Công cụ Bulk Upload <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-slate-400"/> Lịch Trình Đang Chờ</CardTitle>
              <Badge variant="secondary">{stats.pending} Video sắp đăng</Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[400px]">Video</TableHead>
                      <TableHead>Loại Lịch</TableHead>
                      <TableHead>Thời Gian Dự Kiến</TableHead>
                      <TableHead className="text-right">Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.filter(v => v.status === 'pending' || v.status === 'ready_to_publish').length > 0 ? (
                      videos.filter(v => v.status === 'pending' || v.status === 'ready_to_publish').map(video => (
                        <TableRow key={video.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedVideo(video)}>
                          <TableCell className="font-medium flex items-center gap-2">
                             <PlaySquare className="w-4 h-4 text-slate-400"/> {video.title}
                          </TableCell>
                          <TableCell className="capitalize text-slate-500 text-xs">{video.schedule_type}</TableCell>
                          <TableCell className="text-xs font-mono">{new Date(video.scheduled_for).toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="sm" className="text-emerald-600 h-8 px-2" onClick={(e) => handlePublishNow(e, video)}>
                               <Zap className="w-3.5 h-3.5 mr-1 fill-current"/> Đăng ngay
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 italic">Không có video nào đang đợi lịch đăng.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-slate-400"/> Nhật Ký Hoạt Động</CardTitle></CardHeader>
            <CardContent>
               <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Thời Gian</TableHead>
                        <TableHead>Video</TableHead>
                        <TableHead>Kết Quả</TableHead>
                        <TableHead>Chi Tiết</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos.filter(v => v.status === 'uploaded' || v.status === 'failed').slice(0, 15).map(video => (
                        <TableRow key={video.id}>
                          <TableCell className="text-xs text-slate-500">{new Date(video.updated_at || video.created_at).toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="font-medium text-sm">{video.title}</TableCell>
                          <TableCell>{getStatusBadge(video.status)}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs text-slate-500">
                             {video.status === 'uploaded' ? `YouTube ID: ${video.youtube_video_id}` : video.error_message || 'Không rõ nguyên nhân'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="max-w-2xl">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-slate-400"/> Tổng Quan Tài Khoản</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-slate-500 uppercase mb-1">Gói Hiện Tại</p>
                    <p className="font-bold text-lg text-red-600">{profile?.tier?.toUpperCase() || 'STARTER'}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-slate-500 uppercase mb-1">Email Tài Khoản</p>
                    <p className="font-medium text-sm truncate">{profile?.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <Label className="text-sm font-bold">Hạn mức Quota (Video/Tháng)</Label>
                    <span className="text-sm font-bold">{profile?.quota_used || 0} / {profile?.quota_limit || 5}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${((profile?.quota_used || 0) / (profile?.quota_limit || 5)) > 0.8 ? 'bg-orange-500' : 'bg-red-600'}`} 
                      style={{width: `${((profile?.quota_used || 0) / (profile?.quota_limit || 1)) * 100}%`}}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">* Hạn mức Quota sẽ được làm mới vào ngày đầu tiên của mỗi tháng.</p>
                </div>

                <div className="pt-4 border-t">
                   <Link href="/dashboard/settings">
                      <Button className="w-full" variant="outline">
                         Quản Lý Chi Tiết Cài Đặt <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                   </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </DashboardTabs>

      {/* Bottom spacing */}
      <div className="h-10" />

      {/* --- PREVIEW MODAL (YOUTUBE STUDIO STYLE) --- */}
      <Dialog open={!!selectedVideo} onOpenChange={(openVal) => !openVal && setSelectedVideo(null)}>
        <DialogContent className="max-w-7xl w-[95vw] p-0 overflow-hidden bg-slate-50">
          <DialogHeader className="sr-only">
            <DialogTitle>Video Preview</DialogTitle>
            <DialogDescription>Chi tiết và xem trước nội dung video đã chọn.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-5 md:h-[80vh]">
             {/* Left Side: Video Player */}
            <div className="md:col-span-3 bg-black flex flex-col justify-center relative">
              <div className="aspect-video w-full bg-slate-900 relative flex items-center justify-center">
                {selectedVideo?.status === 'uploaded' && selectedVideo?.youtube_video_id ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${selectedVideo.youtube_video_id}?autoplay=1`} 
                    className="w-full h-full absolute inset-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : selectedVideo?.drive_file_id ? (
                  <iframe 
                    src={`https://drive.google.com/file/d/${selectedVideo.drive_file_id}/preview`} 
                    className="w-full h-full absolute inset-0 border-0"
                    allow="autoplay"
                  ></iframe>
                ) : (
                  <div className="text-white/50 flex flex-col items-center">
                    <AlertCircle className="w-10 h-10 mb-2" /> Không thể tải Video Preview
                  </div>
                )}
              </div>
              <div className="p-4 bg-[#18181B] text-white absolute bottom-0 w-full border-t border-white/10">
                <p className="text-xs text-white/50 mb-1">Video Link</p>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={selectedVideo?.youtube_video_id ? `https://youtu.be/${selectedVideo.youtube_video_id}` : selectedVideo?.drive_file_url || ''} 
                    className="bg-white/10 border-white/20 text-white h-8 text-sm"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20" onClick={() => navigator.clipboard.writeText(selectedVideo?.youtube_video_id ? `https://youtu.be/${selectedVideo.youtube_video_id}` : selectedVideo?.drive_file_url)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  {selectedVideo?.youtube_video_id && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20" onClick={() => window.open(`https://youtu.be/${selectedVideo.youtube_video_id}`, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Side: Details */}
            <div className="md:col-span-2 bg-white p-6 overflow-y-auto border-l border-slate-200">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-slate-900">Chi Tiết Video</h2>
                {selectedVideo && getStatusBadge(selectedVideo.status)}
              </div>
              
              <div className="space-y-6">
                <div>
                  <Label className="text-slate-500 text-xs uppercase tracking-wider mb-2 block">Tiêu Đề</Label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-900 font-medium">
                    {selectedVideo?.title}
                  </div>
                </div>
                
                <div>
                  <Label className="text-slate-500 text-xs uppercase tracking-wider mb-2 block">Mô Tả</Label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-sm whitespace-pre-wrap min-h-[100px] max-h-[200px] overflow-y-auto">
                    {selectedVideo?.description || <span className="text-slate-400 italic">Không có mô tả</span>}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-500 text-xs uppercase tracking-wider mb-2 block flex items-center gap-1"><Tag className="w-3 h-3"/> Thẻ (Tags)</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedVideo?.tags && selectedVideo.tags.length > 0 ? (
                      selectedVideo.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 font-normal">{tag}</Badge>
                      ))
                    ) : <span className="text-sm text-slate-400 italic">Không có thẻ</span>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Loại Lịch Đăng</p>
                      <p className="text-sm font-medium capitalize">{selectedVideo?.schedule_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Thời Gian</p>
                      <p className="text-sm font-medium">{new Date(selectedVideo?.scheduled_for).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                </div>

                {selectedVideo?.error_message && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                    <span>Lỗi: {selectedVideo.error_message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- QUICK UPLOAD MODAL --- */}
      <Dialog open={isUploadModalOpen} onOpenChange={(open) => !isUploading && setIsUploadModalOpen(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl"><UploadCloud className="w-5 h-5 mr-2 text-red-600" /> Upload & Đăng Ngay Lập Tức</DialogTitle>
            <DialogDescription>Video sẽ được lưu trữ và lên lịch đăng ngay lập tức trên kênh của bạn.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!files.length ? (
               <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
                 <input {...getInputProps()} />
                 <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                 <p className="text-sm font-medium text-slate-700">Kéo thả hoặc click chọn Video</p>
               </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Video className="w-6 h-6 text-red-600 shrink-0" />
                  <span className="text-sm font-medium truncate">{files[0].name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => !isUploading && setFiles([])} disabled={isUploading}>Đổi</Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tiêu Đề Video</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isUploading} placeholder="Nhập tiêu đề..." />
            </div>
            <div className="space-y-2">
              <Label>Mô Tả</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isUploading} rows={3} placeholder="Mô tả cho video này..." />
            </div>
            <div className="space-y-2">
              <Label>Thẻ (Tags)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} disabled={isUploading} placeholder="vlog, gaming, tech..." />
            </div>

            {isUploading && (
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Đang xử lý...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>Hủy</Button>
            <Button onClick={handleQuickUpload} disabled={files.length === 0 || isUploading || !title} className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]">
              {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang Xử Lý...</> : <><PlaySquare className="w-4 h-4 mr-2" /> 🚀 Đăng Ngay!</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

}
        