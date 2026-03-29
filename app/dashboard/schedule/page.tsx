'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search, MoreHorizontal, Calendar, Youtube,
  CheckCircle2, AlertCircle, Clock, List, Copy, Edit,
  Trash2, ExternalLink, ChevronLeft, ChevronRight,
  RefreshCw, LayoutGrid,
  Video, AlertTriangle, ChevronDown, ChevronUp,
  ChevronsLeft, ChevronsRight, Zap, X,
  SlidersHorizontal, ArrowUpDown, Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Video {
  id: string;
  title: string;
  status: 'pending' | 'uploaded' | 'failed';
  scheduled_for: string;
  channel_id?: string;
  drive_file_id?: string;
  file_path?: string;
  youtube_video_id?: string;
  schedule_type?: string;
  recurring_interval?: string;
  continuous_interval_hours?: number;
  random_start_date?: string;
  random_end_date?: string;
  publish_now?: boolean;
  created_at?: string;
}

type SortField = 'title' | 'scheduled_for' | 'status';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'calendar' | 'grid';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  uploaded: {
    label: 'Uploaded',
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-400',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    dot: 'bg-red-500',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (ds: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: false,
  }).format(new Date(ds));

const formatRelative = (ds: string) => {
  const diff = new Date(ds).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  const past = diff < 0;
  if (mins < 60) return past ? `${mins}m ago` : `in ${mins}m`;
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`;
  return past ? `${days}d ago` : `in ${days}d`;
};

const isOverdue = (ds: string, status: string) =>
  status === 'pending' && new Date(ds) < new Date();

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium px-2.5 py-0.5 ${cfg.classes}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

function StatCard({
  label, value, icon: Icon, color, trend,
}: {
  label: string; value: number; icon: any; color: string; trend?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
          {trend && <p className="mt-1 text-xs text-slate-400">{trend}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-0.5 w-full ${color.replace('bg-', 'bg-').replace('-500', '-200')}`} />
    </div>
  );
}

function Pagination({
  page, totalPages, pageSize, total,
  onPage, onPageSize,
}: {
  page: number; totalPages: number; pageSize: number; total: number;
  onPage: (p: number) => void; onPageSize: (s: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page number array with ellipsis
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result: (number | '...')[] = [1];
    if (page > 3) result.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) result.push(i);
    if (page < totalPages - 2) result.push('...');
    result.push(totalPages);
    return result;
  }, [page, totalPages]);

  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3 border-t border-slate-100">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Hiển thị</span>
        <Select value={String(pageSize)} onValueChange={v => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[70px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(s => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>/ trang &nbsp;·&nbsp; {from}–{to} trong {total} video</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(1)} disabled={page === 1}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(page - 1)} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
            : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className={`h-8 w-8 text-xs ${p === page ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}`}
                onClick={() => onPage(p as number)}
              >
                {p}
              </Button>
            )
        )}

        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(totalPages)} disabled={page === totalPages}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Video Card (Grid view) ───────────────────────────────────────────────────
function VideoCard({ video, onEdit, onDelete, onPublishNow }: {
  video: Video; onEdit: () => void; onDelete: () => void; onPublishNow: () => void;
}) {
  const overdue = isOverdue(video.scheduled_for, video.status);

  return (
    <div className={`group relative flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 ${overdue ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200'}`}>
      {overdue && (
        <div className="absolute top-2 right-2" title="Video này đã quá hạn đăng!">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <Video className="h-5 w-5 text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{video.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
            {video.drive_file_id ? `Drive: ${video.drive_file_id.substring(0, 12)}…` : video.file_path?.split(/[\\/]/).pop()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge status={video.status} />
        {video.scheduled_for && (
          <span className="text-xs text-slate-400 tabular-nums">{formatRelative(video.scheduled_for)}</span>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Calendar className="h-3.5 w-3.5" />
        <span>{video.scheduled_for ? formatDate(video.scheduled_for) : '—'}</span>
      </div>

      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5 mr-1" /> Sửa
        </Button>
        <Button
          variant="outline" size="sm"
          className="flex-1 h-8 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          onClick={onPublishNow}
        >
          <Zap className="h-3.5 w-3.5 mr-1" /> Đăng Ngay
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SchedulePage() {
  // Data
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sort
  const [sortField, setSortField] = useState<SortField>('scheduled_for');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Edit Dialog
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState('single');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [recurringInterval, setRecurringInterval] = useState('daily');
  const [continuousIntervalHours, setContinuousIntervalHours] = useState('6');
  const [randomStartDate, setRandomStartDate] = useState('');
  const [randomEndDate, setRandomEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); setRefreshing(false); return; }

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', session.user.id)
      .order('scheduled_for', { ascending: true });

    if (error) showToast('Lỗi tải dữ liệu!', 'error');
    else if (data) setVideos(data as Video[]);

    setLoading(false);
    setRefreshing(false);
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => fetchVideos(true), 60000);
    return () => clearInterval(id);
  }, [fetchVideos]);

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Filtering & Sorting ───────────────────────────────────────────────────
  const filteredVideos = useMemo(() => {
    let result = videos.filter(v => {
      const matchSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchType = scheduleTypeFilter === 'all' || v.schedule_type === scheduleTypeFilter;
      const date = new Date(v.scheduled_for);
      const matchStart = !dateRangeStart || date >= new Date(dateRangeStart);
      const matchEnd = !dateRangeEnd || date <= new Date(dateRangeEnd + 'T23:59:59');
      return matchSearch && matchStatus && matchType && matchStart && matchEnd;
    });

    result.sort((a, b) => {
      let av: any = a[sortField], bv: any = b[sortField];
      if (sortField === 'scheduled_for') { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [videos, searchTerm, statusFilter, scheduleTypeFilter, dateRangeStart, dateRangeEnd, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / pageSize));
  const paginatedVideos = filteredVideos.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, scheduleTypeFilter, dateRangeStart, dateRangeEnd, pageSize]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: videos.length,
    pending: videos.filter(v => v.status === 'pending').length,
    uploaded: videos.filter(v => v.status === 'uploaded').length,
    failed: videos.filter(v => v.status === 'failed').length,
    overdue: videos.filter(v => isOverdue(v.scheduled_for, v.status)).length,
  }), [videos]);

  // ─── Sort helper ───────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
      : <ChevronDown className="h-3.5 w-3.5 text-slate-600" />;
  };

  // ─── Selection ─────────────────────────────────────────────────────────────
  const allPageSelected = paginatedVideos.length > 0 && paginatedVideos.every(v => selectedIds.has(v.id));
  const toggleSelectAll = () => {
    if (allPageSelected) setSelectedIds(prev => { const n = new Set(prev); paginatedVideos.forEach(v => n.delete(v.id)); return n; });
    else setSelectedIds(prev => { const n = new Set(prev); paginatedVideos.forEach(v => n.add(v.id)); return n; });
  };
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Xóa ${selectedIds.size} video đã chọn?`)) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('videos').delete().in('id', ids);
    if (error) showToast('Xóa thất bại!', 'error');
    else { showToast(`Đã xóa ${ids.length} video.`); setSelectedIds(new Set()); fetchVideos(true); }
  };

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleEditClick = (video: Video) => {
    setEditingVideo(video);
    setScheduleType(video.schedule_type || 'single');
    if (video.scheduled_for) {
      const d = new Date(video.scheduled_for);
      setScheduleDate(d.toISOString().split('T')[0]);
      setScheduleTime(d.toTimeString().substring(0, 5));
    }
    if (video.recurring_interval) setRecurringInterval(video.recurring_interval);
    if (video.continuous_interval_hours) setContinuousIntervalHours(String(video.continuous_interval_hours));
    if (video.random_start_date) setRandomStartDate(new Date(video.random_start_date).toISOString().slice(0, 16));
    if (video.random_end_date) setRandomEndDate(new Date(video.random_end_date).toISOString().slice(0, 16));
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa lịch đăng này?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) showToast('Xóa thất bại!', 'error');
    else { showToast('Đã xóa thành công.'); fetchVideos(true); }
  };

  const handlePublishNow = async (video: Video) => {
    if (!confirm(`Đăng "${video.title}" ngay bây giờ?`)) return;
    const { error } = await supabase.from('videos').update({
      status: 'pending',
      scheduled_for: new Date().toISOString(),
      publish_now: true,
      schedule_type: 'immediate',
    }).eq('id', video.id);
    if (error) showToast('Kích hoạt thất bại!', 'error');
    else { showToast('Đã kích hoạt! Worker sẽ xử lý trong vài phút.'); fetchVideos(true); }
  };

  const handleSaveSchedule = async () => {
    if (!editingVideo) return;
    setIsSaving(true);
    try {
      let scheduledFor = new Date().toISOString();
      if (scheduleDate && scheduleTime) scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      else if (randomStartDate && scheduleType === 'random') scheduledFor = new Date(randomStartDate).toISOString();

      const { error } = await supabase.from('videos').update({
        schedule_type: scheduleType,
        scheduled_for: scheduledFor,
        recurring_interval: scheduleType === 'recurring' ? recurringInterval : null,
        continuous_interval_hours: scheduleType === 'continuous' ? parseInt(continuousIntervalHours) : null,
        random_start_date: scheduleType === 'random' && randomStartDate ? new Date(randomStartDate).toISOString() : null,
        random_end_date: scheduleType === 'random' && randomEndDate ? new Date(randomEndDate).toISOString() : null,
      }).eq('id', editingVideo.id);

      if (error) throw error;
      setIsEditDialogOpen(false);
      showToast('Lưu lịch thành công!');
      fetchVideos(true);
    } catch (e) {
      showToast('Lưu thất bại!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Calendar helpers ──────────────────────────────────────────────────────
  const { days, firstDay } = useMemo(() => {
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
    return { days: new Date(y, m + 1, 0).getDate(), firstDay: new Date(y, m, 1).getDay() };
  }, [currentMonth]);

  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const d = i - firstDay + 1;
    return d > 0 && d <= days ? d : null;
  });

  const getVideosForDay = (day: number) =>
    filteredVideos.filter(v => {
      if (!v.scheduled_for) return false;
      const d = new Date(v.scheduled_for);
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();

  const clearFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setScheduleTypeFilter('all');
    setDateRangeStart(''); setDateRangeEnd('');
  };
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || scheduleTypeFilter !== 'all' || dateRangeStart || dateRangeEnd;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl text-sm font-medium transition-all animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
            <button onClick={() => setToast(null)}><X className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Schedule Manager</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Quản lý lịch đăng video YouTube của bạn
              {lastRefreshed && (
                <span className="ml-2 text-xs text-slate-400">
                  · Cập nhật {formatRelative(lastRefreshed.toISOString())}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => fetchVideos(true)}
              disabled={refreshing}
              className="gap-1.5"
              title="Tự động làm mới mỗi 60 giây"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Đang tải…' : 'Làm mới'}
            </Button>

            {/* View Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {(['list', 'grid', 'calendar'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === mode ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  {mode === 'list' && <List className="h-3.5 w-3.5" />}
                  {mode === 'grid' && <LayoutGrid className="h-3.5 w-3.5" />}
                  {mode === 'calendar' && <Calendar className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline capitalize">{mode === 'list' ? 'Danh sách' : mode === 'grid' ? 'Lưới' : 'Lịch'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Tổng video" value={stats.total} icon={Video} color="bg-slate-700" />
          <StatCard label="Đang chờ" value={stats.pending} icon={Clock} color="bg-amber-500" />
          <StatCard label="Đã đăng" value={stats.uploaded} icon={CheckCircle2} color="bg-emerald-500" />
          <StatCard label="Thất bại" value={stats.failed} icon={AlertCircle} color="bg-red-500" />
        </div>

        {/* Overdue Alert */}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <Bell className="h-4 w-4 flex-shrink-0 text-orange-500" />
            <span>
              <strong>{stats.overdue} video</strong> mới đang chờ bạn xử lý.
              <button className="ml-2 underline font-medium" onClick={() => { setStatusFilter('pending'); setViewMode('list'); }}>
                Xem ngay
              </button>
            </span>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm video…"
                className="pl-9 bg-white border-slate-200 h-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={v => setStatusFilter(v || 'all')}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 bg-white border-slate-200">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">⏳ Đang chờ</SelectItem>
                <SelectItem value="uploaded">✅ Đã đăng</SelectItem>
                <SelectItem value="failed">❌ Thất bại</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className={`h-9 gap-1.5 ${showAdvancedFilter ? 'bg-slate-100' : ''}`}
              onClick={() => setShowAdvancedFilter(v => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Bộ lọc nâng cao
              {hasActiveFilters && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">!</span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-slate-500 gap-1" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Xóa bộ lọc
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilter && (
            <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex-1">
                <Label className="text-xs text-slate-500 mb-1 block">Loại lịch</Label>
                <Select value={scheduleTypeFilter} onValueChange={v => setScheduleTypeFilter(v || 'all')}>
                  <SelectTrigger className="h-8 bg-white text-sm">
                    <SelectValue placeholder="Tất cả loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại</SelectItem>
                    <SelectItem value="single">Đơn lần</SelectItem>
                    <SelectItem value="recurring">Lặp lại</SelectItem>
                    <SelectItem value="continuous">Liên tục</SelectItem>
                    <SelectItem value="random">Ngẫu nhiên</SelectItem>
                    <SelectItem value="immediate">Đăng ngay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-slate-500 mb-1 block">Từ ngày</Label>
                <Input type="date" className="h-8 bg-white text-sm" value={dateRangeStart} onChange={e => setDateRangeStart(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-slate-500 mb-1 block">Đến ngày</Label>
                <Input type="date" className="h-8 bg-white text-sm" value={dateRangeEnd} onChange={e => setDateRangeEnd(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium shadow-lg">
            <span>{selectedIds.size} video được chọn</span>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="text-red-300 hover:text-red-100 hover:bg-red-900/50 gap-1.5 h-8" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4" /> Xóa đã chọn
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white gap-1.5 h-8" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" /> Bỏ chọn
            </Button>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-10 pl-4">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 accent-slate-900 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="min-w-[260px] cursor-pointer select-none" onClick={() => handleSort('title')}>
                        <div className="flex items-center gap-1.5">Video <SortIcon field="title" /></div>
                      </TableHead>
                      <TableHead>Kênh</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('scheduled_for')}>
                        <div className="flex items-center gap-1.5">Lịch đăng <SortIcon field="scheduled_for" /></div>
                      </TableHead>
                      <TableHead>Loại lịch</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1.5">Trạng thái <SortIcon field="status" /></div>
                      </TableHead>
                      <TableHead className="text-right pr-4">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : paginatedVideos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Video className="h-8 w-8 opacity-30" />
                            <p className="font-medium">Không tìm thấy video nào</p>
                            {hasActiveFilters && (
                              <button className="text-xs text-slate-500 underline" onClick={clearFilters}>Xóa bộ lọc</button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVideos.map(video => {
                        const overdue = isOverdue(video.scheduled_for, video.status);
                        return (
                          <TableRow
                            key={video.id}
                            className={`transition-colors ${selectedIds.has(video.id) ? 'bg-slate-50' : ''} ${overdue ? 'bg-orange-50/40' : 'hover:bg-slate-50/70'}`}
                          >
                            <TableCell className="pl-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(video.id)}
                                onChange={() => toggleSelect(video.id)}
                                className="rounded border-slate-300 accent-slate-900 cursor-pointer"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-2.5">
                                <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <Video className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900 text-sm leading-tight line-clamp-1">{video.title}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                                    {video.drive_file_id ? `Drive: ${video.drive_file_id.substring(0, 12)}…` : video.file_path?.split(/[\\/]/).pop()}
                                  </div>
                                </div>
                                {overdue && (
                                  <span title="Quá hạn đăng!" className="flex-shrink-0 mt-0.5">
                                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
                                <span className="truncate max-w-[100px]">{video.channel_id ? 'Kênh đã kết nối' : 'Kênh mặc định'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-slate-700 tabular-nums">
                                {formatDate(video.scheduled_for)}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{formatRelative(video.scheduled_for)}</div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                {video.schedule_type || 'single'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={video.status} />
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 data-[state=open]:bg-slate-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs text-slate-500">Hành động</DropdownMenuLabel>

                                  <DropdownMenuItem
                                    className="gap-2 font-semibold text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800"
                                    onClick={() => handlePublishNow(video)}
                                  >
                                    <Zap className="h-4 w-4" /> 🚀 Đăng Ngay!
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem className="gap-2" onClick={() => handleEditClick(video)}>
                                    <Edit className="h-4 w-4" /> Sửa lịch
                                  </DropdownMenuItem>

                                  <DropdownMenuItem className="gap-2" onClick={() => navigator.clipboard.writeText(video.id).then(() => showToast('Đã copy ID!'))}>
                                    <Copy className="h-4 w-4" /> Copy ID
                                  </DropdownMenuItem>

                                  {video.status === 'uploaded' && video.youtube_video_id && (
                                    <DropdownMenuItem className="gap-2" onClick={() => window.open(`https://youtube.com/watch?v=${video.youtube_video_id}`, '_blank')}>
                                      <ExternalLink className="h-4 w-4" /> Xem trên YouTube
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                                    onClick={() => handleDelete(video.id)}
                                  >
                                    <Trash2 className="h-4 w-4" /> Xóa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {!loading && filteredVideos.length > 0 && (
                <div className="px-4">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    total={filteredVideos.length}
                    onPage={setPage}
                    onPageSize={s => { setPageSize(s); setPage(1); }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── GRID VIEW ── */}
        {viewMode === 'grid' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-44 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : paginatedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <Video className="h-10 w-10 opacity-30" />
                <p className="font-medium">Không có video</p>
                {hasActiveFilters && <button className="text-xs underline" onClick={clearFilters}>Xóa bộ lọc</button>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedVideos.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onEdit={() => handleEditClick(video)}
                      onDelete={() => handleDelete(video.id)}
                      onPublishNow={() => handlePublishNow(video)}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  total={filteredVideos.length}
                  onPage={setPage}
                  onPageSize={s => { setPageSize(s); setPage(1); }}
                />
              </>
            )}
          </>
        )}

        {/* ── CALENDAR VIEW ── */}
        {viewMode === 'calendar' && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-base">
                    {currentMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {getVideosForDay(0).length > 0
                      ? `${filteredVideos.filter(v => {
                        const d = new Date(v.scheduled_for);
                        return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
                      }).length} video tháng này`
                      : 'Xem lịch đăng theo tháng'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date())}>
                    Hôm nay
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                {calendarDays.map((day, i) => {
                  const dayVideos = day ? getVideosForDay(day) : [];
                  const todayDay = isToday(day ?? -1);
                  return (
                    <div
                      key={i}
                      className={`min-h-[90px] p-1.5 flex flex-col gap-1 ${day ? `bg-white ${todayDay ? 'ring-2 ring-inset ring-slate-900' : ''}` : 'bg-slate-50/60'}`}
                    >
                      {day && (
                        <>
                          <span className={`self-end text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${todayDay ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
                            {day}
                          </span>
                          <div className="space-y-0.5 overflow-hidden">
                            {dayVideos.slice(0, 3).map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleEditClick(v)}
                                className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium transition-opacity hover:opacity-80 ${v.status === 'uploaded' ? 'bg-emerald-100 text-emerald-800' : v.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}
                                title={`${new Date(v.scheduled_for).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${v.title}`}
                              >
                                {new Date(v.scheduled_for).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {v.title}
                              </button>
                            ))}
                            {dayVideos.length > 3 && (
                              <span className="text-[10px] text-slate-400 px-1.5">+{dayVideos.length - 3} nữa</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calendar legend */}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-200" />Đang chờ</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-200" />Đã đăng</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-200" />Thất bại</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── EDIT DIALOG ── */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden rounded-xl">
            <DialogHeader className="px-6 py-5 border-b bg-slate-50">
              <DialogTitle className="text-base">Chỉnh sửa lịch đăng</DialogTitle>
              <DialogDescription className="text-sm line-clamp-1 mt-0.5">
                {editingVideo?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-5">
              {/* Schedule Type */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loại lịch</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'single', label: '📅 Đơn lần' },
                    { value: 'recurring', label: '🔁 Lặp lại' },
                    { value: 'continuous', label: '⚡ Liên tục' },
                    { value: 'random', label: '🎲 Ngẫu nhiên' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setScheduleType(opt.value)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${scheduleType === opt.value ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single */}
              {scheduleType === 'single' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Ngày</Label>
                    <Input type="date" className="h-9" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Giờ</Label>
                    <Input type="time" className="h-9" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Recurring */}
              {scheduleType === 'recurring' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Chu kỳ</Label>
                    <Select value={recurringInterval} onValueChange={v => setRecurringInterval(v || 'daily')}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Mỗi ngày</SelectItem>
                        <SelectItem value="weekly">Mỗi tuần</SelectItem>
                        <SelectItem value="monthly">Mỗi tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Giờ đăng</Label>
                    <Input type="time" className="h-9" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Continuous */}
              {scheduleType === 'continuous' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Đăng mỗi X giờ</Label>
                  <div className="relative">
                    <Input
                      type="number" min="1" max="168" className="h-9 pr-12"
                      value={continuousIntervalHours}
                      onChange={e => setContinuousIntervalHours(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">giờ</span>
                  </div>
                </div>
              )}

              {/* Random */}
              {scheduleType === 'random' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Từ ngày & giờ</Label>
                    <Input type="datetime-local" className="h-9 text-xs" value={randomStartDate} onChange={e => setRandomStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Đến ngày & giờ</Label>
                    <Input type="datetime-local" className="h-9 text-xs" value={randomEndDate} onChange={e => setRandomEndDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-slate-50 gap-2">
              <Button variant="outline" className="h-9" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
              <Button
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="h-9 bg-slate-900 hover:bg-slate-800 text-white gap-2"
              >
                {isSaving ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Đang lưu…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Lưu thay đổi</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}