// CONCEPT: Compare two birds and identify differences in Spanish
// WHY: Develops comparative vocabulary and visual discrimination
// PATTERN: Side-by-side comparison with structured prompts

import React, { useState, useCallback } from 'react';
import { audioService } from '../../services/audioService';

interface BirdComparison {
  id: string;
  spanish: string;
  english: string;
  imageUrl: string;
  characteristics: {
    size: string;
    color: string;
    beak: string;
    habitat: string;
  };
}

interface ComparisonQuestion {
  id: string;
  spanishQuestion: string;
  englishQuestion: string;
  correctBirdId: string;
  characteristic: keyof BirdComparison['characteristics'];
}

interface ComparativeAnalysisExerciseProps {
  birdA: BirdComparison;
  birdB: BirdComparison;
  questions: ComparisonQuestion[];
  onComplete: (score: number, total: number) => void;
}

export const ComparativeAnalysisExercise: React.FC<ComparativeAnalysisExerciseProps> = ({
  birdA,
  birdB,
  questions,
  onComplete,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedAnswer === currentQuestion?.correctBirdId;

  // Play question audio
  const playQuestion = useCallback(async () => {
    if (!currentQuestion) return;
    try {
      await audioService.speakSentence(currentQuestion.spanishQuestion);
    } catch {
      // Silently handle TTS errors
    }
  }, [currentQuestion]);

  // Handle bird selection
  const handleBirdSelect = useCallback((birdId: string) => {
    if (showResult || isComplete) return;

    setSelectedAnswer(birdId);
    setShowResult(true);

    const correct = birdId === currentQuestion.correctBirdId;
    if (correct) {
      setScore(prev => prev + 1);
    }
  }, [showResult, isComplete, currentQuestion]);

  // Move to next question
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
      onComplete(score + (isCorrect ? 1 : 0), questions.length);
    }
  }, [currentQuestionIndex, questions.length, score, isCorrect, onComplete]);

  // Get bird card styles
  const getBirdCardClass = (birdId: string) => {
    const base = 'relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer';

    if (!showResult) {
      return `${base} border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg`;
    }

    if (birdId === currentQuestion?.correctBirdId) {
      return `${base} border-4 border-green-500 shadow-lg`;
    }
    if (selectedAnswer === birdId && birdId !== currentQuestion?.correctBirdId) {
      return `${base} border-4 border-red-500`;
    }
    return `${base} border-2 border-gray-200 opacity-50`;
  };

  if (isComplete) {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <div className="space-y-6">
        <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{percentage}%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {percentage >= 80 ? '¡Excelente!' : percentage >= 60 ? '¡Bien hecho!' : 'Keep practicing!'}
          </h3>
          <p className="text-gray-600">
            You got {finalScore} of {questions.length} comparisons correct
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">
          Compara los pájaros
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Compare the birds and answer the question
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600">
          {currentQuestionIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={playQuestion}
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md flex-shrink-0"
            aria-label="Play question"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-lg font-medium text-blue-700">
              {currentQuestion?.spanishQuestion}
            </p>
            <p className="text-sm text-gray-600">
              {currentQuestion?.englishQuestion}
            </p>
          </div>
        </div>
      </div>

      {/* Bird Comparison Cards */}
      <div className="grid grid-cols-2 gap-4">
        {[birdA, birdB].map(bird => (
          <button
            key={bird.id}
            onClick={() => handleBirdSelect(bird.id)}
            disabled={showResult}
            className={getBirdCardClass(bird.id)}
          >
            {/* Bird Image */}
            <div className="aspect-square overflow-hidden bg-gray-100">
              <img
                src={bird.imageUrl}
                alt={bird.english}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&h=400&fit=crop';
                }}
              />
            </div>

            {/* Bird Name */}
            <div className="p-3 bg-white">
              <p className="font-semibold text-gray-800">{bird.spanish}</p>
              <p className="text-sm text-gray-500">{bird.english}</p>
            </div>

            {/* Result Overlay */}
            {showResult && bird.id === currentQuestion?.correctBirdId && (
              <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
            )}
            {showResult && selectedAnswer === bird.id && bird.id !== currentQuestion?.correctBirdId && (
              <div className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Characteristics Legend (shown after answer) */}
      {showResult && currentQuestion && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Comparison:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-700">{birdA.spanish}</p>
              <p className="text-gray-600 capitalize">
                {currentQuestion.characteristic}: {birdA.characteristics[currentQuestion.characteristic]}
              </p>
            </div>
            <div>
              <p className="font-medium text-purple-700">{birdB.spanish}</p>
              <p className="text-gray-600 capitalize">
                {currentQuestion.characteristic}: {birdB.characteristics[currentQuestion.characteristic]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      {showResult && (
        <div className="text-center">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-lg"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        </div>
      )}

      {/* Score Display */}
      <div className="text-center text-sm text-gray-500">
        Score: {score}/{currentQuestionIndex + (showResult ? 1 : 0)}
      </div>
    </div>
  );
};

export default ComparativeAnalysisExercise;
