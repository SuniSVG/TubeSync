'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Filter, MoreHorizontal, Calendar, Youtube, CheckCircle2, AlertCircle, Clock, List, Copy, Edit, Trash2, ExternalLink, ChevronLeft, ChevronRight, PlaySquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';

export default function SchedulePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Edit Schedule State
  const [editingVideo, setEditingVideo] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState('single');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [recurringInterval, setRecurringInterval] = useState('daily');
  const [continuousIntervalHours, setContinuousIntervalHours] = useState('6');
  const [randomStartDate, setRandomStartDate] = useState('');
  const [randomEndDate, setRandomEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchVideos = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', session.user.id)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error fetching videos:', error);
    } else if (data) {
      setVideos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || video.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Calendar View Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentMonth);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= days) {
      return dayNumber;
    }
    return null;
  });

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const getVideosForDay = (day: number) => {
    return filteredVideos.filter(video => {
      if (!video.scheduled_for) return false;
      const date = new Date(video.scheduled_for);
      return date.getDate() === day && 
             date.getMonth() === currentMonth.getMonth() && 
             date.getFullYear() === currentMonth.getFullYear();
    });
  };

  // Action Handlers
  const handleEditClick = (video: any) => {
    setEditingVideo(video);
    setScheduleType(video.schedule_type || 'single');
    
    if (video.scheduled_for) {
      const dateObj = new Date(video.scheduled_for);
      setScheduleDate(dateObj.toISOString().split('T')[0]);
      setScheduleTime(dateObj.toTimeString().split(' ')[0].substring(0, 5));
    }
    
    if (video.recurring_interval) setRecurringInterval(video.recurring_interval);
    if (video.continuous_interval_hours) setContinuousIntervalHours(video.continuous_interval_hours.toString());
    if (video.random_start_date) setRandomStartDate(new Date(video.random_start_date).toISOString().slice(0, 16));
    if (video.random_end_date) setRandomEndDate(new Date(video.random_end_date).toISOString().slice(0, 16));
    
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this video schedule?')) return;
    
    try {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video.');
    }
  };

  const handleSaveSchedule = async () => {
    if (!editingVideo) return;
    setIsSaving(true);
    
    try {
      let scheduledFor = new Date().toISOString();
      if (scheduleDate && scheduleTime) {
        scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      } else if (randomStartDate && scheduleType === 'random') {
        scheduledFor = new Date(randomStartDate).toISOString();
      }

      const { error } = await supabase
        .from('videos')
        .update({
          schedule_type: scheduleType,
          scheduled_for: scheduledFor,
          recurring_interval: scheduleType === 'recurring' ? recurringInterval : null,
          continuous_interval_hours: scheduleType === 'continuous' ? parseInt(continuousIntervalHours) : null,
          random_start_date: scheduleType === 'random' && randomStartDate ? new Date(randomStartDate).toISOString() : null,
          random_end_date: scheduleType === 'random' && randomEndDate ? new Date(randomEndDate).toISOString() : null,
        })
        .eq('id', editingVideo.id);

      if (error) throw error;
      
      setIsEditDialogOpen(false);
      fetchVideos();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'uploaded':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-4 w-4 text-emerald-500 mr-1" /> Uploaded</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-4 w-4 text-blue-500 mr-1" /> Pending</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-4 w-4 text-red-500 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule Manager</h2>
          <p className="text-slate-500">View and manage your upcoming YouTube publications.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
          >
            {viewMode === 'list' ? <Calendar className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
            {viewMode === 'list' ? 'Calendar View' : 'List View'}
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <Card>
          <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>All Scheduled Videos</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="search"
                  placeholder="Search videos..."
                  className="pl-8 bg-slate-50 border-slate-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
                <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                  <Filter className="mr-2 h-4 w-4 text-slate-500" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[300px]">Video Details</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Scheduled Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      Loading schedule...
                    </TableCell>
                  </TableRow>
                ) : filteredVideos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      No videos found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVideos.map((video) => (
                    <TableRow key={video.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{video.title}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1 flex items-center">
                          Drive ID: {video.drive_file_id.substring(0, 10)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-slate-700">
                          <Youtube className="h-4 w-4 text-red-500 mr-2" />
                          {video.channel_id ? 'Connected Channel' : 'Default Channel'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-700">
                          {formatDate(video.scheduled_for)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(video.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(video.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                if (confirm('Đăng video này ngay lập tức lên kênh hiện tại?')) {
                                  try {
                                    await supabase
                                      .from('videos')
                                      .update({ 
                                        status: 'pending',
                                        scheduled_for: new Date().toISOString(),
                                        publish_now: true,
                                        schedule_type: 'immediate'
                                      })
                                      .eq('id', video.id);
                                    fetchVideos();
                                    alert('Đã kích hoạt đăng ngay! Python worker sẽ xử lý trong 5 phút.');
                                  } catch (error) {
                                    alert('Lỗi: ' + error);
                                  }
                                }
                              }}
                              className="bg-green-50 text-green-800 hover:bg-green-100 font-semibold"
                            >
                              <PlaySquare className="mr-2 h-4 w-4" /> 🚀 Đăng Ngay!
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditClick(video)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Schedule
                            </DropdownMenuItem>
                            {video.status === 'uploaded' && video.youtube_video_id && (
                              <DropdownMenuItem onClick={() => window.open(`https://youtube.com/watch?v=${video.youtube_video_id}`, '_blank')}>
                                <ExternalLink className="mr-2 h-4 w-4" /> View on YouTube
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:bg-red-50 focus:text-red-600"
                              onClick={() => handleDelete(video.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>Your scheduled videos for {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center font-medium text-sm text-slate-500 mb-2">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day, i) => {
                const dayVideos = day ? getVideosForDay(day) : [];
                return (
                  <div key={i} className={`min-h-[80px] sm:min-h-[120px] border rounded-md p-1 sm:p-2 ${day ? 'bg-white border-slate-200' : 'bg-slate-50/50 border-transparent'}`}>
                    {day && (
                      <>
                        <div className="text-right text-xs sm:text-sm font-medium text-slate-500 mb-1">{day}</div>
                        <div className="space-y-1">
                          {dayVideos.map(video => (
                            <div 
                              key={video.id} 
                              className="text-[10px] sm:text-xs p-1 sm:p-1.5 rounded bg-slate-100 border border-slate-200 truncate cursor-pointer hover:bg-slate-200 hover:border-slate-300 transition-colors" 
                              onClick={() => handleEditClick(video)}
                              title={`${new Date(video.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${video.title}`}
                            >
                              <div className="flex items-center gap-1">
                                {video.status === 'uploaded' ? <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" /> : 
                                 video.status === 'failed' ? <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" /> : 
                                 <Clock className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                                <span className="truncate">{new Date(video.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="truncate text-slate-700 font-medium mt-0.5">{video.title}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update the posting schedule for &quot;{editingVideo?.title}&quot;.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Select value={scheduleType} onValueChange={(val) => setScheduleType(val || 'single')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Post</SelectItem>
                  <SelectItem value="recurring">Recurring Post</SelectItem>
                  <SelectItem value="continuous">Continuous Posting</SelectItem>
                  <SelectItem value="random">Randomized Posting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleType === 'single' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-schedule-date">Date</Label>
                  <Input 
                    id="edit-schedule-date" 
                    type="date" 
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-schedule-time">Time</Label>
                  <Input 
                    id="edit-schedule-time" 
                    type="time" 
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {scheduleType === 'recurring' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select value={recurringInterval} onValueChange={(val) => setRecurringInterval(val || 'daily')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-recurring-time">Time of Day</Label>
                  <Input 
                    id="edit-recurring-time" 
                    type="time" 
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {scheduleType === 'continuous' && (
              <div className="space-y-2">
                <Label htmlFor="edit-continuous-hours">Post Every X Hours</Label>
                <Input 
                  id="edit-continuous-hours" 
                  type="number" 
                  min="1"
                  value={continuousIntervalHours}
                  onChange={(e) => setContinuousIntervalHours(e.target.value)}
                />
              </div>
            )}

            {scheduleType === 'random' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-random-start">Start Date & Time</Label>
                  <Input 
                    id="edit-random-start" 
                    type="datetime-local" 
                    value={randomStartDate}
                    onChange={(e) => setRandomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-random-end">End Date & Time</Label>
                  <Input 
                    id="edit-random-end" 
                    type="datetime-local" 
                    value={randomEndDate}
                    onChange={(e) => setRandomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSchedule} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
