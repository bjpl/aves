import { useState, useCallback, useEffect } from 'react';
import { VocabularyDisclosure, DisclosureLevel, LearningEvent } from '../../../shared/types/vocabulary.types';
import { Annotation } from '../../../shared/types/annotation.types';
import { vocabularyAPI } from '../services/vocabularyAPI';

export const useDisclosure = (annotation: Annotation) => {
  const [disclosure, setDisclosure] = useState<VocabularyDisclosure>({
    annotationId: annotation.id,
    level: 0,
  });
  const [interactionStartTime, setInteractionStartTime] = useState<number>(0);

  const generateHint = useCallback((annotation: Annotation, level: DisclosureLevel): string => {
    const hints = {
      0: '',
      1: `This ${annotation.type} term starts with "${annotation.spanishTerm[0]}"`,
      2: 'Click to hear pronunciation',
      3: 'Explore etymology and related terms',
      4: 'You\'ve mastered this term!'
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
        console.error('Failed to fetch enrichment:', error);
      }
    }

    if (level === 4) {
      try {
        const examples = await vocabularyAPI.getExamples(annotation.spanishTerm);
        content.usageExamples = examples.usageExamples;
        content.commonPhrases = examples.commonPhrases;
      } catch (error) {
        console.error('Failed to fetch examples:', error);
      }
    }

    return content;
  }, [annotation, generateHint]);

  const recordInteraction = useCallback(async (
    eventType: LearningEvent['eventType'],
    level: DisclosureLevel
  ) => {
    const duration = interactionStartTime ? Date.now() - interactionStartTime : 0;

    const event: Omit<LearningEvent, 'id' | 'userId'> = {
      annotationId: annotation.id,
      eventType,
      disclosureLevel: level,
      interactionDuration: duration,
      timestamp: new Date(),
    };

    try {
      await vocabularyAPI.recordLearningEvent(event);
    } catch (error) {
      console.error('Failed to record interaction:', error);
    }
  }, [annotation.id, interactionStartTime]);

  const handleHover = useCallback(async () => {
    if (disclosure.level === 0) {
      setInteractionStartTime(Date.now());
      const content = await fetchEnrichedContent(1);
      setDisclosure({
        ...disclosure,
        ...content,
        level: 1,
      });
      recordInteraction('hover', 1);
    }
  }, [disclosure, fetchEnrichedContent, recordInteraction]);

  const handleClick = useCallback(async () => {
    const newLevel = Math.min(disclosure.level + 1, 4) as DisclosureLevel;
    setInteractionStartTime(Date.now());
    const content = await fetchEnrichedContent(newLevel);
    setDisclosure({
      ...disclosure,
      ...content,
      level: newLevel,
    });
    recordInteraction('click', newLevel);
  }, [disclosure, fetchEnrichedContent, recordInteraction]);

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
    setInteractionStartTime(0);
  }, [annotation.id]);

  useEffect(() => {
    return () => {
      if (interactionStartTime) {
        recordInteraction('hover', disclosure.level);
      }
    };
  }, []);

  return {
    disclosure,
    handleHover,
    handleClick,
    setLevel,
    reset,
  };
};