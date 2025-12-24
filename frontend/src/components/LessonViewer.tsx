import React, { useState, useMemo, useCallback } from 'react';
import { useLesson, useQuizzesByLesson, useQuizSubmission, useProgressTracking } from '../hooks/useCMS';
import { LessonOverview } from './lesson/LessonOverview';
import { LessonContent } from './lesson/LessonContent';
import { LessonQuiz } from './lesson/LessonQuiz';
import { Lesson, Quiz } from '../services/cms.service';

// PATTERN: Progressive Learning Interface
// WHY: Guides users through structured content
// CONCEPT: Educational UX with progress tracking

interface LessonViewerProps {
  lessonId: number;
  userId?: string;
  onComplete?: () => void;
}

interface QuizSubmitResult {
  correct: boolean;
  explanation?: string;
  points: number;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({ lessonId, userId, onComplete }) => {
  const [currentSection, setCurrentSection] = useState<'overview' | 'content' | 'quiz'>('overview');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResults, setQuizResults] = useState<Record<number, boolean>>({});

  const { data: lesson, isLoading: lessonLoading } = useLesson(lessonId) as {
    data: Lesson | undefined;
    isLoading: boolean;
  };
  const { data: quizzes, isLoading: quizzesLoading } = useQuizzesByLesson(lessonId) as {
    data: Quiz[] | undefined;
    isLoading: boolean;
  };
  const submitQuiz = useQuizSubmission();
  const trackProgress = useProgressTracking();

  const sectionProgress: Record<'overview' | 'content' | 'quiz', number> = useMemo(() => ({
    overview: 33,
    content: 66,
    quiz: 100
  }), []);

  const progress = sectionProgress[currentSection];

  const handleSectionChange = useCallback((section: 'overview' | 'content' | 'quiz') => {
    setCurrentSection(section);
  }, []);

  const handleQuizAnswerChange = useCallback((quizId: number, answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [quizId]: answer }));
  }, []);

  if (lessonLoading || quizzesLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-red-600">Lesson not found</p>
      </div>
    );
  }

  const handleQuizSubmit = useCallback(async () => {
    const results: Record<number, boolean> = {};
    const quizData: Quiz[] = quizzes || [];

    for (const quiz of quizData) {
      const answer = quizAnswers[quiz.id];
      if (answer !== undefined) {
        const result = await submitQuiz.mutateAsync({ quizId: quiz.id, answer }) as QuizSubmitResult;
        results[quiz.id] = result.correct;
      }
    }

    setQuizResults(results);

    // Complete lesson if all quizzes are answered
    if (Object.keys(results).length === quizData.length) {
      if (userId) {
        await trackProgress.mutateAsync({ userId, lessonId, progress: 100 });
      }
      onComplete?.();
    }
  }, [quizzes, quizAnswers, submitQuiz, userId, lessonId, trackProgress, onComplete]);

  const quizScore = useMemo(() => {
    const correctCount = Object.values(quizResults).filter(r => r).length;
    const totalCount = (quizzes || []).length;
    return { correct: correctCount, total: totalCount };
  }, [quizResults, quizzes]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-4 mb-8 border-b">
        {['overview', 'content', 'quiz'].map((section) => (
          <button
            key={section}
            onClick={() => handleSectionChange(section as any)}
            className={`pb-2 px-4 capitalize font-medium transition-colors ${
              currentSection === section
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {currentSection === 'overview' && (
          <LessonOverview
            title={lesson.attributes.title}
            description={lesson.attributes.description}
            duration={lesson.attributes.duration}
            difficulty={lesson.attributes.difficulty}
            category={lesson.attributes.category}
            objectives={lesson.attributes.objectives}
            onStartLesson={() => handleSectionChange('content')}
          />
        )}

        {currentSection === 'content' && (
          <LessonContent
            content={lesson.attributes.content}
            birds={lesson.attributes.birds}
            onBack={() => handleSectionChange('overview')}
            onNext={() => handleSectionChange('quiz')}
          />
        )}

        {currentSection === 'quiz' && (
          <LessonQuiz
            quizzes={quizzes || []}
            quizAnswers={quizAnswers}
            quizResults={quizResults}
            quizScore={quizScore}
            onAnswerChange={handleQuizAnswerChange}
            onSubmit={handleQuizSubmit}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
};
