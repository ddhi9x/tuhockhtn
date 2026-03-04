import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext, ChatMessage } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcon from '@/components/MaterialIcon';
import { toast } from 'sonner';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const ChatPage = () => {
  const { state, addChatMessage, updateChatMessage, clearChatHistory, updateDailyActivity, getTodayActivity } = useAppContext();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'general' | 'exercise'>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.chatHistory]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    return () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > 5) {
        const today = getTodayActivity();
        updateDailyActivity({
          theoryTime: today.theoryTime + elapsed,
          totalTime: today.totalTime + elapsed,
        });
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInput('');
    setIsLoading(true);

    try {
      const history = state.chatHistory.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      // Generate system prompt based on active lesson context
      const activeLesson = state.activeLesson;
      const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'học sinh';
      const studentGrade = user?.user_metadata?.grade || 'THCS';

      let systemPrompt = undefined;
      if (activeLesson) {
        systemPrompt = `Bạn là Gia sư AI môn Khoa học tự nhiên của tài nguyên này. Tên của học sinh là: ${studentName}. Học sinh đang học Lớp ${studentGrade}.
        Học sinh đang học bài: "${activeLesson.name}" (Chương ${activeLesson.chapter}, Lớp ${activeLesson.grade}). 
        Bạn tuyệt đối chỉ cung cấp, giải thích, và trả lời các câu hỏi liên quan đến nội dung của bài học được chỉ định ở trên.
        Cách xưng hô: Gọi học sinh là "${studentName}" hoặc "bạn", xưng là "mình" hoặc "thầy/cô". Phải giữ thái độ thân thiện, khích lệ.
        Giải thích bài tập phải phù hợp với trình độ của học sinh Lớp ${studentGrade}.
        Bạn hãy luôn ưu tiên nhắc lại hoặc đưa ra ví dụ liên quan đến "${activeLesson.name}" vào câu trả lời để học sinh hiểu rõ nhất bài này.
        Nếu phần hỏi nằm ngoài nội dung này, hãy khéo léo từ chối và hướng học sinh quay lại bài học chính.`;
      } else {
        systemPrompt = `Bạn là Gia sư AI môn Khoa học tự nhiên cấp THCS. Tên của học sinh là: ${studentName}. Học sinh đang học Lớp ${studentGrade}.
        Cách xưng hô: Gọi học sinh là "${studentName}" hoặc "bạn", xưng là "mình" hoặc "thầy/cô". Phải giữ thái độ cực kỳ thân thiện, khích lệ.
        Giải thích kiến thức hoặc bài tập phải luôn phù hợp với năng lực nhận thức cơ bản của học sinh Lớp ${studentGrade}.
        Nếu được hỏi, hãy tận tình giải thích dễ hiểu, có ví dụ từ thực tế cuộc sống.`;
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: input.trim() }],
          mode,
          systemPrompt,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || 'Có lỗi xảy ra');
        throw new Error(err.error || 'Request failed');
      }

      if (!resp.body) throw new Error('No response body');

      // Stream response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let assistantMsgId = (Date.now() + 1).toString();
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              if (firstToken) {
                addChatMessage({
                  id: assistantMsgId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: Date.now(),
                });
                firstToken = false;
              } else {
                updateChatMessage(assistantMsgId, assistantContent);
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // If no tokens were streamed, add a fallback message
      if (firstToken) {
        addChatMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: 'Xin lỗi, mình không thể trả lời lúc này. Vui lòng thử lại!',
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      if (!String(err).includes('Request failed')) {
        addChatMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Có lỗi xảy ra. Vui lòng thử lại!',
          timestamp: Date.now(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const messages = state.chatHistory;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="text-center py-3 border-b border-border bg-card">
        <p className="font-semibold text-primary/80">Trợ lý học tập Khoa học tự nhiên (24/7)</p>

        {state.activeLesson ? (
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
            <MaterialIcon name="school" size={14} className="text-info" />
            <span className="text-muted-foreground">Đang hỗ trợ bài:</span>
            <span className="font-bold text-info">{state.activeLesson.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">Lớp {state.activeLesson.grade}</span>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <MaterialIcon name="explore" size={14} />
            <span>Hỏi đáp tổng hợp (không chọn bài)</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <MaterialIcon name="smart_toy" size={20} className="text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 max-w-2xl">
              <p className="text-sm leading-relaxed">
                Chào bạn! Mình là Gia sư AI. 👋 Mình chuyên về Khoa học tự nhiên (Lý, Hóa, Sinh).
                Hôm nay bạn muốn khám phá kiến thức nào? Bạn có thể gửi câu hỏi để mình hỗ trợ nhé!
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">{formatTime(Date.now())}</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-primary' : 'bg-primary/10'
              }`}>
              <MaterialIcon
                name={msg.role === 'user' ? 'person' : 'smart_toy'}
                size={20}
                className={msg.role === 'user' ? 'text-primary-foreground' : 'text-primary'}
              />
            </div>
            <div className={`rounded-2xl p-4 max-w-2xl text-sm leading-relaxed ${msg.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-card border border-border rounded-tl-sm text-foreground'
              }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MaterialIcon name="smart_toy" size={20} className="text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mode tabs + Input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Chế độ:</span>
          <button
            onClick={() => setMode('general')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${mode === 'general' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            💬 Hỏi đáp
          </button>
          <button
            onClick={() => setMode('exercise')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${mode === 'exercise' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            📝 Luyện đề AI
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="ml-auto text-xs text-destructive/70 hover:text-destructive font-medium"
            >
              Xóa lịch sử
            </button>
          )}
        </div>
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gửi câu hỏi cho mình..."
            rows={1}
            className="flex-1 resize-none border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-32"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <MaterialIcon name="send" size={20} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Powered by AI • Trả lời có thể không chính xác 100%
        </p>
      </div>
    </div>
  );
};

export default ChatPage;
