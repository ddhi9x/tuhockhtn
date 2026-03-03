import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { curriculumData } from '@/data/curriculumData';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Available simulation types that are built into the app
const SIM_TYPES = [
  { id: 'friction', label: '⚙️ Lực ma sát', subject: 'physics' },
  { id: 'circuit', label: '⚡ Mạch điện (Ohm)', subject: 'physics' },
  { id: 'ph_scale', label: '🧪 Thang đo pH', subject: 'chemistry' },
  { id: 'atom', label: '⚛️ Cấu tạo Nguyên tử', subject: 'chemistry' },
  { id: 'states_of_matter', label: '🌡️ Các thể của chất', subject: 'chemistry' },
  { id: 'cell', label: '🔬 Cấu tạo Tế bào', subject: 'biology' },
  { id: 'iframe', label: '🖼️ Iframe (HTML ngoài)', subject: 'general' },
];

interface SimRecord {
  id: string;
  lesson_id: string;
  lesson_name: string;
  grade: number;
  sim_type: string;
  title: string;
  description: string | null;
  config: Record<string, any>;
  sort_order: number;
  is_active: boolean;
}

const AdminSimulationsPage = () => {
  const [simulations, setSimulations] = useState<SimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState(6);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'simulation' | 'iframe'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Duplicate state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatingSim, setDuplicatingSim] = useState<SimRecord | null>(null);
  const [dupGrade, setDupGrade] = useState(6);
  const [dupChapter, setDupChapter] = useState('');
  const [dupLesson, setDupLesson] = useState('');

  // Form state
  const [formSimType, setFormSimType] = useState('friction');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formConfig, setFormConfig] = useState('{}');
  const [formOrder, setFormOrder] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const gradeData = curriculumData.find(g => g.grade === selectedGrade);
  const chapters = gradeData?.chapters || [];
  const selectedChapterData = chapters.find(c => c.id === selectedChapter);
  const lessons = selectedChapterData?.lessons || [];
  const selectedLessonData = lessons.find(l => l.id === selectedLesson);

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lesson_simulations')
      .select('*')
      .order('grade')
      .order('lesson_id')
      .order('sort_order');
    if (!error && data) {
      setSimulations(data as SimRecord[]);
    }
    setLoading(false);
  };

  const openAddForm = (lessonId: string) => {
    setEditingId(null);
    setFormSimType('friction');
    setFormTitle('');
    setFormDesc('');
    setFormConfig('{}');
    setFormOrder(0);
    setSelectedLesson(lessonId);
    setShowForm(true);
  };

  const openEditForm = (sim: SimRecord) => {
    setEditingId(sim.id);
    setFormSimType(sim.sim_type);
    setFormTitle(sim.title);
    setFormDesc(sim.description || '');
    setFormConfig(JSON.stringify(sim.config || {}, null, 2));
    setFormOrder(sim.sort_order);
    setSelectedLesson(sim.lesson_id);
    // Find grade/chapter for this lesson
    for (const g of curriculumData) {
      for (const c of g.chapters) {
        if (c.lessons.some(l => l.id === sim.lesson_id)) {
          setSelectedGrade(g.grade);
          setSelectedChapter(c.id);
        }
      }
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selectedLesson || !formTitle.trim()) {
      toast.error('Vui lòng chọn bài học và nhập tiêu đề.');
      return;
    }

    let config = {};
    try {
      config = JSON.parse(formConfig);
    } catch {
      toast.error('Config JSON không hợp lệ.');
      return;
    }

    const lessonData = lessons.find(l => l.id === selectedLesson);
    const payload = {
      lesson_id: selectedLesson,
      lesson_name: lessonData?.name || '',
      grade: selectedGrade,
      sim_type: formSimType,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      config,
      sort_order: formOrder,
      is_active: true,
    };

    if (editingId) {
      const { error } = await supabase
        .from('lesson_simulations')
        .update(payload)
        .eq('id', editingId);
      if (error) { toast.error('Lỗi cập nhật: ' + error.message); return; }
      toast.success('Đã cập nhật mô phỏng!');
    } else {
      const { error } = await supabase
        .from('lesson_simulations')
        .insert(payload);
      if (error) { toast.error('Lỗi thêm: ' + error.message); return; }
      toast.success('Đã thêm mô phỏng!');
    }

    setShowForm(false);
    fetchSimulations();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html')) {
      toast.error('Chỉ hỗ trợ file HTML');
      return;
    }

    setIsUploading(true);
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `lessons/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('html_lessons')
        .upload(filePath, file, {
          contentType: 'text/html; charset=utf-8',
          upsert: false
        });

      if (error) {
        if (error.message.includes('Bucket not found') || error.message.includes('The resource was not found')) {
          toast.error('Vui lòng tạo bucket "html_lessons" ở trạng thái Public trên Supabase Storage trước khi tải lên.');
        } else {
          toast.error('Lỗi tải file: ' + error.message);
        }
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('html_lessons')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update config with the new URL
      try {
        const currentConfig = JSON.parse(formConfig);
        currentConfig.url = publicUrl;
        setFormConfig(JSON.stringify(currentConfig, null, 2));
        toast.success('Đã tải file lên thành công!');
      } catch (err) {
        setFormConfig(JSON.stringify({ url: publicUrl }, null, 2));
        toast.success('Đã tải file lên thành công!');
      }

    } catch (err: any) {
      toast.error('Lỗi tải file: ' + err.message);
    } finally {
      setIsUploading(false);
      // clear input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa mô phỏng này?')) return;
    const { error } = await supabase.from('lesson_simulations').delete().eq('id', id);
    if (error) { toast.error('Lỗi xóa.'); return; }
    toast.success('Đã xóa.');
    fetchSimulations();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from('lesson_simulations').update({ is_active: !current }).eq('id', id);
    fetchSimulations();
  };

  const openDuplicate = (sim: SimRecord) => {
    setDuplicatingSim(sim);
    setDupGrade(sim.grade);
    setDupChapter('');
    setDupLesson('');
    setShowDuplicateModal(true);
  };

  const handleDuplicate = async () => {
    if (!duplicatingSim || !dupLesson) {
      toast.error('Vui lòng chọn bài học đích.');
      return;
    }
    const dupGradeData = curriculumData.find(g => g.grade === dupGrade);
    const dupChapterData = dupGradeData?.chapters.find(c => c.id === dupChapter);
    const dupLessonData = dupChapterData?.lessons.find(l => l.id === dupLesson);

    const { error } = await supabase.from('lesson_simulations').insert({
      lesson_id: dupLesson,
      lesson_name: dupLessonData?.name || '',
      grade: dupGrade,
      sim_type: duplicatingSim.sim_type,
      title: duplicatingSim.title,
      description: duplicatingSim.description,
      config: duplicatingSim.config,
      sort_order: 0,
      is_active: true,
    });

    if (error) {
      toast.error('Lỗi sao chép: ' + error.message);
      return;
    }
    toast.success('Đã sao chép mô phỏng sang bài mới!');
    setShowDuplicateModal(false);
    fetchSimulations();
  };

  const dupGradeData = curriculumData.find(g => g.grade === dupGrade);
  const dupChapters = dupGradeData?.chapters || [];
  const dupChapterData = dupChapters.find(c => c.id === dupChapter);
  const dupLessons = dupChapterData?.lessons || [];

  // Group simulations by lesson and apply filter
  const simsForLesson = (lessonId: string) => {
    return simulations.filter(s => {
      if (s.lesson_id !== lessonId) return false;
      if (filterType === 'all') return true;
      if (filterType === 'iframe') return s.sim_type === 'iframe';
      return s.sim_type !== 'iframe';
    });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MaterialIcon name="admin_panel_settings" size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quản lý Mô phỏng</h1>
            <p className="text-sm text-muted-foreground">Thêm, chỉnh sửa mô phỏng cho từng bài học</p>
          </div>
        </div>

        {/* Grade & Filter selector */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between">
          <div className="flex gap-2">
            {[6, 7, 8, 9].map(g => (
              <button key={g} onClick={() => { setSelectedGrade(g); setSelectedChapter(''); setSelectedLesson(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedGrade === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}>
                Lớp {g}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            {[
              { id: 'all', label: 'Tất cả', icon: 'list' },
              { id: 'simulation', label: 'Mô phỏng', icon: 'science' },
              { id: 'iframe', label: 'HTML (Tự học)', icon: 'html' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === f.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
              >
                <MaterialIcon name={f.icon} size={16} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chapters */}
        <div className="grid gap-3">
          {chapters.map(chapter => (
            <div key={chapter.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setSelectedChapter(selectedChapter === chapter.id ? '' : chapter.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MaterialIcon name={chapter.icon} size={20} className="text-primary" />
                  <span className="font-medium text-sm">{chapter.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {chapter.lessons.length} bài
                  </span>
                </div>
                <MaterialIcon
                  name={selectedChapter === chapter.id ? 'expand_less' : 'expand_more'}
                  size={20} className="text-muted-foreground"
                />
              </button>

              <AnimatePresence>
                {selectedChapter === chapter.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    {chapter.lessons.map(lesson => {
                      const lessonSims = simsForLesson(lesson.id);
                      return (
                        <div key={lesson.id} className="border-b border-border last:border-b-0 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{lesson.name}</span>
                            <button
                              onClick={() => openAddForm(lesson.id)}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MaterialIcon name="add_circle" size={16} />
                              Thêm mô phỏng
                            </button>
                          </div>

                          {lessonSims.length > 0 ? (
                            <div className="space-y-2">
                              {lessonSims.map(sim => (
                                <div key={sim.id} className={`flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 ${!sim.is_active ? 'opacity-50' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                                      {SIM_TYPES.find(s => s.id === sim.sim_type)?.label || sim.sim_type}
                                    </span>
                                    <span className="text-sm">{sim.title}</span>
                                    {sim.description && (
                                      <span className="text-xs text-muted-foreground">– {sim.description}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => openDuplicate(sim)} className="p-1 hover:bg-muted rounded" title="Sao chép sang bài khác">
                                      <MaterialIcon name="content_copy" size={16} className="text-primary" />
                                    </button>
                                    <button onClick={() => handleToggleActive(sim.id, sim.is_active)}
                                      className="p-1 hover:bg-muted rounded" title={sim.is_active ? 'Tắt' : 'Bật'}>
                                      <MaterialIcon name={sim.is_active ? 'visibility' : 'visibility_off'} size={16}
                                        className={sim.is_active ? 'text-success' : 'text-muted-foreground'} />
                                    </button>
                                    <button onClick={() => openEditForm(sim)} className="p-1 hover:bg-muted rounded">
                                      <MaterialIcon name="edit" size={16} className="text-info" />
                                    </button>
                                    <button onClick={() => handleDelete(sim.id)} className="p-1 hover:bg-muted rounded">
                                      <MaterialIcon name="delete" size={16} className="text-destructive" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Chưa có mô phỏng (sẽ dùng auto-detect)</p>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl"
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MaterialIcon name={editingId ? 'edit' : 'add_circle'} size={22} className="text-primary" />
                  {editingId ? 'Chỉnh sửa mô phỏng' : 'Thêm mô phỏng mới'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Bài học</label>
                    <p className="text-sm font-medium bg-muted rounded-lg px-3 py-2">
                      {selectedLessonData?.name || selectedLesson}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Loại mô phỏng</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SIM_TYPES.map(st => (
                        <button key={st.id} onClick={() => {
                          setFormSimType(st.id);
                          if (!formTitle) setFormTitle(st.label.replace(/^[^\s]+\s/, ''));
                        }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${formSimType === st.id
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}>
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tiêu đề hiển thị</label>
                    <input
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="VD: Mạch điện cơ bản"
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Mô tả (tùy chọn)</label>
                    <input
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      placeholder="VD: Khám phá định luật Ohm"
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Config (JSON)</label>
                    <textarea
                      value={formConfig}
                      onChange={e => setFormConfig(e.target.value)}
                      placeholder='{"voltage_max": 24}'
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {formSimType === 'iframe' && (
                      <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <label className="text-xs font-semibold text-primary block mb-2 flex items-center gap-1">
                          <MaterialIcon name="upload_file" size={16} /> Tải lên File HTML
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".html"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 transition-colors"
                            id="html-file-upload"
                          />
                        </div>
                        {isUploading && <p className="text-xs text-info mt-2 flex items-center gap-1"><span className="animate-spin w-3 h-3 border-2 border-info border-t-transparent rounded-full block"></span> Đang tải lên Supabase...</p>}
                        <p className="text-[10px] text-muted-foreground mt-2">
                          * Tải file HTML lên sẽ tự động lấy link chèn vào trường `url` trong Config. (Yêu cầu phải có bucket "html_lessons" trên Supabase).
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Thứ tự hiển thị</label>
                    <input type="number" value={formOrder} onChange={e => setFormOrder(+e.target.value)}
                      className="w-20 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 bg-muted text-muted-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/80">
                    Hủy
                  </button>
                  <button onClick={handleSave}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90">
                    {editingId ? 'Lưu thay đổi' : 'Thêm mô phỏng'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duplicate Modal */}
        <AnimatePresence>
          {showDuplicateModal && duplicatingSim && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDuplicateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl"
              >
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <MaterialIcon name="content_copy" size={22} className="text-primary" />
                  Sao chép mô phỏng
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sao chép "<strong>{duplicatingSim.title}</strong>" sang bài khác
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Lớp</label>
                    <div className="flex gap-2">
                      {[6, 7, 8, 9].map(g => (
                        <button key={g} onClick={() => { setDupGrade(g); setDupChapter(''); setDupLesson(''); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${dupGrade === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          Lớp {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Chương</label>
                    <select value={dupChapter} onChange={e => { setDupChapter(e.target.value); setDupLesson(''); }}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">-- Chọn chương --</option>
                      {dupChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {dupChapter && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Bài học</label>
                      <select value={dupLesson} onChange={e => setDupLesson(e.target.value)}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">-- Chọn bài --</option>
                        {dupLessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowDuplicateModal(false)}
                    className="flex-1 bg-muted text-muted-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/80">
                    Hủy
                  </button>
                  <button onClick={handleDuplicate} disabled={!dupLesson}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                    Sao chép
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminSimulationsPage;
