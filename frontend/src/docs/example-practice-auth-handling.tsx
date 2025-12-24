/**
 * Example: How to use the updated useSpacedRepetition hook with proper error handling
 *
 * This example shows how to handle authentication errors in a Practice page component
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';

export const ExamplePracticePage: React.FC = () => {
  const navigate = useNavigate();

  // Get all the data from the hook
  const {
    dueTerms,
    dueCount,
    stats,
    isLoading,
    error,           // NEW: User-friendly error message
    requiresAuth,    // NEW: True when user needs to log in
    isAuthenticated, // NEW: True when user is logged in
    recordReview,
    calculateQuality,
  } = useSpacedRepetition();

  // Show loading spinner while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (error && requiresAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Alert variant="warning">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-yellow-900 mb-2">
                  Login Required
                </h2>
                <p className="text-yellow-800">{error}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/login')}
                  variant="primary"
                  size="md"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  variant="outline"
                  size="md"
                >
                  Create Account
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  // Handle other errors (network, server errors, etc.)
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Alert variant="error">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-red-900 mb-2">
                  Something Went Wrong
                </h2>
                <p className="text-red-800">{error}</p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="md"
              >
                Try Again
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  // Normal authenticated state - render the practice interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with stats */}
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

                {/* Show due count badge when terms are due */}
                {dueCount > 0 && (
                  <Badge variant="warning" size="sm">
                    {dueCount} term{dueCount !== 1 ? 's' : ''} due for review
                  </Badge>
                )}
              </div>
            </div>

            {/* User info */}
            {isAuthenticated && stats && (
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Progress: {stats.mastered}/{stats.totalTerms} mastered
                </p>
                <p className="text-sm text-gray-600">
                  Streak: {stats.streak} days
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Practice content would go here */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {dueTerms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">
                Great job! No terms due for review right now.
              </p>
              <Button onClick={() => navigate('/learn')}>
                Learn New Terms
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Review {dueTerms.length} term{dueTerms.length !== 1 ? 's' : ''}
              </h2>
              {/* Exercise components would go here */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Alternative: More compact error handling with inline rendering
 */
export const CompactExamplePracticePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    dueTerms,
    dueCount,
    isLoading,
    error,
    requiresAuth,
  } = useSpacedRepetition();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error state - inline alert */}
        {error && !isLoading && (
          <Alert variant={requiresAuth ? 'warning' : 'error'}>
            <p>{error}</p>
            {requiresAuth && (
              <div className="mt-3 flex gap-2">
                <Button onClick={() => navigate('/login')} size="sm">
                  Log In
                </Button>
                <Button onClick={() => navigate('/signup')} variant="outline" size="sm">
                  Sign Up
                </Button>
              </div>
            )}
            {!requiresAuth && (
              <Button onClick={() => window.location.reload()} size="sm" className="mt-3">
                Retry
              </Button>
            )}
          </Alert>
        )}

        {/* Normal content - only show when no error */}
        {!error && !isLoading && (
          <div>
            <h1 className="text-3xl font-bold mb-4">Practice Exercises</h1>
            {dueCount > 0 && (
              <Badge variant="warning">{dueCount} due</Badge>
            )}
            {/* Practice content */}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Alternative: Using error boundary pattern
 */
export const ErrorBoundaryExamplePracticePage: React.FC = () => {
  const { error, requiresAuth } = useSpacedRepetition();

  // Throw error to be caught by error boundary if it's a critical error
  // (This is useful if you have a global error boundary)
  if (error && !requiresAuth) {
    throw new Error(error);
  }

  // Handle auth errors locally (they're not really "errors", more like state)
  if (error && requiresAuth) {
    return <AuthPrompt message={error} />;
  }

  // Normal rendering
  return <PracticeContent />;
};

// Helper component for auth prompt
const AuthPrompt: React.FC<{ message: string }> = ({ message }) => {
  const navigate = useNavigate();
  return (
    <div className="text-center py-12">
      <p className="text-gray-700 mb-4">{message}</p>
      <Button onClick={() => navigate('/login')}>Log In</Button>
    </div>
  );
};

// Placeholder for actual practice content
const PracticeContent: React.FC = () => {
  const { dueTerms, dueCount } = useSpacedRepetition();
  return (
    <div>
      <h1>Practice</h1>
      <p>{dueCount} terms due</p>
      {/* Actual practice interface */}
    </div>
  );
};
