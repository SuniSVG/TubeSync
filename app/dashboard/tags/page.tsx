'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Copy,
  TrendingUp,
  Hash,
  BarChart3,
  Check,
  Sparkles,
  Download,
  Filter,
  SortAsc,
  SortDesc,
  X,
  Plus,
  Zap,
  Eye,
  LayoutGrid,
  List,
  RefreshCw,
  ChevronDown,
  Star,
  Flame,
  ArrowUpRight,
  CheckSquare,
  Square,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────
interface TagStat {
  name: string;
  count: number;
  trend?: 'up' | 'down' | 'stable';
  engagementScore?: number;
  category?: string;
  isSelected?: boolean;
}

interface LibraryTag {
  id: string;
  tag_name: string;
  usage_count: number;
  category?: string;
}

type SortField = 'name' | 'count' | 'engagement';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'grid' | 'cloud';

// ─── AI Tag Suggester ────────────────────────────────────────────────────────
async function fetchAISuggestions(existingTags: string[], niche?: string): Promise<string[]> {
  const prompt = `You are a TikTok/YouTube Shorts hashtag strategist. Based on these existing tags: ${existingTags.slice(0, 10).join(', ')}${niche ? ` and niche: ${niche}` : ''}, suggest 15 high-performing hashtags in Vietnamese content style. Return ONLY a JSON array of strings (hashtag names WITHOUT #), no explanation.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

// ─── Tag Cloud Component ─────────────────────────────────────────────────────
function TagCloud({ tags, onTagClick }: { tags: TagStat[]; onTagClick: (name: string) => void }) {
  const maxCount = Math.max(...tags.map(t => t.count), 1);
  return (
    <div className="flex flex-wrap gap-2 p-4 min-h-40 items-center justify-center">
      {tags.map(tag => {
        const ratio = tag.count / maxCount;
        const size = 12 + ratio * 20;
        const opacity = 0.5 + ratio * 0.5;
        return (
          <button
            key={tag.name}
            onClick={() => onTagClick(tag.name)}
            style={{ fontSize: `${size}px`, opacity }}
            className="font-bold text-red-500 hover:text-red-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            #{tag.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Category Badge ──────────────────────────────────────────────────────────
const categoryColors: Record<string, string> = {
  lifestyle: 'bg-pink-100 text-pink-700',
  trending: 'bg-orange-100 text-orange-700',
  food: 'bg-yellow-100 text-yellow-700',
  tech: 'bg-blue-100 text-blue-700',
  beauty: 'bg-purple-100 text-purple-700',
  fitness: 'bg-emerald-100 text-emerald-700',
  default: 'bg-slate-100 text-slate-600',
};

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  const cls = categoryColors[category] ?? categoryColors.default;
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cls)}>{category}</span>;
}

// ─── Trend Icon ──────────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend?: TagStat['trend'] }) {
  if (trend === 'up') return <Flame className="h-3.5 w-3.5 text-orange-500" />;
  if (trend === 'down') return <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 rotate-180" />;
  return <span className="h-3.5 w-3.5 inline-block" />;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TagsPage() {
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [userTags, setUserTags] = useState<TagStat[]>([]);
  const [popularTags, setPopularTags] = useState<LibraryTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('my-tags');
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [nicheInput, setNicheInput] = useState('');
  const [showNicheInput, setShowNicheInput] = useState(false);
  const nicheRef = useRef<HTMLInputElement>(null);

  // Fetch data
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: videos } = await supabase
        .from('videos')
        .select('tags')
        .eq('user_id', session.user.id);

      if (videos) {
        const tagMap: Record<string, number> = {};
        videos.forEach(v => {
          // Xử lý cả trường hợp tags là mảng hoặc chuỗi (phòng trường hợp dữ liệu cũ)
          let tagsArray: string[] = [];
          if (Array.isArray(v.tags)) {
            tagsArray = v.tags;
          } else if (typeof v.tags === 'string' && v.tags.trim().length > 0) {
            tagsArray = v.tags.split(/[,\s]+/).map(t => t.trim());
          }

          tagsArray.forEach((t: string) => {
            if (!t) return;
            const clean = t.startsWith('#') ? t.slice(1) : t.toLowerCase();
            tagMap[clean] = (tagMap[clean] || 0) + 1;
          });
        });

        const sorted = Object.entries(tagMap)
          .map(([name, count]) => ({
            name,
            count,
            trend: count > 3 ? 'up' : count === 1 ? 'down' : 'stable',
            engagementScore: Math.floor(Math.random() * 40 + 60), // replace with real metric
            category: inferCategory(name),
          } as TagStat))
          .sort((a, b) => b.count - a.count);

        setUserTags(sorted);
      }

      const { data: library } = await supabase
        .from('tags_library')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(40);

      if (library) setPopularTags(library);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Infer category from tag name (simple heuristic; replace with DB field)
  function inferCategory(name: string): string {
    const n = name.toLowerCase();
    if (/food|ăn|nấu|món/.test(n)) return 'food';
    if (/beauty|makeup|skincare|đẹp/.test(n)) return 'beauty';
    if (/tech|công nghệ|review/.test(n)) return 'tech';
    if (/fitness|gym|workout/.test(n)) return 'fitness';
    if (/trend|viral|hot/.test(n)) return 'trending';
    return 'lifestyle';
  }

  // Derived: categories
  const categories = useMemo(() => {
    const cats = new Set(userTags.map(t => t.category ?? 'lifestyle'));
    return ['all', ...Array.from(cats)];
  }, [userTags]);

  // Filtered + sorted tags
  const displayedTags = useMemo(() => {
    let list = userTags.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterCategory === 'all' || t.category === filterCategory)
    );
    list = list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return dir * a.name.localeCompare(b.name);
      if (sortField === 'count') return dir * (a.count - b.count);
      return dir * ((a.engagementScore ?? 0) - (b.engagementScore ?? 0));
    });
    return list;
  }, [userTags, searchQuery, filterCategory, sortField, sortDir]);

  // Stats
  const totalUses = userTags.reduce((s, t) => s + t.count, 0);
  const trendingCount = userTags.filter(t => t.count > 1).length; // Tag dùng trên 1 lần coi như có xu hướng trong kênh

  // Copy single tag
  const copyToClipboard = useCallback((tag: string) => {
    const text = tag.startsWith('#') ? tag : `#${tag}`;
    navigator.clipboard.writeText(text);
    setCopiedTag(tag);
    toast({ title: 'Đã sao chép!', description: `${text} đã được copy.` });
    setTimeout(() => setCopiedTag(null), 2000);
  }, [toast]);

  // Bulk copy
  const bulkCopy = useCallback(() => {
    if (selectedTags.size === 0) return;
    const text = Array.from(selectedTags).map(t => `#${t}`).join(' ');
    navigator.clipboard.writeText(text);
    toast({ title: `Đã copy ${selectedTags.size} tags!`, description: text.slice(0, 80) + '...' });
    setSelectedTags(new Set());
  }, [selectedTags, toast]);

  // Select / deselect tag
  const toggleSelect = (name: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelectedTags(new Set(displayedTags.map(t => t.name)));
  const clearSelection = () => setSelectedTags(new Set());

  // Export CSV
  const exportCSV = () => {
    const rows = ['tag,count,engagement_score,category', ...userTags.map(t =>
      `#${t.name},${t.count},${t.engagementScore ?? ''},${t.category ?? ''}`
    )];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tags-export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Xuất CSV thành công!' });
  };

  // AI Suggestions
  const handleAISuggest = async () => {
    setIsAILoading(true);
    const suggestions = await fetchAISuggestions(userTags.map(t => t.name), nicheInput || undefined);
    setAISuggestions(suggestions);
    setIsAILoading(false);
    setShowNicheInput(false);
    toast({ title: `AI đề xuất ${suggestions.length} tags mới!` });
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="space-y-6 pb-12">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quản lý Tags</h1>
            <p className="text-slate-500 mt-1">Phân tích, tối ưu và khám phá hashtag hiệu quả nhất.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm tag..."
                className="pl-9 bg-white shadow-sm border-slate-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={fetchData} className="shadow-sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="shadow-sm gap-1.5">
              <Download className="h-4 w-4" /> Xuất CSV
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <Hash className="h-5 w-5" />,
              bg: 'bg-red-50', text: 'text-red-600',
              label: 'Tags Duy Nhất',
              value: userTags.length,
            },
            {
              icon: <TrendingUp className="h-5 w-5" />,
              bg: 'bg-blue-50', text: 'text-blue-600',
              label: 'Tag Hot Nhất',
              value: userTags[0] ? `#${userTags[0].name}` : '--',
            },
            {
              icon: <Flame className="h-5 w-5" />,
              bg: 'bg-orange-50', text: 'text-orange-600',
              label: 'Tags Phổ Biến',
              value: trendingCount,
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              bg: 'bg-emerald-50', text: 'text-emerald-600',
              label: 'Tổng Lượt Dùng',
              value: totalUses,
            },
          ].map((s, i) => (
            <Card key={i} className="shadow-sm border-slate-200">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-xl', s.bg, s.text)}>{s.icon}</div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">{s.label}</p>
                    <p className="text-xl font-bold text-slate-900 truncate max-w-[120px]">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Tabs */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="my-tags" className="gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Tags của tôi
                    <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                      {userTags.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="cloud" className="gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Tag Cloud
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Phân tích
                  </TabsTrigger>
                </TabsList>

                {/* Toolbar */}
                <div className="flex items-center gap-2">
                  {selectedTags.size > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                      <span className="text-sm font-medium text-red-700">
                        {selectedTags.size} đã chọn
                      </span>
                      <button
                        onClick={bulkCopy}
                        className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                      <button onClick={clearSelection} className="text-red-400 hover:text-red-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Category Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 shadow-sm h-8">
                        <Filter className="h-3.5 w-3.5" />
                        {filterCategory === 'all' ? 'Tất cả' : filterCategory}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Lọc theo danh mục</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {categories.map(cat => (
                        <DropdownMenuItem key={cat} onClick={() => setFilterCategory(cat)}
                          className={filterCategory === cat ? 'bg-slate-100' : ''}>
                          {cat === 'all' ? '🏷️ Tất cả' : cat}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* View Mode */}
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    {(['table', 'grid'] as ViewMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={cn('px-2.5 py-1.5 transition-colors', viewMode === mode
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50')}
                      >
                        {mode === 'table' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── My Tags Tab ── */}
              <TabsContent value="my-tags">
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <CardContent className="p-0">
                    {viewMode === 'table' ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="px-4 py-3 w-10">
                                <button onClick={selectedTags.size === displayedTags.length ? clearSelection : selectAll}>
                                  {selectedTags.size === displayedTags.length && displayedTags.length > 0
                                    ? <CheckSquare className="h-4 w-4 text-red-500" />
                                    : <Square className="h-4 w-4 text-slate-400" />}
                                </button>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('name')}>
                                <span className="flex items-center gap-1">
                                  Hashtag {sortField === 'name' && (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                                </span>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('count')}>
                                <span className="flex items-center gap-1">
                                  Dùng {sortField === 'count' && (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                                </span>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('engagement')}>
                                <span className="flex items-center gap-1">
                                  Hiệu suất {sortField === 'engagement' && (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                                </span>
                              </th>
                              <th className="px-4 py-3">Danh mục</th>
                              <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {displayedTags.length > 0 ? displayedTags.map(tag => (
                              <tr
                                key={tag.name}
                                className={cn(
                                  'hover:bg-slate-50 transition-colors group',
                                  selectedTags.has(tag.name) && 'bg-red-50/50'
                                )}
                              >
                                <td className="px-4 py-3">
                                  <button onClick={() => toggleSelect(tag.name)}>
                                    {selectedTags.has(tag.name)
                                      ? <CheckSquare className="h-4 w-4 text-red-500" />
                                      : <Square className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <TrendIcon trend={tag.trend} />
                                    <span className="font-semibold text-slate-900">#{tag.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                    {tag.count} video
                                  </span>
                                </td>
                                <td className="px-4 py-3 w-40">
                                  <div className="flex items-center gap-2">
                                    <Progress value={tag.engagementScore} className="h-1.5 w-20" />
                                    <span className="text-xs text-slate-500">{tag.engagementScore}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <CategoryBadge category={tag.category} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                      <Button
                                        variant="ghost" size="icon"
                                        onClick={() => copyToClipboard(tag.name)}
                                        title="Sao chép hashtag"
                                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                                      >
                                        {copiedTag === tag.name
                                          ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                                          : <Copy className="h-3.5 w-3.5" />}
                                      </Button>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                  <Hash className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                  <p className="text-slate-400 font-medium">
                                    {isLoading ? 'Đang tải dữ liệu...' : 'Chưa có tag nào.'}
                                  </p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Grid view */
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {displayedTags.map(tag => (
                          <div
                            key={tag.name}
                            onClick={() => toggleSelect(tag.name)}
                            className={cn(
                              'relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md',
                              selectedTags.has(tag.name)
                                ? 'border-red-400 bg-red-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            {selectedTags.has(tag.name) && (
                              <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-red-500" />
                            )}
                            <div className="flex items-center gap-1 mb-1.5">
                              <TrendIcon trend={tag.trend} />
                              <span className="font-bold text-slate-800 text-sm truncate">#{tag.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">{tag.count} video</span>
                              <CategoryBadge category={tag.category} />
                            </div>
                            <Progress value={tag.engagementScore} className="h-1 mt-2" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tag Cloud Tab ── */}
              <TabsContent value="cloud">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Tag Cloud Trực Quan</CardTitle>
                    <CardDescription>Kích thước chữ tương ứng với tần suất sử dụng. Click để sao chép.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {displayedTags.length > 0
                      ? <TagCloud tags={displayedTags} onTagClick={copyToClipboard} />
                      : <p className="text-center text-slate-400 py-12">Chưa có dữ liệu.</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Analytics Tab ── */}
              <TabsContent value="analytics">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Top 5 tags */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" /> Top Tags Phổ Biến
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {userTags.slice(0, 5).map((tag, i) => (
                        <div key={tag.name} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-700">#{tag.name}</span>
                              <span className="text-xs text-slate-500">{tag.count} video</span>
                            </div>
                            <Progress
                              value={(tag.count / (userTags[0]?.count || 1)) * 100}
                              className="h-1.5"
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Category breakdown */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-500" /> Phân Bổ Danh Mục
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categories.filter(c => c !== 'all').map(cat => {
                        const count = userTags.filter(t => t.category === cat).length;
                        const pct = userTags.length ? (count / userTags.length) * 100 : 0;
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <CategoryBadge category={cat} />
                            <div className="flex-1">
                              <Progress value={pct} className="h-1.5" />
                            </div>
                            <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Engagement insights */}
                  <Card className="shadow-sm border-slate-200 sm:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="h-4 w-4 text-emerald-500" /> Insights Nhanh
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                          <p className="text-2xl font-bold text-emerald-700">
                            {userTags.filter(t => (t.engagementScore ?? 0) > 80).length}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">Tag hiệu suất cao</p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl">
                          <p className="text-2xl font-bold text-amber-700">{trendingCount}</p>
                          <p className="text-xs text-amber-600 mt-1">Đang trending</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl">
                          <p className="text-2xl font-bold text-red-700">
                            {userTags.filter(t => t.count === 1).length}
                          </p>
                          <p className="text-xs text-red-600 mt-1">Chưa tối ưu</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-4">

            {/* AI Suggestions */}
            <Card className="shadow-sm border-slate-200 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" /> AI Gợi Ý Tags
                </CardTitle>
                <CardDescription>Dùng AI để khám phá hashtag mới phù hợp.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {showNicheInput ? (
                  <div className="flex gap-2">
                    <Input
                      ref={nicheRef}
                      placeholder="Nhập niche (VD: ăn vặt, beauty...)"
                      value={nicheInput}
                      onChange={e => setNicheInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAISuggest()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleAISuggest} disabled={isAILoading}>
                      {isAILoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'OK'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => { setShowNicheInput(true); setTimeout(() => nicheRef.current?.focus(), 50); }}
                      className="flex-1 gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm niche
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAISuggest}
                      disabled={isAILoading || userTags.length === 0}
                      className="flex-1 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs"
                    >
                      {isAILoading
                        ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang tạo...</>
                        : <><Sparkles className="h-3.5 w-3.5" /> Gợi ý ngay</>}
                    </Button>
                  </div>
                )}

                {userTags.length === 0 && !isLoading && (
                  <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg text-xs text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    Thêm video với tags để AI học từ nội dung của bạn.
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Kết quả AI
                      </p>
                      <button
                        onClick={() => {
                          const text = aiSuggestions.map(t => `#${t}`).join(' ');
                          navigator.clipboard.writeText(text);
                          toast({ title: 'Đã copy toàn bộ AI tags!' });
                        }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" /> Copy tất cả
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {aiSuggestions.map(tag => (
                        <button
                          key={tag}
                          onClick={() => copyToClipboard(tag)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-95"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bulk Copy Quick Panel */}
            {selectedTags.size > 0 && (
              <Card className="shadow-sm border-red-200 bg-red-50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-red-700">
                      {selectedTags.size} tag đã chọn
                    </span>
                    <button onClick={clearSelection} className="text-red-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-red-600 mb-3 break-all line-clamp-2">
                    {Array.from(selectedTags).map(t => `#${t}`).join(' ')}
                  </p>
                  <Button size="sm" onClick={bulkCopy} className="w-full bg-red-500 hover:bg-red-600 text-white gap-1.5">
                    <Copy className="h-3.5 w-3.5" /> Copy {selectedTags.size} Tags
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Library Tags */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Thư Viện Tags
                </CardTitle>
                <CardDescription>Click để sao chép ngay.</CardDescription>
              </CardHeader>
              <CardContent>
                {popularTags.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
                      {popularTags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => copyToClipboard(tag.tag_name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm active:scale-95"
                        >
                          #{tag.tag_name}
                          {tag.usage_count > 100 && <Flame className="h-2.5 w-2.5 text-orange-400" />}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline" size="sm"
                      className="w-full mt-3 text-xs"
                      onClick={() => {
                        const text = popularTags.map(t => `#${t.tag_name}`).join(' ');
                        navigator.clipboard.writeText(text);
                        toast({ title: 'Đã copy toàn bộ thư viện!' });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy toàn bộ thư viện
                    </Button>
                  </>
                ) : (
                  <p className="text-center text-slate-400 py-8 text-sm">Thư viện trống.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}