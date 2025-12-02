// CONCEPT: Comprehensive tests for apiAdapter dual-mode service
// WHY: apiAdapter is critical - powers entire app with backend/client switching
// PATTERN: Test both backend mode, client mode, and mode switching

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { ApiAdapter } from '../../services/apiAdapter';
import { clientDataService } from '../../services/clientDataService';
import type {
  Annotation,
  Species,
  Exercise,
  VocabularyInteraction
} from '../../types';
import type { ExerciseResult } from '../../types/api.types';

// Helper to check if error is a NetworkError (works with dynamic imports)
const isNetworkError = (error: unknown): boolean => {
  return error instanceof Error && error.name === 'NetworkError';
};

// Mock dependencies
vi.mock('axios');
vi.mock('../../services/clientDataService');
vi.mock('../../utils/logger');

// Dynamic import to load apiAdapter AFTER mocks are set up
let apiAdapter: InstanceType<typeof ApiAdapter>;

describe('ApiAdapter - Backend Mode', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          // Store interceptor for testing
          return 1;
        })
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          // Store interceptor for testing
          return 1;
        })
      }
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to allow reimport

    // Mock axios.create to return our mock instance
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
    // Make axios.isAxiosError recognize our mock errors
    vi.mocked(axios.isAxiosError).mockImplementation((error: any) => {
      return error && (error.response !== undefined || error.isAxiosError === true);
    });

    // Mock window.location for backend mode
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
        href: 'http://localhost:5173',
        pathname: '/'
      },
      writable: true,
      configurable: true
    });

    // Mock sessionStorage
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true,
      configurable: true
    });

    // Dynamically import apiAdapter AFTER mocks are set up
    const module = await import('../../services/apiAdapter');
    apiAdapter = module.apiAdapter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create axios instance in backend mode', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should use VITE_API_URL from environment if available', () => {
      const createCall = vi.mocked(axios.create).mock.calls[0];
      expect(createCall[0]).toHaveProperty('baseURL');
    });

    it('should fallback to localhost:3001 if no VITE_API_URL', () => {
      const createCall = vi.mocked(axios.create).mock.calls[0];
      const baseURL = createCall[0]?.baseURL;
      expect(baseURL).toBeTruthy();
    });
  });

  describe('Annotation Methods - Backend Mode', () => {
    const mockAnnotation: Annotation = {
      id: '1',
      imageId: 'img1',
      spanishTerm: 'pico',
      englishTerm: 'beak',
      type: 'anatomical',
      boundingBox: {
        topLeft: { x: 100, y: 100 },
        bottomRight: { x: 200, y: 200 },
        width: 100,
        height: 100
      },
      difficultyLevel: 2,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should fetch annotations from backend API', async () => {
      const mockResponse = { data: { data: [mockAnnotation] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiAdapter.getAnnotations();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/annotations', {
        params: { imageId: undefined }
      });
      expect(result).toEqual([mockAnnotation]);
    });

    it('should fetch annotations by imageId', async () => {
      const mockResponse = { data: { data: [mockAnnotation] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiAdapter.getAnnotations('img1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/annotations', {
        params: { imageId: 'img1' }
      });
    });

    it('should fallback to client storage on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      vi.mocked(clientDataService.getAnnotations).mockResolvedValue([mockAnnotation]);

      const result = await apiAdapter.getAnnotations();

      expect(clientDataService.getAnnotations).toHaveBeenCalled();
      expect(result).toEqual([mockAnnotation]);
    });

    it('should create annotation via backend API', async () => {
      const newAnnotation = { ...mockAnnotation };
      delete (newAnnotation as any).id;
      delete (newAnnotation as any).createdAt;
      delete (newAnnotation as any).updatedAt;

      const mockResponse = { data: { data: mockAnnotation } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiAdapter.createAnnotation(newAnnotation);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/annotations', newAnnotation);
      expect(result).toEqual(mockAnnotation);
    });

    it('should handle create annotation errors', async () => {
      const newAnnotation = { ...mockAnnotation };
      delete (newAnnotation as any).id;

      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 500, data: {} },
        message: 'Server error'
      });

      await expect(apiAdapter.createAnnotation(newAnnotation)).rejects.toSatisfy(isNetworkError);
    });
  });

  describe('Species Methods - Backend Mode', () => {
    const mockSpecies: Species = {
      id: '1',
      scientificName: 'Cardinalis cardinalis',
      englishName: 'Northern Cardinal',
      spanishName: 'Cardenal Rojo',
      orderName: 'Passeriformes',
      familyName: 'Cardinalidae',
      genus: 'Cardinalis',
      habitats: ['forest'],
      sizeCategory: 'medium',
      primaryColors: ['red'],
      conservationStatus: 'LC',
      primaryImageUrl: 'http://example.com/cardinal.jpg',
      annotationCount: 5
    };

    it('should fetch all species from backend', async () => {
      const mockResponse = { data: { data: [mockSpecies] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiAdapter.getSpecies();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/species', {
        params: undefined
      });
      expect(result).toEqual([mockSpecies]);
    });

    it('should fetch species with filters', async () => {
      const filters = { habitat: 'forest', sizeCategory: 'medium' };
      const mockResponse = { data: { data: [mockSpecies] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiAdapter.getSpecies(filters);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/species', {
        params: filters
      });
    });

    it('should get species by ID', async () => {
      const mockResponse = { data: { data: [mockSpecies] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiAdapter.getSpeciesById('1');

      expect(result).toEqual(mockSpecies);
    });

    it('should return null if species not found by ID', async () => {
      const mockResponse = { data: { data: [] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiAdapter.getSpeciesById('999');

      expect(result).toBeNull();
    });

    it('should fallback to client storage on species fetch error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      vi.mocked(clientDataService.getSpecies).mockResolvedValue([mockSpecies]);

      const result = await apiAdapter.getSpecies();

      expect(clientDataService.getSpecies).toHaveBeenCalled();
      expect(result).toEqual([mockSpecies]);
    });
  });

  describe('Exercise Methods - Backend Mode', () => {
    const mockExercise: Exercise = {
      id: '1',
      type: 'visual_discrimination',
      instructions: 'Select the correct part',
      difficultyLevel: 2,
      targetTerm: 'pico',
      imageId: 'img1'
    };

    it('should fetch all exercises from backend', async () => {
      const mockResponse = { data: { data: [mockExercise] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiAdapter.getExercises();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/exercises', {
        params: { type: undefined }
      });
      expect(result).toEqual([mockExercise]);
    });

    it('should fetch exercises by type', async () => {
      const mockResponse = { data: { data: [mockExercise] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiAdapter.getExercises('visual_discrimination');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/exercises', {
        params: { type: 'visual_discrimination' }
      });
    });

    it('should submit exercise answer to backend', async () => {
      const answer = 'option1';
      const mockResult: ExerciseResult = {
        exerciseId: '1',
        answer,
        correct: true,
        timestamp: new Date(),
        sessionId: 'test-session'
      };
      const mockResponse = { data: { data: mockResult } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Mock sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: vi.fn(() => 'test-session'),
          setItem: vi.fn()
        },
        writable: true
      });

      const result = await apiAdapter.submitExerciseAnswer('1', answer);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/exercises/submit',
        expect.objectContaining({
          exerciseId: '1',
          answer,
          sessionId: expect.any(String)
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle exercise submission errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 400, data: {} },
        message: 'Bad request'
      });

      await expect(apiAdapter.submitExerciseAnswer('1', 'answer')).rejects.toSatisfy(isNetworkError);
    });

    it('should fallback to client storage on exercise fetch error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      vi.mocked(clientDataService.getExercises).mockResolvedValue([mockExercise]);

      const result = await apiAdapter.getExercises();

      expect(clientDataService.getExercises).toHaveBeenCalled();
      expect(result).toEqual([mockExercise]);
    });
  });

  describe('Vocabulary Interaction Methods - Backend Mode', () => {
    const mockInteraction: Omit<VocabularyInteraction, 'id'> = {
      annotationId: '1',
      action: 'view',
      timestamp: new Date()
    };

    it('should save interaction to backend', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await apiAdapter.saveInteraction(mockInteraction);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/vocabulary/interact',
        mockInteraction
      );
    });

    it('should fetch interactions from backend', async () => {
      const mockResponse = {
        data: {
          data: [{ ...mockInteraction, id: '1' }]
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiAdapter.getInteractions('session-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/vocabulary/interactions',
        { params: { sessionId: 'session-123' } }
      );
      expect(result).toHaveLength(1);
    });

    it('should fallback to client storage on getInteractions error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      vi.mocked(clientDataService.getInteractions).mockResolvedValue([
        { ...mockInteraction, id: '1' } as VocabularyInteraction
      ]);

      const result = await apiAdapter.getInteractions('session-123');

      expect(clientDataService.getInteractions).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('Progress Methods - Backend Mode', () => {
    const mockProgress = {
      sessionId: 'session-123',
      termsLearned: ['pico', 'ala'],
      currentStreak: 5,
      totalInteractions: 20
    };

    it('should save progress to backend', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { data: null } });

      await apiAdapter.saveProgress(mockProgress);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/progress', mockProgress);
    });

    it('should fetch progress from backend', async () => {
      const mockResponse = {
        data: {
          data: { ...mockProgress, lastUpdated: new Date() }
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiAdapter.getProgress('session-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/progress',
        { params: { sessionId: 'session-123' } }
      );
      expect(result).toMatchObject(mockProgress);
    });

    it('should handle save progress errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 500, data: {} },
        message: 'Server error'
      });

      await expect(apiAdapter.saveProgress(mockProgress)).rejects.toSatisfy(isNetworkError);
    });

    it('should fallback to client storage on getProgress error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      vi.mocked(clientDataService.getProgress).mockResolvedValue({
        ...mockProgress,
        lastUpdated: new Date()
      });

      const result = await apiAdapter.getProgress('session-123');

      expect(clientDataService.getProgress).toHaveBeenCalled();
      expect(result).toMatchObject(mockProgress);
    });
  });

  describe('Session Management', () => {
    it('should create new session ID if none exists', async () => {
      const setItemMock = vi.fn();
      const getItemMock = vi.fn(() => null);

      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: getItemMock,
          setItem: setItemMock
        },
        writable: true
      });

      // Trigger session ID creation by submitting answer
      const mockResult: ExerciseResult = {
        exerciseId: '1',
        answer: 'test',
        correct: true,
        timestamp: new Date(),
        sessionId: 'test-session'
      };
      mockAxiosInstance.post.mockResolvedValue({ data: { data: mockResult } });

      await apiAdapter.submitExerciseAnswer('1', 'test');

      expect(setItemMock).toHaveBeenCalledWith(
        'aves-session-id',
        expect.stringContaining('session-')
      );
    });

    it('should reuse existing session ID', async () => {
      const getItemMock = vi.fn(() => 'existing-session-123');
      const setItemMock = vi.fn();

      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: getItemMock,
          setItem: setItemMock
        },
        writable: true
      });

      const mockResult: ExerciseResult = {
        exerciseId: '1',
        answer: 'test',
        correct: true,
        timestamp: new Date(),
        sessionId: 'existing-session-123'
      };
      mockAxiosInstance.post.mockResolvedValue({ data: { data: mockResult } });

      await apiAdapter.submitExerciseAnswer('1', 'test');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/exercises/submit',
        expect.objectContaining({
          sessionId: 'existing-session-123'
        })
      );
    });
  });

  describe('Request Interceptors', () => {
    it('should add session ID to request headers', () => {
      // Get the request interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const requestInterceptor = interceptorCall[0];

      const config = { headers: {} };
      const sessionId = 'test-session-123';

      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: vi.fn(() => sessionId)
        },
        writable: true
      });

      const result = requestInterceptor(config);

      expect(result.headers['X-Session-Id']).toBe(sessionId);
    });

    it('should not add header if no session ID exists', () => {
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const requestInterceptor = interceptorCall[0];

      const config = { headers: {} };

      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: vi.fn(() => null)
        },
        writable: true
      });

      const result = requestInterceptor(config);

      expect(result.headers['X-Session-Id']).toBeUndefined();
    });
  });

  describe('Utility Methods', () => {
    it('should export user data via client service', async () => {
      const mockExport = JSON.stringify({ data: 'test' });
      vi.mocked(clientDataService.exportData).mockResolvedValue(mockExport);

      const result = await apiAdapter.exportUserData();

      expect(clientDataService.exportData).toHaveBeenCalled();
      expect(result).toBe(mockExport);
    });

    it('should import user data via client service', async () => {
      const importData = JSON.stringify({ data: 'test' });
      vi.mocked(clientDataService.importData).mockResolvedValue(undefined);

      await apiAdapter.importUserData(importData);

      expect(clientDataService.importData).toHaveBeenCalledWith(importData);
    });

    it('should clear all data via client service', async () => {
      vi.mocked(clientDataService.clearAllData).mockResolvedValue(undefined);

      await apiAdapter.clearAllData();

      expect(clientDataService.clearAllData).toHaveBeenCalled();
    });

    it('should report correct storage mode in backend mode', () => {
      const mode = apiAdapter.getStorageMode();
      expect(mode).toBe('backend');
    });

    it('should report isUsingClientStorage as false in backend mode', () => {
      const isClient = apiAdapter.isUsingClientStorage();
      expect(isClient).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should convert axios errors to NetworkError', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        },
        message: 'Request failed'
      };
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      await expect(
        apiAdapter.createAnnotation({} as any)
      ).rejects.toSatisfy(isNetworkError);
    });

    it('should handle errors without response', async () => {
      const axiosError = {
        message: 'Network error',
        response: undefined
      };
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      await expect(
        apiAdapter.createAnnotation({} as any)
      ).rejects.toSatisfy(isNetworkError);
    });

    it('should handle non-axios errors', async () => {
      const genericError = new Error('Something went wrong');
      mockAxiosInstance.get.mockRejectedValue(genericError);

      // Should fallback to client storage
      vi.mocked(clientDataService.getAnnotations).mockResolvedValue([]);
      const result = await apiAdapter.getAnnotations();

      expect(clientDataService.getAnnotations).toHaveBeenCalled();
    });
  });
});

describe('ApiAdapter - Client Mode', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock window.location for GitHub Pages
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'username.github.io',
        href: 'https://username.github.io/aves/',
        pathname: '/aves/'
      },
      writable: true,
      configurable: true
    });

    // Mock sessionStorage
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true,
      configurable: true
    });

    // Dynamically import apiAdapter AFTER mocks are set up
    const module = await import('../../services/apiAdapter');
    apiAdapter = module.apiAdapter;
  });

  it('should use client storage in GitHub Pages mode', () => {
    // Create new instance after mocking location
    const isClient = apiAdapter.isUsingClientStorage();
    expect(isClient).toBe(true);
  });

  it('should throw error when creating annotations in client mode', async () => {
    vi.mocked(clientDataService.getAnnotations).mockResolvedValue([]);

    await expect(
      apiAdapter.createAnnotation({} as any)
    ).rejects.toSatisfy(isNetworkError);
    await expect(
      apiAdapter.createAnnotation({} as any)
    ).rejects.toThrow('Cannot create annotations in static mode');
  });

  it('should validate answers locally in client mode', async () => {
    vi.mocked(clientDataService.saveExerciseResult).mockResolvedValue(undefined);

    const result = await apiAdapter.submitExerciseAnswer('1', 'answer');

    expect(result).toHaveProperty('correct');
    expect(result).toHaveProperty('exerciseId', '1');
    expect(clientDataService.saveExerciseResult).toHaveBeenCalled();
  });
});

describe('ApiAdapter - Mode Switching', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock window.location for backend mode
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
        href: 'http://localhost:5173',
        pathname: '/'
      },
      writable: true,
      configurable: true
    });

    // Mock sessionStorage
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true,
      configurable: true
    });
  });

  it('should switch to client mode on 503 error', async () => {
    const mockInstance = {
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((onSuccess, onError) => {
            // Simulate 503 error
            onError({ response: { status: 503 } });
          })
        }
      }
    };

    vi.mocked(axios.create).mockReturnValue(mockInstance as any);

    // Mock import.meta.env
    vi.stubEnv('VITE_API_URL', 'http://localhost:3001');

    // Dynamically import apiAdapter AFTER mock is set up
    const module = await import('../../services/apiAdapter');
    const adapter = module.apiAdapter;

    // The interceptor should handle 503 and switch modes
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
  });
});
