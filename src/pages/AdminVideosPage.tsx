import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { curriculumData } from '@/data/curriculumData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import MaterialIcon from '@/components/MaterialIcon';

interface VideoRecord {
  id: string;
  grade: number;
  lesson_id: string;
  lesson_name: string;
  chapter_name: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_order: number | null;
  is_active: boolean | null;
}

const AdminVideosPage = () => {
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = useState(6);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);

  // AI Prompt Modal
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [promptLessonId, setPromptLessonId] = useState('');

  // Form state
  const [form, setForm] = useState({
    lesson_id: '',
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration_seconds: '',
  });

  const gradeData = curriculumData.find(g => g.grade === selectedGrade);

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lesson_videos')
      .select('*')
      .eq('grade', selectedGrade)
      .order('chapter_name')
      .order('lesson_id')
      .order('sort_order');
    if (!error && data) setVideos(data as unknown as VideoRecord[]);
    setLoading(false);
  };

  useEffect(() => { fetchVideos(); }, [selectedGrade]);

  const getLessonInfo = (lessonId: string) => {
    for (const ch of gradeData?.chapters || []) {
      const lesson = ch.lessons.find(l => l.id === lessonId);
      if (lesson) return { lessonName: lesson.name, chapterName: ch.name };
    }
    return null;
  };

  const resetForm = () => {
    setForm({ lesson_id: '', title: '', description: '', video_url: '', thumbnail_url: '', duration_seconds: '' });
    setEditingVideo(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({ title: 'File quá lớn', description: 'Tối đa 100MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const cleanFileName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9.\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
    const ext = cleanFileName.split('.').pop();
    const path = `grade-${selectedGrade}/${form.lesson_id || 'general'}/${Date.now()}_${cleanFileName}`;

    const { data, error } = await supabase.storage.from('lesson-videos').upload(path, file);
    if (error) {
      toast({ title: 'Lỗi upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('lesson-videos').getPublicUrl(data.path);
      setForm(prev => ({ ...prev, video_url: urlData.publicUrl }));
      toast({ title: 'Upload thành công!' });
    }
    setUploading(false);
  };

  const openConsultationModal = (lessonId: string) => {
    const info = getLessonInfo(lessonId);
    if (!info) { toast({ title: 'Chọn bài học', description: 'Vui lòng chọn bài học trước.', variant: 'destructive' }); return; }

    setPromptLessonId(lessonId);
    setPromptText(`Bạn là chuyên gia tư liệu phim thí nghiệm Khoa học tự nhiên. 
Bài học: "${info.lessonName}" - Chương: "${info.chapterName}" - Lớp: ${selectedGrade}.
Hãy đề xuất 1 video thí nghiệm tiêu biểu cho bài này. 
Trả về JSON:
{
  "title": "Tiêu đề video thí nghiệm hấp dẫn",
  "description": "Mô tả ngắn gọn nội dung cần có trong video (ví dụ: các bước thí nghiệm, hiện tượng quan sát)",
  "search_keywords": "từ khóa tìm trên YouTube để thầy dễ tìm"
}`);
    setShowPromptModal(true);
  };

  const handleAiConsultation = async () => {
    const lessonId = promptLessonId;
    if (!lessonId) return;

    setIsConsulting(true);
    setShowPromptModal(false);

    try {
      const prompt = promptText;

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: prompt,
          systemPrompt: "Chỉ trả về JSON, không kèm văn bản thừa."
        }
      });

      if (error) throw error;
      const result = typeof data.reply === 'string' ? JSON.parse(data.reply.replace(/```json|```/g, '')) : data.reply;

      setForm(prev => ({
        ...prev,
        lesson_id: lessonId,
        title: result.title || '',
        description: `${result.description || ''}\n(Gợi ý tìm kiếm: ${result.search_keywords || ''})`
      }));
      setDialogOpen(true);
      toast({ title: 'AI đã hoàn thành tư vấn!', description: 'Thầy có thể sử dụng từ khóa gợi ý để tìm video trên YouTube.' });
    } catch (err) {
      toast({ title: 'Lỗi AI', description: 'Không thể kết nối với AI lúc này.', variant: 'destructive' });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.lesson_id || !form.title || !form.video_url) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng điền bài học, tiêu đề và URL video', variant: 'destructive' });
      return;
    }

    const info = getLessonInfo(form.lesson_id);
    if (!info) return;

    const payload = {
      grade: selectedGrade,
      lesson_id: form.lesson_id,
      lesson_name: info.lessonName,
      chapter_name: info.chapterName,
      title: form.title,
      description: form.description || null,
      video_url: form.video_url,
      thumbnail_url: form.thumbnail_url || null,
      duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
    };

    if (editingVideo) {
      const { error } = await supabase.from('lesson_videos').update(payload as any).eq('id', editingVideo.id);
      if (error) { toast({ title: 'Lỗi', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Đã cập nhật video!' });
    } else {
      const { error } = await supabase.from('lesson_videos').insert(payload as any);
      if (error) { toast({ title: 'Lỗi', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Đã thêm video!' });
    }

    resetForm();
    setDialogOpen(false);
    fetchVideos();
  };

  const handleEdit = (video: VideoRecord) => {
    setEditingVideo(video);
    setForm({
      lesson_id: video.lesson_id,
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration_seconds: video.duration_seconds?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa video này?')) return;
    await supabase.from('lesson_videos').delete().eq('id', id);
    toast({ title: 'Đã xóa video' });
    fetchVideos();
  };

  const handleToggleActive = async (video: VideoRecord) => {
    await supabase.from('lesson_videos').update({ is_active: !video.is_active } as any).eq('id', video.id);
    fetchVideos();
  };

  const formatDuration = (s: number | null) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Group videos by chapter
  const videosByChapter: Record<string, VideoRecord[]> = {};
  videos.forEach(v => {
    if (!videosByChapter[v.chapter_name]) videosByChapter[v.chapter_name] = [];
    videosByChapter[v.chapter_name].push(v);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MaterialIcon name="video_library" size={28} />
            Kho Video Thí Nghiệm
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý video thí nghiệm cho từng bài học</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedGrade.toString()} onValueChange={v => setSelectedGrade(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 7, 8, 9].map(g => (
                <SelectItem key={g} value={g.toString()}>Lớp {g}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><MaterialIcon name="add" size={18} /> Thêm video</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVideo ? 'Sửa video' : 'Thêm video mới'}</DialogTitle>
              </DialogHeader>

              {!editingVideo && (
                <Button
                  onClick={() => openConsultationModal(form.lesson_id)}
                  disabled={isConsulting || !form.lesson_id}
                  variant="outline"
                  className="w-full bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 flex items-center gap-2 mb-2"
                >
                  <MaterialIcon name={isConsulting ? "hourglass_empty" : "auto_awesome"} size={18} className={isConsulting ? "animate-spin" : ""} />
                  {isConsulting ? "AI Đang phân tích bài học..." : "AI Tư vấn tìm kiếm video thí nghiệm"}
                </Button>
              )}

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Bài học *</label>
                  <Select value={form.lesson_id} onValueChange={v => setForm(p => ({ ...p, lesson_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Chọn bài học" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {gradeData?.chapters.map(ch => (
                        <React.Fragment key={ch.id}>
                          <SelectItem value={ch.id} disabled className="font-bold text-xs text-muted-foreground">{ch.name}</SelectItem>
                          {ch.lessons.map(l => (
                            <SelectItem key={l.id} value={l.id} className="pl-6 text-sm">{l.name}</SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Tiêu đề video *</label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="VD: Thí nghiệm đo nhiệt độ sôi của nước" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Mô tả</label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả ngắn về video..." rows={2} />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Video *</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} placeholder="URL video (YouTube, Drive, hoặc upload)" className="flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">hoặc</span>
                      <label className="cursor-pointer">
                        <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                        <Button variant="outline" size="sm" asChild disabled={uploading}>
                          <span>
                            <MaterialIcon name={uploading ? 'hourglass_empty' : 'upload'} size={16} />
                            {uploading ? 'Đang upload...' : 'Upload file'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Thumbnail URL</label>
                  <Input value={form.thumbnail_url} onChange={e => setForm(p => ({ ...p, thumbnail_url: e.target.value }))} placeholder="URL ảnh thumbnail (tùy chọn)" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Thời lượng (giây)</label>
                  <Input type="number" value={form.duration_seconds} onChange={e => setForm(p => ({ ...p, duration_seconds: e.target.value }))} placeholder="VD: 180" />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={uploading}>
                  {editingVideo ? 'Cập nhật' : 'Thêm video'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><MaterialIcon name="video_library" size={16} /> {videos.length} video</span>
        <span className="flex items-center gap-1"><MaterialIcon name="check_circle" size={16} /> {videos.filter(v => v.is_active).length} đang hiển thị</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MaterialIcon name="video_library" size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có video nào cho lớp {selectedGrade}</p>
            <p className="text-sm mt-1">Nhấn "Thêm video" để bắt đầu xây dựng kho video thí nghiệm</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(videosByChapter).map(([chapterName, chapterVideos]) => (
            <Card key={chapterName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MaterialIcon name="folder" size={20} />
                  {chapterName}
                  <Badge variant="secondary" className="ml-auto">{chapterVideos.length} video</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chapterVideos.map(video => (
                  <div key={video.id} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${video.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                    <div className="w-16 h-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <MaterialIcon name="play_circle" size={24} className="text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground truncate">{video.title}</p>
                        <button
                          onClick={() => openConsultationModal(video.lesson_id)}
                          disabled={isConsulting && promptLessonId === video.lesson_id}
                          className="flex items-center justify-center gap-1 text-[10px] font-bold bg-gradient-to-r from-primary/80 to-info/80 text-white px-2 py-0.5 rounded-full hover:opacity-100 transition-all disabled:opacity-50"
                          title="AI tìm video tự động"
                        >
                          <MaterialIcon name={(isConsulting && promptLessonId === video.lesson_id) ? "hourglass_empty" : "lightbulb"} size={12} className={(isConsulting && promptLessonId === video.lesson_id) ? "animate-spin" : ""} />
                          AI Tìm nhanh
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{video.lesson_name}</p>
                      {video.duration_seconds && (
                        <span className="text-xs text-muted-foreground">{formatDuration(video.duration_seconds)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(video.video_url, '_blank')}>
                        <MaterialIcon name="open_in_new" size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(video)}>
                        <MaterialIcon name={video.is_active ? 'visibility' : 'visibility_off'} size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(video)}>
                        <MaterialIcon name="edit" size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(video.id)}>
                        <MaterialIcon name="delete" size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-border animate-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-border bg-primary/5">
              <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                <MaterialIcon name="auto_awesome" /> Lệnh Tìm Video (AI Prompt)
              </h2>
              <button onClick={() => setShowPromptModal(false)} className="text-muted-foreground hover:text-foreground">
                <MaterialIcon name="close" size={24} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-info/10 text-info border border-info/20 p-3 rounded-lg text-sm flex gap-3">
                <MaterialIcon name="tips_and_updates" />
                <div>
                  <span className="font-bold">Hệ thống đã tự động chèn bối cảnh bài học.</span> Thầy có thể cấu hình thêm điều kiện tìm video (ví dụ: "chỉ tìm video có giải thích tiếng việt") vào ô bên dưới.
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-1 block">Yêu cầu gửi lên AI (Prompt)</label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full h-48 bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-inner font-mono"
                  placeholder="Nhập yêu cầu cho AI..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleAiConsultation}
                  disabled={isConsulting}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-info text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <MaterialIcon name={isConsulting ? "hourglass_empty" : "send"} size={18} className={isConsulting ? "animate-spin" : ""} />
                  {isConsulting ? "Đang phân tích..." : "Gửi yêu cầu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVideosPage;
