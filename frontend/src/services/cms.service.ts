import axios from 'axios';

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
    funFacts?: any;
    regions?: any;
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
    objectives: any;
    content: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    duration: number;
    order: number;
    category: string;
    tags?: any;
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
    options?: any;
    correctAnswer: any;
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
    filters?: any;
    sort?: string[];
    pagination?: { page?: number; pageSize?: number };
    populate?: string | string[];
  }) {
    const queryString = params ? `?${this.buildQueryString(params)}` : '';
    const response = await cmsClient.get<{ data: Bird[]; meta: any }>(`/birds${queryString}`);
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
    filters?: any;
    sort?: string[];
    pagination?: { page?: number; pageSize?: number };
    populate?: string | string[];
  }) {
    const queryString = params ? `?${this.buildQueryString(params)}` : '';
    const response = await cmsClient.get<{ data: Lesson[]; meta: any }>(`/lessons${queryString}`);
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

  static async submitQuizAnswer(quizId: number, answer: any) {
    // This would normally go to your backend for validation
    // For now, we'll validate on the client side
    const quiz = await this.getQuizById(quizId);
    const isCorrect = JSON.stringify(answer) === JSON.stringify(quiz.attributes.correctAnswer);
    return {
      correct: isCorrect,
      explanation: quiz.attributes.explanation,
      points: isCorrect ? quiz.attributes.points : 0
    };
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
  private static buildQueryString(params: any): string {
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
    console.log('Progress tracked:', { userId, lessonId, progress });
    return { success: true };
  }
}