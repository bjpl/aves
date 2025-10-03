# AI Exercise Generation - Code Examples

**Comprehensive examples for implementing AI exercise generation in the Aves platform**

---

## Table of Contents

1. [React Hooks Usage](#react-hooks-usage)
2. [API Integration](#api-integration)
3. [Admin Dashboard](#admin-dashboard)
4. [Error Handling](#error-handling)
5. [Testing Examples](#testing-examples)
6. [Advanced Patterns](#advanced-patterns)

---

## React Hooks Usage

### Example 1: Basic Exercise Generation Hook

```typescript
// frontend/src/hooks/useExerciseGenerator.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateExercise, getExerciseStats } from '../services/exerciseAPI';

export interface UseExerciseGeneratorOptions {
  userId: string;
  type?: ExerciseType;
  difficulty?: number;
  onSuccess?: (data: ExerciseResponse) => void;
  onError?: (error: Error) => void;
}

export function useExerciseGenerator(options: UseExerciseGeneratorOptions) {
  const { userId, type, difficulty, onSuccess, onError } = options;

  // Generate new exercise
  const generateMutation = useMutation({
    mutationFn: async () => {
      return await generateExercise({
        userId,
        type,
        difficulty
      });
    },
    onSuccess: (data) => {
      console.log('Exercise generated:', data);
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      if (onError) onError(error);
    }
  });

  return {
    generateExercise: generateMutation.mutate,
    exercise: generateMutation.data?.exercise,
    metadata: generateMutation.data?.metadata,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error
  };
}

// Usage in component
function ExercisePage() {
  const { user } = useAuth();
  const { generateExercise, exercise, isGenerating } = useExerciseGenerator({
    userId: user.id,
    type: 'fill_in_blank',
    onSuccess: (data) => {
      console.log('Generated:', data.exercise.type);
    }
  });

  useEffect(() => {
    generateExercise();
  }, []);

  if (isGenerating) return <LoadingSpinner />;
  if (!exercise) return <EmptyState />;

  return <ExerciseRenderer exercise={exercise} />;
}
```

### Example 2: Adaptive Exercise Generation

```typescript
// frontend/src/hooks/useAdaptiveExercise.ts
import { useState, useEffect } from 'react';
import { useExerciseGenerator } from './useExerciseGenerator';

export function useAdaptiveExercise(userId: string) {
  const [difficulty, setDifficulty] = useState(3);
  const [streak, setStreak] = useState(0);

  const { generateExercise, exercise, isGenerating } = useExerciseGenerator({
    userId,
    type: 'adaptive', // Let system choose type
    difficulty,
    onSuccess: (data) => {
      // Track metadata for analytics
      trackEvent('exercise_generated', {
        type: data.exercise.type,
        difficulty: data.metadata.difficulty,
        cached: !data.metadata.generated
      });
    }
  });

  const handleAnswer = async (isCorrect: boolean) => {
    // Update streak
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);

    // Adjust difficulty based on performance
    let newDifficulty = difficulty;

    if (newStreak >= 3 && difficulty < 5) {
      newDifficulty = difficulty + 1; // Make harder
    } else if (!isCorrect && difficulty > 1) {
      newDifficulty = difficulty - 1; // Make easier
    }

    setDifficulty(newDifficulty);

    // Generate next exercise with new difficulty
    generateExercise();
  };

  return {
    exercise,
    isGenerating,
    difficulty,
    streak,
    handleAnswer,
    generateNext: generateExercise
  };
}

// Usage
function AdaptivePracticePage() {
  const { user } = useAuth();
  const {
    exercise,
    isGenerating,
    difficulty,
    streak,
    handleAnswer
  } = useAdaptiveExercise(user.id);

  return (
    <div>
      <DifficultyIndicator level={difficulty} />
      <StreakCounter count={streak} />

      {isGenerating ? (
        <LoadingSpinner />
      ) : (
        <ExerciseRenderer
          exercise={exercise}
          onSubmit={(isCorrect) => handleAnswer(isCorrect)}
        />
      )}
    </div>
  );
}
```

### Example 3: Prefetch Hook for Performance

```typescript
// frontend/src/hooks/usePrefetchExercises.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { generateExercise } from '../services/exerciseAPI';

export function usePrefetchExercises(
  userId: string,
  count: number = 3,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const prefetch = async () => {
      for (let i = 0; i < count; i++) {
        // Prefetch exercises in background
        queryClient.prefetchQuery({
          queryKey: ['exercise', userId, i],
          queryFn: () => generateExercise({ userId, type: 'adaptive' }),
          staleTime: 5 * 60 * 1000 // 5 minutes
        });
      }
    };

    // Prefetch after a short delay
    const timer = setTimeout(prefetch, 2000);

    return () => clearTimeout(timer);
  }, [userId, count, enabled, queryClient]);
}

// Usage
function PracticePage() {
  const { user } = useAuth();

  // Prefetch 3 exercises in background
  usePrefetchExercises(user.id, 3, true);

  return <ExerciseContainer />;
}
```

### Example 4: Exercise History Hook

```typescript
// frontend/src/hooks/useExerciseHistory.ts
import { useQuery } from '@tanstack/react-query';
import { getSessionProgress } from '../services/exerciseAPI';

export function useExerciseHistory(sessionId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exercise-history', sessionId],
    queryFn: () => getSessionProgress(sessionId),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  });

  const accuracy = data?.accuracy || '0';
  const totalExercises = data?.totalExercises || 0;
  const correctAnswers = data?.correctAnswers || 0;

  return {
    progress: data,
    accuracy: parseFloat(accuracy),
    totalExercises,
    correctAnswers,
    isLoading,
    error,
    refresh: refetch
  };
}

// Usage with progress display
function ProgressDashboard() {
  const { session } = useSession();
  const { accuracy, totalExercises, correctAnswers } = useExerciseHistory(
    session.id
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Your Progress</h3>

      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="Exercises"
          value={totalExercises}
          icon={<BookIcon />}
        />

        <Stat
          label="Correct"
          value={correctAnswers}
          icon={<CheckIcon />}
          color="green"
        />

        <Stat
          label="Accuracy"
          value={`${accuracy.toFixed(1)}%`}
          icon={<ChartIcon />}
          color={accuracy >= 70 ? 'green' : 'yellow'}
        />
      </div>
    </div>
  );
}
```

---

## API Integration

### Example 5: Exercise Service Layer

```typescript
// frontend/src/services/exerciseAPI.ts
import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001';

export interface ExerciseGenerateRequest {
  userId: string;
  type?: ExerciseType;
  difficulty?: number;
  topics?: string[];
}

export interface ExerciseResponse {
  exercise: Exercise;
  metadata: {
    generated: boolean;
    cacheKey: string;
    cost: number;
    difficulty: number;
    source: 'ai' | 'cache';
    timestamp: string;
  };
}

/**
 * Generate a new AI-powered exercise
 */
export async function generateExercise(
  request: ExerciseGenerateRequest
): Promise<ExerciseResponse> {
  const response = await axios.post(
    `${API_BASE}/api/ai/exercises/generate`,
    request,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    }
  );

  return response.data;
}

/**
 * Get AI generation statistics (admin only)
 */
export async function getExerciseStats(
  startDate?: string,
  endDate?: string
): Promise<ExerciseStats> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await axios.get(
    `${API_BASE}/api/ai/exercises/stats?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );

  return response.data;
}

/**
 * Prefetch exercises for better UX
 */
export async function prefetchExercises(
  userId: string,
  count: number = 5,
  types?: ExerciseType[]
): Promise<PrefetchResponse> {
  const response = await axios.post(
    `${API_BASE}/api/ai/exercises/prefetch`,
    { userId, count, types },
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

/**
 * Submit exercise result
 */
export async function submitExerciseResult(
  result: ExerciseResult
): Promise<{ success: boolean }> {
  const response = await axios.post(
    `${API_BASE}/api/exercises/result`,
    result,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

/**
 * Get session progress
 */
export async function getSessionProgress(
  sessionId: string
): Promise<Progress> {
  const response = await axios.get(
    `${API_BASE}/api/exercises/session/${sessionId}/progress`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );

  return response.data;
}

/**
 * Clear exercise cache (admin only)
 */
export async function clearExerciseCache(
  userId: string,
  type?: ExerciseType
): Promise<{ cleared: number }> {
  const params = type ? `?type=${type}` : '';

  const response = await axios.delete(
    `${API_BASE}/api/ai/exercises/cache/${userId}${params}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );

  return response.data;
}
```

### Example 6: API Error Handling

```typescript
// frontend/src/services/exerciseAPI.ts (continued)
import { AxiosError } from 'axios';

export class ExerciseAPIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ExerciseAPIError';
  }
}

/**
 * Handle API errors with proper typing
 */
function handleAPIError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      error: string;
      code: string;
      details?: any;
    }>;

    const statusCode = axiosError.response?.status || 500;
    const errorData = axiosError.response?.data;

    throw new ExerciseAPIError(
      errorData?.code || 'UNKNOWN_ERROR',
      errorData?.error || 'An unexpected error occurred',
      statusCode,
      errorData?.details
    );
  }

  throw new ExerciseAPIError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred',
    500
  );
}

/**
 * Generate exercise with error handling
 */
export async function generateExerciseSafe(
  request: ExerciseGenerateRequest
): Promise<ExerciseResponse> {
  try {
    return await generateExercise(request);
  } catch (error) {
    handleAPIError(error);
  }
}

// Usage with error handling
async function loadExercise() {
  try {
    const response = await generateExerciseSafe({
      userId: currentUser.id,
      type: 'fill_in_blank'
    });

    console.log('Exercise loaded:', response.exercise);
  } catch (error) {
    if (error instanceof ExerciseAPIError) {
      switch (error.code) {
        case 'RATE_LIMIT_EXCEEDED':
          showNotification('Too many requests. Please wait a moment.');
          break;

        case 'AI_SERVICE_UNAVAILABLE':
          showNotification('AI service temporarily unavailable. Using cached exercises.');
          break;

        case 'INVALID_USER_ID':
          showNotification('Invalid user. Please log in again.');
          break;

        default:
          showNotification('Failed to generate exercise. Please try again.');
      }
    }
  }
}
```

---

## Admin Dashboard

### Example 7: Admin Statistics Dashboard

```typescript
// frontend/src/components/admin/ExerciseStatsAdmin.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExerciseStats } from '../../services/exerciseAPI';
import { Chart } from '../charts/Chart';

export const ExerciseStatsAdmin: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  });

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['exercise-stats', dateRange],
    queryFn: () => getExerciseStats(dateRange.start, dateRange.end),
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!stats) return null;

  const cacheHitRate = stats.cacheHitRate.toFixed(1);
  const totalCost = stats.totalCost.toFixed(2);
  const avgTime = stats.avgGenerationTime.toFixed(0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">AI Exercise Statistics</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Generated"
          value={stats.totalGenerated.toLocaleString()}
          icon={<SparklesIcon />}
          trend={+12.5}
        />

        <MetricCard
          title="Cache Hit Rate"
          value={`${cacheHitRate}%`}
          icon={<ZapIcon />}
          trend={+3.2}
          target={80}
          current={parseFloat(cacheHitRate)}
        />

        <MetricCard
          title="Total Cost"
          value={`$${totalCost}`}
          icon={<DollarIcon />}
          trend={-5.8}
          targetColor="green"
        />

        <MetricCard
          title="Avg Generation Time"
          value={`${avgTime}ms`}
          icon={<ClockIcon />}
          trend={-8.3}
          targetColor="green"
        />
      </div>

      {/* Exercise Type Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">By Exercise Type</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(stats.byType).map(([type, data]) => (
                <tr key={type}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatExerciseType(type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${data.cost.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(data.cost / data.count).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Cost Trend</h3>
        <Chart
          type="line"
          data={stats.costTrend}
          xKey="date"
          yKey="cost"
          color="#3b82f6"
        />
      </div>

      {/* Cache Performance Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Cache Hit Rate</h3>
        <Chart
          type="area"
          data={stats.cachePerformance}
          xKey="date"
          yKey="hitRate"
          color="#10b981"
        />
      </div>
    </div>
  );
};

function formatExerciseType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

### Example 8: Prefetch Management Admin

```typescript
// frontend/src/components/admin/PrefetchAdmin.tsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { prefetchExercises } from '../../services/exerciseAPI';

export const PrefetchAdmin: React.FC = () => {
  const [config, setConfig] = useState({
    userId: '',
    count: 10,
    types: [] as ExerciseType[]
  });

  const prefetchMutation = useMutation({
    mutationFn: () => prefetchExercises(
      config.userId,
      config.count,
      config.types.length > 0 ? config.types : undefined
    ),
    onSuccess: (data) => {
      showNotification(
        `Successfully prefetched ${data.prefetched} exercises (${data.cached} cached)`,
        'success'
      );
    },
    onError: (error) => {
      showNotification('Failed to prefetch exercises', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    prefetchMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Prefetch Exercises</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            User ID
          </label>
          <input
            type="text"
            value={config.userId}
            onChange={(e) => setConfig({ ...config, userId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="user_12345"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Count
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={config.count}
            onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Exercise Types (optional)
          </label>
          <MultiSelect
            options={[
              { value: 'fill_in_blank', label: 'Fill in Blank' },
              { value: 'multiple_choice', label: 'Multiple Choice' },
              { value: 'translation', label: 'Translation' },
              { value: 'contextual', label: 'Contextual' }
            ]}
            value={config.types}
            onChange={(types) => setConfig({ ...config, types })}
          />
        </div>

        <button
          type="submit"
          disabled={prefetchMutation.isPending}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {prefetchMutation.isPending ? 'Prefetching...' : 'Prefetch Exercises'}
        </button>
      </form>

      {prefetchMutation.data && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <p className="text-sm text-green-800">
            <strong>Success!</strong> Prefetched {prefetchMutation.data.prefetched} exercises.
            {prefetchMutation.data.cached > 0 && (
              <span> ({prefetchMutation.data.cached} already cached)</span>
            )}
          </p>
          <p className="text-sm text-green-800 mt-1">
            Estimated cost: ${prefetchMutation.data.totalCost.toFixed(3)}
          </p>
        </div>
      )}
    </div>
  );
};
```

---

## Error Handling

### Example 9: Comprehensive Error Handler

```typescript
// frontend/src/components/exercises/ExerciseErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExerciseAPIError } from '../../services/exerciseAPI';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ExerciseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Exercise error boundary caught error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });

    // Log to error tracking service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Send to Sentry, LogRocket, etc.
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack
        }
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h3 className="mt-4 text-lg font-medium text-center text-gray-900">
              {error instanceof ExerciseAPIError
                ? this.getErrorTitle(error.code)
                : 'Something went wrong'}
            </h3>

            <p className="mt-2 text-sm text-center text-gray-600">
              {error?.message || 'An unexpected error occurred while loading the exercise.'}
            </p>

            {error instanceof ExerciseAPIError && error.details && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">
                  <strong>Details:</strong> {JSON.stringify(error.details, null, 2)}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private getErrorTitle(code: string): string {
    const titles: Record<string, string> = {
      'RATE_LIMIT_EXCEEDED': 'Rate Limit Exceeded',
      'AI_SERVICE_UNAVAILABLE': 'Service Temporarily Unavailable',
      'INVALID_USER_ID': 'Authentication Error',
      'GENERATION_FAILED': 'Generation Failed',
      'CACHE_ERROR': 'Cache Error'
    };

    return titles[code] || 'Error Occurred';
  }
}

// Usage
function App() {
  return (
    <ExerciseErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Error caught:', error, errorInfo);
      }}
    >
      <ExercisePage />
    </ExerciseErrorBoundary>
  );
}
```

### Example 10: Retry Logic with Exponential Backoff

```typescript
// frontend/src/utils/retryWithBackoff.ts
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryableErrors = ['AI_SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'TIMEOUT']
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (error instanceof ExerciseAPIError) {
        if (!retryableErrors.includes(error.code)) {
          throw error; // Don't retry non-retryable errors
        }
      }

      // Last attempt failed
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retry
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
async function generateExerciseWithRetry(userId: string) {
  try {
    const response = await retryWithBackoff(
      () => generateExercise({ userId, type: 'fill_in_blank' }),
      {
        maxRetries: 3,
        initialDelay: 1000,
        retryableErrors: ['AI_SERVICE_UNAVAILABLE', 'TIMEOUT']
      }
    );

    return response;
  } catch (error) {
    console.error('All retry attempts failed:', error);
    throw error;
  }
}
```

---

## Testing Examples

### Example 11: Unit Testing Exercise Generation

```typescript
// frontend/src/__tests__/hooks/useExerciseGenerator.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExerciseGenerator } from '../../hooks/useExerciseGenerator';
import * as exerciseAPI from '../../services/exerciseAPI';

// Mock the API
jest.mock('../../services/exerciseAPI');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useExerciseGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate exercise successfully', async () => {
    const mockResponse = {
      exercise: {
        id: 'ex_123',
        type: 'fill_in_blank',
        sentence: 'El pájaro tiene plumas ___.',
        correctAnswer: 'rojas'
      },
      metadata: {
        generated: true,
        cacheKey: 'abc123',
        cost: 0.003,
        difficulty: 3,
        source: 'ai',
        timestamp: new Date().toISOString()
      }
    };

    (exerciseAPI.generateExercise as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useExerciseGenerator({
        userId: 'user_123',
        type: 'fill_in_blank'
      }),
      { wrapper: createWrapper() }
    );

    result.current.generateExercise();

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(result.current.exercise).toEqual(mockResponse.exercise);
    expect(result.current.metadata).toEqual(mockResponse.metadata);
    expect(exerciseAPI.generateExercise).toHaveBeenCalledWith({
      userId: 'user_123',
      type: 'fill_in_blank',
      difficulty: undefined
    });
  });

  it('should handle API errors', async () => {
    const mockError = new exerciseAPI.ExerciseAPIError(
      'AI_SERVICE_UNAVAILABLE',
      'Service unavailable',
      503
    );

    (exerciseAPI.generateExercise as jest.Mock).mockRejectedValue(mockError);

    const onError = jest.fn();

    const { result } = renderHook(
      () => useExerciseGenerator({
        userId: 'user_123',
        onError
      }),
      { wrapper: createWrapper() }
    );

    result.current.generateExercise();

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should call onSuccess callback', async () => {
    const mockResponse = {
      exercise: { id: 'ex_123', type: 'fill_in_blank' },
      metadata: { generated: true }
    };

    (exerciseAPI.generateExercise as jest.Mock).mockResolvedValue(mockResponse);

    const onSuccess = jest.fn();

    const { result } = renderHook(
      () => useExerciseGenerator({
        userId: 'user_123',
        onSuccess
      }),
      { wrapper: createWrapper() }
    );

    result.current.generateExercise();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });
});
```

### Example 12: Integration Testing

```typescript
// frontend/src/__tests__/integration/exercise-generation.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ExerciseContainer } from '../../components/exercises/ExerciseContainer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const server = setupServer(
  rest.post('/api/ai/exercises/generate', (req, res, ctx) => {
    return res(
      ctx.json({
        exercise: {
          id: 'ex_123',
          type: 'fill_in_blank',
          instructions: 'Complete the sentence',
          sentence: 'El pájaro tiene plumas ___.',
          correctAnswer: 'rojas',
          distractors: ['azules', 'verdes', 'amarillas']
        },
        metadata: {
          generated: true,
          cacheKey: 'abc123',
          cost: 0.003,
          difficulty: 3,
          source: 'ai',
          timestamp: new Date().toISOString()
        }
      })
    );
  }),

  rest.post('/api/exercises/result', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Exercise Generation Integration', () => {
  it('should generate and complete an exercise', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExerciseContainer userId="user_123" />
      </QueryClientProvider>
    );

    // Wait for exercise to load
    await waitFor(() => {
      expect(screen.getByText('El pájaro tiene plumas ___.)).toBeInTheDocument();
    });

    // Select an answer
    const correctAnswer = screen.getByText('rojas');
    fireEvent.click(correctAnswer);

    // Submit
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    // Wait for feedback
    await waitFor(() => {
      expect(screen.getByText(/correct/i)).toBeInTheDocument();
    });
  });

  it('should handle generation errors gracefully', async () => {
    server.use(
      rest.post('/api/ai/exercises/generate', (req, res, ctx) => {
        return res(
          ctx.status(503),
          ctx.json({
            error: 'AI service unavailable',
            code: 'AI_SERVICE_UNAVAILABLE'
          })
        );
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExerciseContainer userId="user_123" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/service.*unavailable/i)).toBeInTheDocument();
    });
  });
});
```

---

## Advanced Patterns

### Example 13: Exercise Queue System

```typescript
// frontend/src/utils/ExerciseQueue.ts
export class ExerciseQueue {
  private queue: Exercise[] = [];
  private prefetchThreshold = 2;
  private maxQueueSize = 5;

  constructor(
    private userId: string,
    private generateFn: (userId: string) => Promise<ExerciseResponse>
  ) {}

  async initialize() {
    // Pre-fill queue
    await this.refillQueue();
  }

  async getNext(): Promise<Exercise> {
    // Get exercise from queue
    const exercise = this.queue.shift();

    if (!exercise) {
      // Queue empty, generate immediately
      const response = await this.generateFn(this.userId);
      return response.exercise;
    }

    // Refill queue in background if needed
    if (this.queue.length < this.prefetchThreshold) {
      this.refillQueue().catch(err => {
        console.error('Background refill failed:', err);
      });
    }

    return exercise;
  }

  private async refillQueue() {
    const needed = this.maxQueueSize - this.queue.length;

    if (needed <= 0) return;

    console.log(`Refilling queue with ${needed} exercises`);

    const promises = Array(needed)
      .fill(null)
      .map(() => this.generateFn(this.userId));

    try {
      const responses = await Promise.all(promises);
      const exercises = responses.map(r => r.exercise);

      this.queue.push(...exercises);
      console.log(`Queue refilled. Size: ${this.queue.length}`);
    } catch (error) {
      console.error('Failed to refill queue:', error);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }
}

// Usage
const exerciseQueue = new ExerciseQueue('user_123', generateExercise);
await exerciseQueue.initialize();

// Get next exercise instantly from queue
const exercise = await exerciseQueue.getNext();
```

### Example 14: Real-time Exercise Analytics

```typescript
// frontend/src/hooks/useExerciseAnalytics.ts
import { useEffect } from 'react';

export function useExerciseAnalytics(userId: string) {
  useEffect(() => {
    const analytics = {
      startTime: Date.now(),
      exerciseCount: 0,
      correctCount: 0,
      totalTime: 0,
      types: {} as Record<ExerciseType, number>
    };

    const trackExerciseStart = (exercise: Exercise) => {
      analytics.exerciseCount++;
      analytics.types[exercise.type] = (analytics.types[exercise.type] || 0) + 1;

      // Send event to analytics
      window.gtag?.('event', 'exercise_start', {
        exercise_type: exercise.type,
        difficulty: exercise.difficulty,
        user_id: userId
      });
    };

    const trackExerciseComplete = (
      exercise: Exercise,
      isCorrect: boolean,
      timeTaken: number
    ) => {
      if (isCorrect) analytics.correctCount++;
      analytics.totalTime += timeTaken;

      window.gtag?.('event', 'exercise_complete', {
        exercise_type: exercise.type,
        difficulty: exercise.difficulty,
        correct: isCorrect,
        time_taken: timeTaken,
        user_id: userId
      });
    };

    // Subscribe to events
    window.addEventListener('exercise:start', trackExerciseStart as any);
    window.addEventListener('exercise:complete', trackExerciseComplete as any);

    // Send session summary on unmount
    return () => {
      const sessionDuration = Date.now() - analytics.startTime;
      const accuracy = analytics.correctCount / analytics.exerciseCount;

      window.gtag?.('event', 'session_end', {
        duration: sessionDuration,
        exercises_completed: analytics.exerciseCount,
        accuracy: accuracy,
        avg_time_per_exercise: analytics.totalTime / analytics.exerciseCount,
        user_id: userId
      });

      window.removeEventListener('exercise:start', trackExerciseStart as any);
      window.removeEventListener('exercise:complete', trackExerciseComplete as any);
    };
  }, [userId]);
}
```

---

**Last Updated:** October 2, 2025

For more information, see:
- [AI Exercise Generation API](../AI_EXERCISE_GENERATION_API.md)
- [Exercise Generation Guide](../EXERCISE_GENERATION_GUIDE.md)
- [Phase 2 README](../../README_PHASE2.md)
