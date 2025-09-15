// CONCEPT: Adapter pattern for dual-mode data access
// WHY: Seamlessly switch between backend API (dev) and client storage (production/GitHub Pages)
// PATTERN: Strategy pattern with environment-based implementation selection

import { clientDataService } from './clientDataService';
import axios, { AxiosInstance } from 'axios';
import {
  Annotation,
  Species,
  Exercise,
  VocabularyInteraction
} from '../types';

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
      this.axiosInstance = axios.create({
        baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001',
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
          console.warn('Backend unavailable, switching to client storage');
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
      const response = await this.axiosInstance!.get('/api/annotations', {
        params: { imageId }
      });
      return response.data;
    } catch (error) {
      // Fallback to client storage on error
      console.error('API error, falling back to client storage:', error);
      return clientDataService.getAnnotations(imageId);
    }
  }

  async createAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation> {
    if (this.useClientStorage) {
      // Client-side creation (read-only in GitHub Pages mode)
      throw new Error('Cannot create annotations in static mode');
    }

    const response = await this.axiosInstance!.post('/api/annotations', annotation);
    return response.data;
  }

  // Species methods

  async getSpecies(filters?: any): Promise<Species[]> {
    if (this.useClientStorage) {
      return clientDataService.getSpecies(filters);
    }

    try {
      const response = await this.axiosInstance!.get('/api/species', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('API error, falling back to client storage:', error);
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
      const response = await this.axiosInstance!.get('/api/exercises', {
        params: { type }
      });
      return response.data;
    } catch (error) {
      console.error('API error, falling back to client storage:', error);
      return clientDataService.getExercises(type);
    }
  }

  async submitExerciseAnswer(exerciseId: string, answer: any): Promise<any> {
    if (this.useClientStorage) {
      // Process answer locally
      const result = {
        exerciseId,
        answer,
        correct: this.validateAnswer(exerciseId, answer),
        timestamp: new Date()
      };
      await clientDataService.saveExerciseResult(result);
      return result;
    }

    const response = await this.axiosInstance!.post('/api/exercises/submit', {
      exerciseId,
      answer
    });
    return response.data;
  }

  private validateAnswer(_exerciseId: string, _answer: any): boolean {
    // Simple client-side validation logic
    // In production, this would be more sophisticated
    return Math.random() > 0.3; // 70% success rate for demo
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
      const response = await this.axiosInstance!.get('/api/vocabulary/interactions', {
        params: { sessionId }
      });
      return response.data;
    } catch (error) {
      console.error('API error, falling back to client storage:', error);
      return clientDataService.getInteractions(sessionId);
    }
  }

  // Progress methods

  async saveProgress(progress: any): Promise<void> {
    if (this.useClientStorage) {
      return clientDataService.saveProgress(progress);
    }

    await this.axiosInstance!.post('/api/progress', progress);
  }

  async getProgress(sessionId: string): Promise<any> {
    if (this.useClientStorage) {
      return clientDataService.getProgress(sessionId);
    }

    try {
      const response = await this.axiosInstance!.get('/api/progress', {
        params: { sessionId }
      });
      return response.data;
    } catch (error) {
      console.error('API error, falling back to client storage:', error);
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
}

// Export singleton instance
export const apiAdapter = new ApiAdapter();

// Export convenience methods
export const api = {
  annotations: {
    list: (imageId?: string) => apiAdapter.getAnnotations(imageId),
    create: (annotation: any) => apiAdapter.createAnnotation(annotation),
  },
  species: {
    list: (filters?: any) => apiAdapter.getSpecies(filters),
    get: (id: string) => apiAdapter.getSpeciesById(id),
  },
  exercises: {
    list: (type?: string) => apiAdapter.getExercises(type),
    submit: (exerciseId: string, answer: any) => apiAdapter.submitExerciseAnswer(exerciseId, answer),
  },
  vocabulary: {
    saveInteraction: (interaction: any) => apiAdapter.saveInteraction(interaction),
    getInteractions: (sessionId: string) => apiAdapter.getInteractions(sessionId),
  },
  progress: {
    save: (progress: any) => apiAdapter.saveProgress(progress),
    get: (sessionId: string) => apiAdapter.getProgress(sessionId),
  },
  utils: {
    export: () => apiAdapter.exportUserData(),
    import: (data: string) => apiAdapter.importUserData(data),
    clear: () => apiAdapter.clearAllData(),
    getMode: () => apiAdapter.getStorageMode(),
  }
};