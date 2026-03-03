import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';

interface Student {
    id: string;
    student_code: string;
    full_name: string;
    password: string;
    grade: number;
    created_at: string;
}

const AdminStudentsPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [importGrade, setImportGrade] = useState<number>(6);

    const fetchStudents = async () => {
        setIsLoading(true);
        const { data, error } = await (supabase
            .from('students' as any)
            .select('*')
            .order('student_code', { ascending: true }) as any);

        if (error) {
            toast.error('Lỗi khi tải danh sách học sinh: ' + error.message);
        } else {
            setStudents(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa học sinh này?')) return;

        const { error } = await (supabase
            .from('students' as any)
            .delete()
            .eq('id', id) as any);

        if (error) {
            toast.error('Lỗi khi xóa: ' + error.message);
        } else {
            toast.success('Đã xóa học sinh');
            fetchStudents();
        }
    };

    const handleImport = async () => {
        if (!importText.trim()) {
            toast.error('Vui lòng dán dữ liệu từ Excel/Sheet');
            return;
        }

        setIsProcessing(true);
        try {
            // Parse tab-separated or comma-separated values
            const lines = importText.trim().split('\n');
            const newStudents: any[] = [];

            for (const line of lines) {
                // Try tab first (Excel copy-paste), then fall back to comma
                let parts = line.split('\t');
                if (parts.length < 2) parts = line.split(',');

                if (parts.length >= 2) {
                    const mhs = parts[0].trim();
                    const name = parts[1].trim();
                    // Use column D (DEFAULT_PASSW) or E (NEW_PASSWOR) if available, else use MHS
                    const password = parts[4]?.trim() || parts[3]?.trim() || mhs;

                    if (mhs && name) {
                        newStudents.push({
                            student_code: mhs,
                            full_name: name,
                            password: password,
                            grade: importGrade
                        });
                    }
                }
            }

            if (newStudents.length === 0) {
                throw new Error('Không tìm thấy dữ liệu hợp lệ. Định dạng: Mã HS (tab) Họ tên');
            }

            const { error } = await (supabase
                .from('students' as any)
                .upsert(newStudents, { onConflict: 'student_code' }) as any);

            if (error) throw error;

            toast.success(`Đã nhập thành công ${newStudents.length} học sinh!`);
            setShowImport(false);
            setImportText('');
            fetchStudents();
        } catch (err: any) {
            toast.error('Lỗi khi nhập dữ liệu: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MaterialIcon name="people" size={28} className="text-primary" />
                        Quản lý học sinh
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tổng số: <span className="font-bold text-foreground">{students.length}</span> học sinh trong hệ thống.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        <MaterialIcon name="file_upload" size={18} />
                        Nhập từ Excel/Sheet
                    </button>
                    <button
                        onClick={fetchStudents}
                        className="p-2 border border-border rounded-xl hover:bg-muted transition-colors"
                        title="Làm mới"
                    >
                        <MaterialIcon name="refresh" size={18} />
                    </button>
                </div>
            </div>

            {showImport && (
                <div className="mb-8 p-6 bg-card border-2 border-primary/20 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <MaterialIcon name="content_paste" size={20} className="text-primary" />
                            Hướng dẫn nhập dữ liệu
                        </h3>
                        <button onClick={() => setShowImport(false)} className="text-muted-foreground hover:text-foreground">
                            <MaterialIcon name="close" size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="text-sm text-muted-foreground space-y-2 bg-muted/30 p-4 rounded-xl">
                            <p>1. Mở file Excel hoặc Google Sheet của thầy.</p>
                            <p>2. Copy cột **Mã HS** và **Họ tên HS** (có thể copy cả Password).</p>
                            <p>3. Dán vào ô bên cạnh.</p>
                            <p className="text-xs italic mt-2">* Hệ thống sẽ tự tách cột bằng dấu Tab. Nếu đã có mã trong hệ thống, thông tin sẽ được cập nhật mới.</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Chọn khối lớp cho danh sách này</label>
                                <div className="flex gap-2">
                                    {[6, 7, 8, 9].map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setImportGrade(g)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${importGrade === g ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'border-border text-muted-foreground hover:bg-muted'
                                                }`}
                                        >
                                            Lớp {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <textarea
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder="Dán dữ liệu tại đây...&#10;VD:&#10;24123802	NGUYỄN DIỆP ANH&#10;24125706	LƯƠNG NGỌC BẢO"
                        className="w-full h-48 bg-muted/50 border border-border rounded-xl p-4 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowImport(false)}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isProcessing || !importText.trim()}
                            className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MaterialIcon name="check_circle" size={18} />}
                            Xác nhận nhập dữ liệu
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                                <th className="px-6 py-4">Mã HS</th>
                                <th className="px-6 py-4">Họ và tên</th>
                                <th className="px-6 py-4">Mật khẩu</th>
                                <th className="px-6 py-4">Khối</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm text-muted-foreground">Đang tải danh sách...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <MaterialIcon name="person_off" size={48} />
                                            <p className="text-sm font-medium">Chưa có học sinh nào trong hệ thống</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <code className="text-primary font-bold bg-primary/5 px-2 py-1 rounded text-sm">{student.student_code}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-foreground">{student.full_name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">{student.password}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-info/10 text-info">
                                                Lớp {student.grade}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                title="Xóa học student"
                                            >
                                                <MaterialIcon name="delete" size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminStudentsPage;
