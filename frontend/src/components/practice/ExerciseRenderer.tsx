import React from 'react';

interface ExerciseRendererProps {
  type: 'visual_match' | 'fill_blank' | 'multiple_choice';
  question: string;
  imageUrl?: string;
  translation?: string;
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  showFeedback: boolean;
  explanation?: string;
  onAnswer: (answer: string) => void;
}

export const ExerciseRenderer: React.FC<ExerciseRendererProps> = ({
  type,
  question,
  imageUrl,
  translation,
  options,
  selectedAnswer,
  correctAnswer,
  showFeedback,
  explanation,
  onAnswer
}) => {
  const getButtonClass = (option: string) => {
    if (showFeedback && option === correctAnswer) {
      return 'bg-green-500 text-white';
    }
    if (showFeedback && option === selectedAnswer && option !== correctAnswer) {
      return 'bg-red-500 text-white';
    }
    if (selectedAnswer === option) {
      return 'bg-blue-500 text-white';
    }
    return 'bg-white border-2 border-gray-300 hover:border-blue-400';
  };

  if (type === 'visual_match') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-center">{question}</h3>
        {imageUrl && (
          <div className="relative w-full max-w-md mx-auto">
            <img
              src={imageUrl}
              alt="Bird to identify"
              className="w-full rounded-lg shadow-md object-cover aspect-video"
              onError={(e) => {
                // Fallback on image load error
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
              }}
              loading="lazy"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => !showFeedback && onAnswer(option)}
              disabled={showFeedback}
              className={`p-4 rounded-lg font-medium transition-all ${getButtonClass(option)}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'fill_blank') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-2">{question}</h3>
          {translation && <p className="text-gray-600 italic">{translation}</p>}
        </div>
        {imageUrl && (
          <div className="relative w-full max-w-sm mx-auto">
            <img
              src={imageUrl}
              alt="Bird reference"
              className="w-full rounded-lg shadow-md object-cover aspect-square"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none'; // Hide if image fails to load
              }}
              loading="lazy"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => !showFeedback && onAnswer(option)}
              disabled={showFeedback}
              className={`p-3 rounded-lg font-medium transition-all ${getButtonClass(option)}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'multiple_choice') {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-center">{question}</h3>
        {imageUrl && (
          <div className="relative w-full max-w-sm mx-auto">
            <img
              src={imageUrl}
              alt="Bird reference"
              className="w-full rounded-lg shadow-md object-cover aspect-square"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none'; // Hide if image fails to load
              }}
              loading="lazy"
            />
          </div>
        )}
        <div className="space-y-3 max-w-md mx-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => !showFeedback && onAnswer(option)}
              disabled={showFeedback}
              className={`w-full p-4 text-left rounded-lg font-medium transition-all ${getButtonClass(option)}`}
            >
              {option}
            </button>
          ))}
        </div>
        {showFeedback && explanation && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-blue-700">{explanation}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};
