import { useState, useCallback } from 'react';
import { VocabularyDisclosure, DisclosureLevel } from '../../../shared/types/vocabulary.types';
import { Annotation } from '../../../shared/types/annotation.types';
import { vocabularyAPI } from '../services/vocabularyAPI';
import { error as logError } from '../utils/logger';

export const useDisclosure = (annotation: Annotation) => {
  const [disclosure, setDisclosure] = useState<VocabularyDisclosure>({
    annotationId: annotation.id,
    level: 0,
  });

  const generateHint = useCallback((annotation: Annotation, level: DisclosureLevel): string => {
    const hints = {
      0: '',
      1: `This ${annotation.type} term starts with "${annotation.spanishTerm[0]}"`,
      2: 'Click to hear pronunciation',
      3: 'Explore etymology and related terms',
      4: 'View examples and common phrases'
    };
    return hints[level];
  }, []);

  const fetchEnrichedContent = useCallback(async (level: DisclosureLevel) => {
    if (level === 0) return {};

    const content: Partial<VocabularyDisclosure> = {
      spanish: annotation.spanishTerm,
      hint: generateHint(annotation, level),
    };

    if (level >= 2) {
      content.english = annotation.englishTerm;
      content.pronunciation = annotation.pronunciation;
      content.audioUrl = `/api/audio/pronounce/${encodeURIComponent(annotation.spanishTerm)}`;
    }

    if (level >= 3) {
      try {
        const enrichment = await vocabularyAPI.getEnrichment(annotation.spanishTerm);
        content.etymology = enrichment.etymology;
        content.mnemonic = enrichment.mnemonic;
        content.relatedTerms = enrichment.relatedTerms;
      } catch (error) {
        logError('Failed to fetch enrichment:', error);
      }
    }

    if (level === 4) {
      try {
        const examples = await vocabularyAPI.getExamples(annotation.spanishTerm);
        content.usageExamples = examples.usageExamples;
        content.commonPhrases = examples.commonPhrases;
      } catch (error) {
        logError('Failed to fetch examples:', error);
      }
    }

    return content;
  }, [annotation, generateHint]);

  const handleHover = useCallback(async () => {
    if (disclosure.level === 0) {
      const content = await fetchEnrichedContent(1);
      setDisclosure({
        ...disclosure,
        ...content,
        level: 1,
      });

      // Simple tracking
      vocabularyAPI.trackInteraction(annotation.id, annotation.spanishTerm, 1);
    }
  }, [disclosure, fetchEnrichedContent, annotation]);

  const handleClick = useCallback(async () => {
    const newLevel = Math.min(disclosure.level + 1, 4) as DisclosureLevel;
    const content = await fetchEnrichedContent(newLevel);
    setDisclosure({
      ...disclosure,
      ...content,
      level: newLevel,
    });

    // Simple tracking
    vocabularyAPI.trackInteraction(annotation.id, annotation.spanishTerm, newLevel);
  }, [disclosure, fetchEnrichedContent, annotation]);

  const setLevel = useCallback(async (level: DisclosureLevel) => {
    const content = await fetchEnrichedContent(level);
    setDisclosure({
      ...disclosure,
      ...content,
      level,
    });
  }, [disclosure, fetchEnrichedContent]);

  const reset = useCallback(() => {
    setDisclosure({
      annotationId: annotation.id,
      level: 0,
    });
  }, [annotation.id]);

  return {
    disclosure,
    handleHover,
    handleClick,
    setLevel,
    reset,
  };
};