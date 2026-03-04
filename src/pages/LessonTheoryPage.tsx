import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';
import SimulationPanel from '@/components/SimulationPanel';
import ImageLightbox from '@/components/ImageLightbox';

// Emoji/icon mapping for visual sections
const topicEmojis: Record<string, string> = {
  'vật lí': '⚡', 'vật lý': '⚡', 'lực': '💪', 'chuyển động': '🏃',
  'hóa học': '🧪', 'hóa': '🧪', 'chất': '💧', 'nguyên tử': '⚛️',
  'sinh học': '🌿', 'sinh': '🌿', 'tế bào': '🔬', 'sống': '❤️',
  'trái đất': '🌍', 'thiên văn': '🚀', 'vũ trụ': '✨',
  'năng lượng': '🔥', 'nhiệt': '🌡️', 'ánh sáng': '☀️',
  'điện': '⚡', 'từ': '🧲', 'âm thanh': '🔊',
  'nước': '💧', 'không khí': '🌬️', 'môi trường': '🌳',
  'vai trò': '💡', 'ứng dụng': '🛠️', 'lĩnh vực': '📂',
  'khái niệm': '📖', 'định nghĩa': '📝', 'tính chất': '🔧',
  'cấu tạo': '🏗️', 'thí nghiệm': '🔬', 'quan sát': '👀',
  'an toàn': '🛡️', 'kính': '🔍', 'đo': '📏', 'khối lượng': '⚖️',
  'thời gian': '⏱️', 'nhiệt độ': '🌡️', 'oxygen': '🫧',
  'vật liệu': '🧱', 'nhiên liệu': '⛽', 'hỗn hợp': '🥣',
  'tách': '🧫', 'phân tử': '🔗', 'nguyên tố': '🧬',
};

const getTopicEmoji = (title: string): string => {
  const lower = title.toLowerCase();
  for (const [keyword, emoji] of Object.entries(topicEmojis)) {
    if (lower.includes(keyword)) return emoji;
  }
  return '📘';
};

const sectionStyles = [
  { gradient: 'from-primary/10 to-primary/5', border: 'border-primary/25', accent: 'bg-primary', accentText: 'text-primary' },
  { gradient: 'from-info/10 to-info/5', border: 'border-info/25', accent: 'bg-info', accentText: 'text-info' },
  { gradient: 'from-success/10 to-success/5', border: 'border-success/25', accent: 'bg-success', accentText: 'text-success' },
  { gradient: 'from-warning/10 to-warning/5', border: 'border-warning/25', accent: 'bg-warning', accentText: 'text-warning' },
  { gradient: 'from-destructive/10 to-destructive/5', border: 'border-destructive/25', accent: 'bg-destructive', accentText: 'text-destructive' },
];

interface ParsedSection {
  title: string;
  emoji: string;
  bullets: string[];
  examples: string[];
  definition?: string;
  rawText: string; // The original markdown for this section
}

// Extract clean text content from potentially JSON-wrapped data
const extractCleanContent = (raw: string): { content: string; summary: string; keyPoints: string[] } => {
  if (!raw) return { content: '', summary: '', keyPoints: [] };

  let str = raw.trim();

  // Remove code block wrapper
  const cbMatch = str.match(/^```(?:json)?\s*\n([\s\S]*)\n\s*```$/);
  if (cbMatch) str = cbMatch[1].trim();

  // If it looks like a JSON wrapper with "content" key, extract manually
  if (str.startsWith('{') && str.includes('"content"')) {
    // Extract "content" value - find the start and end of the value string
    const contentStart = str.indexOf('"content"');
    if (contentStart !== -1) {
      // Find the colon after "content", then the opening quote
      const colonIdx = str.indexOf(':', contentStart + 9);
      if (colonIdx !== -1) {
        const quoteStart = str.indexOf('"', colonIdx + 1);
        if (quoteStart !== -1) {
          // Find matching closing quote (not escaped)
          let i = quoteStart + 1;
          let content = '';
          while (i < str.length) {
            if (str[i] === '\\' && i + 1 < str.length) {
              // Handle escape sequences
              const next = str[i + 1];
              if (next === 'n') { content += '\n'; i += 2; }
              else if (next === '"') { content += '"'; i += 2; }
              else if (next === '\\') { content += '\\'; i += 2; }
              else if (next === 't') { content += '\t'; i += 2; }
              else { content += str[i]; i++; }
            } else if (str[i] === '"') {
              // End of string value
              break;
            } else {
              content += str[i];
              i++;
            }
          }
          if (content.length > 20) {
            // Also try to extract summary and key_points via simple regex
            let summary = '';
            const sumMatch = str.match(/"summary"\s*:\s*"([^"]*)"/);
            if (sumMatch) summary = sumMatch[1].replace(/\\n/g, '\n');

            let keyPoints: string[] = [];
            const kpMatch = str.match(/"key_points"\s*:\s*\[([\s\S]*?)\]/);
            if (kpMatch) {
              const matches = kpMatch[1].match(/"([^"]*)"/g);
              if (matches) keyPoints = matches.map(m => m.replace(/^"|"$/g, ''));
            }

            return { content, summary, keyPoints };
          }
        }
      }
    }
  }

  // Already clean markdown
  return { content: str, summary: '', keyPoints: [] };
};

// Parse markdown content into visual sections
const parseToSections = (text: string): ParsedSection[] => {
  const lines = text.split('\n');
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  let currentRawLines: string[] = [];

  const pushCurrent = () => {
    if (current && (current.bullets.length > 0 || current.definition || current.examples.length > 0)) {
      current.rawText = currentRawLines.join('\n');
      sections.push(current);
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^#{2,4}\s+/.test(trimmed)) {
      pushCurrent();
      const title = trimmed.replace(/^#{2,4}\s+/, '').replace(/^\d+\.\s*/, '');
      current = { title, emoji: getTopicEmoji(title), bullets: [], examples: [], definition: undefined, rawText: '' };
      currentRawLines = [line];
    } else if (trimmed.startsWith('# ')) {
      // Skip H1 but record it if it's the very first part of content?
      // For now skip.
    } else if (current) {
      currentRawLines.push(line);
      // Check if it's a bullet point
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const text = trimmed.replace(/^[-*•]\s*/, '');
        current.bullets.push(text);
      }
      else if (trimmed.toLowerCase().startsWith('ví dụ') || trimmed.startsWith('**ví dụ')) {
        current.examples.push(trimmed.replace(/^\*\*ví dụ[^*]*\*\*:?\s*/i, '').replace(/^ví dụ:?\s*/i, ''));
      }
      else if (trimmed.startsWith('**') && trimmed.includes('**') && trimmed.length < 300) {
        if (!current.definition) {
          current.definition = trimmed.replace(/\*\*/g, '');
        } else {
          current.bullets.push(trimmed);
        }
      }
      else if (trimmed.length > 20) {
        const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(s => s.length > 15);
        if (sentences.length > 2) {
          sentences.slice(0, 3).forEach(s => current!.bullets.push(s));
        } else {
          current.bullets.push(trimmed);
        }
      }
    }
  }
  pushCurrent();
  return sections;
};

// Render inline markdown (bold, italic)
const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
};

// Visual section card component
const SectionCard = ({ section, index, illustrationUrl, onGenerateIllustration, onUploadIllustration, onDeleteIllustration, onEdit, isGenerating, fs }: {
  section: ParsedSection; index: number;
  illustrationUrl?: string;
  onGenerateIllustration?: () => void;
  onUploadIllustration?: (file: File) => void;
  onDeleteIllustration?: () => void;
  onEdit?: () => void;
  isGenerating?: boolean;
  fs: typeof FONT_SIZES[0];
}) => {
  const style = sectionStyles[index % sectionStyles.length];
  const keyBullets = section.bullets.slice(0, 4);
  const hasMore = section.bullets.length > 4;
  const [expanded, setExpanded] = useState(false);
  const displayBullets = expanded ? section.bullets : keyBullets;
  const uploadRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`rounded-2xl border ${style.border} bg-gradient-to-br ${style.gradient} overflow-hidden`}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="text-3xl">{section.emoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className={`${fs.heading} font-bold text-foreground leading-tight`}>{section.title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Sửa nội dung này"
            >
              <MaterialIcon name="border_color" size={16} />
            </button>
          )}
          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${style.accent} text-white tracking-wider`}>
            {index + 1}
          </span>
        </div>
      </div>

      {/* Illustration */}
      {illustrationUrl ? (
        <div className="mx-4 mb-3">
          <ImageLightbox src={illustrationUrl} alt={`Minh họa: ${section.title}`}>
            <div className="rounded-xl overflow-hidden border border-border/50 bg-card/50">
              <img
                src={illustrationUrl}
                alt={`Minh họa: ${section.title}`}
                className="w-full h-auto object-contain max-h-[500px]"
                loading="lazy"
              />
            </div>
          </ImageLightbox>
          {/* Admin actions: regenerate / upload / delete */}
          {onGenerateIllustration && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onGenerateIllustration}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${fs.sub} font-medium border border-border/50 bg-card/80 hover:bg-card transition-all ${isGenerating ? 'opacity-60 cursor-wait' : ''
                  }`}
              >
                {isGenerating ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MaterialIcon name="refresh" size={14} className={style.accentText} />
                )}
                <span className="text-muted-foreground">Tạo lại AI</span>
              </button>
              <button
                onClick={() => uploadRef.current?.click()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${fs.sub} font-medium border border-border/50 bg-card/80 hover:bg-card transition-all`}
              >
                <MaterialIcon name="upload" size={14} className={style.accentText} />
                <span className="text-muted-foreground">Tải ảnh lên</span>
              </button>
              {onDeleteIllustration && (
                <button
                  onClick={onDeleteIllustration}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${fs.sub} font-medium border border-destructive/30 bg-card/80 hover:bg-destructive/10 transition-all`}
                >
                  <MaterialIcon name="delete" size={14} className="text-destructive" />
                  <span className="text-destructive/80">Xóa</span>
                </button>
              )}
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onUploadIllustration) onUploadIllustration(file);
                  e.target.value = '';
                }}
              />
            </div>
          )}
        </div>
      ) : onGenerateIllustration ? (
        <div className="mx-4 mb-3 flex gap-2">
          <button
            onClick={onGenerateIllustration}
            disabled={isGenerating}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed ${style.border} ${fs.sub} font-medium transition-all ${isGenerating ? 'opacity-60 cursor-wait' : 'hover:bg-card/50 cursor-pointer'
              }`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-muted-foreground">AI đang vẽ minh họa...</span>
              </>
            ) : (
              <>
                <MaterialIcon name="brush" size={16} className={style.accentText} />
                <span className={style.accentText}>Tạo hình AI</span>
              </>
            )}
          </button>
          <button
            onClick={() => uploadRef.current?.click()}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed ${style.border} ${fs.sub} font-medium transition-all hover:bg-card/50 cursor-pointer`}
          >
            <MaterialIcon name="upload" size={16} className={style.accentText} />
            <span className={style.accentText}>Tải lên</span>
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onUploadIllustration) onUploadIllustration(file);
              e.target.value = '';
            }}
          />
        </div>
      ) : null}

      {/* Definition highlight */}
      {section.definition && (
        <div className="mx-4 mb-2 p-3 rounded-xl bg-card/80 border border-border/50 backdrop-blur">
          <p className={`${fs.body} font-medium text-foreground/90 leading-relaxed italic`}>
            💡 {renderInline(section.definition)}
          </p>
        </div>
      )}

      {/* Key bullets */}
      <div className="px-4 pb-3 space-y-1.5">
        {displayBullets.map((bullet, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${style.accent} mt-2 shrink-0`} />
            <p className={`${fs.body} text-foreground/75 leading-relaxed`}>{renderInline(bullet)}</p>
          </div>
        ))}
        {hasMore && !expanded && (
          <button onClick={() => setExpanded(true)} className={`${fs.sub} font-medium ${style.accentText} hover:underline ml-3.5`}>
            Xem thêm {section.bullets.length - 4} điểm ▼
          </button>
        )}
        {expanded && hasMore && (
          <button onClick={() => setExpanded(false)} className={`${fs.sub} font-medium ${style.accentText} hover:underline ml-3.5`}>
            Thu gọn ▲
          </button>
        )}
      </div>

      {/* Examples */}
      {section.examples.length > 0 && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-warning/8 border border-warning/20">
          <p className={`${fs.sub} font-bold text-warning uppercase tracking-wider mb-1`}>🔬 Ví dụ minh họa</p>
          {section.examples.map((ex, i) => (
            <p key={i} className={`${fs.body} text-foreground/70 leading-relaxed`}>{renderInline(ex)}</p>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Font size presets
const FONT_SIZES = [
  { label: 'Nhỏ', value: 0, body: 'text-xs', heading: 'text-sm', sub: 'text-[10px]', detail: 'text-[11px]' },
  { label: 'Vừa', value: 1, body: 'text-sm', heading: 'text-base', sub: 'text-xs', detail: 'text-xs' },
  { label: 'Lớn', value: 2, body: 'text-base', heading: 'text-lg', sub: 'text-sm', detail: 'text-sm' },
];

const LessonTheoryPage = () => {
  const { grade } = useParams<{ grade: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { setActiveLesson } = useAppContext();
  const lessonId = searchParams.get('lessonId') || '';
  const lessonName = searchParams.get('lessonName') || '';
  const chapterName = searchParams.get('chapterName') || '';
  const gradeNum = parseInt(grade || '6');

  const [activeTab, setActiveTab] = useState<'theory' | 'simulation' | 'self_study' | 'video'>('theory');
  const [lessonVideos, setLessonVideos] = useState<any[]>([]);

  // Set tab from query params if available
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'simulation' || tabParam === 'self_study' || tabParam === 'video') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // Record current context for Chatbot
    if (lessonId && lessonName && chapterName && gradeNum) {
      setActiveLesson({
        id: lessonId,
        name: lessonName,
        chapter: chapterName,
        grade: gradeNum.toString()
      });
    }
  }, [lessonId, lessonName, chapterName, gradeNum, setActiveLesson]);

  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [rawContent, setRawContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editKeyPoints, setEditKeyPoints] = useState<string[]>([]);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [illustrations, setIllustrations] = useState<Record<string, string>>({});
  const [generatingIllustration, setGeneratingIllustration] = useState<string | null>(null);
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [tempSectionMarkdown, setTempSectionMarkdown] = useState('');
  const [fontSizeIdx, setFontSizeIdx] = useState(() => {
    try { return parseInt(localStorage.getItem('theory-font-size') || '1'); } catch { return 1; }
  });
  const fontSize = FONT_SIZES[fontSizeIdx] || FONT_SIZES[1];

  const cycleFontSize = () => {
    const next = (fontSizeIdx + 1) % FONT_SIZES.length;
    setFontSizeIdx(next);
    localStorage.setItem('theory-font-size', String(next));
  };

  const handleGenerateIllustration = async (sectionTitle: string, sectionDescription?: string) => {
    setGeneratingIllustration(sectionTitle);
    try {
      const { data, error } = await supabase.functions.invoke('generate-illustration', {
        body: { sectionTitle, lessonName, chapterName, grade: gradeNum, lessonId, description: sectionDescription },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        setIllustrations(prev => {
          const updated = { ...prev, [sectionTitle]: data.url };
          // Persist to DB immediately
          supabase.from('lesson_theory')
            .update({ illustrations: updated })
            .eq('lesson_id', lessonId)
            .then(({ error: upErr }) => {
              if (upErr) console.error("Error persisting illustration:", upErr);
            });
          return updated;
        });
        toast.success(`Đã tạo hình minh họa cho "${sectionTitle}"!`);
      }
    } catch (err: any) {
      toast.error('Lỗi tạo hình: ' + (err?.message || 'Unknown'));
    }
    setGeneratingIllustration(null);
  };

  const handleGenerateAllIllustrations = async () => {
    const secs = rawContent ? parseToSections(rawContent) : [];
    const missing = secs.filter(s => !illustrations[s.title]);
    if (missing.length === 0) { toast.info('Tất cả section đã có hình minh họa.'); return; }
    toast.info(`Đang tạo ${missing.length} hình minh họa...`);
    for (const sec of missing) {
      await handleGenerateIllustration(sec.title, sec.definition || sec.bullets.slice(0, 2).join('. '));
    }
    toast.success('Hoàn thành tạo hình minh họa!');
  };

  const handleUploadIllustration = async (sectionTitle: string, file: File) => {
    setGeneratingIllustration(sectionTitle);
    try {
      const safeName = sectionTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40);
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${lessonId}/${safeName}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('theory-illustrations')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('theory-illustrations').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Update DB
      const newIllustrations = { ...illustrations, [sectionTitle]: publicUrl };
      await supabase.from('lesson_theory').update({ illustrations: newIllustrations }).eq('lesson_id', lessonId);
      setIllustrations(newIllustrations);
      toast.success(`Đã tải ảnh lên cho "${sectionTitle}"!`);
    } catch (err: any) {
      toast.error('Lỗi tải ảnh: ' + (err?.message || 'Unknown'));
    }
    setGeneratingIllustration(null);
  };

  const handleDeleteIllustration = async (sectionTitle: string) => {
    try {
      const newIllustrations = { ...illustrations };
      delete newIllustrations[sectionTitle];
      await supabase.from('lesson_theory').update({ illustrations: newIllustrations }).eq('lesson_id', lessonId);
      setIllustrations(newIllustrations);
      toast.success('Đã xóa hình minh họa.');
    } catch {
      toast.error('Lỗi khi xóa hình.');
    }
  };

  const startEditing = () => {
    setEditSummary(summary);
    setEditKeyPoints([...keyPoints]);
    setEditContent(rawContent);
    setIsEditing(true);
  };

  const startSectionEdit = (idx: number, markdown: string) => {
    setEditingSectionIdx(idx);
    setTempSectionMarkdown(markdown);
  };

  const handleSaveSection = () => {
    if (editingSectionIdx === null) return;
    const secs = rawContent ? parseToSections(rawContent) : [];
    if (editingSectionIdx >= secs.length) return;

    // Build new content by replacing old raw section
    const oldRaw = secs[editingSectionIdx].rawText;
    const newRawContent = rawContent.replace(oldRaw, tempSectionMarkdown);

    // Save using standard save logic
    setEditContent(newRawContent);
    setEditSummary(summary);
    setEditKeyPoints(keyPoints);

    // Call saveEdits effectively
    (async () => {
      setIsSaving(true);
      try {
        await supabase.from('lesson_theory').upsert({
          lesson_id: lessonId, lesson_name: lessonName, grade: gradeNum,
          chapter_name: chapterName, content: newRawContent, summary: summary, key_points: keyPoints,
          illustrations: illustrations,
        }, { onConflict: 'lesson_id' });
        setRawContent(newRawContent);
        setEditingSectionIdx(null);
        toast.success('Đã lưu thay đổi phần này!');
      } catch {
        toast.error('Lỗi khi lưu.');
      } finally { setIsSaving(false); }
    })();
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdits = async () => {
    setIsSaving(true);
    try {
      await supabase.from('lesson_theory').upsert({
        lesson_id: lessonId, lesson_name: lessonName, grade: gradeNum,
        chapter_name: chapterName, content: editContent, summary: editSummary, key_points: editKeyPoints,
        illustrations: illustrations,
      }, { onConflict: 'lesson_id' });
      setSummary(editSummary);
      setKeyPoints(editKeyPoints);
      setRawContent(editContent);
      setIsEditing(false);
      toast.success('Đã lưu thay đổi!');
    } catch {
      toast.error('Lỗi khi lưu.');
    } finally { setIsSaving(false); }
  };

  const updateKeyPoint = (index: number, value: string) => {
    setEditKeyPoints(prev => prev.map((p, i) => i === index ? value : p));
  };
  const removeKeyPoint = (index: number) => {
    setEditKeyPoints(prev => prev.filter((_, i) => i !== index));
  };
  const addKeyPoint = () => {
    setEditKeyPoints(prev => [...prev, '']);
  };

  useEffect(() => {
    const fetchTheory = async () => {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('lesson_theory')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (data && !error) {
        const extracted = extractCleanContent(data.content || '');
        setRawContent(extracted.content);
        setSummary(data.summary || extracted.summary || '');
        setKeyPoints((data.key_points as string[]) || extracted.keyPoints || []);
        setIllustrations((data.illustrations as Record<string, string>) || {});
      }
      setIsFetching(false);

      // Fetch videos as well
      const { data: vData } = await supabase
        .from('lesson_videos')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_active', true)
        .order('sort_order');
      if (vData) setLessonVideos(vData);
    };
    if (lessonId) fetchTheory();
  }, [lessonId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setUploadProgress(10);
    try {
      const textContent = await file.text();
      if (textContent.length < 20) { toast.error('File không có đủ nội dung.'); setIsLoading(false); return; }
      setRawContent(textContent);
      setUploadProgress(30);
      await summarizeContent(textContent);
    } catch { toast.error('Lỗi khi đọc file.'); setIsLoading(false); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteText = async () => {
    const text = await navigator.clipboard.readText();
    if (!text || text.length < 20) { toast.error('Clipboard không có đủ nội dung.'); return; }
    setRawContent(text);
    setIsLoading(true);
    setUploadProgress(30);
    await summarizeContent(text);
  };

  const [manualText, setManualText] = useState('');
  const handleManualSubmit = async () => {
    if (manualText.length < 20) { toast.error('Nội dung quá ngắn.'); return; }
    setRawContent(manualText);
    setIsLoading(true);
    setUploadProgress(30);
    await summarizeContent(manualText);
  };

  const summarizeContent = async (content: string) => {
    try {
      setUploadProgress(50);
      const { data, error } = await supabase.functions.invoke('summarize-textbook', {
        body: { content, lessonName, chapterName, grade: gradeNum },
      });
      if (error) throw error;
      setUploadProgress(80);
      const newSummary = data.summary || '';
      const newKeyPoints = data.key_points || [];
      setSummary(newSummary);
      setKeyPoints(newKeyPoints);
      await supabase.from('lesson_theory').upsert({
        lesson_id: lessonId, lesson_name: lessonName, grade: gradeNum,
        chapter_name: chapterName, content, summary: newSummary, key_points: newKeyPoints,
      }, { onConflict: 'lesson_id' });
      setUploadProgress(100);
      toast.success('Đã tóm tắt và lưu lý thuyết thành công!');
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tóm tắt nội dung.');
    } finally { setIsLoading(false); setUploadProgress(0); }
  };

  const sections = rawContent ? parseToSections(rawContent) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(`/exercises/${gradeNum}`)} className="text-muted-foreground hover:text-foreground">
            <MaterialIcon name="arrow_back" size={20} />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">{chapterName}</p>
            <h1 className="text-lg font-bold">{lessonName}</h1>
          </div>
        </div>
        <div className="flex gap-1 mt-3">
          {[
            { id: 'theory' as const, label: 'Lý thuyết SGK', icon: 'menu_book' },
            { id: 'self_study' as const, label: 'Tự học (HTML)', icon: 'html' },
            { id: 'simulation' as const, label: 'Mô phỏng', icon: 'science' },
            { id: 'video' as const, label: 'Video Thí nghiệm', icon: 'video_library' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
            >
              <MaterialIcon name={tab.icon} size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto scrollbar-thin ${activeTab === 'theory' || activeTab === 'video' ? 'p-6' : 'p-0'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'theory' ? (
            <motion.div key="theory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isFetching ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (rawContent || summary) ? (
                <div className="max-w-5xl mx-auto space-y-5">

                  {/* Edit/View toggle */}
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={cancelEditing} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
                          Hủy
                        </button>
                        <button onClick={saveEdits} disabled={isSaving} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1">
                          <MaterialIcon name={isSaving ? "hourglass_empty" : "save"} size={14} />
                          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </>
                    ) : (
                      <button onClick={startEditing} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1">
                        <MaterialIcon name="edit" size={14} />
                        Chỉnh sửa
                      </button>
                    )}
                    <button
                      onClick={cycleFontSize}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium transition-colors"
                      title="Thay đổi cỡ chữ"
                    >
                      <MaterialIcon name="text_fields" size={16} />
                      Cỡ chữ: {fontSize.label}
                    </button>
                  </div>

                  {/* Hero Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/15 via-info/8 to-success/8 border border-primary/20 p-5"
                  >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full -translate-y-10 translate-x-10" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-info/5 rounded-full translate-y-8 -translate-x-8" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-extrabold uppercase tracking-widest">
                          Lớp {gradeNum}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{chapterName}</span>
                      </div>
                      <h2 className="text-lg font-bold text-foreground">{lessonName}</h2>
                      {isEditing ? (
                        <textarea
                          value={editSummary}
                          onChange={e => setEditSummary(e.target.value)}
                          placeholder="Tóm tắt bài học..."
                          className="w-full mt-2 bg-background/80 border border-border rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                          rows={3}
                        />
                      ) : summary ? (
                        <p className={`${fontSize.body} text-foreground/60 mt-2 leading-relaxed line-clamp-2`}>{summary}</p>
                      ) : null}
                    </div>
                  </motion.div>

                  {/* Key Points */}
                  {(isEditing || keyPoints.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-lg">💡</span>
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Điểm chính</h3>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          {editKeyPoints.map((point, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-lg ${sectionStyles[i % sectionStyles.length].accent} text-white flex items-center justify-center text-[10px] font-extrabold shrink-0`}>
                                {i + 1}
                              </span>
                              <input
                                value={point}
                                onChange={e => updateKeyPoint(i, e.target.value)}
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder={`Điểm chính ${i + 1}`}
                              />
                              <button onClick={() => removeKeyPoint(i)} className="text-muted-foreground hover:text-destructive">
                                <MaterialIcon name="close" size={16} />
                              </button>
                            </div>
                          ))}
                          <button onClick={addKeyPoint} className="text-xs text-primary hover:underline flex items-center gap-1 ml-8">
                            <MaterialIcon name="add" size={14} /> Thêm điểm chính
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x">
                          {keyPoints.map((point, i) => {
                            const style = sectionStyles[i % sectionStyles.length];
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.06 }}
                                className={`snap-start shrink-0 w-56 p-3.5 rounded-xl border ${style.border} bg-gradient-to-br ${style.gradient}`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className={`w-6 h-6 rounded-lg ${style.accent} text-white flex items-center justify-center text-[10px] font-extrabold shrink-0`}>
                                    {i + 1}
                                  </span>
                                  <p className={`${fontSize.detail} leading-relaxed text-foreground/80`}>{point}</p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Content sections */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📚</span>
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Nội dung (Markdown)</h3>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl p-4 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[300px]"
                        placeholder="## Tiêu đề section&#10;- Nội dung bullet&#10;- Nội dung khác..."
                      />
                      <p className="text-[10px] text-muted-foreground">
                        💡 Dùng <code className="bg-muted px-1 rounded">## Tiêu đề</code> để tạo section, <code className="bg-muted px-1 rounded">- text</code> để tạo bullet point, <code className="bg-muted px-1 rounded">**text**</code> để in đậm
                      </p>
                    </div>
                  ) : (
                    <>
                      {sections.length > 0 && (
                        <div className="space-y-4 pt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📚</span>
                              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Nội dung bài học</h3>
                            </div>
                            {isAdmin && sections.some(s => !illustrations[s.title]) && (
                              <button
                                onClick={handleGenerateAllIllustrations}
                                disabled={generatingIllustration !== null}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                              >
                                <MaterialIcon name="auto_awesome" size={14} />
                                Tạo tất cả hình minh họa
                              </button>
                            )}
                          </div>
                          {sections.map((section, i) => (
                            <SectionCard
                              key={i}
                              section={section}
                              index={i}
                              illustrationUrl={illustrations[section.title]}
                              onGenerateIllustration={isAdmin ? () => handleGenerateIllustration(
                                section.title,
                                section.definition || section.bullets.slice(0, 2).join('. ')
                              ) : undefined}
                              onUploadIllustration={isAdmin ? (file) => handleUploadIllustration(section.title, file) : undefined}
                              onDeleteIllustration={isAdmin ? () => handleDeleteIllustration(section.title) : undefined}
                              onEdit={isAdmin ? () => startSectionEdit(i, section.rawText) : undefined}
                              isGenerating={generatingIllustration === section.title}
                              fs={fontSize}
                            />
                          ))}
                        </div>
                      )}

                      {/* Section Edit Modal */}
                      <AnimatePresence>
                        {editingSectionIdx !== null && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                            >
                              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <MaterialIcon name="edit_note" size={20} className="text-primary" />
                                  <h3 className="text-sm font-bold">Sửa nội dung phần {editingSectionIdx + 1}</h3>
                                </div>
                                <button onClick={() => setEditingSectionIdx(null)} className="text-muted-foreground hover:text-foreground">
                                  <MaterialIcon name="close" size={20} />
                                </button>
                              </div>
                              <div className="p-4">
                                <textarea
                                  value={tempSectionMarkdown}
                                  onChange={e => setTempSectionMarkdown(e.target.value)}
                                  className="w-full h-64 bg-background border border-border rounded-xl p-4 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder="Nhập nội dung Markdown..."
                                  autoFocus
                                />
                                <div className="mt-4 flex justify-end gap-2">
                                  <button onClick={() => setEditingSectionIdx(null)} className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors">
                                    Hủy bỏ
                                  </button>
                                  <button
                                    onClick={handleSaveSection}
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                                  >
                                    {isSaving ? <MaterialIcon name="hourglass_empty" size={14} className="animate-spin" /> : <MaterialIcon name="save" size={14} />}
                                    Lưu thay đổi
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                      {sections.length === 0 && summary && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-card border border-border rounded-2xl p-5"
                        >
                          <div className="space-y-2">
                            {summary.split('\n').filter(l => l.trim()).map((line, i) => (
                              <p key={i} className={`${fontSize.body} text-foreground/75 leading-relaxed`}>{renderInline(line)}</p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* Font size control + Footer */}
                  <div className="flex items-center justify-between pt-3 pb-8">
                    <button
                      onClick={() => { setSummary(''); setKeyPoints([]); setRawContent(''); }}
                      className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <MaterialIcon name="refresh" size={12} />
                      Cập nhật lại nội dung
                    </button>
                    <button
                      onClick={cycleFontSize}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium transition-colors"
                      title="Thay đổi cỡ chữ"
                    >
                      <MaterialIcon name="text_fields" size={16} />
                      {fontSize.label}
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload Area */
                <div className="max-w-5xl mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <MaterialIcon name="upload_file" size={32} className="text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">Nhập nội dung SGK</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload file hoặc paste nội dung SGK, AI sẽ tự động tóm tắt và tạo điểm chính.
                    </p>
                  </div>

                  {isLoading ? (
                    <div className="bg-card border border-border rounded-xl p-8 text-center">
                      <div className="animate-spin w-10 h-10 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="font-medium">AI đang tóm tắt nội dung...</p>
                      <div className="w-64 h-2 bg-muted rounded-full mx-auto mt-4 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-card border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                      >
                        <MaterialIcon name="cloud_upload" size={40} className="text-primary/60 mx-auto mb-3" />
                        <p className="font-medium text-sm">Kéo thả hoặc bấm để chọn file</p>
                        <p className="text-xs text-muted-foreground mt-1">.txt, .md hoặc file văn bản</p>
                        <input ref={fileInputRef} type="file" accept=".txt,.md,.text" onChange={handleFileUpload} className="hidden" />
                      </div>
                      <button onClick={handlePasteText} className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                          <MaterialIcon name="content_paste" size={20} className="text-info" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">Dán từ clipboard</p>
                          <p className="text-xs text-muted-foreground">Copy nội dung SGK rồi bấm vào đây</p>
                        </div>
                      </button>
                      <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <MaterialIcon name="edit_note" size={18} className="text-primary" />
                          Hoặc nhập trực tiếp
                        </p>
                        <textarea
                          value={manualText}
                          onChange={e => setManualText(e.target.value)}
                          placeholder="Paste hoặc gõ nội dung SGK vào đây..."
                          className="w-full h-40 bg-muted/50 border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                          onClick={handleManualSubmit}
                          disabled={manualText.length < 20}
                          className="mt-3 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                          <MaterialIcon name="auto_awesome" size={18} />
                          AI Tóm tắt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'video' ? (
            <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto space-y-8">
              {lessonVideos.length > 0 ? (
                <div className="grid gap-8">
                  {lessonVideos.map((video, idx) => {
                    // Extract YT ID if possible
                    let embedUrl = video.video_url;
                    if (video.video_url.includes('youtube.com/watch?v=')) {
                      embedUrl = `https://www.youtube.com/embed/${video.video_url.split('v=')[1].split('&')[0]}`;
                    } else if (video.video_url.includes('youtu.be/')) {
                      embedUrl = `https://www.youtube.com/embed/${video.video_url.split('be/')[1].split('?')[0]}`;
                    }

                    return (
                      <div key={video.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="aspect-video w-full bg-black">
                          <iframe
                            src={embedUrl}
                            title={video.title}
                            className="w-full h-full border-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          ></iframe>
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{idx + 1}</span>
                            {video.title}
                          </h3>
                          {video.description && <p className="text-sm text-muted-foreground">{video.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <MaterialIcon name="video_library" size={40} className="text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Chưa có video thí nghiệm</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Video quay lại các thí nghiệm thực tế của bài học sẽ được cập nhật sớm.
                  </p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'self_study' ? (
            <motion.div key="self_study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <SimulationPanel lessonId={lessonId!} lessonName={lessonName!} grade={gradeNum} filterType="iframe" />
            </motion.div>
          ) : activeTab === 'simulation' ? (
            <motion.div key="simulation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <SimulationPanel lessonId={lessonId!} lessonName={lessonName!} grade={gradeNum} filterType="simulation" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LessonTheoryPage;
