import React, { useState, useEffect } from 'react';
import { ContextualFillExercise } from '../../../../shared/types/exercise.types';

interface ContextualFillProps {
  exercise: ContextualFillExercise;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export const ContextualFill: React.FC<ContextualFillProps> = ({
  exercise,
  onAnswer,
  disabled = false
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Reset state when exercise changes
  useEffect(() => {
    setSelectedAnswer(null);
    setHasAnswered(false);
  }, [exercise.id]);

  const handleSelect = (answer: string) => {
    if (disabled || hasAnswered) return;

    setSelectedAnswer(answer);
    setHasAnswered(true);
    onAnswer(answer);
  };

  const getButtonClass = (option: string) => {
    if (!hasAnswered) {
      return selectedAnswer === option
        ? 'bg-blue-500 text-white'
        : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300';
    }

    if (option === exercise.correctAnswer) {
      return 'bg-green-500 text-white';
    }

    if (selectedAnswer === option && option !== exercise.correctAnswer) {
      return 'bg-red-500 text-white';
    }

    return 'bg-gray-100 text-gray-400 border border-gray-200';
  };

  const renderSentence = () => {
    const parts = exercise.sentence.split('___');
    return (
      <p className="text-xl leading-relaxed">
        {parts[0]}
        <span className="inline-block min-w-[100px] mx-2 pb-1 border-b-2 border-gray-400 text-center font-bold text-blue-600">
          {hasAnswered ? (
            <span className={selectedAnswer === exercise.correctAnswer ? 'text-green-600' : 'text-red-600'}>
              {selectedAnswer || '___'}
            </span>
          ) : (
            '___'
          )}
        </span>
        {parts[1]}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {exercise.instructions}
        </h3>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        {renderSentence()}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {exercise.options.map((option, index) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={disabled || hasAnswered}
            className={`
              px-4 py-3 rounded-lg font-medium transition-all
              ${getButtonClass(option)}
              ${!hasAnswered && !disabled ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            <span className="mr-2">{String.fromCharCode(65 + index)}.</span>
            {option}
            {hasAnswered && option === exercise.correctAnswer && (
              <span className="ml-2">✓</span>
            )}
            {hasAnswered && selectedAnswer === option && option !== exercise.correctAnswer && (
              <span className="ml-2">✗</span>
            )}
          </button>
        ))}
      </div>

      {hasAnswered && (
        <div className={`p-4 rounded-lg ${
          selectedAnswer === exercise.correctAnswer
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {selectedAnswer === exercise.correctAnswer ? (
            <p className="font-semibold">¡Correcto!</p>
          ) : (
            <p>
              <span className="font-semibold">Incorrect.</span> The answer was: <strong>{exercise.correctAnswer}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
};