/**
 * VectorUserContextService - User Context Memory with Reflexion Pattern
 *
 * Implements learning memory and skill tracking for personalized AI recommendations.
 * Uses the Reflexion pattern to record learning episodes with situation-action-outcome
 * and builds enhanced user context for intelligent exercise recommendations.
 *
 * Based on: "Reflexion: Language Agents with Verbal Reinforcement Learning"
 *
 * @module VectorUserContextService
 */

import {
  ReflexionEpisode,
  SkillEntry,
  LearningEpisode,
  EnhancedUserContext,
  ExperienceQuery,
  VectorOperation,
} from '../../../types/vector.types';
import { RuVectorService } from '../core/RuVectorService';
import { EmbeddingService } from '../core/EmbeddingService';
import { info, warn, error as logError, debug } from '../../../utils/logger';

/**
 * Analysis result for user progress
 */
interface UserProgressAnalysis {
  /** Areas where user excels */
  strengths: string[];

  /** Areas needing improvement */
  weaknesses: string[];

  /** Recommended focus areas based on analysis */
  suggestedFocus: string[];
}

/**
 * VectorUserContextService provides user-specific learning memory
 */
export class VectorUserContextService {
  private ruVectorService: RuVectorService;
  private embeddingService: EmbeddingService;

  constructor(
    ruVectorService: RuVectorService,
    embeddingService: EmbeddingService
  ) {
    this.ruVectorService = ruVectorService;
    this.embeddingService = embeddingService;
  }

  // ============================================================================
  // Learning Episode Recording (Reflexion Pattern)
  // ============================================================================

  /**
   * Record a learning episode with full context
   *
   * Stores the episode in agentic database with embeddings for
   * situation, action, and outcome for later retrieval.
   */
  async recordLearningEpisode(episode: LearningEpisode): Promise<void> {
    const start = Date.now();

    try {
      debug('Recording learning episode', {
        userId: episode.userId,
        topic: episode.topic,
        activity: episode.activity,
      });

      // Build situation description from episode context
      const situation = this.buildSituationDescription(episode);

      // Build action description from performance
      const action = this.buildActionDescription(episode);

      // Build outcome description from results
      const outcome = this.buildOutcomeDescription(episode);

      // Generate reflection using AI-driven analysis
      const reflection = await this.generateReflection(situation, action, outcome, episode);

      // Determine success based on performance
      const success = this.evaluateSuccess(episode);

      // Create reflexion episode
      const reflexionEpisode: ReflexionEpisode = {
        userId: episode.userId,
        sessionId: episode.sessionId,
        timestamp: episode.timestamp,
        situation,
        action,
        outcome,
        reflection,
        exerciseType: episode.activity,
        difficulty: this.estimateDifficulty(episode),
        success,
      };

      // Record in agentic database
      const result = await this.ruVectorService.recordReflexion(reflexionEpisode);

      if (!result.success) {
        throw new Error(`Failed to record reflexion: ${result.error?.message}`);
      }

      const duration = Date.now() - start;
      info('Learning episode recorded successfully', {
        userId: episode.userId,
        success,
        duration: `${duration}ms`,
      });

    } catch (err) {
      logError('Failed to record learning episode', err as Error);
      throw err;
    }
  }

  /**
   * Record reflection on performance
   *
   * Simplified interface for recording a single reflexion episode.
   */
  async recordReflection(
    userId: string,
    sessionId: string,
    situation: string,
    action: string,
    outcome: string,
    success: boolean
  ): Promise<void> {
    try {
      // Generate AI reflection
      const reflection = await this.generateSimpleReflection(
        situation,
        action,
        outcome,
        success
      );

      const reflexionEpisode: ReflexionEpisode = {
        userId,
        sessionId,
        timestamp: new Date(),
        situation,
        action,
        outcome,
        reflection,
        success,
      };

      const result = await this.ruVectorService.recordReflexion(reflexionEpisode);

      if (!result.success) {
        throw new Error(`Failed to record reflection: ${result.error?.message}`);
      }

      debug('Reflection recorded', { userId, success });

    } catch (err) {
      logError('Failed to record reflection', err as Error);
      throw err;
    }
  }

  // ============================================================================
  // Skill Tracking
  // ============================================================================

  /**
   * Update user skill level with performance metrics
   *
   * Records or updates a skill entry in the agentic database.
   */
  async updateSkill(
    userId: string,
    skillName: string,
    level: number,
    exercisesCompleted: number,
    successRate: number
  ): Promise<void> {
    const start = Date.now();

    try {
      const skillEntry: SkillEntry = {
        userId,
        skillName,
        level,
        lastPracticed: new Date(),
        exercisesCompleted,
        successRate,
      };

      const result = await this.ruVectorService.recordSkill(skillEntry);

      if (!result.success) {
        throw new Error(`Failed to update skill: ${result.error?.message}`);
      }

      const duration = Date.now() - start;
      debug('Skill updated', {
        userId,
        skillName,
        level,
        successRate,
        duration: `${duration}ms`,
      });

    } catch (err) {
      logError('Failed to update skill', err as Error);
      throw err;
    }
  }

  // ============================================================================
  // Experience Querying
  // ============================================================================

  /**
   * Query similar past experiences based on current situation
   *
   * Uses semantic search to find relevant learning episodes that
   * match the current context.
   */
  async querySimilarExperiences(
    userId: string,
    currentSituation: string,
    limit: number = 5
  ): Promise<ReflexionEpisode[]> {
    const start = Date.now();

    try {
      const query: ExperienceQuery = {
        userId,
        query: currentSituation,
        limit,
      };

      const result = await this.ruVectorService.queryExperiences(query);

      if (!result.success || !result.data) {
        warn('Failed to query experiences', {
          userId,
          error: result.error?.message,
        });
        return [];
      }

      const duration = Date.now() - start;
      debug('Similar experiences retrieved', {
        userId,
        count: result.data.length,
        duration: `${duration}ms`,
      });

      return result.data;

    } catch (err) {
      logError('Failed to query similar experiences', err as Error);
      return [];
    }
  }

  // ============================================================================
  // Enhanced User Context
  // ============================================================================

  /**
   * Build enhanced user context for AI recommendations
   *
   * Aggregates user skills, recent performance, and relevant past experiences
   * to create a comprehensive context for personalized recommendations.
   */
  async buildEnhancedContext(userId: string): Promise<EnhancedUserContext> {
    const start = Date.now();

    try {
      info('Building enhanced user context', { userId });

      // Get all user skills
      const skillsResult = await this.ruVectorService.getUserSkills(userId);
      const skills = skillsResult.success && skillsResult.data ? skillsResult.data : [];

      // Calculate aggregate metrics
      const totalExercises = skills.reduce(
        (sum, skill) => sum + skill.exercisesCompleted,
        0
      );

      const overallAccuracy = skills.length > 0
        ? skills.reduce((sum, skill) => sum + skill.successRate, 0) / skills.length
        : 0;

      // Determine current level (average of all skills)
      const currentLevel = skills.length > 0
        ? Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length)
        : 1;

      // Analyze progress
      const analysis = await this.analyzeUserProgress(userId);

      // Get relevant recent experiences (top 10)
      const recentQuery: ExperienceQuery = {
        userId,
        query: 'Recent learning activities',
        limit: 10,
      };

      const experiencesResult = await this.ruVectorService.queryExperiences(recentQuery);
      const experiences = experiencesResult.success && experiencesResult.data
        ? experiencesResult.data
        : [];

      // Convert ReflexionEpisodes to LearningEpisodes for context
      const relevantExperiences = this.convertToLearningEpisodes(experiences);

      // Calculate learning velocity (improvement rate)
      const learningVelocity = this.calculateLearningVelocity(skills);

      const context: EnhancedUserContext = {
        userId,
        currentLevel,
        totalExercises,
        overallAccuracy,
        recentStrengths: analysis.strengths,
        recentWeaknesses: analysis.weaknesses,
        relevantExperiences,
        suggestedFocus: analysis.suggestedFocus,
        learningVelocity,
      };

      const duration = Date.now() - start;
      info('Enhanced user context built', {
        userId,
        currentLevel,
        totalExercises,
        overallAccuracy: overallAccuracy.toFixed(2),
        duration: `${duration}ms`,
      });

      return context;

    } catch (err) {
      logError('Failed to build enhanced context', err as Error);
      throw err;
    }
  }

  /**
   * Analyze user progress to identify strengths and weaknesses
   */
  async analyzeUserProgress(userId: string): Promise<UserProgressAnalysis> {
    try {
      // Get all user skills
      const skillsResult = await this.ruVectorService.getUserSkills(userId);
      const skills = skillsResult.success && skillsResult.data ? skillsResult.data : [];

      if (skills.length === 0) {
        return {
          strengths: [],
          weaknesses: [],
          suggestedFocus: ['Start with basic ornithology concepts'],
        };
      }

      // Sort skills by success rate
      const sortedSkills = [...skills].sort((a, b) => b.successRate - a.successRate);

      // Top 3 skills are strengths
      const strengths = sortedSkills
        .slice(0, 3)
        .filter(skill => skill.successRate > 0.7)
        .map(skill => skill.skillName);

      // Bottom 3 skills are weaknesses
      const weaknesses = sortedSkills
        .slice(-3)
        .filter(skill => skill.successRate < 0.6)
        .map(skill => skill.skillName);

      // Suggested focus: weaknesses + skills not practiced recently
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      const staleLearning = skills
        .filter(skill => skill.lastPracticed.getTime() < oneWeekAgo)
        .map(skill => skill.skillName);

      const uniqueFocus = new Set([...weaknesses, ...staleLearning.slice(0, 2)]);
      const suggestedFocus = Array.from(uniqueFocus);

      debug('User progress analyzed', {
        userId,
        strengthsCount: strengths.length,
        weaknessesCount: weaknesses.length,
        suggestedFocusCount: suggestedFocus.length,
      });

      return {
        strengths,
        weaknesses,
        suggestedFocus: suggestedFocus.length > 0
          ? suggestedFocus
          : ['Continue practicing current skills'],
      };

    } catch (err) {
      logError('Failed to analyze user progress', err as Error);
      return {
        strengths: [],
        weaknesses: [],
        suggestedFocus: ['Continue learning at your own pace'],
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Build situation description from learning episode
   */
  private buildSituationDescription(episode: LearningEpisode): string {
    const parts = [
      `Learning ${episode.topic}`,
      `Activity: ${episode.activity}`,
    ];

    if (episode.speciesInvolved && episode.speciesInvolved.length > 0) {
      parts.push(`Species: ${episode.speciesInvolved.join(', ')}`);
    }

    if (episode.vocabularyUsed && episode.vocabularyUsed.length > 0) {
      parts.push(`Vocabulary: ${episode.vocabularyUsed.join(', ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Build action description from performance metrics
   */
  private buildActionDescription(episode: LearningEpisode): string {
    const { performance } = episode;

    return [
      `Completed in ${Math.round(performance.timeSpent)} seconds`,
      `${performance.attemptsUsed} attempts`,
      `${performance.hintsUsed} hints used`,
    ].join(', ');
  }

  /**
   * Build outcome description from results
   */
  private buildOutcomeDescription(episode: LearningEpisode): string {
    const parts = [`Score: ${episode.performance.score}%`];

    if (episode.masteredConcepts && episode.masteredConcepts.length > 0) {
      parts.push(`Mastered: ${episode.masteredConcepts.join(', ')}`);
    }

    if (episode.struggledWith && episode.struggledWith.length > 0) {
      parts.push(`Struggled: ${episode.struggledWith.join(', ')}`);
    }

    if (episode.emotionalState) {
      parts.push(`Emotion: ${episode.emotionalState}`);
    }

    return parts.join(' | ');
  }

  /**
   * Generate AI-driven reflection on learning episode
   */
  private async generateReflection(
    situation: string,
    action: string,
    outcome: string,
    episode: LearningEpisode
  ): Promise<string> {
    try {
      // Create reflection based on performance analysis
      const score = episode.performance.score;
      const hints = episode.performance.hintsUsed;
      const attempts = episode.performance.attemptsUsed;

      if (score >= 90 && hints === 0 && attempts === 1) {
        return `Excellent performance! User demonstrated strong understanding of ${episode.topic} with immediate success.`;
      } else if (score >= 70 && score < 90) {
        return `Good progress on ${episode.topic}. ${hints > 0 ? 'Consider reviewing concepts before attempting exercises.' : 'Keep practicing to achieve mastery.'}`;
      } else if (score >= 50 && score < 70) {
        return `Moderate understanding of ${episode.topic}. Recommend additional review of ${episode.struggledWith?.join(', ') || 'core concepts'}.`;
      } else {
        return `Challenging topic requiring more practice. Focus on fundamentals of ${episode.topic}. ${episode.struggledWith ? `Specifically review: ${episode.struggledWith.join(', ')}.` : ''}`;
      }

    } catch (err) {
      logError('Failed to generate reflection', err as Error);
      return 'Learning episode recorded for future reference.';
    }
  }

  /**
   * Generate simple reflection for basic episodes
   */
  private async generateSimpleReflection(
    situation: string,
    action: string,
    outcome: string,
    success: boolean
  ): Promise<string> {
    if (success) {
      return `Successfully handled similar situation. Strategy: ${action} led to positive outcome: ${outcome}`;
    } else {
      return `Learning opportunity identified. Situation: ${situation}. Action taken: ${action} did not achieve desired outcome: ${outcome}. Consider alternative approaches.`;
    }
  }

  /**
   * Evaluate success based on performance metrics
   */
  private evaluateSuccess(episode: LearningEpisode): boolean {
    const score = episode.performance.score;
    const hintsUsed = episode.performance.hintsUsed;
    const attemptsUsed = episode.performance.attemptsUsed;

    // Success criteria: score >= 70% OR (score >= 50% with minimal help)
    return score >= 70 || (score >= 50 && hintsUsed <= 1 && attemptsUsed <= 2);
  }

  /**
   * Estimate difficulty from learning episode
   */
  private estimateDifficulty(episode: LearningEpisode): number {
    const { score, timeSpent, attemptsUsed, hintsUsed } = episode.performance;

    // Base difficulty on inverse of performance
    let difficulty = 10 - (score / 10);

    // Adjust based on time (normalize to 0-2 range)
    const timeScore = Math.min(timeSpent / 300, 2); // 300 seconds = moderate difficulty
    difficulty += timeScore;

    // Adjust based on attempts and hints (0-3 range)
    const helpScore = (attemptsUsed - 1) + hintsUsed;
    difficulty += Math.min(helpScore, 3);

    // Clamp to 1-10 range
    return Math.max(1, Math.min(10, Math.round(difficulty)));
  }

  /**
   * Convert ReflexionEpisodes to LearningEpisodes
   */
  private convertToLearningEpisodes(
    reflexions: ReflexionEpisode[]
  ): LearningEpisode[] {
    return reflexions.map(reflexion => ({
      userId: reflexion.userId,
      sessionId: reflexion.sessionId,
      timestamp: reflexion.timestamp,
      topic: reflexion.exerciseType || 'General Learning',
      activity: reflexion.exerciseType || 'Exercise',
      performance: {
        score: reflexion.success ? 85 : 45, // Estimate based on success
        timeSpent: 0, // Unknown from reflexion
        attemptsUsed: 1,
        hintsUsed: 0,
      },
      struggledWith: reflexion.success ? undefined : [reflexion.situation],
      masteredConcepts: reflexion.success ? [reflexion.situation] : undefined,
      speciesInvolved: reflexion.speciesId ? [reflexion.speciesId] : undefined,
    }));
  }

  /**
   * Calculate learning velocity (rate of improvement)
   */
  private calculateLearningVelocity(skills: SkillEntry[]): number {
    if (skills.length === 0) {
      return 0;
    }

    // Calculate weighted average based on recent practice
    const now = Date.now();
    let totalVelocity = 0;
    let totalWeight = 0;

    for (const skill of skills) {
      const daysSincePractice = (now - skill.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);

      // Recent practice is weighted more heavily (exponential decay)
      const weight = Math.exp(-daysSincePractice / 7); // 7-day half-life

      // Velocity = exercises completed * success rate * level
      const velocity = skill.exercisesCompleted * skill.successRate * skill.level;

      totalVelocity += velocity * weight;
      totalWeight += weight;
    }

    // Normalize to 0-10 scale
    const rawVelocity = totalWeight > 0 ? totalVelocity / totalWeight : 0;
    return Math.min(10, rawVelocity / 10);
  }
}

/**
 * Factory function to create VectorUserContextService singleton
 */
let userContextServiceInstance: VectorUserContextService | null = null;

export function createVectorUserContextService(
  ruVectorService: RuVectorService,
  embeddingService: EmbeddingService
): VectorUserContextService {
  if (!userContextServiceInstance) {
    userContextServiceInstance = new VectorUserContextService(
      ruVectorService,
      embeddingService
    );
  }
  return userContextServiceInstance;
}

/**
 * Get existing VectorUserContextService instance
 */
export function getVectorUserContextService(): VectorUserContextService {
  if (!userContextServiceInstance) {
    throw new Error(
      'VectorUserContextService not initialized. Call createVectorUserContextService first.'
    );
  }
  return userContextServiceInstance;
}

/**
 * Cleanup singleton instance
 */
export function cleanupVectorUserContextService(): void {
  userContextServiceInstance = null;
}
