import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CMSService } from '../services/cms.service';

// PATTERN: Custom React Hooks for Data Fetching
// WHY: Encapsulates data fetching logic with caching
// CONCEPT: Separation of concerns between UI and data layers

// Birds hooks
export const useBirds = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ['birds', params],
    queryFn: () => CMSService.getBirds(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useBird = (id: number) => {
  return useQuery({
    queryKey: ['bird', id],
    queryFn: () => CMSService.getBirdById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBirdByName = (spanishName: string) => {
  return useQuery({
    queryKey: ['bird', 'name', spanishName],
    queryFn: () => CMSService.getBirdBySpanishName(spanishName),
    enabled: !!spanishName,
    staleTime: 5 * 60 * 1000,
  });
};

// Lessons hooks
export const useLessons = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ['lessons', params],
    queryFn: () => CMSService.getLessons(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useLesson = (id: number) => {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: () => CMSService.getLessonById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLessonsByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
  return useQuery({
    queryKey: ['lessons', 'difficulty', difficulty],
    queryFn: () => CMSService.getLessonsByDifficulty(difficulty),
    staleTime: 5 * 60 * 1000,
  });
};

// Quiz hooks
export const useQuizzesByLesson = (lessonId: number) => {
  return useQuery({
    queryKey: ['quizzes', 'lesson', lessonId],
    queryFn: () => CMSService.getQuizzesByLessonId(lessonId),
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useQuizSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, answer }: { quizId: number; answer: unknown }) =>
      CMSService.submitQuizAnswer(quizId, answer),
    onSuccess: () => {
      // Invalidate and refetch any queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    },
  });
};

// Search hook
export const useBirdSearch = (searchTerm: string, enabled = true) => {
  return useQuery({
    queryKey: ['birds', 'search', searchTerm],
    queryFn: () => CMSService.searchBirds(searchTerm),
    enabled: enabled && searchTerm.length > 2,
    staleTime: 2 * 60 * 1000,
  });
};

// Progress tracking hook
export const useProgressTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, lessonId, progress }: { userId: string; lessonId: number; progress: number }) =>
      CMSService.trackProgress(userId, lessonId, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    },
  });
};

// Prefetch hooks for performance optimization
export const usePrefetchBird = () => {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: ['bird', id],
      queryFn: () => CMSService.getBirdById(id),
      staleTime: 5 * 60 * 1000,
    });
  };
};

export const usePrefetchLesson = () => {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: ['lesson', id],
      queryFn: () => CMSService.getLessonById(id),
      staleTime: 5 * 60 * 1000,
    });
  };
};