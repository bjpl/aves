import React, { useState, useEffect } from 'react';
import { ExerciseContainer } from '../components/exercises/ExerciseContainer';
import { AIExerciseContainer } from '../components/exercises/AIExerciseContainer';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAnnotations } from '../hooks/useAnnotations';
import { usePrefetchExercises, useAIExerciseAvailability } from '../hooks/useAIExercise';
import { debug } from '../utils/logger';
import type { Exercise, Annotation } from '../types';

// Sample annotations only used as fallback if API data is unavailable
const fallbackAnnotations: Annotation[] = [
  // BEGINNER LEVEL - Recognition & Basic Vocabulary
  {
    id: '1',
    imageId: 'flamingo',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'anatomical',
    spanishTerm: 'el pico',
    englishTerm: 'beak',
    pronunciation: 'el PEE-koh',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    imageId: 'flamingo',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'anatomical',
    spanishTerm: 'las patas',
    englishTerm: 'legs',
    pronunciation: 'lahs PAH-tahs',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    imageId: 'sparrow',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'anatomical',
    spanishTerm: 'las alas',
    englishTerm: 'wings',
    pronunciation: 'lahs AH-lahs',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    imageId: 'eagle',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'anatomical',
    spanishTerm: 'los ojos',
    englishTerm: 'eyes',
    pronunciation: 'lohs OH-hohs',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    imageId: 'stork',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'habitat',
    spanishTerm: 'el nido',
    englishTerm: 'nest',
    pronunciation: 'el NEE-doh',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // INTERMEDIATE LEVEL - Descriptive & Contextual
  {
    id: '6',
    imageId: 'flamingo',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'color',
    spanishTerm: 'las plumas rosadas',
    englishTerm: 'pink feathers',
    pronunciation: 'lahs PLOO-mahs roh-SAH-dahs',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '7',
    imageId: 'eagle',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'anatomical',
    spanishTerm: 'las garras',
    englishTerm: 'talons',
    pronunciation: 'lahs GAH-rrahs',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '8',
    imageId: 'stork',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'anatomical',
    spanishTerm: 'el cuello largo',
    englishTerm: 'long neck',
    pronunciation: 'el KWEH-yoh LAHR-goh',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '9',
    imageId: 'cardinal',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'anatomical',
    spanishTerm: 'la cresta roja',
    englishTerm: 'red crest',
    pronunciation: 'lah KREHS-tah ROH-hah',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '10',
    imageId: 'owl',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'behavioral',
    spanishTerm: 'caza de noche',
    englishTerm: 'hunts at night',
    pronunciation: 'KAH-sah deh NOH-cheh',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // ADVANCED LEVEL - Complex Phrases & Cultural
  {
    id: '11',
    imageId: 'peacock',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'behavioral',
    spanishTerm: 'hacer la rueda',
    englishTerm: 'display tail feathers',
    pronunciation: 'ah-SEHR lah RWEH-dah',
    difficultyLevel: 3,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '12',
    imageId: 'migratory',
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    type: 'behavioral',
    spanishTerm: 'migrar al sur',
    englishTerm: 'migrate south',
    pronunciation: 'mee-GRAHR ahl soor',
    difficultyLevel: 3,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const PracticePage: React.FC = () => {
  // State
  const [useAIExercises, setUseAIExercises] = useState(false);
  const [userId] = useState(() => {
    // Get or create user ID from session storage
    let id = sessionStorage.getItem('aves-user-id');
    if (!id) {
      id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('aves-user-id', id);
    }
    return id;
  });

  // Hooks
  const { data: apiAnnotations = [], isLoading: annotationsLoading } = useAnnotations();
  const { isAvailable: isAIAvailable } = useAIExerciseAvailability();
  const { mutate: prefetchExercises } = usePrefetchExercises();

  // Use API annotations if available, otherwise fallback to samples
  const annotations = apiAnnotations.length > 0 ? apiAnnotations : fallbackAnnotations;

  // Prefetch exercises on page load if AI mode is enabled
  useEffect(() => {
    if (useAIExercises && isAIAvailable) {
      debug('Prefetching AI exercises', { userId, count: 5 });
      prefetchExercises({ userId, count: 5 });
    }
  }, [useAIExercises, isAIAvailable, userId]);

  const handleExerciseComplete = (correct: boolean, exercise?: Exercise) => {
    debug('Exercise completed', { correct, exerciseId: exercise?.id });

    // Track analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('exercise_completed', {
        userId,
        correct,
        exerciseType: exercise?.type,
        mode: useAIExercises ? 'ai' : 'traditional',
      });
    }
  };

  const handleToggleMode = () => {
    const newMode = !useAIExercises;
    setUseAIExercises(newMode);

    debug('Exercise mode toggled', { mode: newMode ? 'ai' : 'traditional' });

    // Track analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('exercise_mode_changed', {
        userId,
        mode: newMode ? 'ai' : 'traditional',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Practice Exercises
              </h1>
              <p className="text-gray-600">
                Test your Spanish bird vocabulary knowledge
              </p>
            </div>

            {/* AI Toggle - Only show if AI is available */}
            {isAIAvailable && (
              <div className="flex items-center gap-3">
                <Badge
                  variant={useAIExercises ? 'primary' : 'default'}
                  size="md"
                  className="cursor-default"
                >
                  {useAIExercises ? 'AI Mode' : 'Traditional'}
                </Badge>
                <Button
                  onClick={handleToggleMode}
                  variant={useAIExercises ? 'primary' : 'outline'}
                  size="md"
                  leftIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  aria-label={`Switch to ${useAIExercises ? 'traditional' : 'AI'} exercises`}
                >
                  {useAIExercises ? 'Use Traditional' : 'Use AI Exercises'}
                </Button>
              </div>
            )}
          </div>

          {/* Mode Description */}
          {isAIAvailable && (
            <div
              className={`p-4 rounded-lg border ${
                useAIExercises
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
              role="status"
              aria-live="polite"
            >
              <p
                className={`text-sm ${
                  useAIExercises ? 'text-purple-800' : 'text-blue-800'
                }`}
              >
                {useAIExercises ? (
                  <>
                    <strong>AI Mode:</strong> Exercises are dynamically generated based on your
                    performance and learning progress. Each exercise is personalized to help you
                    improve faster.
                  </>
                ) : (
                  <>
                    <strong>Traditional Mode:</strong> Practice with our curated set of
                    exercises covering all difficulty levels from beginner to advanced.
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Exercise Container */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {annotationsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading exercises...</div>
            </div>
          ) : annotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-gray-500 mb-4">No annotations available for practice.</div>
              <p className="text-sm text-gray-400">Please add annotations in the admin panel first.</p>
            </div>
          ) : useAIExercises && isAIAvailable ? (
            <AIExerciseContainer
              userId={userId}
              exerciseType="adaptive"
              onComplete={handleExerciseComplete}
              autoGenerate={true}
              showAIBadge={true}
            />
          ) : (
            <ExerciseContainer
              annotations={annotations}
              onComplete={(progress) => {
                debug('Session complete', { progress });
              }}
            />
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Adaptive Learning</h3>
            <p className="text-sm text-gray-600">
              {useAIExercises
                ? 'AI adjusts difficulty based on your performance'
                : 'Progress through beginner, intermediate, and advanced levels'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Feedback</h3>
            <p className="text-sm text-gray-600">
              Get instant feedback on your answers with helpful hints and explanations
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Progress</h3>
            <p className="text-sm text-gray-600">
              Monitor your learning journey with detailed statistics and achievements
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Practice Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Practice consistently - even 10 minutes a day makes a difference</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Say the words out loud to improve pronunciation and memory</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Review difficult terms multiple times for better retention</span>
            </li>
            {isAIAvailable && useAIExercises && (
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>AI exercises adapt to your level - don't worry about mistakes!</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};