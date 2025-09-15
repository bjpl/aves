import React, { useState, useEffect } from 'react';
import { useLesson, useQuizzesByLesson, useQuizSubmission, useProgressTracking } from '../hooks/useCMS';
import { CMSService } from '../services/cms.service';
import { Clock, Target, CheckCircle, XCircle, ChevronRight, ChevronLeft } from 'lucide-react';

// PATTERN: Progressive Learning Interface
// WHY: Guides users through structured content
// CONCEPT: Educational UX with progress tracking

interface LessonViewerProps {
  lessonId: number;
  userId?: string;
  onComplete?: () => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({ lessonId, userId, onComplete }) => {
  const [currentSection, setCurrentSection] = useState<'overview' | 'content' | 'quiz'>('overview');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, any>>({});
  const [quizResults, setQuizResults] = useState<Record<number, boolean>>({});
  const [progress, setProgress] = useState(0);

  const { data: lesson, isLoading: lessonLoading } = useLesson(lessonId);
  const { data: quizzes, isLoading: quizzesLoading } = useQuizzesByLesson(lessonId);
  const submitQuiz = useQuizSubmission();
  const trackProgress = useProgressTracking();

  useEffect(() => {
    // Calculate progress based on current section
    const sectionProgress = {
      overview: 33,
      content: 66,
      quiz: 100
    };
    const newProgress = sectionProgress[currentSection];
    setProgress(newProgress);

    // Track progress if user is logged in
    if (userId && lesson) {
      trackProgress.mutate({ userId, lessonId, progress: newProgress });
    }
  }, [currentSection, userId, lessonId]);

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

  const handleQuizSubmit = async () => {
    const results: Record<number, boolean> = {};

    for (const quiz of (quizzes?.data || [])) {
      const answer = quizAnswers[quiz.id];
      if (answer !== undefined) {
        const result = await submitQuiz.mutateAsync({ quizId: quiz.id, answer });
        results[quiz.id] = result.correct;
      }
    }

    setQuizResults(results);

    // Complete lesson if all quizzes are answered
    if (Object.keys(results).length === quizzes?.data.length) {
      if (userId) {
        await trackProgress.mutateAsync({ userId, lessonId, progress: 100 });
      }
      onComplete?.();
    }
  };

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
            onClick={() => setCurrentSection(section as any)}
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
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">{lesson.attributes.title}</h1>

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>{lesson.attributes.duration} minutes</span>
              </div>
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-1" />
                <span className="capitalize">{lesson.attributes.difficulty}</span>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {lesson.attributes.category}
              </span>
            </div>

            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: lesson.attributes.description }} />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Learning Objectives:</h3>
              <ul className="space-y-1">
                {(lesson.attributes.objectives || []).map((objective: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setCurrentSection('content')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Start Lesson
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}

        {currentSection === 'content' && (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: lesson.attributes.content }} />
            </div>

            {/* Related Birds */}
            {lesson.attributes.birds?.data && lesson.attributes.birds.data.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Featured Birds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lesson.attributes.birds.data.map((bird) => (
                    <div key={bird.id} className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
                      {bird.attributes.images?.data?.[0] && (
                        <img
                          src={CMSService.getMediaUrl(bird.attributes.images.data[0].attributes.url)}
                          alt={bird.attributes.spanishName}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h4 className="font-medium">{bird.attributes.spanishName}</h4>
                        <p className="text-sm text-gray-600">{bird.attributes.englishName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentSection('overview')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                onClick={() => setCurrentSection('quiz')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                Take Quiz
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentSection === 'quiz' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Lesson Quiz</h2>

            {quizzes?.data && quizzes.data.length > 0 ? (
              <>
                {quizzes.data.map((quiz, index) => (
                  <div key={quiz.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium">Question {index + 1}</h3>
                      <span className="text-sm text-gray-600">{quiz.attributes.points} points</span>
                    </div>

                    <p className="mb-4">{quiz.attributes.question}</p>

                    {quiz.attributes.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {(quiz.attributes.options || []).map((option: string, optIndex: number) => (
                          <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`quiz-${quiz.id}`}
                              value={option}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [quiz.id]: option })}
                              disabled={!!quizResults[quiz.id]}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {quiz.attributes.type === 'true_false' && (
                      <div className="space-y-2">
                        {['True', 'False'].map((option) => (
                          <label key={option} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`quiz-${quiz.id}`}
                              value={option.toLowerCase()}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [quiz.id]: option.toLowerCase() })}
                              disabled={!!quizResults[quiz.id]}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {quizResults[quiz.id] !== undefined && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        quizResults[quiz.id] ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        <div className="flex items-center">
                          {quizResults[quiz.id] ? (
                            <CheckCircle className="w-5 h-5 mr-2" />
                          ) : (
                            <XCircle className="w-5 h-5 mr-2" />
                          )}
                          <span className="font-medium">
                            {quizResults[quiz.id] ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        {quiz.attributes.explanation && (
                          <p className="mt-2 text-sm">{quiz.attributes.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {Object.keys(quizResults).length === 0 ? (
                  <button
                    onClick={handleQuizSubmit}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={Object.keys(quizAnswers).length !== quizzes.data.length}
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-medium mb-4">
                      You scored {Object.values(quizResults).filter(r => r).length} out of {quizzes.data.length}!
                    </p>
                    {onComplete && (
                      <button
                        onClick={onComplete}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Complete Lesson
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No quiz available for this lesson.</p>
                {onComplete && (
                  <button
                    onClick={onComplete}
                    className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Complete Lesson
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};