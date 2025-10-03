import React from 'react';
import { Clock, Target, CheckCircle, ChevronRight } from 'lucide-react';

interface LessonOverviewProps {
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  category: string;
  objectives?: string[];
  onStartLesson: () => void;
}

export const LessonOverview: React.FC<LessonOverviewProps> = ({
  title,
  description,
  duration,
  difficulty,
  category,
  objectives = [],
  onStartLesson
}) => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>

      <div className="flex items-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          <span>{duration} minutes</span>
        </div>
        <div className="flex items-center">
          <Target className="w-4 h-4 mr-1" />
          <span className="capitalize">{difficulty}</span>
        </div>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
          {category}
        </span>
      </div>

      <div className="prose max-w-none">
        <div dangerouslySetInnerHTML={{ __html: description }} />
      </div>

      {objectives.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Learning Objectives:</h3>
          <ul className="space-y-1">
            {objectives.map((objective: string, index: number) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onStartLesson}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
      >
        Start Lesson
        <ChevronRight className="w-5 h-5 ml-2" />
      </button>
    </div>
  );
};
