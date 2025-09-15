import React, { useState } from 'react';
import { VisualDiscriminationExercise } from '../../../../shared/types/exercise.types';

interface VisualDiscriminationProps {
  exercise: VisualDiscriminationExercise;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export const VisualDiscrimination: React.FC<VisualDiscriminationProps> = ({
  exercise,
  onAnswer,
  disabled = false
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleSelect = (optionId: string) => {
    if (disabled || hasAnswered) return;

    setSelectedOption(optionId);
    setHasAnswered(true);
    onAnswer(optionId);
  };

  const getOptionClass = (optionId: string) => {
    if (!hasAnswered) {
      return selectedOption === optionId
        ? 'ring-2 ring-blue-500'
        : 'hover:ring-2 hover:ring-gray-300';
    }

    if (optionId === exercise.correctOptionId) {
      return 'ring-2 ring-green-500 bg-green-50';
    }

    if (selectedOption === optionId && optionId !== exercise.correctOptionId) {
      return 'ring-2 ring-red-500 bg-red-50';
    }

    return 'opacity-50';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {exercise.instructions}
        </h3>
        <p className="text-2xl font-bold text-blue-600">
          {exercise.targetTerm}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {exercise.options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={disabled || hasAnswered}
            className={`
              relative p-4 rounded-lg border-2 transition-all
              ${getOptionClass(option.id)}
              ${!hasAnswered && !disabled ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            <div className="aspect-square bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
              {/* In production, this would be an actual image */}
              <span className="text-4xl">🦅</span>
            </div>
            <div className="absolute top-2 left-2 bg-white rounded-full px-2 py-1 text-sm font-semibold">
              {String.fromCharCode(65 + index)}
            </div>
            {hasAnswered && option.id === exercise.correctOptionId && (
              <div className="absolute top-2 right-2 text-green-500">
                ✓
              </div>
            )}
            {hasAnswered && selectedOption === option.id && option.id !== exercise.correctOptionId && (
              <div className="absolute top-2 right-2 text-red-500">
                ✗
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};