import React from 'react';

interface FeedbackDisplayProps {
  isCorrect: boolean;
  correctAnswer: string;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  isCorrect,
  correctAnswer
}) => {
  return (
    <div className={`mt-6 p-4 rounded-lg text-center ${
      isCorrect ? 'bg-green-100' : 'bg-red-100'
    }`}>
      <p className={`text-lg font-bold ${
        isCorrect ? 'text-green-700' : 'text-red-700'
      }`}>
        {isCorrect ? '¡Excelente! Correct!' : `Not quite. The answer was: ${correctAnswer}`}
      </p>
    </div>
  );
};
