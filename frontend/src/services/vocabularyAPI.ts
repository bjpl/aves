import axios from 'axios';
import { DisclosureLevel } from '../../../shared/types/vocabulary.types';
import { error as logError } from '../utils/logger';

const API_BASE_URL = '/api';

export const vocabularyAPI = {
  async getEnrichment(spanishTerm: string) {
    const response = await axios.get(`${API_BASE_URL}/vocabulary/enrichment/${encodeURIComponent(spanishTerm)}`);
    return response.data;
  },

  async getExamples(spanishTerm: string) {
    const response = await axios.get(`${API_BASE_URL}/vocabulary/enrichment/${encodeURIComponent(spanishTerm)}`);
    return {
      usageExamples: response.data.usageExamples || [],
      commonPhrases: response.data.commonPhrases || []
    };
  },

  async trackInteraction(annotationId: string, spanishTerm: string, level: DisclosureLevel) {
    const sessionId = this.getSessionId();
    try {
      await axios.post(`${API_BASE_URL}/vocabulary/track-interaction`, {
        sessionId,
        annotationId,
        spanishTerm,
        disclosureLevel: level
      });
    } catch (err) {
      logError('Failed to track interaction', err instanceof Error ? err : new Error(String(err)));
    }
  },

  getSessionId(): string {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  },

  async generatePronunciationAudio(text: string): Promise<string> {
    // In production, this would call a TTS service
    // For now, return a placeholder URL
    return `${API_BASE_URL}/audio/pronounce/${encodeURIComponent(text)}`;
  }
};