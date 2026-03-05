import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { curriculumData } from '@/data/curriculumData';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

interface KnowledgeSource {
    id: string;
    grade: number;
    file_name: string;
    storage_path: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error_message?: string;
    created_at: string;
}

const AdminKnowledgeHubPage = () => {
    const [sources, setSources] = useState<KnowledgeSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState(6);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        setLoading(true);
        const { data, error } = await (supabase
            .from('knowledge_sources' as any)
            .select('*')
            .order('created_at', { ascending: false }) as any);
        if (!error && data) setSources(data as KnowledgeSource[]);
        setLoading(false);
    };

    const extractTextFromFile = async (file: File): Promise<string> => {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'txt' || ext === 'md') {
            return await file.text();
        }

        if (ext === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        }

        if (ext === 'xlsx' || ext === 'xls') {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            let text = '';
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
            }
            return text;
        }

        if (ext === 'pdf') {
            // Basic text extraction attempt
            const text = await file.text();
            if (text.length > 50) return text;
            toast.error(`PDF "${file.name}" không thể đọc tự động. Hãy chuyển sang file văn bản (.txt, .docx) sẽ tốt hơn.`);
            return '';
        }

        return await file.text();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        try {
            for (const file of files) {
                const filePath = `knowledge/${selectedGrade}/${Date.now()}_${file.name}`;

                // 1. Upload to Storage
                const { error: uploadError } = await supabase.storage
                    .from('textbook-uploads')
                    .upload(filePath, file);
                if (uploadError) throw uploadError;

                // 2. Create DB record
                const { data: source, error: dbError } = await (supabase
                    .from('knowledge_sources' as any)
                    .insert({
                        grade: selectedGrade,
                        file_name: file.name,
                        storage_path: filePath,
                        status: 'pending'
                    } as any)
                    .select()
                    .single() as any);
                if (dbError) {
                    if (dbError.message?.includes('relation "knowledge_sources" does not exist')) {
                        toast.error('Lỗi: Thầy chưa chạy mã SQL để tạo bảng dữ liệu. Vui lòng vào SQL Editor và chạy mã em đã gửi nhé!');
                    } else {
                        throw dbError;
                    }
                    setUploading(false);
                    return;
                }

                // 3. Start Ingestion (Async)
                processKnowledge(source.id, file, selectedGrade);
            }
            toast.success(`Đã tải lên ${files.length} tài liệu. AI đang bắt đầu xử lý...`);
            fetchSources();
        } catch (err: any) {
            toast.error('Lỗi khi tải lên: ' + err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const processKnowledge = async (sourceId: string, file: File, grade: number) => {
        try {
            const textContent = await extractTextFromFile(file);
            if (!textContent || textContent.length < 10) {
                console.warn('Skipping ingestion: No text extracted');
                return;
            }

            const gradeData = curriculumData.find(g => g.grade === grade);
            const curriculum = gradeData?.chapters.map(ch => ({
                name: ch.name,
                lessons: ch.lessons.map(l => ({ id: l.id, name: l.name }))
            })) || [];

            await supabase.functions.invoke('ingest-knowledge', {
                body: { sourceId, textContent, grade, curriculum }
            });
            fetchSources();
        } catch (err) {
            console.error('Ingestion trigger error:', err);
        }
    };

    const deleteSource = async (source: KnowledgeSource) => {
        if (!confirm(`Xóa tài liệu "${source.file_name}" và các mẩu kiến thức liên quan?`)) return;

        await supabase.storage.from('textbook-uploads').remove([source.storage_path]);
        await (supabase.from('knowledge_sources' as any).delete().eq('id', source.id) as any);
        toast.success('Đã xóa tài liệu.');
        fetchSources();
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <MaterialIcon name="hub" size={28} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Trung tâm Tri thức (Knowledge Hub)</h1>
                            <p className="text-sm text-muted-foreground">Nạp tài liệu thông minh & Xây dựng kho RAG cho AI</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Upload Sidebar */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                <MaterialIcon name="cloud_upload" size={18} className="text-primary" />
                                Nạp tài liệu mới
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block">Chọn Khối lớp</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[6, 7, 8, 9].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setSelectedGrade(g)}
                                                className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${selectedGrade === g ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                    }`}
                                            >
                                                Lớp {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : 'border-primary/20 hover:border-primary/50 hover:bg-primary/5'
                                        }`}
                                >
                                    <MaterialIcon name={uploading ? 'hourglass_empty' : 'upload_file'} size={32} className={`mx-auto mb-2 ${uploading ? 'animate-spin' : 'text-primary'}`} />
                                    <p className="text-sm font-semibold">{uploading ? 'Đang tải lên...' : 'Bấm chọn file'}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Hỗ trợ: .docx, .xlsx, .pdf, .txt, .md</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        multiple
                                        className="hidden"
                                        accept=".docx,.xlsx,.xls,.pdf,.txt,.md"
                                    />
                                </div>

                                <div className="bg-info/10 text-info p-3 rounded-xl text-xs flex gap-2">
                                    <MaterialIcon name="info" size={16} className="shrink-0" />
                                    <p>Sau khi upload, AI sẽ tự động đọc nội dung, chia nhỏ lý thuyết vào các bài học và trích xuất câu hỏi vào kho bài tập.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Source List */}
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2 px-2">
                            <MaterialIcon name="history" size={18} className="text-primary" />
                            Lịch sử nạp tài liệu
                        </h3>

                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : sources.length === 0 ? (
                            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
                                <MaterialIcon name="folder_open" size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Chưa có tài liệu nào được nạp.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sources.map(source => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={source.id}
                                        className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <MaterialIcon name="description" className="text-muted-foreground" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold truncate">{source.file_name}</h4>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Lớp {source.grade}</span>
                                                <span className="text-[10px] text-muted-foreground">{new Date(source.created_at).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${source.status === 'completed' ? 'bg-success/10 text-success' :
                                                source.status === 'processing' ? 'bg-info/10 text-info' :
                                                    source.status === 'error' ? 'bg-destructive/10 text-destructive' :
                                                        'bg-muted text-muted-foreground'
                                                }`}>
                                                {source.status === 'processing' && <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
                                                {source.status === 'completed' ? 'Thành công' :
                                                    source.status === 'processing' ? 'Đang xử lý' :
                                                        source.status === 'error' ? 'Lỗi' : 'Chờ xử lý'}
                                            </div>

                                            <button
                                                onClick={() => deleteSource(source)}
                                                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                                            >
                                                <MaterialIcon name="delete" size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminKnowledgeHubPage;
