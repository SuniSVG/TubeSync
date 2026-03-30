'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UploadCloud, FileVideo, X, CheckCircle2, Loader2, AlertCircle,
  Clock, Repeat2, Shuffle, Zap, Tag, FileText,
  CalendarDays, Hash, Info, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ScheduleType = 'single' | 'recurring' | 'continuous' | 'random';

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string; icon: any; desc: string }[] = [
  { value: 'single',     label: 'Đơn lần',    icon: CalendarDays, desc: 'Đăng 1 lần vào thời điểm cụ thể' },
  { value: 'recurring',  label: 'Lặp lại',    icon: Repeat2,      desc: 'Đăng theo chu kỳ ngày/tuần/tháng' },
  { value: 'continuous', label: 'Liên tục',   icon: Clock,        desc: 'Đăng mỗi X giờ tự động' },
  { value: 'random',     label: 'Ngẫu nhiên', icon: Shuffle,      desc: 'Đăng ngẫu nhiên trong khoảng thời gian' },
];

// ─── File size formatter ──────────────────────────────────────────────────────
const fmtSize = (bytes: number) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = ['Chọn file', 'Metadata', 'Lịch đăng', 'Xác nhận'];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${i < current ? 'bg-slate-900 text-white' : i === current ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-300' : 'text-slate-400'}`}>
            <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] ${i < current ? 'bg-white text-slate-900' : i === current ? 'bg-slate-300 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
              {i < current ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 mx-1 ${i < current ? 'bg-slate-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UploadPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState('');

  // Publish options
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Metadata state
  const [titleTemplate, setTitleTemplate] = useState('{filename}');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const [scheduleType, setScheduleType] = useState<ScheduleType>('single');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [recurringInterval, setRecurringInterval] = useState('daily');
  const [continuousIntervalHours, setContinuousIntervalHours] = useState('6');
  const [randomStartDate, setRandomStartDate] = useState('');
  const [randomEndDate, setRandomEndDate] = useState('');

  // Derived step
  const step = files.length === 0 ? 0 : !showPublishOptions ? 1 : publishImmediately ? 3 : 2;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setUploadSuccess(false);
    setUploadError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] },
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const fetchChannel = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('youtube_channels')
          .select('id, thumbnail_url')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!data) {
            toast({
              variant: 'destructive',
              title: 'Chưa kết nối kênh YouTube',
              description: 'Vui lòng vào mục Cài đặt để kết nối tài khoản Google trước khi upload.',
            });
            setChannel(null);
        } else {
            setChannel(data);
        }
      }
    };
    fetchChannel();
  }, []); // dependencies empty để chỉ chạy 1 lần khi load trang

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('tags_library')
        .select('tag_name')
        .order('usage_count', { ascending: false })
        .limit(10);
      if (data) setSuggestedTags(data.map((t: any) => t.tag_name));
    };
    fetchTags();
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadError(null);

    try {
      if (!channel?.id) {
        toast({
          variant: 'destructive',
          title: 'Chưa sẵn sàng',
          description: 'Bạn chưa kết nối kênh YouTube. Hãy vào phần Cài đặt để thực hiện.',
        });
        setIsUploading(false);
        return;
      }

      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session) {
        toast({ variant: 'destructive', title: 'Yêu cầu đăng nhập', description: 'Vui lòng đăng nhập lại để tiếp tục.' });
        setIsUploading(false);
        return;
      }

      // 1. Validation trước khi chạy vòng lặp
      if (!publishImmediately) {
        if (scheduleType === 'single' && (!scheduleDate || !scheduleTime)) {
          toast({
            variant: 'destructive',
            title: 'Thiếu thông tin',
            description: 'Vui lòng điền đầy đủ ngày và giờ lên lịch.',
          });
          setIsUploading(false);
          return;
        }
        if (scheduleType === 'random' && (!randomStartDate || !randomEndDate)) {
          toast({
            variant: 'destructive',
            title: 'Thiếu thông tin',
            description: 'Vui lòng chọn khoảng thời gian cho chế độ ngẫu nhiên.',
          });
          setIsUploading(false);
          return;
        }
      }

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api-production-2a9a.up.railway.app';
      // Chuẩn hóa URL để không bị double slash
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const backendUrl = `${cleanBaseUrl}/upload`;

      const totalFiles = files.length;
      let completedFiles = 0;
      const batchTimestamp = new Date(); // Dùng làm mốc cho Immediate mode

      for (const file of files) {
        setCurrentFile(file.name);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', session.user.id);

        const response = await fetch(backendUrl, {
          method: 'POST',
          mode: 'cors',
          body: formData,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        const uploadResult = await response.json().catch(() => ({ success: false, error: 'Phản hồi server không hợp lệ' }));
        if (!response.ok || !uploadResult.success) {
          throw new Error(uploadResult.error || `Lỗi server (${response.status})`);
        }

        let finalTitle = titleTemplate.replace('{filename}', file.name.replace(/\.[^/.]+$/, ''));
        if (finalTitle.length > 100) finalTitle = finalTitle.substring(0, 100);

        const tagArray = tags
          .split(/[\s,]+/)
          .map(t => t.trim())
          .filter(t => t !== '')
          .map(t => (t.startsWith('#') ? t : `#${t}`));

        let videoData: any = {
          user_id: session.user.id,
          channel_id: channel.id,
          title: finalTitle,
          description,
          tags: tagArray,
          drive_file_id: uploadResult.fileId,
          app_uploaded: true,
          drive_file_url: uploadResult.fileUrl,
        };

        if (publishImmediately) {
          // Fix lỗi Immediate: Cộng thêm 2 giây cho mỗi file để tránh trùng timestamp trong batch
          const staggeredDate = new Date(batchTimestamp.getTime() + (completedFiles * 2000));
          videoData.status = 'pending';
          videoData.scheduled_for = staggeredDate.toISOString();
          videoData.publish_now = true;
          videoData.schedule_type = 'immediate';
        } else {
          let scheduledFor = new Date().toISOString();
          if (scheduleDate && scheduleTime) {
            scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
          } else if (randomStartDate && scheduleType === 'random') {
            scheduledFor = new Date(randomStartDate).toISOString();
          }
          videoData.status = 'pending';
          videoData.scheduled_for = scheduledFor;
          videoData.schedule_type = scheduleType;
          videoData.recurring_interval = scheduleType === 'recurring' ? recurringInterval : null;
          videoData.continuous_interval_hours = scheduleType === 'continuous' ? parseInt(continuousIntervalHours) : null;
          videoData.random_start_date = scheduleType === 'random' && randomStartDate ? new Date(randomStartDate).toISOString() : null;
          videoData.random_end_date = scheduleType === 'random' && randomEndDate ? new Date(randomEndDate).toISOString() : null;
        }

        const { error: dbError } = await supabase.from('videos').insert(videoData);
        if (dbError) throw new Error(dbError.message);

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      setUploadSuccess(true);
      setFiles([]);
      setShowPublishOptions(false);
      setCurrentFile('');
      setTitleTemplate('{filename}');
      setDescription('');
      setTags('');
      setScheduleType('single');
      setScheduleDate('');
      setScheduleTime('');
      setRecurringInterval('daily');
      setContinuousIntervalHours('6');
      setRandomStartDate('');
      setRandomEndDate('');
      setPublishImmediately(false);
    } catch (error: any) {
      console.error('Upload Error:', error);
      let errorMsg = error.message;

      // Xử lý lỗi mất kết nối Backend
      if (errorMsg === 'Failed to fetch' || error.name === 'TypeError') {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api-production-2a9a.up.railway.app';
        errorMsg = `Không thể kết nối tới Server tại địa chỉ: ${baseUrl}. Hãy kiểm tra xem Backend đã được deploy thành công chưa.`;
      }

      setUploadError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Lỗi Upload',
        description: errorMsg,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bulk Upload</h2>
          <p className="text-slate-500 text-sm mt-0.5">Upload video lên Google Drive và đồng bộ metadata về Supabase.</p>
        </div>
        <StepIndicator current={step} />
      </div>

      {/* ── Drop Zone ── */}
      <div
        {...getRootProps()}
        className={`relative group rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden
          ${isDragActive
            ? 'border-slate-900 bg-slate-900/5 scale-[1.01]'
            : files.length > 0
              ? 'border-slate-300 bg-slate-50/60 py-6'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white py-14'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />

        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className={`rounded-2xl p-5 transition-colors ${isDragActive ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600'} shadow-sm`}>
              <UploadCloud className="h-10 w-10" />
            </div>
            {isDragActive ? (
              <p className="text-lg font-semibold text-slate-900">Thả file vào đây…</p>
            ) : (
              <>
                <div>
                  <p className="text-base font-semibold text-slate-700">Kéo & thả video vào đây</p>
                  <p className="text-sm text-slate-400 mt-1">hoặc <span className="text-slate-700 font-medium underline underline-offset-2">click để chọn file</span></p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {['MP4', 'MOV', 'AVI', 'MKV'].map(f => (
                    <span key={f} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full font-mono">{f}</span>
                  ))}
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-full">tối đa 10GB</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="px-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                <UploadCloud className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{files.length} file đã chọn</p>
                <p className="text-xs text-slate-400">{fmtSize(totalSize)} tổng · Click để thêm file</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium border border-dashed border-slate-300 px-3 py-1.5 rounded-lg">+ Thêm file</span>
          </div>
        )}
      </div>

      {/* ── File List ── */}
      {files.length > 0 && !uploadSuccess && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                <FileVideo className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmtSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Progress ── */}
      {isUploading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {publishImmediately ? 'Đang đăng ngay lên YouTube…' : 'Đang upload & lên lịch…'}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{currentFile || 'Đang xử lý…'}</p>
            </div>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-center">Đừng đóng tab này trong khi đang upload</p>
        </div>
      )}

      {/* ── Success Banner ── */}
      {uploadSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Upload thành công!</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              File đã được lưu vào Google Drive và metadata đã đồng bộ về Supabase.
            </p>
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {uploadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-900">Upload thất bại</p>
            <p className="text-sm text-red-700 mt-0.5 break-words">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Metadata Form ── */}
      {files.length > 0 && !uploadSuccess && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Section header */}
          <div className={cn("flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60", isUploading && "opacity-50 pointer-events-none")}>
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Metadata cho tất cả video</span>
            <span className="ml-auto text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{files.length} file</span>
          </div>

          <div className={cn("p-6 space-y-5", isUploading && "opacity-50 pointer-events-none")}>
            {/* Title Template */}
            <div className="space-y-1.5">
              <Label htmlFor="title-template" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Template tiêu đề
              </Label>
              <div className="relative">
                <Input
                  id="title-template"
                  value={titleTemplate}
                  onChange={e => setTitleTemplate(e.target.value)}
                  placeholder="{filename} | Kênh của tôi"
                  className="pr-10 font-mono text-sm"
                />
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                Dùng <code className="px-1 bg-slate-100 rounded text-slate-600 font-mono">{'{'+'filename'+'}'}</code> để chèn tên file gốc (không có đuôi).
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Mô tả mặc định
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Nhập mô tả cho các video này…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="tags" className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Tags
              </Label>
              <div className="relative">
                <Input
                  id="tags"
                  value={tags}
                  onChange={e => { setTags(e.target.value); setShowTagSuggestions(true); }}
                  onFocus={() => setShowTagSuggestions(true)}
                  placeholder="#vlog #tech #review hoặc vlog, tech…"
                  className="text-sm"
                />
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              </div>

              {showTagSuggestions && suggestedTags.length > 0 && (
                <div className="absolute z-50 w-full top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Tag phổ biến</p>
                    <button onClick={() => setShowTagSuggestions(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Đóng</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTags.filter(t => !tags.includes(t)).map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const currentTags = tags.split(/[\s,]+/).map(t => t.trim()).filter(t => t);
                          const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
                          if (!currentTags.includes(normalizedTag)) {
                            setTags([...currentTags, normalizedTag].join(' ') + ' ');
                          }
                        }}
                        className="text-xs bg-slate-100 hover:bg-slate-900 hover:text-white px-2.5 py-1 rounded-full transition-colors font-medium"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Schedule Options ── */}
          <div className="border-t border-slate-100">
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-50/60">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Lịch đăng</span>
            </div>

            <div className={cn("p-6 space-y-5", isUploading && "opacity-50 pointer-events-none")}>
              {/* Schedule type selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SCHEDULE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const active = scheduleType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setScheduleType(opt.value)}
                      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                      <span className={`text-[10px] leading-tight ${active ? 'text-slate-300' : 'text-slate-400'}`}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Schedule config */}
              {scheduleType === 'single' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Ngày đăng</Label>
                    <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Giờ đăng</Label>
                    <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              )}

              {scheduleType === 'recurring' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Chu kỳ</Label>
                    <Select value={recurringInterval} onValueChange={v => setRecurringInterval(v || 'daily')}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Mỗi ngày</SelectItem>
                        <SelectItem value="weekly">Mỗi tuần</SelectItem>
                        <SelectItem value="monthly">Mỗi tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Giờ đăng trong ngày</Label>
                    <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              )}

              {scheduleType === 'continuous' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Đăng mỗi X giờ</Label>
                  <div className="relative max-w-[200px]">
                    <Input
                      type="number" min="1" max="168"
                      value={continuousIntervalHours}
                      onChange={e => setContinuousIntervalHours(e.target.value)}
                      className="h-9 text-sm pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">giờ</span>
                  </div>
                  <p className="text-xs text-slate-400">Worker sẽ tự động theo mốc giờ đã cài đặt trong Settings.</p>
                </div>
              )}

              {scheduleType === 'random' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Từ ngày & giờ</Label>
                    <Input type="datetime-local" value={randomStartDate} onChange={e => setRandomStartDate(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Đến ngày & giờ</Label>
                    <Input type="datetime-local" value={randomEndDate} onChange={e => setRandomEndDate(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Action Bar ── */}
      {files.length > 0 && !uploadSuccess && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Left summary */}
          <div className="flex-1 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{files.length} video</span>
            {' '}·{' '}
            <span>{fmtSize(totalSize)}</span>
            {publishImmediately && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Zap className="h-3 w-3" /> Đăng ngay
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="flex gap-2">
            {showPublishOptions && (
              <Button
                variant="ghost"
                className="h-9 gap-1.5 text-slate-500 hover:text-red-600"
                onClick={() => { setShowPublishOptions(false); setPublishImmediately(false); }}
                disabled={isUploading}
              >
                <X className="h-4 w-4" /> Hủy
              </Button>
            )}

            {!showPublishOptions ? (
              <>
                <Button
                  variant="ghost"
                  className="h-9 gap-1.5 flex-1 sm:flex-none text-slate-600 border-slate-200"
                  disabled={isUploading}
                  onClick={() => { setPublishImmediately(false); setShowPublishOptions(true); }}
                >
                  <CalendarDays className="h-4 w-4" /> Lên Lịch
                </Button>
                <Button
                  className="h-9 gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 flex-1 sm:flex-none font-semibold"
                  disabled={isUploading}
                  onClick={() => { setPublishImmediately(true); setShowPublishOptions(true); }}
                >
                  <Zap className="h-4 w-4" /> Đăng Ngay
                </Button>
              </>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className={cn("h-9 gap-1.5 font-semibold px-6 transition-all", publishImmediately ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white")}
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
                ) : publishImmediately ? (
                  <><Zap className="h-3.5 w-3.5 fill-current" /> Xác nhận đăng ngay</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Xác nhận lên lịch</>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}