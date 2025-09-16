// CONCEPT: Landing page with real-time progress dashboard
// WHY: Provides immediate feedback on learning progress and motivates continued use
// PATTERN: Dashboard pattern with progress visualization

import React from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';

export const HomePage: React.FC = () => {
  const { getStats, loading } = useProgress();
  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                Birds in Spanish
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Beautiful photos of birds. Real Spanish vocabulary. Natural learning.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/learn"
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Start Learning
              </Link>
              <Link
                to="/practice"
                className="px-8 py-4 bg-white text-gray-800 font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Practice Exercises
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative birds */}
        <div className="absolute top-20 left-10 text-4xl animate-bounce">🦜</div>
        <div className="absolute top-40 right-20 text-3xl animate-pulse">🦅</div>
        <div className="absolute bottom-20 left-1/4 text-4xl animate-bounce delay-150">🦩</div>
      </div>

      {/* Progress Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Your Learning Progress
        </h2>

        {loading ? (
          <div className="text-center text-gray-500">Loading progress...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Terms Learned */}
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">📚</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.termsLearned}
                </div>
              </div>
              <h3 className="text-gray-600 font-medium">Terms Discovered</h3>
              <div className="mt-2 text-sm text-gray-500">
                Spanish vocabulary learned
              </div>
            </div>

            {/* Exercises Completed */}
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">✏️</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.exercisesCompleted}
                </div>
              </div>
              <h3 className="text-gray-600 font-medium">Exercises Done</h3>
              <div className="mt-2 text-sm text-gray-500">
                Practice sessions completed
              </div>
            </div>

            {/* Accuracy */}
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">🎯</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.accuracy}%
                </div>
              </div>
              <h3 className="text-gray-600 font-medium">Accuracy</h3>
              <div className="mt-2 text-sm text-gray-500">
                Exercise success rate
              </div>
            </div>

            {/* Current Streak */}
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">🔥</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.currentStreak}
                </div>
              </div>
              <h3 className="text-gray-600 font-medium">Current Streak</h3>
              <div className="mt-2 text-sm text-gray-500">
                Correct answers in a row
              </div>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Session Time
                </h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stats.sessionDuration} min
                </p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Mastered Terms
                </h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stats.masteredTerms}
                </p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Best Streak
                </h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stats.longestStreak}
                </p>
              </div>
              <div className="text-4xl">🏆</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-gradient-to-br from-green-400 to-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Explore Images</h3>
            <p className="text-gray-600">
              Click on bird photographs to discover Spanish vocabulary through
              interactive annotations
            </p>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-br from-blue-400 to-purple-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Learn Progressively</h3>
            <p className="text-gray-600">
              Vocabulary reveals gradually from basic terms to etymology and
              contextual examples
            </p>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-br from-purple-400 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Practice & Master</h3>
            <p className="text-gray-600">
              Reinforce learning with interactive exercises and track your
              progress over time
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands discovering Spanish through the beauty of birds
          </p>
          <Link
            to="/learn"
            className="inline-block px-8 py-4 bg-white text-green-600 font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Begin Your Journey
          </Link>
        </div>
      </div>
    </div>
  );
};