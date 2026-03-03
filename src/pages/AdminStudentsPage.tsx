import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';

interface Student {
    id: string;
    student_code: string;
    full_name: string;
    birthday: string;
    password: string;
    grade: number;
    created_at: string;
}

interface ImportRow {
    student_code: string;
    full_name: string;
    birthday: string;
    password: string;
}

const AdminStudentsPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importGrade, setImportGrade] = useState<number>(6);
    const [importRows, setImportRows] = useState<ImportRow[]>(Array(10).fill({ student_code: '', full_name: '', birthday: '', password: '' }));

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
        const { error } = await (supabase.from('students' as any).delete().eq('id', id) as any);
        if (error) toast.error('Lỗi khi xóa: ' + error.message);
        else {
            toast.success('Đã xóa học sinh');
            fetchStudents();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasteData = e.clipboardData.getData('text');
        const lines = pasteData.trim().split(/\r?\n/);
        const newRows = lines.map(line => {
            let parts = line.split('\t');
            if (parts.length < 2) parts = line.split(',');
            return {
                student_code: parts[0]?.trim() || '',
                full_name: parts[1]?.trim() || '',
                birthday: parts[2]?.trim() || '',
                password: parts[3]?.trim() || parts[0]?.trim() || '', // Cột 4 hoặc lấy mã HS làm pass
            };
        }).filter(row => row.student_code || row.full_name);

        if (newRows.length > 0) {
            setImportRows(newRows);
            toast.info(`Đã nhận dữ liệu ${newRows.length} dòng từ Excel`);
        }
    };

    const updateRow = (index: number, field: keyof ImportRow, value: string) => {
        const updated = [...importRows];
        updated[index] = { ...updated[index], [field]: value };
        setImportRows(updated);
    };

    const addRow = () => setImportRows([...importRows, { student_code: '', full_name: '', birthday: '', password: '' }]);

    const handleConfirmImport = async () => {
        const validRows = importRows.filter(r => r.student_code && r.full_name);
        if (validRows.length === 0) {
            toast.error('Vui lòng nhập ít nhất Mã HS và Họ tên');
            return;
        }

        setIsProcessing(true);
        try {
            // Deduplicate by code in memory first
            const uniqueMap = new Map();
            validRows.forEach(row => {
                uniqueMap.set(row.student_code, {
                    student_code: row.student_code,
                    full_name: row.full_name,
                    birthday: row.birthday,
                    password: row.password || row.student_code,
                    grade: importGrade
                });
            });

            const dataToUpload = Array.from(uniqueMap.values());
            const { error } = await (supabase
                .from('students' as any)
                .upsert(dataToUpload, { onConflict: 'student_code' }) as any);

            if (error) throw error;
            toast.success(`Đã thành công! Hệ thống đã nhập/cập nhật ${dataToUpload.length} học sinh.`);
            setShowImport(false);
            setImportRows(Array(10).fill({ student_code: '', full_name: '', birthday: '', password: '' }));
            fetchStudents();
        } catch (err: any) {
            toast.error('Lỗi: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                        <MaterialIcon name="school" size={32} className="text-primary" />
                        Quản lý học sinh
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Tổng cộng <span className="font-bold text-primary">{students.length}</span> học sinh đã đăng ký.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <MaterialIcon name="add_to_photos" size={20} />
                        Thêm & Nhập học sinh
                    </button>
                    <button
                        onClick={fetchStudents}
                        className="w-11 h-11 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        <MaterialIcon name="refresh" size={20} />
                    </button>
                </div>
            </div>

            {showImport && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <MaterialIcon name="grid_on" size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Bảng Nhập Học Sinh</h2>
                                    <p className="text-sm text-slate-500">Thầy có thể dán trực tiếp từ Excel vào bảng dưới đây</p>
                                </div>
                            </div>
                            <button onClick={() => setShowImport(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                                <MaterialIcon name="close" size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8 space-y-8">
                            {/* Settings */}
                            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                                <label className="text-sm font-bold text-slate-700 block mb-4 flex items-center gap-2">
                                    <MaterialIcon name="category" size={18} className="text-primary" />
                                    CHỌN KHỐI LỚP CHO DANH SÁCH NÀY
                                </label>
                                <div className="flex gap-3">
                                    {[6, 7, 8, 9].map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setImportGrade(g)}
                                            className={`flex-1 py-3.5 rounded-2xl text-base font-bold border transition-all ${importGrade === g ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-primary/30'
                                                }`}
                                        >
                                            Lớp {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grid Input */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <MaterialIcon name="edit_note" size={22} className="text-primary" />
                                        Dữ liệu đầu vào
                                    </h3>
                                    <p className="text-xs text-slate-400 italic">Mẹo: Thầy nhấn vào một ô rồi dán (Ctrl+V) để nhập cả bảng</p>
                                </div>

                                <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="w-12 px-2 py-3 text-center border-r border-slate-200">#</th>
                                                <th className="px-4 py-3 text-left border-r border-slate-200">Mã học sinh</th>
                                                <th className="px-4 py-3 text-left border-r border-slate-200">Họ và tên</th>
                                                <th className="px-4 py-3 text-left border-r border-slate-200">Ngày sinh</th>
                                                <th className="px-4 py-3 text-left">Mật khẩu</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100" onPaste={handlePaste}>
                                            {importRows.map((row, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="text-center bg-slate-50/30 font-medium text-slate-400 border-r border-slate-200">{idx + 1}</td>
                                                    <td className="p-1 border-r border-slate-200">
                                                        <input
                                                            value={row.student_code}
                                                            onChange={e => updateRow(idx, 'student_code', e.target.value)}
                                                            placeholder="241..."
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary rounded-lg transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-1 border-r border-slate-200">
                                                        <input
                                                            value={row.full_name}
                                                            onChange={e => updateRow(idx, 'full_name', e.target.value)}
                                                            placeholder="Nguyễn Văn A"
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary rounded-lg transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-1 border-r border-slate-200">
                                                        <input
                                                            value={row.birthday}
                                                            onChange={e => updateRow(idx, 'birthday', e.target.value)}
                                                            placeholder="01/01/2010"
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary rounded-lg transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input
                                                            value={row.password}
                                                            onChange={e => updateRow(idx, 'password', e.target.value)}
                                                            placeholder="Để trống = Mã HS"
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary rounded-lg transition-all"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button
                                    onClick={addRow}
                                    className="flex items-center gap-2 text-primary text-sm font-bold hover:underline py-2"
                                >
                                    <MaterialIcon name="add" size={18} />
                                    Thêm dòng mới
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowImport(false)}
                                className="px-6 py-3.5 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isProcessing}
                                className="px-8 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isProcessing ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" /> : <MaterialIcon name="verified" size={22} />}
                                XÁC NHẬN NHẬP DỮ LIỆU
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Table Display */}
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/40">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                <th className="px-8 py-5">Mã học sinh</th>
                                <th className="px-8 py-5">Họ và tên</th>
                                <th className="px-8 py-5">Ngày sinh</th>
                                <th className="px-8 py-5">Khối lớp</th>
                                <th className="px-8 py-5 text-right">Lệnh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-slate-400 font-medium tracking-wide">Đang quét dữ liệu học sinh...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <MaterialIcon name="groups" size={64} />
                                            <p className="text-xl font-bold">Chưa có học sinh nào</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors duration-200">
                                        <td className="px-8 py-5">
                                            <code className="text-primary font-bold bg-primary/5 px-3 py-1.5 rounded-xl text-sm border border-primary/10 tracking-tight">{student.student_code}</code>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-slate-800 text-[15px]">{student.full_name}</p>
                                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {student.id.slice(0, 8)}</p>
                                        </td>
                                        <td className="px-8 py-5 font-medium text-slate-600">
                                            {student.birthday || '---'}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-info/10 text-info uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                                                Lớp {student.grade}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all"
                                            >
                                                <MaterialIcon name="delete_outline" size={20} />
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
