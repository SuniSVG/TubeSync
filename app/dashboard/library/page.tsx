'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Calendar, Youtube, Search,
  ChevronLeft, ChevronRight, ExternalLink,
  Loader2, Film, Grid3X3, List, Eye, Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Video {
  id: string;
  title: string;
  youtube_video_id: string;
  scheduled_for: string;
  status: string;
}

type ViewMode = 'grid' | 'list';

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return `${Math.floor(days / 30)} tháng trước`;
};

// ─── Thumbnail with fallback ──────────────────────────────────────────────────
function Thumbnail({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!videoId || errored) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200">
        <Youtube className="h-10 w-10 text-slate-300" />
        <span className="text-[10px] text-slate-400 font-medium px-4 text-center line-clamp-2">{title}</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      )}
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt={title}
        className={cn(
          'w-full h-full object-cover transition-all duration-500',
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function VideoGridCard({ video, index }: { video: Video; index: number }) {
  const ytUrl = `https://youtube.com/watch?v=${video.youtube_video_id}`;

  return (
    <div
      className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden bg-slate-100">
        <Thumbnail videoId={video.youtube_video_id} title={video.title} />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={() => window.open(ytUrl, '_blank')}
            className="flex items-center gap-2 bg-white/95 hover:bg-white text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            <Play className="h-4 w-4 fill-current text-red-500" />
            Xem video
          </button>
        </div>

        {/* YT badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          <Youtube className="h-3 w-3 text-red-400" />
          <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">YouTube</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.6rem] mb-3 group-hover:text-red-600 transition-colors duration-200">
          {video.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Calendar className="h-3 w-3" />
            <span>{fmtRelative(video.scheduled_for)}</span>
          </div>
          <button
            onClick={() => window.open(ytUrl, '_blank')}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <ExternalLink className="h-3 w-3" />
            Mở
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function VideoListRow({ video, index }: { video: Video; index: number }) {
  const ytUrl = `https://youtube.com/watch?v=${video.youtube_video_id}`;

  return (
    <div
      className="group flex items-center gap-4 p-3 pr-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all duration-200"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Mini thumb */}
      <div className="w-28 h-16 flex-shrink-0 rounded-xl overflow-hidden relative bg-slate-100">
        <Thumbnail videoId={video.youtube_video_id} title={video.title} />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-5 w-5 text-white fill-white" />
        </div>
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-red-600 transition-colors duration-200">
          {video.title}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />{fmtDate(video.scheduled_for)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Eye className="h-3 w-3" />{fmtRelative(video.scheduled_for)}
          </span>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => window.open(ytUrl, '_blank')}
        className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition-all"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        YouTube
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
          <div className="aspect-video bg-slate-100" />
          <div className="p-4 space-y-2.5">
            <div className="h-3.5 bg-slate-100 rounded-full w-full" />
            <div className="h-3.5 bg-slate-100 rounded-full w-3/4" />
            <div className="h-3 bg-slate-100 rounded-full w-1/3 mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 animate-pulse">
          <div className="w-28 h-16 bg-slate-100 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-100 rounded-full w-2/3" />
            <div className="h-3 bg-slate-100 rounded-full w-1/3" />
          </div>
          <div className="w-20 h-8 bg-slate-100 rounded-xl flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center">
          <Film className="h-9 w-9 text-slate-300" />
        </div>
        {search && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-100 border-2 border-white flex items-center justify-center">
            <Search className="h-3 w-3 text-red-400" />
          </div>
        )}
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        {search ? `Không tìm thấy "${search}"` : 'Thư viện trống'}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
        {search
          ? 'Thử tìm kiếm với từ khoá khác hoặc xoá bộ lọc.'
          : 'Các video đã được đăng tải thành công sẽ xuất hiện ở đây.'}
      </p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-8">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="h-4 w-4" /> Trước
      </button>

      <div className="flex items-center gap-1">
        {visible.map((p, i) => {
          const prev = visible[i - 1];
          const showEllipsis = prev && p - prev > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {showEllipsis && (
                <span className="w-8 text-center text-slate-400 text-sm">…</span>
              )}
              <button
                onClick={() => onChange(p)}
                className={cn(
                  'w-9 h-9 rounded-xl text-sm font-semibold transition-all',
                  p === page
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                )}
              >
                {p}
              </button>
            </span>
          );
        })}
      </div>

      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Sau <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VideoLibraryPage() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVideos = useCallback(async (searchTerm: string, currentPage: number) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let query = supabase
        .from('videos')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .eq('status', 'uploaded')
        .order('scheduled_for', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);

      const { data, count, error } = await query;

      if (error) throw error;
      setVideos((data as Video[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching library:', err);
      toast({
        variant: 'destructive',
        title: 'Lỗi tải video',
        description: 'Không thể kết nối với máy chủ để lấy danh sách video.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Debounced search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      fetchVideos(search, 1);
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, fetchVideos]);

  useEffect(() => {
    fetchVideos(search, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 pb-12">

      {/* Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Thư viện Video</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {totalCount > 0
              ? <>{totalCount.toLocaleString()} video đã đăng tải thành công</>
              : 'Xem lại các video đã được đăng tải thành công'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Tìm kiếm..."
              className="pl-9 h-10 w-56 bg-white rounded-xl border-slate-200 text-sm focus:border-slate-400 focus:ring-slate-400/20 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="text-xs font-bold">✕</span>
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Body ────────────────────────────────────────────────── */}
      {loading ? (
        viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />
      ) : videos.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.map((video, i) => (
                <VideoGridCard key={video.id} video={video} index={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {videos.map((video, i) => (
                <VideoListRow key={video.id} video={video} index={i} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}