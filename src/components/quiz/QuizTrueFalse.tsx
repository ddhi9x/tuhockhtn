import React from 'react';
import { motion } from 'framer-motion';
import MaterialIcon from '@/components/MaterialIcon';

interface QuizTrueFalseProps {
    question: string;
    selectedAnswer: boolean | null;
    correctAnswer: boolean;
    onAnswer: (answer: boolean) => void;
}

const QuizTrueFalse: React.FC<QuizTrueFalseProps> = ({ question, selectedAnswer, correctAnswer, onAnswer }) => {
    const answered = selectedAnswer !== null;

    const getButtonStyle = (value: boolean) => {
        if (!answered) return 'border-border hover:border-primary/40 hover:bg-primary/5 hover:scale-[1.02]';
        if (value === correctAnswer) return 'border-success bg-success/10 scale-[1.02]';
        if (value === selectedAnswer) return 'border-destructive bg-destructive/10';
        return 'border-border opacity-40';
    };

    return (
        <div>
            <div className="bg-card rounded-2xl border border-border p-6 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-info/10 text-info text-[10px] font-bold uppercase tracking-wider">Đúng/Sai</span>
                </div>
                <h2 className="font-bold text-lg leading-relaxed">{question}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onAnswer(true)}
                    disabled={answered}
                    className={`border-2 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all ${getButtonStyle(true)}`}
                >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${answered && true === correctAnswer ? 'bg-success text-white' :
                            answered && selectedAnswer === true ? 'bg-destructive text-white' :
                                'bg-success/10 text-success'
                        }`}>
                        <MaterialIcon name="check_circle" size={32} />
                    </div>
                    <span className="font-bold text-base">ĐÚNG</span>
                </button>

                <button
                    onClick={() => onAnswer(false)}
                    disabled={answered}
                    className={`border-2 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all ${getButtonStyle(false)}`}
                >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${answered && false === correctAnswer ? 'bg-success text-white' :
                            answered && selectedAnswer === false ? 'bg-destructive text-white' :
                                'bg-destructive/10 text-destructive'
                        }`}>
                        <MaterialIcon name="cancel" size={32} />
                    </div>
                    <span className="font-bold text-base">SAI</span>
                </button>
            </div>
        </div>
    );
};

export default QuizTrueFalse;
