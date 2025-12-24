/**
 * ML Analytics Routes
 *
 * Provides comprehensive analytics for ML optimization systems:
 * - PatternLearner metrics (learned patterns, confidence trends)
 * - Vocabulary balance tracking
 * - Quality score improvements
 * - Cost and performance metrics
 */

import { Router, Request, Response } from 'express';
import { PatternLearner } from '../services/PatternLearner';
import { info, error as logError } from '../utils/logger';
import { optionalSupabaseAuth } from '../middleware/optionalSupabaseAuth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/ml/analytics/test
 * Simple test endpoint to verify routes are loaded
 */
router.get('/ml/analytics/test', (_req: Request, res: Response) => {
  res.json({ status: 'ML Analytics routes loaded successfully', timestamp: new Date().toISOString() });
});

/**
 * GET /api/ml/analytics/overview
 * Get comprehensive ML optimization overview
 */
router.get(
  '/ml/analytics/overview',
  optionalSupabaseAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      info('ML analytics overview requested');

      const patternLearner = new PatternLearner();
      await patternLearner.ensureInitialized();

      const analytics = patternLearner.getAnalytics();

      // Get database stats from ai_annotation_items (AI-generated annotations)
      const { data: annotationStats } = await supabase
        .from('ai_annotation_items')
        .select('confidence, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      const { count: totalAnnotations } = await supabase
        .from('ai_annotation_items')
        .select('*', { count: 'exact', head: true });

      const { count: totalImages } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true });

      // Calculate trends from AI annotation confidence scores
      const annotationsWithConfidence = annotationStats?.filter(a => a.confidence !== null) || [];
      const recentAnnotations = annotationsWithConfidence.slice(0, 100);
      const olderAnnotations = annotationsWithConfidence.slice(100, 200);

      const avgRecentConfidence = recentAnnotations.length > 0
        ? recentAnnotations.reduce((sum, a) => sum + (a.confidence || 0), 0) / recentAnnotations.length
        : 0;

      const avgOlderConfidence = olderAnnotations.length > 0
        ? olderAnnotations.reduce((sum, a) => sum + (a.confidence || 0), 0) / olderAnnotations.length
        : 0;

      const confidenceTrend = avgOlderConfidence > 0
        ? ((avgRecentConfidence - avgOlderConfidence) / avgOlderConfidence) * 100
        : 0;

      const overview = {
        patternLearning: {
          totalPatterns: analytics.totalPatterns,
          speciesTracked: analytics.speciesTracked,
          topFeatures: analytics.topFeatures.slice(0, 5),
          learningActive: analytics.totalPatterns > 0
        },
        datasetMetrics: {
          totalAnnotations: totalAnnotations || 0,
          totalImages: totalImages || 0,
          avgConfidence: avgRecentConfidence,
          confidenceTrend: confidenceTrend.toFixed(1),
          annotationsPerImage: (totalImages ?? 0) > 0 ? ((totalAnnotations || 0) / (totalImages ?? 1)).toFixed(1) : '0'
        },
        qualityMetrics: {
          recentAvgConfidence: avgRecentConfidence,
          historicalAvgConfidence: avgOlderConfidence,
          improvement: confidenceTrend > 0 ? `+${confidenceTrend.toFixed(1)}%` : `${confidenceTrend.toFixed(1)}%`
        }
      };

      res.json(overview);
    } catch (err) {
      logError('Error fetching ML analytics overview', err as Error);
      res.status(500).json({ error: 'Failed to fetch ML analytics' });
    }
  }
);

/**
 * GET /api/ml/analytics/vocabulary-balance
 * Get vocabulary balance and coverage metrics
 */
router.get(
  '/ml/analytics/vocabulary-balance',
  optionalSupabaseAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      info('Vocabulary balance analytics requested');

      // Get vocabulary distribution from ai_annotation_items (AI-generated annotations)
      const { data: annotations } = await supabase
        .from('ai_annotation_items')
        .select('spanish_term, english_term, annotation_type, confidence');

      if (!annotations || annotations.length === 0) {
        res.json({ features: [], totalFeatures: 0, coverage: 0, topGaps: [] });
        return;
      }

      // Count annotation types and terms (vocabulary coverage)
      const termCounts = new Map<string, { count: number; avgConfidence: number; total: number }>();

      for (const ann of annotations) {
        // Use english_term as the primary vocabulary identifier
        const term = ann.english_term || ann.spanish_term || 'unknown';
        const existing = termCounts.get(term) || { count: 0, avgConfidence: 0, total: 0 };
        existing.count++;
        existing.total += ann.confidence || 0.8; // Default confidence if not set
        existing.avgConfidence = existing.total / existing.count;
        termCounts.set(term, existing);
      }

      // Convert to sorted array
      const features = Array.from(termCounts.entries())
        .filter(([name]) => name && name !== 'unknown')
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          avgConfidence: stats.avgConfidence,
          percentage: (stats.count / annotations.length) * 100
        }))
        .sort((a, b) => b.count - a.count);

      // Define target vocabulary for bird anatomy
      const targetVocabulary = [
        'beak', 'bill', 'eye', 'crest', 'crown', 'nape', 'throat', 'chin',
        'breast', 'belly', 'back', 'rump', 'flank', 'wing', 'tail', 'leg', 'foot',
        'primary feathers', 'secondary feathers', 'wing bar', 'wing coverts',
        'tail feathers', 'undertail coverts', 'tail tip',
        'plumage', 'feathers', 'pattern', 'marking', 'stripe', 'spot', 'patch'
      ];

      // Calculate coverage based on which target terms appear in annotations
      const coveredTargets = targetVocabulary.filter(target =>
        features.some(f => f.name.toLowerCase().includes(target.toLowerCase()))
      );

      const coverage = targetVocabulary.length > 0
        ? ((coveredTargets.length / targetVocabulary.length) * 100).toFixed(1)
        : '0';

      // Find gaps - target terms not covered
      const topGaps = targetVocabulary
        .filter(target => !features.some(f => f.name.toLowerCase().includes(target.toLowerCase())))
        .slice(0, 10);

      const vocabularyBalance = {
        features: features.slice(0, 20), // Top 20 terms
        totalFeatures: features.length,
        targetVocabulary: targetVocabulary.length,
        coverage,
        topGaps
      };

      res.json(vocabularyBalance);
    } catch (err) {
      logError('Error fetching vocabulary balance', err as Error);
      res.status(500).json({ error: 'Failed to fetch vocabulary balance' });
    }
  }
);

/**
 * GET /api/ml/analytics/pattern-learning
 * Get detailed pattern learning metrics
 */
router.get(
  '/ml/analytics/pattern-learning',
  optionalSupabaseAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      info('Pattern learning analytics requested');

      const patternLearner = new PatternLearner();
      await patternLearner.ensureInitialized();

      const analytics = patternLearner.getAnalytics();

      // FIX: Get actual approved annotation counts from database instead of in-memory counts
      // This fixes the issue where observation counts include ALL annotations (pending/rejected)
      // instead of only APPROVED annotations
      const { data: approvedCounts } = await supabase
        .from('ai_annotation_items')
        .select('spanish_term, english_term, image_id')
        .eq('status', 'approved'); // Only count approved annotations

      // Build a map of feature -> approved count
      const approvedCountMap = new Map<string, number>();
      if (approvedCounts) {
        for (const item of approvedCounts) {
          const featureKey = item.spanish_term;
          approvedCountMap.set(featureKey, (approvedCountMap.get(featureKey) || 0) + 1);
        }
      }

      // Get species-specific recommendations
      const speciesRecommendations = analytics.speciesBreakdown.map(species => ({
        species: species.species,
        annotations: species.annotations,
        features: species.features,
        recommendedFeatures: patternLearner.getRecommendedFeatures(species.species, 5)
      }));

      const patternAnalytics = {
        overview: {
          totalPatterns: analytics.totalPatterns,
          speciesTracked: analytics.speciesTracked,
        },
        // Use actual approved counts from database instead of in-memory observation counts
        topPatterns: analytics.topFeatures.map(f => ({
          feature: f.feature,
          observations: approvedCountMap.get(f.feature) || 0, // Use approved count from database
          confidence: f.confidence,
          reliability: f.confidence >= 0.85 ? 'high' : f.confidence >= 0.75 ? 'medium' : 'low'
        })),
        speciesInsights: speciesRecommendations,
        learningStatus: analytics.totalPatterns === 0 ? 'initializing' :
                       analytics.totalPatterns < 10 ? 'learning' : 'active'
      };

      res.json(patternAnalytics);
    } catch (err) {
      logError('Error fetching pattern learning analytics', err as Error);
      res.status(500).json({ error: 'Failed to fetch pattern learning analytics' });
    }
  }
);

/**
 * GET /api/ml/analytics/quality-trends
 * Get quality improvement trends over time
 */
router.get(
  '/ml/analytics/quality-trends',
  optionalSupabaseAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      info('Quality trends analytics requested');

      // Get annotations with confidence grouped by date from ai_annotation_items
      const { data: annotations } = await supabase
        .from('ai_annotation_items')
        .select('confidence, created_at')
        .order('created_at', { ascending: true });

      if (!annotations || annotations.length === 0) {
        res.json({ trends: [], summary: { improvement: 0, currentQuality: 0, totalWeeks: 0 } });
        return;
      }

      // Filter to annotations with confidence scores, or use all if none have confidence
      const annotationsWithConfidence = annotations.filter(a => a.confidence !== null);
      const dataSource = annotationsWithConfidence.length > 0 ? annotationsWithConfidence : annotations;

      // Group by week
      const weeklyData = new Map<string, { total: number; sum: number; count: number }>();

      for (const ann of dataSource) {
        const date = new Date(ann.created_at);
        // Calculate ISO week number properly
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        const weekKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

        const existing = weeklyData.get(weekKey) || { total: 0, sum: 0, count: 0 };
        existing.count++;
        // Use confidence or default to 0.85 if not set
        const confidence = ann.confidence !== null ? ann.confidence : 0.85;
        existing.sum += confidence;
        existing.total = existing.sum / existing.count;
        weeklyData.set(weekKey, existing);
      }

      const trends = Array.from(weeklyData.entries())
        .sort(([a], [b]) => a.localeCompare(b)) // Sort by week chronologically
        .map(([week, data]) => ({
          period: week,
          avgConfidence: Math.round(data.total * 100) / 100,
          annotationCount: data.count
        }));

      const firstWeek = trends[0]?.avgConfidence || 0;
      const lastWeek = trends[trends.length - 1]?.avgConfidence || 0;
      const improvement = firstWeek > 0 ? ((lastWeek - firstWeek) / firstWeek) * 100 : 0;

      res.json({
        trends,
        summary: {
          improvement: improvement.toFixed(1),
          currentQuality: lastWeek,
          totalWeeks: trends.length
        }
      });
    } catch (err) {
      logError('Error fetching quality trends', err as Error);
      res.status(500).json({ error: 'Failed to fetch quality trends' });
    }
  }
);

/**
 * GET /api/ml/analytics/performance-metrics
 * Get ML pipeline performance metrics
 */
router.get(
  '/ml/analytics/performance-metrics',
  optionalSupabaseAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      info('Performance metrics requested');

      // Read metrics from files if they exist
      const fs = require('fs');
      const path = require('path');

      let batchMetrics = null;
      let mlReport = null;

      try {
        const metricsPath = path.join(process.cwd(), 'metrics', 'batch-annotation-metrics.json');
        if (fs.existsSync(metricsPath)) {
          batchMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        }
      } catch (err) {
        // Metrics file doesn't exist yet
      }

      try {
        const reportPath = path.join(process.cwd(), 'ml-improvement-report.json');
        if (fs.existsSync(reportPath)) {
          mlReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }
      } catch (err) {
        // Report file doesn't exist yet
      }

      const performanceMetrics = {
        pipeline: batchMetrics?.metrics || {
          batchSize: 0,
          concurrency: 4,
          totalDuration: 0,
          averageTaskDuration: 0,
          throughput: 0,
          successRate: 100,
          p50Duration: 0,
          p95Duration: 0,
          p99Duration: 0
        },
        improvements: mlReport?.summary || {
          totalImprovements: 0,
          averageImprovement: 0,
          criticalGapsResolved: 0
        },
        status: {
          lastRun: batchMetrics?.exportedAt || null,
          pipelineStatus: batchMetrics ? 'active' : 'initializing'
        }
      };

      res.json(performanceMetrics);
    } catch (err) {
      logError('Error fetching performance metrics', err as Error);
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  }
);

export default router;
