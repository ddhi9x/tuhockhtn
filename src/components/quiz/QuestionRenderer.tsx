import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MaterialIcon from '@/components/MaterialIcon';
import QuizMCQ from './QuizMCQ';
import QuizTrueFalse from './QuizTrueFalse';
import QuizFillBlank from './QuizFillBlank';
import QuizMatching from './QuizMatching';
import QuizOrdering from './QuizOrdering';

// Universal question shape from AI
export interface QuizQuestionAny {
    type?: string; // 'mcq' | 'true_false' | 'fill_blank' | 'matching' | 'ordering'
    question: string;
    explanation?: string;
    // MCQ fields
    options?: string[];
    correct?: number;
    // True/False fields
    correct_answer?: boolean;
    // Fill blank fields
    answers?: string[];
    // Matching fields
    left?: string[];
    right?: string[];
    correct_pairs?: number[];
    // Ordering fields
    items?: string[];
    correct_order?: number[];
}

interface QuestionRendererProps {
    question: QuizQuestionAny;
    onAnswered: (isCorrect: boolean) => void;
    showNext: boolean;
    onNext: () => void;
    isLast: boolean;
}

const normalize = (s: string) => s.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\s+/g, ' ');

const QuestionRenderer: React.FC<QuestionRendererProps> = ({ question, onAnswered, showNext, onNext, isLast }) => {
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const reportAnswer = (correct: boolean) => {
        setAnswered(true);
        setIsCorrect(correct);
        onAnswered(correct);
    };

    // Detect question type (normalize from AI response)
    const qType = question.type || 'mcq';

    return (
        <div>
            {qType === 'mcq' && (
                <QuizMCQ
                    question={question.question}
                    options={question.options || []}
                    selectedAnswer={answered ? (isCorrect ? (question.correct ?? 0) : -1) : null}
                    correctAnswer={question.correct ?? 0}
                    onAnswer={(idx) => {
                        const correct = idx === (question.correct ?? 0);
                        setAnswered(true);
                        setIsCorrect(correct);
                        onAnswered(correct);
                    }}
                />
            )}

            {qType === 'true_false' && (
                <QuizTrueFalse
                    question={question.question}
                    selectedAnswer={answered ? (isCorrect ? question.correct_answer! : !question.correct_answer!) : null}
                    correctAnswer={question.correct_answer ?? true}
                    onAnswer={(answer) => {
                        const correct = answer === question.correct_answer;
                        reportAnswer(correct);
                    }}
                />
            )}

            {qType === 'fill_blank' && (
                <QuizFillBlank
                    question={question.question}
                    correctAnswers={question.answers || []}
                    submitted={answered}
                    isCorrect={isCorrect}
                    onSubmit={(answer) => {
                        const correctAnswers = question.answers || [];
                        const correct = correctAnswers.some(a => normalize(a) === normalize(answer));
                        reportAnswer(correct);
                    }}
                />
            )}

            {qType === 'matching' && (
                <QuizMatching
                    question={question.question}
                    leftItems={question.left || []}
                    rightItems={question.right || []}
                    correctPairs={question.correct_pairs || []}
                    submitted={answered}
                    isCorrect={isCorrect}
                    onSubmit={(pairs) => {
                        const correctPairs = question.correct_pairs || [];
                        const correct = pairs.every((p, i) => p === correctPairs[i]);
                        reportAnswer(correct);
                    }}
                />
            )}

            {qType === 'ordering' && (
                <QuizOrdering
                    question={question.question}
                    items={question.items || []}
                    correctOrder={question.correct_order || []}
                    submitted={answered}
                    isCorrect={isCorrect}
                    onSubmit={(order) => {
                        const correctOrder = question.correct_order || [];
                        const correct = order.every((o, i) => o === correctOrder[i]);
                        reportAnswer(correct);
                    }}
                />
            )}

            {/* Explanation + Next button */}
            {answered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm font-semibold text-primary mb-1">
                        {isCorrect ? '✅ Chính xác!' : '❌ Sai rồi!'}
                    </p>
                    {question.explanation && (
                        <p className="text-sm text-muted-foreground">{question.explanation}</p>
                    )}
                    <button
                        onClick={onNext}
                        className="mt-3 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        {isLast ? 'Xem kết quả' : 'Câu tiếp theo →'}
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default QuestionRenderer;
