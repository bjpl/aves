// Route: /dashboard
// CONCEPT: Personalized user dashboard - comprehensive learning metrics and exercise stats
// WHY: Single source of truth for learning progress, SRS stats, and exercise performance
// PATTERN: Dashboard with SRS stats, exercise metrics, and actionable insights

import React from 'react';
import { Link } from 'react-router-dom';
import { useUserSRSStats, useDueTerms } from '../hooks/useSpacedRepetition';
import { useLearningModules } from '../hooks/useLearnContent';
import { useProgress } from '../hooks/useProgress';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export const UserDashboardPage: React.FC = () => {
  const { user } = useSupabaseAuth();
  const { data: stats, isLoading: loadingStats } = useUserSRSStats();
  const { data: dueTerms = [] } = useDueTerms(5);
  const { data: modules = [], isLoading: loadingModules } = useLearningModules();
  const { getStats } = useProgress();
  const sessionStats = getStats();

  const isLoading = loadingStats || loadingModules;

  // Calculate progress percentages
  const masteryPercentage = stats?.totalTerms
    ? Math.round((stats.mastered / stats.totalTerms) * 100)
    : 0;
  const learningPercentage = stats?.totalTerms
    ? Math.round((stats.learning / stats.totalTerms) * 100)
    : 0;
  const notStartedPercentage = 100 - masteryPercentage - learningPercentage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your Learning Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Track your progress and continue your Spanish learning journey
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-lg p-6 animate-pulse"
              >
                <div className="h-12 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Terms */}
              <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">📚</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {stats?.totalTerms || 0}
                  </div>
                </div>
                <h3 className="text-gray-600 font-semibold text-lg">Total Terms</h3>
                <div className="mt-2 text-sm text-gray-500">
                  Vocabulary discovered
                </div>
              </div>

              {/* Mastered Count */}
              <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">⭐</div>
                  <div className="text-3xl font-bold text-green-600">
                    {stats?.mastered || 0}
                  </div>
                </div>
                <h3 className="text-gray-600 font-semibold text-lg">Mastered</h3>
                <div className="mt-2 text-sm text-gray-500">
                  {masteryPercentage}% of total
                </div>
              </div>

              {/* Learning Count */}
              <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">📖</div>
                  <div className="text-3xl font-bold text-yellow-600">
                    {stats?.learning || 0}
                  </div>
                </div>
                <h3 className="text-gray-600 font-semibold text-lg">Learning</h3>
                <div className="mt-2 text-sm text-gray-500">
                  In progress
                </div>
              </div>

              {/* Day Streak */}
              <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">🔥</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {stats?.streak || 0}
                  </div>
                </div>
                <h3 className="text-gray-600 font-semibold text-lg">Day Streak</h3>
                <div className="mt-2 text-sm text-gray-500">
                  Keep it going!
                </div>
              </div>
            </div>

            {/* Review Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Terms Due for Review
                  </h2>
                  <p className="text-gray-600">
                    Review these terms to strengthen your memory
                  </p>
                </div>
                <div className="text-5xl font-bold text-blue-600">
                  {stats?.dueForReview || 0}
                </div>
              </div>

              {stats?.dueForReview && stats.dueForReview > 0 ? (
                <Link
                  to="/practice"
                  className="w-full sm:w-auto inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-center"
                >
                  Review Now
                </Link>
              ) : (
                <div className="text-center py-4 bg-green-50 rounded-lg">
                  <p className="text-green-700 font-medium">
                    🎉 All caught up! No reviews due right now.
                  </p>
                </div>
              )}
            </div>

            {/* Progress Visualization */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Progress Overview
              </h2>

              {stats?.totalTerms && stats.totalTerms > 0 ? (
                <>
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span className="text-gray-600">Mastery Distribution</span>
                      <span className="text-gray-600">
                        {stats.totalTerms} total terms
                      </span>
                    </div>
                    <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden flex">
                      {/* Mastered */}
                      {masteryPercentage > 0 && (
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold"
                          style={{ width: `${masteryPercentage}%` }}
                        >
                          {masteryPercentage > 15 && `${masteryPercentage}%`}
                        </div>
                      )}
                      {/* Learning */}
                      {learningPercentage > 0 && (
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center text-white text-xs font-bold"
                          style={{ width: `${learningPercentage}%` }}
                        >
                          {learningPercentage > 15 && `${learningPercentage}%`}
                        </div>
                      )}
                      {/* Not Started */}
                      {notStartedPercentage > 0 && (
                        <div
                          className="bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold"
                          style={{ width: `${notStartedPercentage}%` }}
                        >
                          {notStartedPercentage > 15 && `${notStartedPercentage}%`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Mastered: {stats.mastered}
                        </p>
                        <p className="text-xs text-gray-500">
                          Well retained terms
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Learning: {stats.learning}
                        </p>
                        <p className="text-xs text-gray-500">
                          Being practiced
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Not Started: {stats.totalTerms - stats.mastered - stats.learning}
                        </p>
                        <p className="text-xs text-gray-500">
                          Yet to discover
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🌱</div>
                  <p className="text-gray-600 text-lg mb-4">
                    Start your learning journey!
                  </p>
                  <Link
                    to="/learn"
                    className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Discover Your First Terms
                  </Link>
                </div>
              )}
            </div>

            {/* Suggested Next Actions */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Suggested Next Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats?.dueForReview && stats.dueForReview > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🎯</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Review Due Terms
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          You have {stats.dueForReview} terms ready for review
                        </p>
                        <Link
                          to="/practice"
                          className="text-blue-600 font-medium hover:text-blue-700 text-sm"
                        >
                          Start Review →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {(!stats?.totalTerms || stats.totalTerms < 10) && (
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📚</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Discover More Terms
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Expand your vocabulary by learning new terms
                        </p>
                        <Link
                          to="/learn"
                          className="text-green-600 font-medium hover:text-green-700 text-sm"
                        >
                          Continue Learning →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {stats?.streak === 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🔥</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Start Your Streak
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Practice daily to build consistency
                        </p>
                        <Link
                          to="/practice"
                          className="text-orange-600 font-medium hover:text-orange-700 text-sm"
                        >
                          Practice Now →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {modules.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🦜</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Explore Species
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Browse {modules.length} learning modules
                        </p>
                        <Link
                          to="/species"
                          className="text-purple-600 font-medium hover:text-purple-700 text-sm"
                        >
                          Browse Species →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Quick Links
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to="/learn"
                  className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-shadow border border-blue-200"
                >
                  <div className="text-4xl mb-3">📖</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Continue Learning
                  </h3>
                  <p className="text-sm text-gray-600">
                    Discover new vocabulary
                  </p>
                </Link>

                <Link
                  to="/practice"
                  className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-shadow border border-green-200"
                >
                  <div className="text-4xl mb-3">✏️</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Practice
                  </h3>
                  <p className="text-sm text-gray-600">
                    Reinforce your knowledge
                  </p>
                </Link>

                <Link
                  to="/species"
                  className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-shadow border border-purple-200"
                >
                  <div className="text-4xl mb-3">🦅</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Browse Species
                  </h3>
                  <p className="text-sm text-gray-600">
                    Explore bird categories
                  </p>
                </Link>
              </div>
            </div>

            {/* Exercise Performance Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Exercise Performance
              </h2>

              {sessionStats.exercisesCompleted > 0 ? (
                <div className="space-y-6">
                  {/* Performance Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {sessionStats.exercisesCompleted}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Exercises Done</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {sessionStats.accuracy}%
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Accuracy</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {sessionStats.currentStreak}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Current Streak</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-600">
                        {sessionStats.longestStreak}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Best Streak</div>
                    </div>
                  </div>

                  {/* Accuracy Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Session Accuracy</span>
                      <span className="font-medium text-gray-900">{sessionStats.accuracy}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          sessionStats.accuracy >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          sessionStats.accuracy >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                          'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${sessionStats.accuracy}%` }}
                      />
                    </div>
                  </div>

                  {/* Session Time */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⏱️</span>
                      <div>
                        <div className="font-medium text-gray-900">Session Time</div>
                        <div className="text-sm text-gray-500">Time spent learning today</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {sessionStats.sessionDuration} min
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-5xl mb-4">✏️</div>
                  <p className="text-gray-600 mb-4">
                    No exercises completed yet this session
                  </p>
                  <Link
                    to="/practice"
                    className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Practicing
                  </Link>
                </div>
              )}
            </div>

            {/* Terms Due for Review Preview */}
            {dueTerms.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Up Next for Review
                  </h2>
                  <Link
                    to="/practice"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Review All →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dueTerms.slice(0, 6).map((term) => (
                    <div
                      key={term.id}
                      className="p-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border border-gray-100"
                    >
                      <div className="font-semibold text-gray-900 text-lg">
                        {term.spanishTerm}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {term.englishTerm}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                            style={{ width: `${term.masteryLevel}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{term.masteryLevel}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Summary */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Learning Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">This Session</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Terms Discovered</span>
                      <span className="font-bold text-gray-900">{sessionStats.termsLearned}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Exercises Completed</span>
                      <span className="font-bold text-gray-900">{sessionStats.exercisesCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Terms Mastered</span>
                      <span className="font-bold text-gray-900">{sessionStats.masteredTerms}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">All Time (SRS)</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Total Vocabulary</span>
                      <span className="font-bold text-gray-900">{stats?.totalTerms || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Fully Mastered</span>
                      <span className="font-bold text-green-600">{stats?.mastered || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Average Mastery</span>
                      <span className="font-bold text-blue-600">{stats?.averageMastery || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserDashboardPage;
