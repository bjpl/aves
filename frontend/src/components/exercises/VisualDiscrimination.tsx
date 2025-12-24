import React, { useState, useCallback, useMemo } from 'react';
import { VisualDiscriminationExercise } from '../../../../shared/types/exercise.types';

// Bird images for visual discrimination exercises
const BIRD_IMAGES: Record<string, string> = {
  flamingo: 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=400',
  eagle: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=400',
  owl: 'https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?w=400',
  peacock: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=400',
  parrot: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400',
  hummingbird: 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=400',
  pelican: 'https://images.unsplash.com/photo-1590005354167-6da97870c757?w=400',
  toucan: 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=400',
  cardinal: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=400',
  sparrow: 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=400',
  default: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400',
};

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

  // Get image URL for an option - try to match by label or use default
  const getImageForOption = useMemo(() => (optionId: string, index: number) => {
    // Try to find matching image by option ID or use rotation
    const searchTerms = ['flamingo', 'eagle', 'owl', 'peacock', 'parrot', 'hummingbird', 'pelican', 'toucan', 'cardinal', 'sparrow'];
    const matchedTerm = searchTerms.find(term => optionId.toLowerCase().includes(term));
    if (matchedTerm && BIRD_IMAGES[matchedTerm]) {
      return BIRD_IMAGES[matchedTerm];
    }
    // Rotate through images for variety
    const rotatingImages = Object.values(BIRD_IMAGES);
    return rotatingImages[index % rotatingImages.length];
  }, []);

  const handleSelect = useCallback((optionId: string) => {
    if (disabled || hasAnswered) return;

    setSelectedOption(optionId);
    setHasAnswered(true);
    onAnswer(optionId);
  }, [disabled, hasAnswered, onAnswer]);

  const getOptionClass = useCallback((optionId: string) => {
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
  }, [hasAnswered, selectedOption, exercise.correctOptionId]);

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
            <div className="aspect-square bg-gray-200 rounded-lg mb-2 overflow-hidden">
              <img
                src={getImageForOption(option.id, index)}
                alt={`Option ${String.fromCharCode(65 + index)}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
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