 'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, FileVideo, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";

export default function UploadPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Publish options
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Metadata state
  const [titleTemplate, setTitleTemplate] = useState('{filename}');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [scheduleType, setScheduleType] = useState('single');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [recurringInterval, setRecurringInterval] = useState('daily');
  const [continuousIntervalHours, setContinuousIntervalHours] = useState('6');
  const [randomStartDate, setRandomStartDate] = useState('');
  const [randomEndDate, setRandomEndDate] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    }
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
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);
        
        if (data && data.length > 0) {
          setChannel(data[0]);
        }
      }
    };
    fetchChannel();
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadError(null);

    try {
      // 1. Check Auth
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        toast({
          variant: "destructive",
          title: "Yêu cầu đăng nhập",
          description: "Bạn cần đăng nhập để thực hiện tải lên.",
        });
        setIsUploading(false);
        return;
      }

      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        // Sử dụng FormData để gửi stream file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', session.user.id);

        // 2. Tải lên Backend Node.js (Sử dụng Google Drive API)
        const backendUrl = 'https://127.0.0.1:3001/upload';

        let uploadResult: any;

        try {
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
            const errorText = await response.text();
            throw new Error(`Server returned ${response.status}: ${errorText.slice(0, 100)}`);
          }

          uploadResult = await response.json();
          if (!uploadResult?.success) {
            throw new Error(uploadResult?.error || 'Backend từ chối tải lên Google Drive.');
          }
        } catch (fetchError: any) {
          throw new Error(`Lỗi tải lên: ${fetchError.message}`);
        }

        // 3. Save Metadata to Supabase
        if (!channel?.id) throw new Error("Chưa kết nối kênh YouTube.");
        
        // Loại bỏ phần mở rộng (extension), áp dụng template và giới hạn 100 ký tự
        let finalTitle = titleTemplate.replace('{filename}', file.name.replace(/\.[^/.]+$/, ""));
        if (finalTitle.length > 100) {
          finalTitle = finalTitle.substring(0, 100);
        }

        const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
        
        const now = new Date().toISOString();
        let videoData: any = {
          user_id: session.user.id,
          channel_id: channel.id, // THÊM DÒNG NÀY
          title: finalTitle,
          description: description,
          tags: tagArray,
          drive_file_id: uploadResult.fileId,
          app_uploaded: true,
          drive_file_url: uploadResult.fileUrl,
        };

        if (publishImmediately) {
          // Immediate publish mode
          videoData.status = 'pending'; // Python worker will pick up immediately since scheduled_for = now
          videoData.scheduled_for = now;
          videoData.publish_now = true;
          videoData.schedule_type = 'immediate';
        } else {
          // Normal schedule mode
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

        if (dbError) {
          throw new Error(dbError.message);
        }

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      setUploadSuccess(true);
      setFiles([]);
      setShowPublishOptions(false);
      
      // Reset form
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
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bulk Upload</h2>
        <p className="text-slate-500">Upload your videos to Google Drive and sync metadata to Supabase.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Videos</CardTitle>
          <CardDescription>Drag and drop your video files here.</CardDescription>
        </CardHeader>
        <CardContent>
          {uploadError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-800">
              <AlertCircle className="h-5 w-5 mr-3 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Upload Failed</p>
                <p className="text-sm text-red-700 mt-1">{uploadError}</p>
              </div>
            </div>
          )}

          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium text-red-600">Drop the videos here ...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-slate-700">Drag & drop videos here, or click to select files</p>
                <p className="text-sm text-slate-500">Supports MP4, MOV, AVI, MKV up to 10GB</p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="font-medium text-slate-900">Selected Files ({files.length})</h3>
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="bg-red-100 p-2 rounded">
                        <FileVideo className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-sm font-medium text-slate-700">
                <span>Uploading to Google Drive & Syncing to Supabase...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                  className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-emerald-800">
              <CheckCircle2 className="h-5 w-5 mr-3 text-emerald-600" />
              <div>
                <p className="font-medium">Upload Successful!</p>
                <p className="text-sm text-emerald-600 mt-1">Files saved to Drive and metadata synced to Supabase.</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6 space-x-3">
          {files.length > 0 && !isUploading && (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowPublishOptions(false)}
                className="min-w-[140px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setPublishImmediately(false);
                  setShowPublishOptions(true);
                }} 
                disabled={isUploading}
                className="min-w-[140px]"
                variant={publishImmediately ? "outline" : "default"}
              >
                Lên Lịch
              </Button>
              <Button 
                onClick={() => {
                  setPublishImmediately(true);
                  setShowPublishOptions(true);
                }} 
                disabled={isUploading}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[180px] font-semibold"
                variant={publishImmediately ? "default" : "outline"}
              >
                🚀 Đăng Ngay Lập Tức
              </Button>
            </>
          )}
          {showPublishOptions && files.length > 0 && !isUploading && (
            <Button 
              onClick={handleUpload} 
              disabled={files.length === 0 || isUploading}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {publishImmediately ? 'Đang đăng...' : 'Đang lên lịch...'}
                </>
              ) : (
                publishImmediately ? '🚀 Đăng Ngay!' : 'Xác Nhận Lên Lịch'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Metadata Form (Shows when files are selected) */}
      {files.length > 0 && !isUploading && !uploadSuccess && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Metadata Settings</CardTitle>
            <CardDescription>Apply these settings to all uploaded videos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title-template">Title Template</Label>
              <Input 
                id="title-template" 
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                placeholder="e.g., {filename} | My Channel" 
              />
              <p className="text-xs text-slate-500">Use {'{filename}'} to insert the original file name.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Default Description</Label>
              <Textarea 
                id="description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter the description for these videos..." 
                rows={4} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input 
                id="tags" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="vlog, tech, review" 
              />
            </div>
            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="font-medium text-slate-900">Scheduling Options</h3>
              
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select value={scheduleType} onValueChange={(val) => setScheduleType(val || 'single')}>
                  <SelectTrigger className="w-full">
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
                    <Label htmlFor="schedule-date">Schedule Date</Label>
                    <Input 
                      id="schedule-date" 
                      type="date" 
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">Schedule Time</Label>
                    <Input 
                      id="schedule-time" 
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
                      <SelectTrigger className="w-full">
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
                    <Label htmlFor="schedule-time">Time of Day</Label>
                    <Input 
                      id="schedule-time" 
                      type="time" 
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {scheduleType === 'continuous' && (
                <div className="space-y-2">
                  <Label htmlFor="continuous-hours">Post Every X Hours</Label>
                  <Input 
                    id="continuous-hours" 
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
                    <Label htmlFor="random-start">Start Date & Time</Label>
                    <Input 
                      id="random-start" 
                      type="datetime-local" 
                      value={randomStartDate}
                      onChange={(e) => setRandomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="random-end">End Date & Time</Label>
                    <Input 
                      id="random-end" 
                      type="datetime-local" 
                      value={randomEndDate}
                      onChange={(e) => setRandomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
