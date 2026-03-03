import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MaterialIcon from './MaterialIcon';
import { toast } from 'sonner';

const ApiConfigCard = () => {
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await (supabase as any)
                .from('app_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
            } else if (data) {
                setApiKey(data.gemini_api_key || '');
                setSettingsId(data.id);
                if (data.gemini_api_key) {
                    setIsExpanded(false); // Thu gọn nếu đã có key
                }
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
                const { error: updateError } = await (supabase as any)
                    .from('app_settings')
                    .update({
                        gemini_api_key: apiKey,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', settingsId);
                error = updateError;
            } else {
                const { data, error: insertError } = await (supabase as any)
                    .from('app_settings')
                    .insert([{ gemini_api_key: apiKey }])
                    .select()
                    .single();

                error = insertError;
                if (data) setSettingsId(data.id);
            }

            if (error) throw error;
            toast.success('Đã lưu cấu hình API thành công! Các tính năng AI đã sẵn sàng.');
            setIsExpanded(false);
        } catch (err: any) {
            console.error(err);
            toast.error('Lỗi khi lưu cấu hình: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return null;

    return (
        <div className="bg-gradient-to-r from-primary/5 to-info/5 border border-primary/20 rounded-xl overflow-hidden mb-6 transition-all duration-300">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <MaterialIcon name="api" size={18} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-foreground">Cấu hình Trí tuệ nhân tạo (Gemini API)</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {apiKey ? "Đã cấu hình khóa API. Bạn có thể thay đổi bất cứ lúc nào." : "Chưa cấu hình khóa API. Vui lòng nhập để sử dụng tính năng AI."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {apiKey && !isExpanded && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mt-px" />
                            Đang hoạt động
                        </span>
                    )}
                    <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-muted-foreground" />
                </div>
            </button>

            {isExpanded && (
                <div className="p-5 pt-2 border-t border-primary/10">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Nhập khóa API Gemini từ Google AI Studio..."
                                className="w-full pl-10 pr-12 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
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

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md shrink-0 whitespace-nowrap"
                        >
                            {isSaving ? (
                                <MaterialIcon name="refresh" size={18} className="animate-spin" />
                            ) : (
                                <MaterialIcon name="save" size={18} />
                            )}
                            Lưu khóa API
                        </button>
                    </div>

                    <div className="mt-4 flex gap-3 text-xs text-muted-foreground leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                        <MaterialIcon name="info" size={16} className="text-primary shrink-0 mt-0.5" />
                        <div>
                            Mọi tính năng AI (Viết code mô phỏng, Gợi ý video, Soạn lý thuyết, Gia sư...) sẽ dùng chung khóa này.
                            Nếu bạn chưa có API Key, lấy miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Google AI Studio</a>.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiConfigCard;
