import React, { useState } from 'react';
import MaterialIcon from '@/components/MaterialIcon';

interface QuizMatchingProps {
    question: string;
    leftItems: string[];
    rightItems: string[];
    correctPairs: number[];
    submitted: boolean;
    isCorrect: boolean | null;
    onSubmit: (pairs: number[]) => void;
}

const COLORS = [
    'bg-primary/15 border-primary/40 text-primary',
    'bg-info/15 border-info/40 text-info',
    'bg-warning/15 border-warning/40 text-warning',
    'bg-success/15 border-success/40 text-success',
    'bg-destructive/15 border-destructive/40 text-destructive',
];

const QuizMatching: React.FC<QuizMatchingProps> = ({ question, leftItems, rightItems, correctPairs, submitted, isCorrect, onSubmit }) => {
    const [pairs, setPairs] = useState<(number | null)[]>(new Array(leftItems.length).fill(null));
    const [activeLeft, setActiveLeft] = useState<number | null>(null);

    const handleLeftClick = (idx: number) => {
        if (submitted) return;
        setActiveLeft(activeLeft === idx ? null : idx);
    };

    const handleRightClick = (rightIdx: number) => {
        if (submitted || activeLeft === null) return;
        const newPairs = [...pairs];
        // Clear previous assignment of this right item
        const prevLeft = newPairs.indexOf(rightIdx);
        if (prevLeft !== -1) newPairs[prevLeft] = null;
        newPairs[activeLeft] = rightIdx;
        setPairs(newPairs);
        setActiveLeft(null);
    };

    const allPaired = pairs.every(p => p !== null);

    const handleSubmit = () => {
        if (!allPaired) return;
        onSubmit(pairs as number[]);
    };

    const getPairColor = (leftIdx: number) => {
        if (pairs[leftIdx] === null) return '';
        return COLORS[leftIdx % COLORS.length];
    };

    const getRightHighlight = (rightIdx: number) => {
        const leftIdx = pairs.indexOf(rightIdx);
        if (leftIdx === -1) return '';
        if (submitted) {
            return correctPairs[leftIdx] === rightIdx ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10';
        }
        return COLORS[leftIdx % COLORS.length];
    };

    return (
        <div>
            <div className="bg-card rounded-2xl border border-border p-6 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-bold uppercase tracking-wider">Ghép nối</span>
                </div>
                <h2 className="font-bold text-lg leading-relaxed">{question}</h2>
                {!submitted && <p className="text-xs text-muted-foreground mt-2">Bấm vào mục bên trái, rồi bấm vào mục bên phải để ghép cặp.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">Cột 1</p>
                    {leftItems.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => handleLeftClick(i)}
                            disabled={submitted}
                            className={`w-full text-left rounded-xl p-3 border-2 text-sm font-medium transition-all ${activeLeft === i ? 'border-primary bg-primary/10 ring-2 ring-primary/30 scale-[1.02]' :
                                    submitted && correctPairs[i] === pairs[i] ? 'border-success bg-success/10' :
                                        submitted && correctPairs[i] !== pairs[i] ? 'border-destructive bg-destructive/10' :
                                            pairs[i] !== null ? getPairColor(i) :
                                                'border-border hover:border-primary/30'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${pairs[i] !== null ? 'bg-foreground/10' : 'bg-muted'
                                    }`}>{i + 1}</span>
                                {item}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right column */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">Cột 2</p>
                    {rightItems.map((item, i) => {
                        const pairedByLeft = pairs.indexOf(i);
                        return (
                            <button
                                key={i}
                                onClick={() => handleRightClick(i)}
                                disabled={submitted}
                                className={`w-full text-left rounded-xl p-3 border-2 text-sm font-medium transition-all ${activeLeft !== null && pairedByLeft === -1 ? 'border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer' :
                                        getRightHighlight(i) ||
                                        'border-border'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${pairedByLeft !== -1 ? 'bg-foreground/10' : 'bg-muted'
                                        }`}>{String.fromCharCode(97 + i)}</span>
                                    {item}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {!submitted && (
                <button
                    onClick={handleSubmit}
                    disabled={!allPaired}
                    className="w-full mt-4 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <MaterialIcon name="check" size={18} />
                    Xác nhận ghép nối
                </button>
            )}

            {submitted && !isCorrect && (
                <div className="mt-3 p-3 bg-muted rounded-xl">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Đáp án đúng:</p>
                    {leftItems.map((item, i) => (
                        <p key={i} className="text-xs text-foreground">{i + 1}. {item} → {String.fromCharCode(97 + correctPairs[i])}. {rightItems[correctPairs[i]]}</p>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizMatching;
