import React, { useState, useEffect, useMemo } from 'react';
import { ExerciseContainer } from '../components/exercises/ExerciseContainer';
import { AIExerciseContainer } from '../components/exercises/AIExerciseContainer';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAnnotations } from '../hooks/useAnnotations';
import { usePrefetchExercises, useAIExerciseAvailability } from '../hooks/useAIExercise';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { ReviewScheduleCard } from '../components/srs/ReviewScheduleCard';
import { debug } from '../utils/logger';
import type { Exercise, Annotation } from '../types';

// Fallback image URLs for annotations when database is empty
const FALLBACK_IMAGE_URLS: Record<string, string> = {
  'flamingo': 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=800',
  'sparrow': 'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800',
  'eagle': 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800',
  'stork': 'https://images.unsplash.com/photo-1604608672516-f1b9a53a4ed6?w=800',
  'cardinal': 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=800',
  'owl': 'https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?w=800',
  'peacock': 'https://images.unsplash.com/photo-1515442261404-cdc31a521b4c?w=800',
  'migratory': 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800',
  'bluejay': 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=800',
  'hummingbird': 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=800',
};

// Sample annotations only used as fallback if API data is unavailable
const fallbackAnnotations: Annotation[] = [
  // BEGINNER LEVEL - Recognition & Basic Vocabulary
  {
    id: '1',
    imageId: 'flamingo',
    imageUrl: FALLBACK_IMAGE_URLS['flamingo'],
    boundingBox: { x: 0.3, y: 0.2, width: 0.2, height: 0.15 },
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
    imageUrl: FALLBACK_IMAGE_URLS['flamingo'],
    boundingBox: { x: 0.3, y: 0.6, width: 0.15, height: 0.35 },
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
    imageUrl: FALLBACK_IMAGE_URLS['sparrow'],
    boundingBox: { x: 0.25, y: 0.3, width: 0.5, height: 0.25 },
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
    imageUrl: FALLBACK_IMAGE_URLS['eagle'],
    boundingBox: { x: 0.35, y: 0.15, width: 0.15, height: 0.1 },
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
    imageId: 'cardinal',
    imageUrl: FALLBACK_IMAGE_URLS['cardinal'],
    boundingBox: { x: 0.3, y: 0.1, width: 0.3, height: 0.2 },
    type: 'anatomical',
    spanishTerm: 'la cresta',
    englishTerm: 'crest',
    pronunciation: 'lah KREHS-tah',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // INTERMEDIATE LEVEL - Descriptive & Contextual
  {
    id: '6',
    imageId: 'flamingo',
    imageUrl: FALLBACK_IMAGE_URLS['flamingo'],
    boundingBox: { x: 0.2, y: 0.25, width: 0.6, height: 0.4 },
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
    imageUrl: FALLBACK_IMAGE_URLS['eagle'],
    boundingBox: { x: 0.3, y: 0.7, width: 0.2, height: 0.2 },
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
    imageUrl: FALLBACK_IMAGE_URLS['stork'],
    boundingBox: { x: 0.35, y: 0.2, width: 0.15, height: 0.35 },
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
    imageUrl: FALLBACK_IMAGE_URLS['cardinal'],
    boundingBox: { x: 0.25, y: 0.15, width: 0.35, height: 0.25 },
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
    imageUrl: FALLBACK_IMAGE_URLS['owl'],
    boundingBox: { x: 0.25, y: 0.15, width: 0.5, height: 0.25 },
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
    imageUrl: FALLBACK_IMAGE_URLS['peacock'],
    boundingBox: { x: 0.1, y: 0.3, width: 0.8, height: 0.5 },
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
    imageId: 'hummingbird',
    imageUrl: FALLBACK_IMAGE_URLS['hummingbird'],
    boundingBox: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
    type: 'behavioral',
    spanishTerm: 'volar en el lugar',
    englishTerm: 'hover in place',
    pronunciation: 'boh-LAHR ehn el loo-GAHR',
    difficultyLevel: 3,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const PracticePage: React.FC = () => {
  // State
  const [useAIExercises, setUseAIExercises] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
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

  // SRS Hooks
  const {
    dueTerms,
    dueCount,
    upcomingReviews,
    nextReviewDate,
    isLoading: srsLoading,
    recordReview,
    calculateQuality,
  } = useSpacedRepetition();

  // Use API annotations if available, otherwise fallback to samples
  const annotations = apiAnnotations.length > 0 ? apiAnnotations : fallbackAnnotations;

  // Filter annotations for review mode - prioritize due terms
  const filteredAnnotations = useMemo(() => {
    if (!reviewMode || dueCount === 0) {
      return annotations;
    }

    // Map due terms to annotations
    const dueTermIds = new Set(dueTerms.map(term => term.termId));
    const dueAnnotations = annotations.filter(ann => dueTermIds.has(ann.id));

    // If we have due annotations, use them; otherwise fall back to all
    return dueAnnotations.length > 0 ? dueAnnotations : annotations;
  }, [reviewMode, dueTerms, dueCount, annotations]);

  // Prefetch exercises on page load if AI mode is enabled
  useEffect(() => {
    if (useAIExercises && isAIAvailable) {
      debug('Prefetching AI exercises', { userId, count: 5 });
      prefetchExercises({ userId, count: 5 });
    }
  }, [useAIExercises, isAIAvailable, userId]);

  const handleExerciseComplete = async (correct: boolean, exercise?: Exercise) => {
    debug('Exercise completed', { correct, exerciseId: exercise?.id });

    // Record SRS review if we have an annotation ID
    if (exercise?.annotation?.id) {
      try {
        const quality = calculateQuality(correct);
        await recordReview({
          termId: exercise.annotation.id,
          quality,
        });
        debug('SRS review recorded', { termId: exercise.annotation.id, quality });
      } catch (error) {
        debug('Failed to record SRS review', { error });
      }
    }

    // Track analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('exercise_completed', {
        userId,
        correct,
        exerciseType: exercise?.type,
        mode: useAIExercises ? 'ai' : 'traditional',
        reviewMode,
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

  const handleToggleReviewMode = () => {
    const newReviewMode = !reviewMode;
    setReviewMode(newReviewMode);

    debug('Review mode toggled', { reviewMode: newReviewMode });

    // Track analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('review_mode_changed', {
        userId,
        reviewMode: newReviewMode,
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
              <div className="flex items-center gap-4">
                <p className="text-gray-600">
                  Test your Spanish bird vocabulary knowledge
                </p>
                {!srsLoading && dueCount > 0 && (
                  <Badge variant="warning" size="sm">
                    {dueCount} term{dueCount !== 1 ? 's' : ''} due for review
                  </Badge>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Review Mode Toggle */}
              {dueCount > 0 && (
                <Button
                  onClick={handleToggleReviewMode}
                  variant={reviewMode ? 'primary' : 'outline'}
                  size="md"
                  leftIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  }
                  aria-label={`${reviewMode ? 'Exit' : 'Enter'} review mode`}
                >
                  {reviewMode ? 'Exit Review Mode' : 'Review Due Terms'}
                </Button>
              )}

              {/* AI Toggle - Only show if AI is available */}
              {isAIAvailable && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Mode Description */}
          <div
            className={`p-4 rounded-lg border ${
              reviewMode
                ? 'bg-orange-50 border-orange-200'
                : useAIExercises
                ? 'bg-purple-50 border-purple-200'
                : 'bg-blue-50 border-blue-200'
            }`}
            role="status"
            aria-live="polite"
          >
            <p
              className={`text-sm ${
                reviewMode
                  ? 'text-orange-800'
                  : useAIExercises
                  ? 'text-purple-800'
                  : 'text-blue-800'
              }`}
            >
              {reviewMode ? (
                <>
                  <strong>Review Mode:</strong> Focusing on {dueCount} term{dueCount !== 1 ? 's' : ''} due for review.
                  The spaced repetition system will track your progress and schedule future reviews
                  based on your performance.
                </>
              ) : useAIExercises ? (
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
        </div>

        {/* Exercise Container */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {annotationsLoading || srsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                {srsLoading ? 'Loading review data...' : 'Loading exercises...'}
              </div>
            </div>
          ) : reviewMode && dueCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-green-600 mb-4 text-xl">🎉 All caught up!</div>
              <p className="text-gray-600 mb-2">No terms due for review right now.</p>
              <p className="text-sm text-gray-400">Check back later or practice in traditional mode.</p>
              <Button
                onClick={() => setReviewMode(false)}
                variant="outline"
                size="md"
                className="mt-4"
              >
                Exit Review Mode
              </Button>
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
              annotations={filteredAnnotations}
              onComplete={(progress) => {
                debug('Session complete', { progress });
              }}
              onExerciseComplete={async (correct, annotationId) => {
                // Record SRS review
                try {
                  const quality = calculateQuality(correct);
                  await recordReview({
                    termId: annotationId,
                    quality,
                  });
                  debug('SRS review recorded', { annotationId, quality, correct });
                } catch (error) {
                  debug('Failed to record SRS review', { error });
                }
              }}
            />
          )}
        </div>

        {/* Info Cards with Review Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Review Schedule Card */}
          <ReviewScheduleCard
            dueCount={dueCount}
            upcomingReviews={upcomingReviews}
            nextReviewDate={nextReviewDate}
            isLoading={srsLoading}
          />

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Adaptive Learning</h3>
            <p className="text-sm text-gray-600">
              {useAIExercises
                ? 'AI adjusts difficulty based on your performance'
                : 'Progress through beginner, intermediate, and advanced levels'}
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