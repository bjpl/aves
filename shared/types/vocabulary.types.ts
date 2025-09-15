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
  annotationId: string;
  spanishTerm: string;
  disclosureLevel: DisclosureLevel;
  timestamp: Date;
}