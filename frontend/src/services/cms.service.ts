import axios from 'axios';
import { debug } from '../utils/logger';

// PATTERN: Service Layer Architecture
// WHY: Abstracts API communication from components
// CONCEPT: Single source of truth for CMS interactions

const CMS_URL = import.meta.env.VITE_CMS_URL || 'http://localhost:1337';
const API_TOKEN = import.meta.env.VITE_CMS_API_TOKEN || '';

const cmsClient = axios.create({
  baseURL: `${CMS_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` })
  }
});

// PATTERN: TypeScript Interface Definitions
// WHY: Type safety and IntelliSense support
export interface Bird {
  id: number;
  attributes: {
    spanishName: string;
    englishName: string;
    scientificName: string;
    description: string;
    habitat?: string;
    size?: string;
    diet?: string;
    conservationStatus?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    images?: {
      data: Array<{
        id: number;
        attributes: {
          url: string;
          name: string;
          alternativeText?: string;
        };
      }>;
    };
    sounds?: {
      data: Array<{
        id: number;
        attributes: {
          url: string;
          name: string;
        };
      }>;
    };
    funFacts?: string[];
    regions?: string[];
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
  };
}

export interface Lesson {
  id: number;
  attributes: {
    title: string;
    description: string;
    objectives: string[];
    content: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    duration: number;
    order: number;
    category: string;
    tags?: string[];
    birds?: {
      data: Bird[];
    };
    quizzes?: {
      data: Quiz[];
    };
    resources?: {
      data: Array<{
        id: number;
        attributes: {
          url: string;
          name: string;
        };
      }>;
    };
  };
}

export interface Quiz {
  id: number;
  attributes: {
    question: string;
    type: 'multiple_choice' | 'true_false' | 'image_identification' | 'sound_identification' | 'fill_blank';
    options?: string[];
    correctAnswer: string | boolean;
    explanation?: string;
    points: number;
    difficulty: 'easy' | 'medium' | 'hard';
    media?: {
      data: {
        id: number;
        attributes: {
          url: string;
        };
      };
    };
  };
}

// PATTERN: Repository Pattern Implementation
// WHY: Centralizes data access logic
export class CMSService {
  // Birds API
  static async getBirds(params?: {
    filters?: Record<string, string | number | boolean>;
    sort?: string[];
    pagination?: { page?: number; pageSize?: number };
    populate?: string | string[];
  }) {
    const queryString = params ? `?${this.buildQueryString(params)}` : '';
    const response = await cmsClient.get<{ data: Bird[]; meta: Record<string, unknown> }>(`/birds${queryString}`);
    return response.data;
  }

  static async getBirdById(id: number) {
    const response = await cmsClient.get<{ data: Bird }>(`/birds/${id}?populate=*`);
    return response.data.data;
  }

  static async getBirdBySpanishName(name: string) {
    const response = await cmsClient.get<{ data: Bird[] }>(
      `/birds?filters[spanishName][$eq]=${encodeURIComponent(name)}&populate=*`
    );
    return response.data.data[0];
  }

  // Lessons API
  static async getLessons(params?: {
    filters?: Record<string, string | number | boolean>;
    sort?: string[];
    pagination?: { page?: number; pageSize?: number };
    populate?: string | string[];
  }) {
    const queryString = params ? `?${this.buildQueryString(params)}` : '';
    const response = await cmsClient.get<{ data: Lesson[]; meta: Record<string, unknown> }>(`/lessons${queryString}`);
    return response.data;
  }

  static async getLessonById(id: number) {
    const response = await cmsClient.get<{ data: Lesson }>(
      `/lessons/${id}?populate[birds][populate]=images&populate[quizzes][populate]=media&populate[resources]=*`
    );
    return response.data.data;
  }

  static async getLessonsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced') {
    const response = await cmsClient.get<{ data: Lesson[] }>(
      `/lessons?filters[difficulty][$eq]=${difficulty}&sort=order&populate=*`
    );
    return response.data.data;
  }

  // Quizzes API
  static async getQuizzesByLessonId(lessonId: number) {
    const response = await cmsClient.get<{ data: Quiz[] }>(
      `/quizzes?filters[lesson][id][$eq]=${lessonId}&populate=media`
    );
    return response.data.data;
  }

  static async submitQuizAnswer(quizId: number, answer: string | boolean) {
    // This would normally go to your backend for validation
    // For now, we'll validate on the client side
    const quiz = await this.getQuizById(quizId);

    // Use deep equality check instead of JSON.stringify comparison
    // Handle both primitive values and objects
    const isCorrect = this.isAnswerCorrect(answer, quiz.attributes.correctAnswer);

    return {
      correct: isCorrect,
      explanation: quiz.attributes.explanation,
      points: isCorrect ? quiz.attributes.points : 0
    };
  }

  // Helper method for deep equality comparison
  private static isAnswerCorrect(userAnswer: string | boolean | unknown[], correctAnswer: string | boolean | unknown[]): boolean {
    // Handle null/undefined cases
    if (userAnswer === correctAnswer) return true;
    if (userAnswer == null || correctAnswer == null) return false;

    // Handle primitive types (string, number, boolean)
    if (typeof userAnswer !== 'object' || typeof correctAnswer !== 'object') {
      // Case-insensitive comparison for strings
      if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
        return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      }
      return userAnswer === correctAnswer;
    }

    // Handle arrays
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      if (userAnswer.length !== correctAnswer.length) return false;
      return userAnswer.every((item, index) => {
        const correctItem = correctAnswer[index];
        return this.isAnswerCorrect(
          item as string | boolean | unknown[],
          correctItem as string | boolean | unknown[]
        );
      });
    }

    // Handle objects - use JSON comparison as fallback for complex objects
    try {
      return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
    } catch {
      return false;
    }
  }

  static async getQuizById(id: number) {
    const response = await cmsClient.get<{ data: Quiz }>(`/quizzes/${id}?populate=*`);
    return response.data.data;
  }

  // Media URL helper
  static getMediaUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${CMS_URL}${path}`;
  }

  // Helper method to build query strings
  private static buildQueryString(params: {
    filters?: Record<string, string | number | boolean>;
    sort?: string[];
    pagination?: { page?: number; pageSize?: number };
    populate?: string | string[];
  }): string {
    const query = new URLSearchParams();

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        query.append(`filters[${key}]`, String(value));
      });
    }

    if (params.sort) {
      query.append('sort', params.sort.join(','));
    }

    if (params.pagination) {
      if (params.pagination.page) query.append('pagination[page]', String(params.pagination.page));
      if (params.pagination.pageSize) query.append('pagination[pageSize]', String(params.pagination.pageSize));
    }

    if (params.populate) {
      const populateValue = Array.isArray(params.populate) ? params.populate.join(',') : params.populate;
      query.append('populate', populateValue);
    }

    return query.toString();
  }

  // Search functionality
  static async searchBirds(searchTerm: string) {
    const response = await cmsClient.get<{ data: Bird[] }>(
      `/birds?filters[$or][0][spanishName][$containsi]=${searchTerm}` +
      `&filters[$or][1][englishName][$containsi]=${searchTerm}` +
      `&filters[$or][2][scientificName][$containsi]=${searchTerm}&populate=images`
    );
    return response.data.data;
  }

  // Learning progress tracking (would connect to user backend)
  static async trackProgress(userId: string, lessonId: number, progress: number) {
    // This will connect to the serverless backend we'll create next
    debug('Progress tracked:', { userId, lessonId, progress });
    return { success: true };
  }
}