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

export interface VocabularyMastery {
  id: string;
  userId: string;
  annotationId: string;
  spanishTerm: string;
  disclosureLevel: DisclosureLevel;
  viewCount: number;
  totalTimeSpent: number; // seconds
  lastViewed: Date;
  firstViewed: Date;
  masteryScore: number; // 0-1
  nextReviewDate?: Date;
  reviewInterval: number; // days
}

export interface LearningEvent {
  id: string;
  userId: string;
  annotationId: string;
  eventType: 'hover' | 'click' | 'audio_play' | 'exercise_complete' | 'review';
  disclosureLevel: DisclosureLevel;
  interactionDuration: number; // milliseconds
  correctResponse?: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SpacedRepetitionSchedule {
  annotationId: string;
  currentInterval: number;
  easeFactor: number;
  nextReviewDate: Date;
  repetitionNumber: number;
}

export interface LearningProgress {
  totalTermsLearned: number;
  currentStreak: number;
  masteryByCategory: {
    anatomical: number;
    behavioral: number;
    color: number;
    pattern: number;
  };
  averageTimeToMastery: number; // hours
  retentionRate: number; // percentage
}