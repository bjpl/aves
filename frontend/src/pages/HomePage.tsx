// CONCEPT: Landing page - welcoming entry point with auth-aware quick stats
// WHY: Clean landing for new users, quick access for returning users
// PATTERN: Hero + conditional stats based on auth state

import React from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useUserSRSStats } from '../hooks/useSpacedRepetition';
import { useProgress } from '../hooks/useProgress';

export const HomePage: React.FC = () => {
  const { user } = useSupabaseAuth();
  const { data: srsStats, isLoading: srsLoading } = useUserSRSStats();
  const { getStats, loading: progressLoading } = useProgress();
  const sessionStats = getStats();

  const isAuthenticated = !!user;
  const isLoading = srsLoading || progressLoading;

  // Use SRS stats if authenticated, otherwise use session stats
  const displayStats = isAuthenticated && srsStats ? {
    termsLearned: srsStats.totalTerms,
    mastered: srsStats.mastered,
    dueForReview: srsStats.dueForReview,
    streak: srsStats.streak
  } : {
    termsLearned: sessionStats.termsLearned,
    mastered: sessionStats.masteredTerms,
    dueForReview: 0,
    streak: sessionStats.currentStreak
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                Birds in Spanish
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Beautiful photos of birds. Real Spanish vocabulary. Natural learning.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
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
        <div className="hidden lg:block absolute top-20 left-10 text-4xl animate-bounce motion-reduce:animate-none opacity-50 pointer-events-none z-0">🦜</div>
        <div className="hidden lg:block absolute top-40 right-20 text-3xl animate-pulse motion-reduce:animate-none opacity-50 pointer-events-none z-0">🦅</div>
        <div className="hidden lg:block absolute bottom-20 left-1/4 text-4xl animate-bounce delay-150 motion-reduce:animate-none opacity-50 pointer-events-none z-0">🦩</div>
      </div>

      {/* Quick Stats Section - Compact, with link to full dashboard */}
      {(displayStats.termsLearned > 0 || isAuthenticated) && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {isAuthenticated ? 'Welcome Back!' : 'This Session'}
              </h2>
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                >
                  Full Dashboard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="flex gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex-1 h-16 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{displayStats.termsLearned}</div>
                  <div className="text-xs text-gray-600">Terms Learned</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{displayStats.mastered}</div>
                  <div className="text-xs text-gray-600">Mastered</div>
                </div>
                {isAuthenticated && displayStats.dueForReview > 0 ? (
                  <Link to="/practice" className="text-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                    <div className="text-2xl font-bold text-orange-600">{displayStats.dueForReview}</div>
                    <div className="text-xs text-gray-600">Due for Review</div>
                  </Link>
                ) : (
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{sessionStats.exercisesCompleted}</div>
                    <div className="text-xs text-gray-600">Exercises</div>
                  </div>
                )}
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                    {displayStats.streak} <span className="text-lg">🔥</span>
                  </div>
                  <div className="text-xs text-gray-600">{isAuthenticated ? 'Day Streak' : 'Streak'}</div>
                </div>
              </div>
            )}

            {!isAuthenticated && displayStats.termsLearned > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  Sign in to save your progress and unlock spaced repetition
                </p>
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Create Account or Sign In →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

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