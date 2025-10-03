import { Pool } from 'pg';
import { ExerciseService } from './ExerciseService';
import { VocabularyService } from './VocabularyService';
import { UserService } from './UserService';

/**
 * Service factory for dependency injection
 */
export class ServiceFactory {
  private exerciseService: ExerciseService;
  private vocabularyService: VocabularyService;
  private userService: UserService;

  constructor(pool: Pool) {
    this.exerciseService = new ExerciseService(pool);
    this.vocabularyService = new VocabularyService(pool);
    this.userService = new UserService(pool);
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
}

// Export all types
export * from './ExerciseService';
export * from './VocabularyService';
export * from './UserService';
