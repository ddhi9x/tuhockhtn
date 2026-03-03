import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';

const AdminSettingsPage = () => {
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [settingsId, setSettingsId] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
                toast.error('Lỗi khi tải cấu hình');
            } else if (data) {
                setApiKey(data.gemini_api_key || '');
                setSettingsId(data.id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            let error;
            if (settingsId) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('app_settings')
                    .update({
                        gemini_api_key: apiKey,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', settingsId);
                error = updateError;
            } else {
                // Insert new
                const { data, error: insertError } = await supabase
                    .from('app_settings')
                    .insert([{ gemini_api_key: apiKey }])
                    .select()
                    .single();

                error = insertError;
                if (data) setSettingsId(data.id);
            }

            if (error) throw error;
            toast.success('Đã lưu cấu hình API thành công');
        } catch (err: any) {
            console.error(err);
            toast.error('Lỗi khi lưu cấu hình: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <MaterialIcon name="refresh" className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <MaterialIcon name="settings" className="text-primary" />
                        Cài đặt Hệ thống
                    </h1>
                    <p className="text-muted-foreground">
                        Quản lý khóa API và các cấu hình động cho ứng dụng
                    </p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                <div>
                    <h2 className="text-lg font-bold mb-4 border-b border-border pb-2 flex items-center gap-2">
                        <MaterialIcon name="api" size={20} className="text-info" />
                        Trí tuệ Nhân tạo (AI)
                    </h2>

                    <div className="space-y-4 max-w-2xl">
                        <div>
                            <label className="text-sm font-semibold mb-1.5 block">Gemini API Key</label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Nhập khóa API Gemini (AI Studio)"
                                    className="w-full pl-10 pr-12 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                                />
                                <MaterialIcon
                                    name="key"
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                                >
                                    <MaterialIcon name={showKey ? 'visibility_off' : 'visibility'} size={18} />
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Khóa này được dùng chung cho tính năng Gia sư AI, Tạo bài tập và Mô phỏng.
                                Bạn có thể lấy key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                        {isSaving ? (
                            <MaterialIcon name="refresh" size={18} className="animate-spin" />
                        ) : (
                            <MaterialIcon name="save" size={18} />
                        )}
                        Lưu thay đổi
                    </button>
                </div>
            </div>

            <div className="mt-6 bg-info/10 text-info border border-info/20 rounded-xl p-4 flex gap-3 text-sm">
                <MaterialIcon name="info" className="shrink-0 mt-0.5" />
                <div>
                    <strong className="block mb-1">Lưu ý:</strong>
                    Các Edge Functions (chat, generate-theory, generate-quiz, summarize-textbook, generate-illustration) cần được cấu hình quyền Service Role (`SUPABASE_SERVICE_ROLE_KEY`) trong file index.ts để có thể tự động đọc cấu hình lưu trong database mà bỏ qua ràng buộc RLS bảo mật của người dùng thông thường.
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsPage;
