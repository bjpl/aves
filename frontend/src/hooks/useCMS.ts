import { useQuery, useMutation, useQueryClient } from 'react-query';
import { CMSService, Bird, Lesson, Quiz } from '../services/cms.service';

// PATTERN: Custom React Hooks for Data Fetching
// WHY: Encapsulates data fetching logic with caching
// CONCEPT: Separation of concerns between UI and data layers

// Birds hooks
export const useBirds = (params?: any) => {
  return useQuery(
    ['birds', params],
    () => CMSService.getBirds(params),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

export const useBird = (id: number) => {
  return useQuery(
    ['bird', id],
    () => CMSService.getBirdById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  );
};

export const useBirdByName = (spanishName: string) => {
  return useQuery(
    ['bird', 'name', spanishName],
    () => CMSService.getBirdBySpanishName(spanishName),
    {
      enabled: !!spanishName,
      staleTime: 5 * 60 * 1000,
    }
  );
};

// Lessons hooks
export const useLessons = (params?: any) => {
  return useQuery(
    ['lessons', params],
    () => CMSService.getLessons(params),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );
};

export const useLesson = (id: number) => {
  return useQuery(
    ['lesson', id],
    () => CMSService.getLessonById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  );
};

export const useLessonsByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
  return useQuery(
    ['lessons', 'difficulty', difficulty],
    () => CMSService.getLessonsByDifficulty(difficulty),
    {
      staleTime: 5 * 60 * 1000,
    }
  );
};

// Quiz hooks
export const useQuizzesByLesson = (lessonId: number) => {
  return useQuery(
    ['quizzes', 'lesson', lessonId],
    () => CMSService.getQuizzesByLessonId(lessonId),
    {
      enabled: !!lessonId,
      staleTime: 5 * 60 * 1000,
    }
  );
};

export const useQuizSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ quizId, answer }: { quizId: number; answer: any }) =>
      CMSService.submitQuizAnswer(quizId, answer),
    {
      onSuccess: () => {
        // Invalidate and refetch any queries that might be affected
        queryClient.invalidateQueries(['userProgress']);
      },
    }
  );
};

// Search hook
export const useBirdSearch = (searchTerm: string, enabled = true) => {
  return useQuery(
    ['birds', 'search', searchTerm],
    () => CMSService.searchBirds(searchTerm),
    {
      enabled: enabled && searchTerm.length > 2,
      staleTime: 2 * 60 * 1000,
      debounce: 300, // Custom debounce if implemented
    }
  );
};

// Progress tracking hook
export const useProgressTracking = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, lessonId, progress }: { userId: string; lessonId: number; progress: number }) =>
      CMSService.trackProgress(userId, lessonId, progress),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userProgress']);
      },
    }
  );
};

// Prefetch hooks for performance optimization
export const usePrefetchBird = () => {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery(
      ['bird', id],
      () => CMSService.getBirdById(id),
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  };
};

export const usePrefetchLesson = () => {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery(
      ['lesson', id],
      () => CMSService.getLessonById(id),
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  };
};