import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface Quiz {
  id: number;
  attributes: {
    question: string;
    type: string;
    points: number;
    options?: string[];
    explanation?: string;
  };
}

interface LessonQuizProps {
  quizzes: Quiz[];
  quizAnswers: Record<number, any>;
  quizResults: Record<number, boolean>;
  quizScore: { correct: number; total: number };
  onAnswerChange: (quizId: number, answer: any) => void;
  onSubmit: () => void;
  onComplete?: () => void;
}

export const LessonQuiz: React.FC<LessonQuizProps> = ({
  quizzes,
  quizAnswers,
  quizResults,
  quizScore,
  onAnswerChange,
  onSubmit,
  onComplete
}) => {
  const hasSubmitted = Object.keys(quizResults).length > 0;
  const allAnswered = Object.keys(quizAnswers).length === quizzes.length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Lesson Quiz</h2>

      {quizzes.length > 0 ? (
        <>
          {quizzes.map((quiz, index) => (
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
                        onChange={() => onAnswerChange(quiz.id, option)}
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
                        onChange={() => onAnswerChange(quiz.id, option.toLowerCase())}
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

          {!hasSubmitted ? (
            <button
              onClick={onSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={!allAnswered}
            >
              Submit Quiz
            </button>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium mb-4">
                You scored {quizScore.correct} out of {quizScore.total}!
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
  );
};
