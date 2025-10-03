import { Pool } from 'pg';
import { ExerciseService } from './ExerciseService';
import { VocabularyService } from './VocabularyService';
import { UserService } from './UserService';
import { VisionAIService } from './VisionAIService';
import { AIExerciseGenerator } from './aiExerciseGenerator';
import { UserContextBuilder } from './userContextBuilder';

/**
 * Service factory for dependency injection
 */
export class ServiceFactory {
  private exerciseService: ExerciseService;
  private vocabularyService: VocabularyService;
  private userService: UserService;
  private visionAIService: VisionAIService;
  private aiExerciseGenerator: AIExerciseGenerator;
  private userContextBuilder: UserContextBuilder;

  constructor(pool: Pool) {
    this.exerciseService = new ExerciseService(pool);
    this.vocabularyService = new VocabularyService(pool);
    this.userService = new UserService(pool);
    this.visionAIService = new VisionAIService();
    this.aiExerciseGenerator = new AIExerciseGenerator(pool);
    this.userContextBuilder = new UserContextBuilder(pool);
  }

  getExerciseService(): ExerciseService {
    return this.exerciseService;
  }

  getVocabularyService(): VocabularyService {
    return this.vocabularyService;
  }

  getUserService(): UserService {
    return this.userService;
  }

  getVisionAIService(): VisionAIService {
    return this.visionAIService;
  }

  getAIExerciseGenerator(): AIExerciseGenerator {
    return this.aiExerciseGenerator;
  }

  getUserContextBuilder(): UserContextBuilder {
    return this.userContextBuilder;
  }
}

// Export all types
export * from './ExerciseService';
export * from './VocabularyService';
export * from './UserService';
export * from './VisionAIService';
export * from './aiExerciseGenerator';
export * from './userContextBuilder';
