import React from 'react';
import { motion } from 'framer-motion';

interface QuizMCQProps {
    question: string;
    options: string[];
    selectedAnswer: number | null;
    correctAnswer: number;
    onAnswer: (idx: number) => void;
}

const letters = ['A', 'B', 'C', 'D'];

const QuizMCQ: React.FC<QuizMCQProps> = ({ question, options, selectedAnswer, correctAnswer, onAnswer }) => {
    return (
        <div>
            <div className="bg-card rounded-2xl border border-border p-6 mb-4">
                <h2 className="font-bold text-lg leading-relaxed whitespace-pre-line">{question}</h2>
            </div>

            <div className="space-y-3">
                {options.map((opt, i) => {
                    let style = 'border-border hover:border-primary/40 hover:bg-primary/5';
                    if (selectedAnswer !== null) {
                        if (i === correctAnswer) style = 'border-success bg-success/10';
                        else if (i === selectedAnswer) style = 'border-destructive bg-destructive/10';
                        else style = 'border-border opacity-50';
                    }
                    return (
                        <button
                            key={i}
                            onClick={() => onAnswer(i)}
                            disabled={selectedAnswer !== null}
                            className={`w-full text-left border-2 rounded-xl p-4 flex items-start gap-3 transition-all ${style}`}
                        >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${selectedAnswer !== null && i === correctAnswer ? 'bg-success text-success-foreground' :
                                    selectedAnswer === i && i !== correctAnswer ? 'bg-destructive text-destructive-foreground' :
                                        'bg-muted text-muted-foreground'
                                }`}>
                                {letters[i]}
                            </span>
                            <span className="text-sm font-medium pt-1">{opt}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuizMCQ;
