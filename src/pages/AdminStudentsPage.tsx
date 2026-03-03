import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';

interface Student {
    id: string;
    student_code: string;
    full_name: string;
    birthday: string;
    class_name: string;
    gender: string;
    password: string;
    grade: number;
    created_at: string;
}

interface ImportRow {
    student_code: string;
    full_name: string;
    birthday: string;
    class_name: string;
    gender: string;
    password: string;
}

const AdminStudentsPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importGrade, setImportGrade] = useState<number>(6);
    const [importRows, setImportRows] = useState<ImportRow[]>(Array(15).fill({ student_code: '', full_name: '', birthday: '', class_name: '', gender: '', password: '' }));

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
        if (!pasteData) return;

        const lines = pasteData.trim().split(/\r?\n/);

        const newRows = lines.map(line => {
            let parts = line.split('\t');
            if (parts.length < 2) parts = line.split(',');

            return {
                student_code: parts[0]?.trim() || '',
                full_name: parts[1]?.trim() || '',
                birthday: parts[2]?.trim() || '',
                class_name: parts[3]?.trim() || '',
                gender: parts[4]?.trim() || '', // Cột 5: Giới tính
                password: parts[5]?.trim() || '', // Cột 6: Mật khẩu (để cuối cùng)
            };
        }).filter(row => row.student_code || row.full_name);

        if (newRows.length > 0) {
            setImportRows(newRows);
            toast.info(`Đã nhận dữ liệu ${newRows.length} học sinh từ bảng dán vào`);
        }
    };

    const updateRow = (index: number, field: keyof ImportRow, value: string) => {
        const updated = [...importRows];
        updated[index] = { ...updated[index], [field]: value };
        setImportRows(updated);
    };

    const addRow = () => setImportRows([...importRows, { student_code: '', full_name: '', birthday: '', class_name: '', gender: '', password: '' }]);

    const handleConfirmImport = async () => {
        const validRows = importRows.filter(r => r.student_code && r.full_name);
        if (validRows.length === 0) {
            toast.error('Vui lòng nhập ít nhất Mã HS và Họ tên');
            return;
        }

        setIsProcessing(true);
        try {
            const uniqueMap = new Map();
            validRows.forEach(row => {
                uniqueMap.set(row.student_code, {
                    student_code: row.student_code,
                    full_name: row.full_name,
                    birthday: row.birthday,
                    class_name: row.class_name,
                    gender: row.gender,
                    password: row.password || row.student_code,
                    grade: importGrade
                });
            });

            const dataToUpload = Array.from(uniqueMap.values());
            const { error } = await (supabase
                .from('students' as any)
                .upsert(dataToUpload, { onConflict: 'student_code' }) as any);

            if (error) throw error;
            toast.success(`Thành công! Đã nhập/cập nhật ${dataToUpload.length} tài khoản học sinh.`);
            setShowImport(false);
            setImportRows(Array(15).fill({ student_code: '', full_name: '', birthday: '', class_name: '', gender: '', password: '' }));
            fetchStudents();
        } catch (err: any) {
            toast.error('Có lỗi xảy ra: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                        <MaterialIcon name="school" size={32} className="text-primary" />
                        Quản lý học sinh
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Hệ thống đang quản lý <span className="font-bold text-primary">{students.length}</span> học sinh.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <MaterialIcon name="file_upload" size={20} />
                        Nhập học sinh (Excel)
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
                    <div className="bg-white w-full max-w-[95vw] max-h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <MaterialIcon name="table_chart" size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Nhập danh sách học sinh</h2>
                                    <p className="text-sm text-slate-500">Thầy dán bảng Excel có 6 cột: Mã HS - Họ tên - Ngày sinh - Lớp - Giới tính - Mật khẩu</p>
                                </div>
                            </div>
                            <button onClick={() => setShowImport(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                                <MaterialIcon name="close" size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            {/* Grade Selection */}
                            <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 flex flex-wrap items-center gap-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-1">CHỌN KHỐI LỚP (GRADE)</label>
                                    <p className="text-[10px] text-slate-400">Gán khối lớp mặc định cho danh sách này</p>
                                </div>
                                <div className="flex gap-2 flex-1 max-w-md">
                                    {[6, 7, 8, 9].map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setImportGrade(g)}
                                            className={`flex-1 py-3 rounded-2xl text-sm font-black border transition-all ${importGrade === g ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            Khối {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grid Section */}
                            <div className="space-y-4">
                                <div className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                            <tr>
                                                <th className="w-10 px-2 py-4 text-center border-r border-slate-200">#</th>
                                                <th className="px-4 py-4 text-left border-r border-slate-200">1. Mã HS</th>
                                                <th className="px-4 py-4 text-left border-r border-slate-200">2. Họ và tên</th>
                                                <th className="px-4 py-4 text-left border-r border-slate-200">3. Ngày sinh</th>
                                                <th className="px-4 py-4 text-left border-r border-slate-200">4. Lớp</th>
                                                <th className="px-4 py-4 text-left border-r border-slate-200 text-primary">5. Giới tính</th>
                                                <th className="px-4 py-4 text-left bg-slate-100/50">6. Mật khẩu</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100" onPaste={handlePaste}>
                                            {importRows.map((row, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="text-center bg-slate-50/30 text-[10px] font-bold text-slate-300 border-r border-slate-100">{idx + 1}</td>
                                                    <td className="p-1 border-r border-slate-100">
                                                        <input
                                                            value={row.student_code}
                                                            onChange={e => updateRow(idx, 'student_code', e.target.value)}
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary/20 rounded-xl transition-all font-mono text-xs"
                                                        />
                                                    </td>
                                                    <td className="p-1 border-r border-slate-100">
                                                        <input
                                                            value={row.full_name}
                                                            onChange={e => updateRow(idx, 'full_name', e.target.value)}
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary/20 rounded-xl transition-all font-bold text-slate-700"
                                                        />
                                                    </td>
                                                    <td className="p-1 border-r border-slate-100">
                                                        <input
                                                            value={row.birthday}
                                                            onChange={e => updateRow(idx, 'birthday', e.target.value)}
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary/20 rounded-xl transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-1 border-r border-slate-100">
                                                        <input
                                                            value={row.class_name}
                                                            onChange={e => updateRow(idx, 'class_name', e.target.value)}
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary/20 rounded-xl transition-all uppercase font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-1 border-r border-slate-100">
                                                        <input
                                                            value={row.gender}
                                                            onChange={e => updateRow(idx, 'gender', e.target.value)}
                                                            placeholder="Nam/Nữ"
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary/20 rounded-xl transition-all text-primary font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-1 bg-slate-50/30">
                                                        <input
                                                            value={row.password}
                                                            onChange={e => updateRow(idx, 'password', e.target.value)}
                                                            placeholder="Để trống = Mã HS"
                                                            className="w-full h-10 px-3 bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary/20 rounded-xl transition-all text-slate-400 italic text-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button
                                    onClick={addRow}
                                    className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-tighter hover:bg-primary/5 px-4 py-2 rounded-xl transition-colors"
                                >
                                    <MaterialIcon name="add" size={16} />
                                    Thêm dòng thủ công
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                            <button
                                onClick={() => setShowImport(false)}
                                className="px-6 py-3.5 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isProcessing}
                                className="px-10 py-3.5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/25 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 tracking-wide"
                            >
                                {isProcessing ? <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <MaterialIcon name="cloud_done" size={24} />}
                                CẬP NHẬT DỮ LIỆU
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Students List */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/40">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100">
                                <th className="px-8 py-6">Học sinh</th>
                                <th className="px-8 py-6 text-center">Giới tính</th>
                                <th className="px-8 py-6">Ngày sinh</th>
                                <th className="px-8 py-6 text-center">Lớp cụ thể</th>
                                <th className="px-8 py-6">Khối</th>
                                <th className="px-8 py-6 text-right">Lệnh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center pointer-events-none">
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Đang tải danh sách...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center">
                                        <div className="opacity-10 flex flex-col items-center gap-4">
                                            <MaterialIcon name="groups_2" size={80} />
                                            <p className="text-2xl font-black uppercase tracking-tighter">Chưa có dữ liệu</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student.id} className="group hover:bg-slate-50/40 transition-all duration-300">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black border tracking-tighter ${student.gender?.toLowerCase() === 'nữ' ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-primary/5 text-primary border-primary/10'
                                                    }`}>
                                                    {student.student_code.slice(-2)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-[15px] leading-none mb-1.5">{student.full_name}</p>
                                                    <code className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{student.student_code}</code>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${student.gender?.toLowerCase() === 'nữ'
                                                    ? 'bg-pink-50 text-pink-600 border-pink-100'
                                                    : student.gender?.toLowerCase() === 'nam'
                                                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                        : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>
                                                {student.gender || '---'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                                                <MaterialIcon name="calendar_today" size={16} className="text-slate-300" />
                                                {student.birthday || '---'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-xl text-[12px] font-black uppercase ${student.class_name ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-400'}`}>
                                                {student.class_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] font-black bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                                                KHỐI {student.grade}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-white hover:bg-destructive rounded-2xl transition-all shadow-none hover:shadow-lg hover:shadow-destructive/30"
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
