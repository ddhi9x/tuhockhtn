import React, { useState } from 'react';
import MaterialIcon from '@/components/MaterialIcon';

interface QuizOrderingProps {
    question: string;
    items: string[];
    correctOrder: number[];
    submitted: boolean;
    isCorrect: boolean | null;
    onSubmit: (order: number[]) => void;
}

const QuizOrdering: React.FC<QuizOrderingProps> = ({ question, items, correctOrder, submitted, isCorrect, onSubmit }) => {
    const [currentOrder, setCurrentOrder] = useState<number[]>(items.map((_, i) => i));
    const [dragging, setDragging] = useState<number | null>(null);

    const moveItem = (fromIdx: number, direction: 'up' | 'down') => {
        if (submitted) return;
        const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
        if (toIdx < 0 || toIdx >= currentOrder.length) return;
        const newOrder = [...currentOrder];
        [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
        setCurrentOrder(newOrder);
    };

    const handleSubmit = () => {
        onSubmit(currentOrder);
    };

    // Check if a specific position is correct
    const isPositionCorrect = (posIdx: number) => {
        if (!submitted) return null;
        return currentOrder[posIdx] === correctOrder[posIdx];
    };

    return (
        <div>
            <div className="bg-card rounded-2xl border border-border p-6 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-bold uppercase tracking-wider">Sắp xếp</span>
                </div>
                <h2 className="font-bold text-lg leading-relaxed">{question}</h2>
                {!submitted && <p className="text-xs text-muted-foreground mt-2">Dùng nút ▲▼ để di chuyển các mục vào đúng thứ tự.</p>}
            </div>

            <div className="space-y-2">
                {currentOrder.map((itemIdx, posIdx) => {
                    const posCorrect = isPositionCorrect(posIdx);
                    return (
                        <div
                            key={itemIdx}
                            className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${submitted
                                    ? posCorrect ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5'
                                    : 'border-border hover:border-primary/30 bg-card'
                                }`}
                        >
                            {/* Position number */}
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${submitted
                                    ? posCorrect ? 'bg-success text-white' : 'bg-destructive text-white'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                {posIdx + 1}
                            </span>

                            {/* Item text */}
                            <span className="flex-1 text-sm font-medium">{items[itemIdx]}</span>

                            {/* Move buttons */}
                            {!submitted && (
                                <div className="flex flex-col gap-0.5 shrink-0">
                                    <button
                                        onClick={() => moveItem(posIdx, 'up')}
                                        disabled={posIdx === 0}
                                        className="w-7 h-7 rounded-md bg-muted hover:bg-primary/10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <MaterialIcon name="keyboard_arrow_up" size={18} />
                                    </button>
                                    <button
                                        onClick={() => moveItem(posIdx, 'down')}
                                        disabled={posIdx === currentOrder.length - 1}
                                        className="w-7 h-7 rounded-md bg-muted hover:bg-primary/10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <MaterialIcon name="keyboard_arrow_down" size={18} />
                                    </button>
                                </div>
                            )}

                            {/* Result icon */}
                            {submitted && (
                                <MaterialIcon
                                    name={posCorrect ? 'check_circle' : 'cancel'}
                                    size={20}
                                    className={posCorrect ? 'text-success' : 'text-destructive'}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {!submitted && (
                <button
                    onClick={handleSubmit}
                    className="w-full mt-4 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                    <MaterialIcon name="check" size={18} />
                    Xác nhận thứ tự
                </button>
            )}

            {submitted && !isCorrect && (
                <div className="mt-3 p-3 bg-muted rounded-xl">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Thứ tự đúng:</p>
                    {correctOrder.map((itemIdx, pos) => (
                        <p key={pos} className="text-xs text-foreground">{pos + 1}. {items[itemIdx]}</p>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizOrdering;
