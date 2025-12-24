// CONCEPT: Enhanced exercise feedback component with animations and motivational messages
// WHY: Provides immediate, encouraging feedback that enhances learning experience
// PATTERN: Animated feedback with Spanish motivational messages
// NOTE: Install framer-motion with: npm install framer-motion

import React, { useEffect, useState } from 'react';

interface ExerciseFeedbackProps {
  isCorrect: boolean;
  correctAnswer?: string;
  userAnswer?: string;
  timeTaken?: number; // in seconds
  showCelebration?: boolean;
  onAnimationComplete?: () => void;
}

const motivationalMessages = {
  correct: [
    '¡Excelente!',
    '¡Muy bien!',
    '¡Perfecto!',
    '¡Fantástico!',
    '¡Increíble!',
    '¡Genial!',
    '¡Sigue así!',
  ],
  incorrect: [
    '¡Sigue practicando!',
    '¡Casi!',
    '¡Inténtalo de nuevo!',
    '¡No te rindas!',
    '¡Puedes hacerlo!',
  ],
  fast: [
    '¡Rapidísimo!',
    '¡Qué velocidad!',
    '¡Impresionante rapidez!',
  ],
  perfect: [
    '¡PERFECTO!',
    '¡IMPECABLE!',
    '¡MAGNÍFICO!',
  ]
};

const getRandomMessage = (messages: string[]) => {
  return messages[Math.floor(Math.random() * messages.length)];
};

export const ExerciseFeedback: React.FC<ExerciseFeedbackProps> = ({
  isCorrect,
  correctAnswer,
  userAnswer,
  timeTaken,
  showCelebration = false,
  onAnimationComplete,
}) => {
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Determine message based on performance
    if (showCelebration) {
      setMessage(getRandomMessage(motivationalMessages.perfect));
      setShowConfetti(true);
    } else if (isCorrect) {
      if (timeTaken && timeTaken < 3) {
        setMessage(getRandomMessage(motivationalMessages.fast));
      } else {
        setMessage(getRandomMessage(motivationalMessages.correct));
      }
    } else {
      setMessage(getRandomMessage(motivationalMessages.incorrect));
    }

    // Trigger animation complete callback after animation
    const timer = setTimeout(() => {
      onAnimationComplete?.();
      setShowConfetti(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isCorrect, timeTaken, showCelebration, onAnimationComplete]);

  return (
    <div className="relative animate-slideInUp">
      {/* Confetti effect for perfect scores */}
      {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-0 animate-confettiFall"
                style={{
                  animationDelay: `${Math.random() * 0.3}s`,
                  left: `${50 + Math.random() * 100 - 50}%`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: [
                      '#FFD700',
                      '#FF6B6B',
                      '#4ECDC4',
                      '#95E1D3',
                      '#F38181',
                    ][Math.floor(Math.random() * 5)],
                  }}
                />
              </div>
            ))}
          </div>
        )}

      {/* Main feedback card */}
      <div
          className={`rounded-xl p-6 shadow-lg border-2 ${
            isCorrect
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
              : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300'
          }`}
      >
        {/* Icon and message */}
        <div className="flex items-center justify-center mb-4">
          <div className={isCorrect ? 'animate-scaleIn' : 'animate-shake'}>
            {isCorrect ? (
              <svg
                className="w-16 h-16 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-16 h-16 text-orange-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Motivational message */}
        <h3
          className={`text-2xl font-bold text-center mb-3 animate-fadeInUp ${
            isCorrect ? 'text-green-700' : 'text-orange-700'
          }`}
        >
          {message}
        </h3>

        {/* English translation */}
        <p className="text-center text-gray-600 mb-4 animate-fadeIn">
          {isCorrect ? 'Correct!' : 'Not quite right'}
        </p>

        {/* Time taken badge */}
        {timeTaken !== undefined && (
          <div className="flex items-center justify-center gap-2 mb-4 animate-fadeIn">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">
              {timeTaken.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Answer details (when incorrect) */}
        {!isCorrect && correctAnswer && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 animate-fadeInUp">
            <div className="space-y-2">
              {userAnswer && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your answer:</p>
                  <p className="text-sm text-gray-700 line-through">
                    {userAnswer}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Correct answer:</p>
                <p className="text-base font-semibold text-green-700">
                  {correctAnswer}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress indicator dots */}
        <div className="flex justify-center gap-1 mt-4 animate-fadeIn">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full animate-pulse ${
                isCorrect ? 'bg-green-400' : 'bg-orange-400'
              }`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExerciseFeedback;
