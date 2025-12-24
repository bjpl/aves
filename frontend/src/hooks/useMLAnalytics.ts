// CONCEPT: React Query hooks for ML optimization analytics
// WHY: Fetch and cache ML metrics for dashboard visualization
// PATTERN: useQuery with typed responses for each ML analytics endpoint

import { useQuery } from '@tanstack/react-query';
import { api as axios } from '../config/axios';
import { error as logError } from '../utils/logger';

/**
 * ML Overview Analytics
 */
export interface MLOverviewAnalytics {
  patternLearning: {
    totalPatterns: number;
    speciesTracked: number;
    topFeatures: Array<{
      feature: string;
      observations: number;
      confidence: number;
    }>;
    learningActive: boolean;
  };
  datasetMetrics: {
    totalAnnotations: number;
    totalImages: number;
    avgConfidence: number;
    confidenceTrend: string;
    annotationsPerImage: string;
  };
  qualityMetrics: {
    recentAvgConfidence: number;
    historicalAvgConfidence: number;
    improvement: string;
  };
}

/**
 * Vocabulary Balance Analytics
 */
export interface VocabularyBalanceAnalytics {
  features: Array<{
    name: string;
    count: number;
    avgConfidence: number;
    percentage: number;
  }>;
  totalFeatures: number;
  targetVocabulary: number;
  coverage: string;
  topGaps: string[];
}

/**
 * Pattern Learning Analytics
 */
export interface PatternLearningAnalytics {
  overview: {
    totalPatterns: number;
    speciesTracked: number;
  };
  topPatterns: Array<{
    feature: string;
    observations: number;
    confidence: number;
    reliability: 'high' | 'medium' | 'low';
  }>;
  speciesInsights: Array<{
    species: string;
    annotations: number;
    features: number;
    recommendedFeatures: string[];
  }>;
  learningStatus: 'initializing' | 'learning' | 'active';
}

/**
 * Quality Trends Analytics
 */
export interface QualityTrendsAnalytics {
  trends: Array<{
    period: string;
    avgConfidence: number;
    annotationCount: number;
  }>;
  summary: {
    improvement: string;
    currentQuality: number;
    totalWeeks: number;
  };
}

/**
 * Performance Metrics Analytics
 */
export interface PerformanceMetricsAnalytics {
  pipeline: {
    batchSize: number;
    concurrency: number;
    totalDuration: number;
    averageTaskDuration: number;
    throughput: number;
    successRate: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  };
  improvements: {
    totalImprovements: number;
    averageImprovement: number;
    criticalGapsResolved: number;
  };
  status: {
    lastRun: string | null;
    pipelineStatus: 'initializing' | 'active';
  };
}

/**
 * Query keys for ML analytics
 */
export const mlAnalyticsKeys = {
  all: ['ml-analytics'] as const,
  overview: () => [...mlAnalyticsKeys.all, 'overview'] as const,
  vocabularyBalance: () => [...mlAnalyticsKeys.all, 'vocabulary-balance'] as const,
  patternLearning: () => [...mlAnalyticsKeys.all, 'pattern-learning'] as const,
  qualityTrends: () => [...mlAnalyticsKeys.all, 'quality-trends'] as const,
  performanceMetrics: () => [...mlAnalyticsKeys.all, 'performance-metrics'] as const,
};

/**
 * Hook: Fetch ML overview analytics
 */
export const useMLOverview = () => {
  return useQuery({
    queryKey: mlAnalyticsKeys.overview(),
    queryFn: async (): Promise<MLOverviewAnalytics> => {
      try {
        const response = await axios.get<MLOverviewAnalytics>('/api/ml/analytics/overview');
        return response.data;
      } catch (err) {
        logError('Error fetching ML overview:', err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

/**
 * Hook: Fetch vocabulary balance analytics
 */
export const useVocabularyBalance = () => {
  return useQuery({
    queryKey: mlAnalyticsKeys.vocabularyBalance(),
    queryFn: async (): Promise<VocabularyBalanceAnalytics> => {
      try {
        const response = await axios.get<VocabularyBalanceAnalytics>('/api/ml/analytics/vocabulary-balance');
        return response.data;
      } catch (err) {
        logError('Error fetching vocabulary balance:', err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
};

/**
 * Hook: Fetch pattern learning analytics
 */
export const usePatternLearning = () => {
  return useQuery({
    queryKey: mlAnalyticsKeys.patternLearning(),
    queryFn: async (): Promise<PatternLearningAnalytics> => {
      try {
        const response = await axios.get<PatternLearningAnalytics>('/api/ml/analytics/pattern-learning');
        return response.data;
      } catch (err) {
        logError('Error fetching pattern learning:', err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

/**
 * Hook: Fetch quality trends analytics
 */
export const useQualityTrends = () => {
  return useQuery({
    queryKey: mlAnalyticsKeys.qualityTrends(),
    queryFn: async (): Promise<QualityTrendsAnalytics> => {
      try {
        const response = await axios.get<QualityTrendsAnalytics>('/api/ml/analytics/quality-trends');
        return response.data;
      } catch (err) {
        logError('Error fetching quality trends:', err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
};

/**
 * Hook: Fetch performance metrics analytics
 */
export const usePerformanceMetrics = () => {
  return useQuery({
    queryKey: mlAnalyticsKeys.performanceMetrics(),
    queryFn: async (): Promise<PerformanceMetricsAnalytics> => {
      try {
        const response = await axios.get<PerformanceMetricsAnalytics>('/api/ml/analytics/performance-metrics');
        return response.data;
      } catch (err) {
        logError('Error fetching performance metrics:', err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};
