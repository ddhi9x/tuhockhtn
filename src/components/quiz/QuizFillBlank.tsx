import React, { useState } from 'react';
import MaterialIcon from '@/components/MaterialIcon';

interface QuizFillBlankProps {
    question: string;
    correctAnswers: string[];
    submitted: boolean;
    isCorrect: boolean | null;
    onSubmit: (answer: string) => void;
}

const QuizFillBlank: React.FC<QuizFillBlankProps> = ({ question, correctAnswers, submitted, isCorrect, onSubmit }) => {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (!input.trim()) return;
        onSubmit(input.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !submitted) handleSubmit();
    };

    // Highlight blanks in display
    const displayQuestion = question.replace(/____/g, '______');

    return (
        <div>
            <div className="bg-card rounded-2xl border border-border p-6 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-bold uppercase tracking-wider">Điền khuyết</span>
                </div>
                <h2 className="font-bold text-lg leading-relaxed whitespace-pre-line">{displayQuestion}</h2>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
                <label className="text-sm font-medium text-muted-foreground block mb-2">Nhập đáp án của bạn:</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={submitted}
                        placeholder="Gõ đáp án..."
                        className={`flex-1 bg-muted border-2 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-all ${submitted
                                ? isCorrect ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5'
                                : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                            }`}
                    />
                    {!submitted && (
                        <button
                            onClick={handleSubmit}
                            disabled={!input.trim()}
                            className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            <MaterialIcon name="send" size={16} />
                            Gửi
                        </button>
                    )}
                </div>
                {submitted && (
                    <div className="mt-3 flex items-center gap-2">
                        {isCorrect ? (
                            <span className="text-success text-sm font-semibold flex items-center gap-1">
                                <MaterialIcon name="check_circle" size={16} /> Chính xác!
                            </span>
                        ) : (
                            <span className="text-sm">
                                <span className="text-destructive font-semibold flex items-center gap-1 mb-1">
                                    <MaterialIcon name="cancel" size={16} /> Chưa đúng.
                                </span>
                                <span className="text-muted-foreground"> Đáp án đúng: <strong className="text-foreground">{correctAnswers[0]}</strong></span>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizFillBlank;
