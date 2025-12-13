import React from 'react';
import { useSpeciesLearnContent } from '../../hooks/useLearnContent';
import { ProgressBar, CircularProgress } from '../ui/ProgressBar';
import { Link } from 'react-router-dom';

interface SpeciesLearningSectionProps {
  speciesId: string;
  speciesName?: string;
}

export const SpeciesLearningSection: React.FC<SpeciesLearningSectionProps> = ({
  speciesId,
  speciesName
}) => {
  const { data: content = [], isLoading, error } = useSpeciesLearnContent(speciesId);

  // Calculate mastery statistics
  const calculateMastery = () => {
    if (!content.length) return { overall: 0, byTerm: {} as Record<string, number> };

    // For now, we'll use a simple calculation based on content existence
    // In a real app, this would come from user progress data
    const overall = Math.min((content.length / 10) * 100, 100);

    const byTerm: Record<string, number> = {};
    content.forEach(item => {
      const termId = item.id;
      // Simulate mastery based on difficulty level (would come from user data in production)
      byTerm[termId] = Math.max(0, 100 - (item.difficultyLevel * 20));
    });

    return { overall, byTerm };
  };

  const { overall, byTerm } = calculateMastery();

  // Group content by type
  const contentByType = content.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, typeof content>);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-1/3 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1 h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600">Error loading learning content</p>
        </div>
      </div>
    );
  }

  if (!content.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Learning Content Available
          </h3>
          <p className="text-gray-600 mb-6">
            Learning vocabulary for {speciesName || 'this species'} hasn't been published yet.
          </p>
          <div className="text-sm text-gray-500">
            Check back soon for annotated vocabulary and learning materials!
          </div>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anatomical': return '🦴';
      case 'behavioral': return '🎭';
      case 'color': return '🎨';
      case 'pattern': return '📐';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'anatomical': return 'Anatomical';
      case 'behavioral': return 'Behavioral';
      case 'color': return 'Color';
      case 'pattern': return 'Pattern';
      default: return type;
    }
  };

  const getMasteryColor = (percentage: number) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 50) return 'warning';
    return 'primary';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header with Overall Mastery */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Learning Vocabulary</h2>
            <p className="text-blue-100">
              {content.length} term{content.length !== 1 ? 's' : ''} available for {speciesName || 'this species'}
            </p>
          </div>
          <CircularProgress
            value={overall}
            color="primary"
            size={80}
            strokeWidth={6}
            className="bg-white/20 rounded-full p-2"
          />
        </div>

        <div className="flex gap-3">
          <Link
            to={`/learn?speciesId=${speciesId}`}
            className="flex-1 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold text-center hover:bg-blue-50 transition-colors"
          >
            📖 Learn These Terms
          </Link>
          <Link
            to={`/practice?speciesId=${speciesId}`}
            className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold text-center hover:bg-blue-400 transition-colors border-2 border-white/30"
          >
            ✏️ Practice Now
          </Link>
        </div>
      </div>

      {/* Vocabulary List by Type */}
      <div className="p-6">
        <div className="space-y-6">
          {Object.entries(contentByType).map(([type, items]) => (
            <div key={type} className="border-b border-gray-200 pb-6 last:border-0">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{getTypeIcon(type)}</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {getTypeLabel(type)} Terms
                </h3>
                <span className="text-sm text-gray-500 ml-auto">
                  {items.length} term{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {items.map(item => {
                  const mastery = byTerm[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3">
                            <span className="font-semibold text-gray-900 text-lg">
                              {item.spanishTerm}
                            </span>
                            <span className="text-gray-600">
                              {item.englishTerm}
                            </span>
                          </div>
                          {item.pronunciation && (
                            <div className="text-sm text-gray-500 italic mt-1">
                              [{item.pronunciation}]
                            </div>
                          )}
                        </div>

                        {/* Difficulty indicator */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < item.difficultyLevel
                                  ? 'bg-orange-400'
                                  : 'bg-gray-300'
                              }`}
                              title={`Difficulty: ${item.difficultyLevel}/5`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Mastery Progress */}
                      <ProgressBar
                        value={mastery}
                        size="sm"
                        color={getMasteryColor(mastery)}
                        className="mt-2"
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          Mastery Progress
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                          {Math.round(mastery)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {content.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total Terms</div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(contentByType).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Categories</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(content.reduce((sum, item) => sum + item.difficultyLevel, 0) / content.length * 10) / 10}
              </div>
              <div className="text-xs text-gray-600 mt-1">Avg Difficulty</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(overall)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">Overall Mastery</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎯</div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Ready to learn?</h4>
              <p className="text-sm text-gray-600">
                Start with the Learn mode to familiarize yourself with the terms, then practice to reinforce your knowledge.
              </p>
            </div>
            <Link
              to={`/learn?speciesId=${speciesId}`}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              Start Learning
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
