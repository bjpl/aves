export type DisclosureLevel = 0 | 1 | 2 | 3 | 4;

export interface VocabularyDisclosure {
  annotationId: string;
  level: DisclosureLevel;
  spanish?: string;
  english?: string;
  pronunciation?: string;
  audioUrl?: string;
  etymology?: string;
  mnemonic?: string;
  relatedTerms?: RelatedTerm[];
  usageExamples?: string[];
  commonPhrases?: Phrase[];
  hint?: string;
}

export interface RelatedTerm {
  term: string;
  relationship: 'synonym' | 'antonym' | 'related' | 'derivative';
  definition: string;
}

export interface Phrase {
  spanish: string;
  english: string;
  literal: string;
}

export interface VocabularyInteraction {
  id?: string;
  annotationId: string;
  spanishTerm: string;
  disclosureLevel: DisclosureLevel;
  timestamp: Date;
}

export interface UserProgress {
  sessionId: string;
  termsDiscovered: string[];
  exercisesCompleted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalAnswers: number;
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  lastExerciseAt?: Date;
  startedAt: Date;
  lastUpdated: Date;
  vocabularyMastery: Record<string, number>;
  accuracy: number;
}