// CONCEPT: Adapter pattern for dual-mode data access
// WHY: Seamlessly switch between backend API (dev) and client storage (production/GitHub Pages)
// PATTERN: Strategy pattern with environment-based implementation selection

import { clientDataService } from './clientDataService';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Annotation,
  Species,
  Exercise,
  VocabularyInteraction,
  SpeciesFilter
} from '../types';
import {
  ApiResponse,
  ExerciseAnswerSubmission,
  ExerciseResult,
  UserProgress
} from '../types/api.types';
import { NetworkError, toAppError } from '../types/error.types';
import { error as logError, warn } from '../utils/logger';

// Determine if we're running on GitHub Pages or local development
const isGitHubPages = window.location.hostname.includes('github.io');
const isLocalDev = window.location.hostname === 'localhost' && !isGitHubPages;

class ApiAdapter {
  private axiosInstance: AxiosInstance | null = null;
  private useClientStorage: boolean;

  constructor() {
    this.useClientStorage = isGitHubPages || !isLocalDev;

    if (!this.useClientStorage) {
      // Configure axios for backend API
      // Safe access to import.meta.env with fallback
      const env = import.meta.env as Record<string, unknown> | undefined;
      const apiUrl = env?.VITE_API_URL as string | undefined;

      this.axiosInstance = axios.create({
        baseURL: apiUrl || 'http://localhost:3001',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add request/response interceptors
      this.setupInterceptors();
    }
  }

  private setupInterceptors(): void {
    if (!this.axiosInstance) return;

    // Request interceptor for auth tokens
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const sessionId = sessionStorage.getItem('aves-session-id');
        if (sessionId) {
          config.headers['X-Session-Id'] = sessionId;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 503) {
          // Backend unavailable, fall back to client storage
          warn('Backend unavailable, switching to client storage');
          this.useClientStorage = true;
        }
        return Promise.reject(error);
      }
    );
  }

  // Annotation methods

  async getAnnotations(imageId?: string): Promise<Annotation[]> {
    if (this.useClientStorage) {
      return clientDataService.getAnnotations(imageId);
    }

    try {
      const response = await this.axiosInstance!.get<ApiResponse<Annotation[]>>('/api/annotations', {
        params: { imageId }
      });
      return response.data.data;
    } catch (error) {
      // Fallback to client storage on error
      logError('API error, falling back to client storage:', error);
      this.handleApiError(error);
      return clientDataService.getAnnotations(imageId);
    }
  }

  async createAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation> {
    if (this.useClientStorage) {
      // Client-side creation (read-only in GitHub Pages mode)
      throw new NetworkError('Cannot create annotations in static mode', 403);
    }

    try {
      const response = await this.axiosInstance!.post<ApiResponse<Annotation>>('/api/annotations', annotation);
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  // Species methods

  async getSpecies(filters?: SpeciesFilter): Promise<Species[]> {
    if (this.useClientStorage) {
      return clientDataService.getSpecies(filters);
    }

    try {
      const response = await this.axiosInstance!.get<ApiResponse<Species[]>>('/api/species', {
        params: filters
      });
      return response.data.data;
    } catch (error) {
      logError('API error, falling back to client storage:', error);
      this.handleApiError(error);
      return clientDataService.getSpecies(filters);
    }
  }

  async getSpeciesById(id: string): Promise<Species | null> {
    const allSpecies = await this.getSpecies();
    return allSpecies.find(s => s.id === id) || null;
  }

  // Exercise methods

  async getExercises(type?: string): Promise<Exercise[]> {
    if (this.useClientStorage) {
      return clientDataService.getExercises(type);
    }

    try {
      const response = await this.axiosInstance!.get<ApiResponse<Exercise[]>>('/api/exercises', {
        params: { type }
      });
      return response.data.data;
    } catch (error) {
      logError('API error, falling back to client storage:', error);
      this.handleApiError(error);
      return clientDataService.getExercises(type);
    }
  }

  async submitExerciseAnswer(
    exerciseId: string,
    answer: ExerciseAnswerSubmission['answer']
  ): Promise<ExerciseResult> {
    if (this.useClientStorage) {
      // Process answer locally
      const result: ExerciseResult = {
        exerciseId,
        answer,
        correct: this.validateAnswer(exerciseId, answer),
        timestamp: new Date(),
        sessionId: this.getSessionId()
      };
      await clientDataService.saveExerciseResult({
        ...result,
        sessionId: result.sessionId || this.getSessionId()
      });
      return result;
    }

    try {
      const submission: ExerciseAnswerSubmission = {
        exerciseId,
        answer,
        sessionId: this.getSessionId()
      };
      const response = await this.axiosInstance!.post<ApiResponse<ExerciseResult>>(
        '/api/exercises/submit',
        submission
      );
      return response.data.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  private validateAnswer(_exerciseId: string, _answer: ExerciseAnswerSubmission['answer']): boolean {
    // Simple client-side validation logic
    // In production, this would be more sophisticated
    return Math.random() > 0.3; // 70% success rate for demo
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('aves-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('aves-session-id', sessionId);
    }
    return sessionId;
  }

  // Vocabulary interaction methods

  async saveInteraction(interaction: Omit<VocabularyInteraction, 'id'>): Promise<void> {
    if (this.useClientStorage) {
      return clientDataService.saveInteraction(interaction);
    }

    await this.axiosInstance!.post('/api/vocabulary/interact', interaction);
  }

  async getInteractions(sessionId: string): Promise<VocabularyInteraction[]> {
    if (this.useClientStorage) {
      return clientDataService.getInteractions(sessionId);
    }

    try {
      const response = await this.axiosInstance!.get<ApiResponse<VocabularyInteraction[]>>(
        '/api/vocabulary/interactions',
        { params: { sessionId } }
      );
      return response.data.data;
    } catch (error) {
      logError('API error, falling back to client storage:', error);
      this.handleApiError(error);
      return clientDataService.getInteractions(sessionId);
    }
  }

  // Progress methods

  async saveProgress(progress: Omit<UserProgress, 'lastUpdated'>): Promise<void> {
    if (this.useClientStorage) {
      return clientDataService.saveProgress(progress);
    }

    try {
      await this.axiosInstance!.post<ApiResponse<void>>('/api/progress', progress);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async getProgress(sessionId: string): Promise<UserProgress | null> {
    if (this.useClientStorage) {
      return clientDataService.getProgress(sessionId);
    }

    try {
      const response = await this.axiosInstance!.get<ApiResponse<UserProgress>>(
        '/api/progress',
        { params: { sessionId } }
      );
      return response.data.data;
    } catch (error) {
      logError('API error, falling back to client storage:', error);
      this.handleApiError(error);
      return clientDataService.getProgress(sessionId);
    }
  }

  // Utility methods

  async exportUserData(): Promise<string> {
    return clientDataService.exportData();
  }

  async importUserData(jsonString: string): Promise<void> {
    return clientDataService.importData(jsonString);
  }

  async clearAllData(): Promise<void> {
    return clientDataService.clearAllData();
  }

  isUsingClientStorage(): boolean {
    return this.useClientStorage;
  }

  getStorageMode(): 'backend' | 'client' {
    return this.useClientStorage ? 'client' : 'backend';
  }

  /**
   * Handle API errors and convert to AppError
   */
  private handleApiError(error: unknown): NetworkError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      const message = axiosError.message || 'Network request failed';
      const details = axiosError.response?.data as Record<string, unknown> | undefined;

      return new NetworkError(message, statusCode, details);
    }

    const appError = toAppError(error);
    return new NetworkError(appError.message, undefined, { originalError: appError.code });
  }
}

// Export singleton instance
export const apiAdapter = new ApiAdapter();

// Export convenience methods with proper typing
export const api = {
  annotations: {
    list: (imageId?: string): Promise<Annotation[]> => apiAdapter.getAnnotations(imageId),
    create: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation> =>
      apiAdapter.createAnnotation(annotation),
  },
  species: {
    list: (filters?: SpeciesFilter): Promise<Species[]> => apiAdapter.getSpecies(filters),
    get: (id: string): Promise<Species | null> => apiAdapter.getSpeciesById(id),
  },
  exercises: {
    list: (type?: string): Promise<Exercise[]> => apiAdapter.getExercises(type),
    submit: (exerciseId: string, answer: ExerciseAnswerSubmission['answer']): Promise<ExerciseResult> =>
      apiAdapter.submitExerciseAnswer(exerciseId, answer),
  },
  vocabulary: {
    saveInteraction: (interaction: Omit<VocabularyInteraction, 'id'>): Promise<void> =>
      apiAdapter.saveInteraction(interaction),
    getInteractions: (sessionId: string): Promise<VocabularyInteraction[]> =>
      apiAdapter.getInteractions(sessionId),
  },
  progress: {
    save: (progress: Omit<UserProgress, 'lastUpdated'>): Promise<void> =>
      apiAdapter.saveProgress(progress),
    get: (sessionId: string): Promise<UserProgress | null> =>
      apiAdapter.getProgress(sessionId),
  },
  utils: {
    export: (): Promise<string> => apiAdapter.exportUserData(),
    import: (data: string): Promise<void> => apiAdapter.importUserData(data),
    clear: (): Promise<void> => apiAdapter.clearAllData(),
    getMode: (): 'backend' | 'client' => apiAdapter.getStorageMode(),
  }
};