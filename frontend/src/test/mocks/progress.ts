import { UserProgress } from '../../../../shared/types/vocabulary.types';

export const createMockProgress = (overrides: Partial<UserProgress> = {}): UserProgress => ({
  sessionId: 'session-123',
  termsDiscovered: ['pico', 'ala', 'cola'],
  exercisesCompleted: 10,
  correctAnswers: 7,
  incorrectAnswers: 3,
  totalAnswers: 10,
  currentStreak: 3,
  longestStreak: 5,
  lastActivity: new Date('2024-01-15'),
  startedAt: new Date('2024-01-01'),
  lastUpdated: new Date('2024-01-15'),
  vocabularyMastery: {
    pico: 80,
    ala: 60,
    cola: 40,
  },
  accuracy: 70,
  ...overrides,
});
