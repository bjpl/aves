import axios from 'axios';
import { LearningEvent, VocabularyMastery } from '../../../shared/types/vocabulary.types';

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

  async recordLearningEvent(event: Omit<LearningEvent, 'id' | 'userId'>) {
    const response = await axios.post(`${API_BASE_URL}/vocabulary/learning-event`, {
      ...event,
      userId: localStorage.getItem('userId') || null // Temporary until auth is implemented
    });
    return response.data;
  },

  async getMastery(annotationId: string): Promise<VocabularyMastery> {
    const userId = localStorage.getItem('userId') || 'anonymous';
    const response = await axios.get(`${API_BASE_URL}/vocabulary/mastery/${userId}/${annotationId}`);
    return response.data;
  },

  async submitReview(annotationId: string, quality: number) {
    const userId = localStorage.getItem('userId') || 'anonymous';
    const response = await axios.post(`${API_BASE_URL}/vocabulary/review`, {
      userId,
      annotationId,
      quality
    });
    return response.data;
  },

  async getReviewQueue() {
    const userId = localStorage.getItem('userId') || 'anonymous';
    const response = await axios.get(`${API_BASE_URL}/vocabulary/review-queue/${userId}`);
    return response.data;
  },

  async generatePronunciationAudio(text: string): Promise<string> {
    // In production, this would call a TTS service
    // For now, return a placeholder URL
    return `${API_BASE_URL}/audio/pronounce/${encodeURIComponent(text)}`;
  }
};