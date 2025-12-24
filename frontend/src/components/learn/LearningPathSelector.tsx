/**
 * LearningPathSelector Component
 *
 * Displays available learning modules/paths and allows users to select one.
 * Shows progress per path and recommends next module based on completion.
 */

import React from 'react';
import { useLearningModules, LearningModule } from '../../hooks/useLearnContent';

interface LearningPathSelectorProps {
  selectedModuleId?: string;
  onModuleSelect: (module: LearningModule) => void;
  userProgress?: Record<string, number>; // moduleId -> completion %
}

const DifficultyBadge: React.FC<{ level: number }> = ({ level }) => {
  const colors = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-orange-100 text-orange-800',
    5: 'bg-red-100 text-red-800',
  };

  const labels = {
    1: 'Beginner',
    2: 'Elementary',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[level as keyof typeof colors] || colors[1]}`}>
      {labels[level as keyof typeof labels] || 'Beginner'}
    </span>
  );
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

export const LearningPathSelector: React.FC<LearningPathSelectorProps> = ({
  selectedModuleId,
  onModuleSelect,
  userProgress = {},
}) => {
  const { data: modules = [], isLoading, error } = useLearningModules();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Failed to load learning paths. Please try again.</p>
      </div>
    );
  }

  // Sort modules: incomplete first, then by difficulty
  const sortedModules = [...modules].sort((a, b) => {
    const progressA = userProgress[a.id] || 0;
    const progressB = userProgress[b.id] || 0;

    // Incomplete before complete
    if (progressA < 100 && progressB >= 100) return -1;
    if (progressB < 100 && progressA >= 100) return 1;

    // Then by difficulty
    return a.difficultyLevel - b.difficultyLevel;
  });

  // Find recommended module (first incomplete, lowest difficulty)
  const recommendedModule = sortedModules.find(m => (userProgress[m.id] || 0) < 100);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Learning Paths</h2>
        <p className="text-sm text-gray-600">Choose a module to start learning</p>
      </div>

      <div className="divide-y divide-gray-100">
        {sortedModules.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p>No learning paths available yet.</p>
            <p className="text-sm mt-1">Check back soon for new content!</p>
          </div>
        ) : (
          sortedModules.map(module => {
            const progress = userProgress[module.id] || 0;
            const isSelected = module.id === selectedModuleId;
            const isRecommended = module.id === recommendedModule?.id;
            const isComplete = progress >= 100;

            return (
              <button
                key={module.id}
                onClick={() => onModuleSelect(module)}
                className={`w-full p-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                  isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {module.titleSpanish}
                      </h3>
                      {isRecommended && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Recommended
                        </span>
                      )}
                      {isComplete && (
                        <span className="text-green-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{module.title}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <DifficultyBadge level={module.difficultyLevel} />
                      <span className="text-xs text-gray-500">
                        {module.contentCount} terms
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <ProgressBar progress={progress} />
                    </div>
                  </div>

                  <svg
                    className={`w-5 h-5 ml-3 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Quick stats footer */}
      {modules.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{modules.length} paths available</span>
            <span>
              {Object.values(userProgress).filter(p => p >= 100).length} completed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPathSelector;
