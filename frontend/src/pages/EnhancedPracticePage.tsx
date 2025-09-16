import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Practice exercise types and data
const exerciseTypes = {
  VISUAL_MATCH: 'visual_match',
  FILL_BLANK: 'fill_blank',
  MULTIPLE_CHOICE: 'multiple_choice',
  LISTENING: 'listening'
};

const practiceData = {
  visual_match: [
    {
      question: 'Match the image to the Spanish name',
      correctAnswer: 'Flamenco',
      imageUrl: 'https://images.unsplash.com/photo-1535821265819-8e7ff3c30737?w=400',
      options: ['Flamenco', 'Águila', 'Colibrí', 'Búho']
    },
    {
      question: 'Which bird is this?',
      correctAnswer: 'Pavo Real',
      imageUrl: 'https://images.unsplash.com/photo-1512990641230-7e91cc31d0dc?w=400',
      options: ['Gorrión', 'Pavo Real', 'Paloma', 'Cuervo']
    },
    {
      question: 'Identify this bird',
      correctAnswer: 'Búho',
      imageUrl: 'https://images.unsplash.com/photo-1557401751-376608588678?w=400',
      options: ['Águila', 'Halcón', 'Búho', 'Cóndor']
    }
  ],
  fill_blank: [
    {
      sentence: 'El ___ tiene plumas rosadas.',
      correctAnswer: 'flamenco',
      options: ['flamenco', 'águila', 'gorrión', 'búho'],
      translation: 'The ___ has pink feathers.'
    },
    {
      sentence: 'El ___ caza de noche.',
      correctAnswer: 'búho',
      options: ['colibrí', 'flamenco', 'búho', 'pavo real'],
      translation: 'The ___ hunts at night.'
    },
    {
      sentence: 'El ___ tiene una cola magnífica.',
      correctAnswer: 'pavo real',
      options: ['gorrión', 'paloma', 'pavo real', 'cuervo'],
      translation: 'The ___ has a magnificent tail.'
    }
  ],
  multiple_choice: [
    {
      question: '¿Cómo se dice "wings" en español?',
      correctAnswer: 'las alas',
      options: ['las patas', 'las alas', 'las plumas', 'las garras'],
      explanation: 'Alas = wings, used for flying'
    },
    {
      question: '¿Qué significa "el pico"?',
      correctAnswer: 'beak',
      options: ['wing', 'tail', 'beak', 'feather'],
      explanation: 'El pico is the beak, used for eating'
    },
    {
      question: '¿Cuál pájaro es rosado?',
      correctAnswer: 'el flamenco',
      options: ['el águila', 'el búho', 'el cuervo', 'el flamenco'],
      explanation: 'Flamingos are pink from their diet'
    }
  ],
  anatomy: [
    {
      birdImage: 'https://images.unsplash.com/photo-1535821265819-8e7ff3c30737?w=600',
      question: 'Click on: las patas',
      correctArea: { x: 45, y: 70, radius: 10 },
      term: 'las patas',
      english: 'the legs'
    },
    {
      birdImage: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=600',
      question: 'Click on: las garras',
      correctArea: { x: 50, y: 75, radius: 10 },
      term: 'las garras',
      english: 'the talons'
    }
  ]
};

export const EnhancedPracticePage: React.FC = () => {
  const [currentExerciseType, setCurrentExerciseType] = useState(exerciseTypes.VISUAL_MATCH);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [streak, setStreak] = useState(0);

  const getCurrentExerciseData = () => {
    switch (currentExerciseType) {
      case exerciseTypes.VISUAL_MATCH:
        return practiceData.visual_match[currentExerciseIndex % practiceData.visual_match.length];
      case exerciseTypes.FILL_BLANK:
        return practiceData.fill_blank[currentExerciseIndex % practiceData.fill_blank.length];
      case exerciseTypes.MULTIPLE_CHOICE:
        return practiceData.multiple_choice[currentExerciseIndex % practiceData.multiple_choice.length];
      default:
        return practiceData.visual_match[0];
    }
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    const exercise = getCurrentExerciseData();
    const correct = answer.toLowerCase() === exercise.correctAnswer.toLowerCase();
    setIsCorrect(correct);
    setShowFeedback(true);
    setTotalAttempts(totalAttempts + 1);

    if (correct) {
      setScore(score + 1);
      setStreak(streak + 1);
    } else {
      setStreak(0);
    }

    // Auto-advance after 2 seconds
    setTimeout(() => {
      nextExercise();
    }, 2000);
  };

  const nextExercise = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCurrentExerciseIndex(currentExerciseIndex + 1);

    // Rotate through exercise types
    const types = Object.values(exerciseTypes);
    const currentTypeIndex = types.indexOf(currentExerciseType);
    const nextTypeIndex = (currentTypeIndex + 1) % types.length;
    setCurrentExerciseType(types[nextTypeIndex]);
  };

  const renderExercise = () => {
    const exercise = getCurrentExerciseData();

    switch (currentExerciseType) {
      case exerciseTypes.VISUAL_MATCH:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-center">{exercise.question}</h3>
            <img
              src={exercise.imageUrl}
              alt="Bird to identify"
              className="w-full max-w-md mx-auto rounded-lg shadow-md"
            />
            <div className="grid grid-cols-2 gap-3">
              {exercise.options.map((option: string) => (
                <button
                  key={option}
                  onClick={() => !showFeedback && handleAnswer(option)}
                  disabled={showFeedback}
                  className={`p-4 rounded-lg font-medium transition-all ${
                    showFeedback && option === exercise.correctAnswer
                      ? 'bg-green-500 text-white'
                      : showFeedback && option === selectedAnswer && !isCorrect
                      ? 'bg-red-500 text-white'
                      : selectedAnswer === option
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border-2 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      case exerciseTypes.FILL_BLANK:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-2">{exercise.sentence}</h3>
              <p className="text-gray-600 italic">{exercise.translation}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {exercise.options.map((option: string) => (
                <button
                  key={option}
                  onClick={() => !showFeedback && handleAnswer(option)}
                  disabled={showFeedback}
                  className={`p-3 rounded-lg font-medium transition-all ${
                    showFeedback && option === exercise.correctAnswer
                      ? 'bg-green-500 text-white'
                      : showFeedback && option === selectedAnswer && !isCorrect
                      ? 'bg-red-500 text-white'
                      : selectedAnswer === option
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border-2 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      case exerciseTypes.MULTIPLE_CHOICE:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-center">{exercise.question}</h3>
            <div className="space-y-3 max-w-md mx-auto">
              {exercise.options.map((option: string) => (
                <button
                  key={option}
                  onClick={() => !showFeedback && handleAnswer(option)}
                  disabled={showFeedback}
                  className={`w-full p-4 text-left rounded-lg font-medium transition-all ${
                    showFeedback && option === exercise.correctAnswer
                      ? 'bg-green-500 text-white'
                      : showFeedback && option === selectedAnswer && !isCorrect
                      ? 'bg-red-500 text-white'
                      : selectedAnswer === option
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border-2 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {showFeedback && exercise.explanation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-blue-700">{exercise.explanation}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const accuracy = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with stats */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Practice Exercises</h1>
            <Link
              to="/learn"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Learn
            </Link>
          </div>

          {/* Progress stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{score}</p>
              <p className="text-sm text-gray-600">Correct</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-blue-600">{accuracy}%</p>
              <p className="text-sm text-gray-600">Accuracy</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{streak}</p>
              <p className="text-sm text-gray-600">Streak</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-purple-600">{totalAttempts}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>

        {/* Exercise area */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Exercise type indicator */}
          <div className="mb-6 text-center">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {currentExerciseType.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {renderExercise()}

          {/* Feedback */}
          {showFeedback && (
            <div className={`mt-6 p-4 rounded-lg text-center ${
              isCorrect ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <p className={`text-lg font-bold ${
                isCorrect ? 'text-green-700' : 'text-red-700'
              }`}>
                {isCorrect ? '¡Excelente! Correct!' : `Not quite. The answer was: ${getCurrentExerciseData().correctAnswer}`}
              </p>
            </div>
          )}

          {/* Skip button */}
          {!showFeedback && (
            <div className="mt-6 text-center">
              <button
                onClick={nextExercise}
                className="text-gray-500 hover:text-gray-700"
              >
                Skip this exercise →
              </button>
            </div>
          )}
        </div>

        {/* Motivational messages */}
        {streak >= 5 && (
          <div className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg text-center">
            <p className="text-lg font-bold">🔥 You're on fire! {streak} in a row!</p>
          </div>
        )}

        {totalAttempts > 0 && totalAttempts % 10 === 0 && (
          <div className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg text-center">
            <p className="text-lg font-bold">🎉 Milestone: {totalAttempts} exercises completed!</p>
          </div>
        )}
      </div>
    </div>
  );
};