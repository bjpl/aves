// CONCEPT: Comprehensive tests for clientDataService IndexedDB storage
// WHY: Critical for offline functionality and GitHub Pages deployment
// PATTERN: Test IndexedDB operations, static data loading, and data migration

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clientDataService } from '../../services/clientDataService';
import type { Annotation, Species, Exercise } from '../../types';
import { StorageError } from '../../types/error.types';

// Mock logger
vi.mock('../../utils/logger');

// Mock fetch for static data loading
global.fetch = vi.fn();

// Mock IndexedDB
class IDBDatabaseMock {
  objectStoreNames = {
    contains: vi.fn(() => false)
  };
  transaction = vi.fn();
  createObjectStore = vi.fn((name: string, options?: any) => ({
    createIndex: vi.fn()
  }));
}

class IDBRequestMock {
  result: any = null;
  error: any = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(result?: any, error?: any) {
    this.result = result;
    this.error = error;
    setTimeout(() => {
      if (error && this.onerror) {
        this.onerror({ target: this });
      } else if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }, 0);
  }
}

class IDBTransactionMock {
  objectStore = vi.fn(() => ({
    get: vi.fn((key: any) => new IDBRequestMock(null)),
    put: vi.fn(() => new IDBRequestMock(true)),
    add: vi.fn(() => new IDBRequestMock(true)),
    getAll: vi.fn(() => new IDBRequestMock([])),
    clear: vi.fn(() => new IDBRequestMock(true))
  }));
}

const mockIndexedDB = {
  open: vi.fn((name: string, version: number) => {
    const request = new IDBRequestMock(new IDBDatabaseMock());
    (request as any).onupgradeneeded = null;
    setTimeout(() => {
      if ((request as any).onupgradeneeded) {
        (request as any).onupgradeneeded({
          target: { result: new IDBDatabaseMock() }
        });
      }
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn()
};

describe('ClientDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.indexedDB = mockIndexedDB as any;

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    global.localStorage = localStorageMock as any;

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(() => 'test-session'),
      setItem: vi.fn(),
      clear: vi.fn()
    };
    global.sessionStorage = sessionStorageMock as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB with correct database name and version', async () => {
      await clientDataService.initialize();

      expect(mockIndexedDB.open).toHaveBeenCalledWith('aves-learning-db', 1);
    });

    it('should load static data from JSON files', async () => {
      const mockAnnotations: Annotation[] = [{
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
      }];

      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve(mockAnnotations)
      } as any);

      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve([])
      } as any);

      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve([])
      } as any);

      await clientDataService.initialize();

      expect(fetch).toHaveBeenCalledWith('/aves/data/annotations.json');
      expect(fetch).toHaveBeenCalledWith('/aves/data/species.json');
      expect(fetch).toHaveBeenCalledWith('/aves/data/exercises.json');
    });

    it('should use embedded data if static files fail to load', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));

      await clientDataService.initialize();

      // Should fall back to embedded data
      const annotations = await clientDataService.getAnnotations();
      expect(annotations).toBeDefined();
      expect(Array.isArray(annotations)).toBe(true);
    });

    it('should create object stores on first initialization', async () => {
      const mockDB = new IDBDatabaseMock();

      const request = mockIndexedDB.open('aves-learning-db', 1) as any;
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: mockDB } });
      }

      await clientDataService.initialize();

      expect(mockDB.createObjectStore).toHaveBeenCalledWith(
        'interactions',
        expect.objectContaining({ keyPath: 'id', autoIncrement: true })
      );
    });

    it('should migrate localStorage data on initialization', async () => {
      const existingProgress = {
        sessionId: 'old-session',
        termsLearned: ['pico', 'ala'],
        currentStreak: 5
      };

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(existingProgress));

      await clientDataService.initialize();

      expect(localStorage.getItem).toHaveBeenCalledWith('aves-progress');
      expect(localStorage.removeItem).toHaveBeenCalledWith('aves-progress');
    });
  });

  describe('Annotation Methods', () => {
    const mockAnnotations: Annotation[] = [
      {
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
      },
      {
        id: '2',
        imageId: 'img2',
        spanishTerm: 'ala',
        englishTerm: 'wing',
        type: 'anatomical',
        boundingBox: {
          topLeft: { x: 150, y: 150 },
          bottomRight: { x: 250, y: 250 },
          width: 100,
          height: 100
        },
        difficultyLevel: 2,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      // Setup static data
      (clientDataService as any).staticData.annotations = mockAnnotations;
    });

    it('should return all annotations', async () => {
      const result = await clientDataService.getAnnotations();

      expect(result).toEqual(mockAnnotations);
      expect(result).toHaveLength(2);
    });

    it('should filter annotations by imageId', async () => {
      const result = await clientDataService.getAnnotations('img1');

      expect(result).toHaveLength(1);
      expect(result[0].imageId).toBe('img1');
    });

    it('should return empty array if no annotations match imageId', async () => {
      const result = await clientDataService.getAnnotations('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('Species Methods', () => {
    const mockSpecies: Species[] = [
      {
        id: '1',
        scientificName: 'Cardinalis cardinalis',
        englishName: 'Northern Cardinal',
        spanishName: 'Cardenal Rojo',
        orderName: 'Passeriformes',
        familyName: 'Cardinalidae',
        genus: 'Cardinalis',
        habitats: ['forest', 'urban'],
        sizeCategory: 'medium',
        primaryColors: ['red'],
        conservationStatus: 'LC',
        primaryImageUrl: 'http://example.com/cardinal.jpg',
        annotationCount: 5
      },
      {
        id: '2',
        scientificName: 'Cyanocitta cristata',
        englishName: 'Blue Jay',
        spanishName: 'Arrendajo Azul',
        orderName: 'Passeriformes',
        familyName: 'Corvidae',
        genus: 'Cyanocitta',
        habitats: ['forest'],
        sizeCategory: 'medium',
        primaryColors: ['blue'],
        conservationStatus: 'LC',
        primaryImageUrl: 'http://example.com/bluejay.jpg',
        annotationCount: 3
      }
    ];

    beforeEach(() => {
      (clientDataService as any).staticData.species = mockSpecies;
    });

    it('should return all species without filters', async () => {
      const result = await clientDataService.getSpecies();

      expect(result).toEqual(mockSpecies);
      expect(result).toHaveLength(2);
    });

    it('should filter species by habitat', async () => {
      const result = await clientDataService.getSpecies({ habitat: 'urban' });

      expect(result).toHaveLength(1);
      expect(result[0].spanishName).toBe('Cardenal Rojo');
    });

    it('should filter species by sizeCategory', async () => {
      const result = await clientDataService.getSpecies({ sizeCategory: 'medium' });

      expect(result).toHaveLength(2);
    });

    it('should filter species by primaryColor', async () => {
      const result = await clientDataService.getSpecies({ primaryColor: 'blue' });

      expect(result).toHaveLength(1);
      expect(result[0].spanishName).toBe('Arrendajo Azul');
    });

    it('should filter species by searchTerm (Spanish name)', async () => {
      const result = await clientDataService.getSpecies({ searchTerm: 'cardenal' });

      expect(result).toHaveLength(1);
      expect(result[0].spanishName).toBe('Cardenal Rojo');
    });

    it('should filter species by searchTerm (English name)', async () => {
      const result = await clientDataService.getSpecies({ searchTerm: 'blue jay' });

      expect(result).toHaveLength(1);
      expect(result[0].englishName).toBe('Blue Jay');
    });

    it('should filter species by searchTerm (scientific name)', async () => {
      const result = await clientDataService.getSpecies({ searchTerm: 'cardinalis' });

      expect(result).toHaveLength(1);
    });

    it('should filter species by orderName', async () => {
      const result = await clientDataService.getSpecies({ orderName: 'Passeriformes' });

      expect(result).toHaveLength(2);
    });

    it('should filter species by familyName', async () => {
      const result = await clientDataService.getSpecies({ familyName: 'Corvidae' });

      expect(result).toHaveLength(1);
      expect(result[0].familyName).toBe('Corvidae');
    });

    it('should apply multiple filters simultaneously', async () => {
      const result = await clientDataService.getSpecies({
        habitat: 'forest',
        familyName: 'Corvidae'
      });

      expect(result).toHaveLength(1);
      expect(result[0].spanishName).toBe('Arrendajo Azul');
    });

    it('should return empty array if no species match filters', async () => {
      const result = await clientDataService.getSpecies({
        habitat: 'nonexistent'
      });

      expect(result).toEqual([]);
    });
  });

  describe('Exercise Methods', () => {
    const mockExercises: Exercise[] = [
      {
        id: '1',
        type: 'visual_discrimination',
        instructions: 'Select the correct part',
        difficultyLevel: 2,
        targetTerm: 'pico',
        imageId: 'img1'
      },
      {
        id: '2',
        type: 'term_matching',
        instructions: 'Match the terms',
        difficultyLevel: 3,
        imageId: 'img1'
      }
    ];

    beforeEach(() => {
      (clientDataService as any).staticData.exercises = mockExercises;
    });

    it('should return all exercises', async () => {
      const result = await clientDataService.getExercises();

      expect(result).toEqual(mockExercises);
      expect(result).toHaveLength(2);
    });

    it('should filter exercises by type', async () => {
      const result = await clientDataService.getExercises('visual_discrimination');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('visual_discrimination');
    });

    it('should return empty array for non-matching type', async () => {
      const result = await clientDataService.getExercises('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('Interaction Methods', () => {
    let mockDB: IDBDatabaseMock;
    let mockTransaction: IDBTransactionMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      mockTransaction = new IDBTransactionMock();
      mockDB.transaction = vi.fn(() => mockTransaction);
      (clientDataService as any).db = mockDB;
    });

    it('should save interaction to IndexedDB', async () => {
      const interaction = {
        annotationId: '1',
        action: 'view' as const,
        timestamp: new Date()
      };

      const mockStore = {
        add: vi.fn(() => new IDBRequestMock(true))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      await clientDataService.saveInteraction(interaction);

      expect(mockDB.transaction).toHaveBeenCalledWith(['interactions'], 'readwrite');
      expect(mockStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          annotationId: '1',
          action: 'view'
        })
      );
    });

    it('should throw StorageError if database not initialized', async () => {
      (clientDataService as any).db = null;

      const interaction = {
        annotationId: '1',
        action: 'view' as const,
        timestamp: new Date()
      };

      await expect(
        clientDataService.saveInteraction(interaction)
      ).rejects.toThrow(StorageError);
    });

    it('should retrieve interactions by session ID', async () => {
      const mockInteractions = [
        {
          id: 1,
          annotationId: '1',
          action: 'view',
          userSessionId: 'session-123',
          timestamp: new Date()
        },
        {
          id: 2,
          annotationId: '2',
          action: 'pronounce',
          userSessionId: 'session-123',
          timestamp: new Date()
        }
      ];

      const mockStore = {
        getAll: vi.fn(() => new IDBRequestMock(mockInteractions))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      const result = await clientDataService.getInteractions('session-123');

      expect(result).toHaveLength(2);
      expect(mockDB.transaction).toHaveBeenCalledWith(['interactions'], 'readonly');
    });

    it('should filter interactions by session ID', async () => {
      const mockInteractions = [
        {
          id: 1,
          annotationId: '1',
          action: 'view',
          userSessionId: 'session-123',
          timestamp: new Date()
        },
        {
          id: 2,
          annotationId: '2',
          action: 'view',
          userSessionId: 'session-456',
          timestamp: new Date()
        }
      ];

      const mockStore = {
        getAll: vi.fn(() => new IDBRequestMock(mockInteractions))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      const result = await clientDataService.getInteractions('session-123');

      expect(result).toHaveLength(1);
      expect(result[0].userSessionId).toBe('session-123');
    });
  });

  describe('Progress Methods', () => {
    let mockDB: IDBDatabaseMock;
    let mockTransaction: IDBTransactionMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      mockTransaction = new IDBTransactionMock();
      mockDB.transaction = vi.fn(() => mockTransaction);
      (clientDataService as any).db = mockDB;
    });

    it('should save progress to IndexedDB', async () => {
      const progress = {
        sessionId: 'session-123',
        termsLearned: ['pico', 'ala'],
        currentStreak: 5,
        totalInteractions: 20
      };

      const mockStore = {
        put: vi.fn(() => new IDBRequestMock(true))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      await clientDataService.saveProgress(progress);

      expect(mockDB.transaction).toHaveBeenCalledWith(['progress'], 'readwrite');
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          termsLearned: ['pico', 'ala']
        })
      );
    });

    it('should fallback to localStorage if IndexedDB unavailable', async () => {
      (clientDataService as any).db = null;

      const progress = {
        sessionId: 'session-123',
        termsLearned: ['pico'],
        currentStreak: 1
      };

      await clientDataService.saveProgress(progress);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'aves-progress-backup',
        expect.any(String)
      );
    });

    it('should retrieve progress from IndexedDB', async () => {
      const mockProgress = {
        sessionId: 'session-123',
        termsLearned: ['pico', 'ala'],
        currentStreak: 5,
        lastUpdated: new Date()
      };

      const mockStore = {
        get: vi.fn(() => new IDBRequestMock(mockProgress))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      const result = await clientDataService.getProgress('session-123');

      expect(mockDB.transaction).toHaveBeenCalledWith(['progress'], 'readonly');
      expect(result).toEqual(mockProgress);
    });

    it('should return null if progress not found', async () => {
      const mockStore = {
        get: vi.fn(() => new IDBRequestMock(null))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      const result = await clientDataService.getProgress('nonexistent');

      expect(result).toBeNull();
    });

    it('should fallback to localStorage for getProgress if db unavailable', async () => {
      (clientDataService as any).db = null;

      const mockProgress = {
        sessionId: 'session-123',
        termsLearned: ['pico']
      };

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockProgress));

      const result = await clientDataService.getProgress('session-123');

      expect(localStorage.getItem).toHaveBeenCalledWith('aves-progress-backup');
      expect(result).toEqual(mockProgress);
    });
  });

  describe('Exercise Results Methods', () => {
    let mockDB: IDBDatabaseMock;
    let mockTransaction: IDBTransactionMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      mockTransaction = new IDBTransactionMock();
      mockDB.transaction = vi.fn(() => mockTransaction);
      (clientDataService as any).db = mockDB;
    });

    it('should save exercise result to IndexedDB', async () => {
      const result = {
        exerciseId: '1',
        answer: 'option1',
        correct: true,
        sessionId: 'session-123'
      };

      const mockStore = {
        add: vi.fn(() => new IDBRequestMock(true))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      await clientDataService.saveExerciseResult(result);

      expect(mockDB.transaction).toHaveBeenCalledWith(['exerciseResults'], 'readwrite');
      expect(mockStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseId: '1',
          correct: true
        })
      );
    });

    it('should retrieve exercise results by session ID', async () => {
      const mockResults = [
        {
          id: 1,
          exerciseId: '1',
          answer: 'option1',
          correct: true,
          sessionId: 'session-123',
          completedAt: new Date()
        }
      ];

      const mockStore = {
        getAll: vi.fn(() => new IDBRequestMock(mockResults))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      const results = await clientDataService.getExerciseResults('session-123');

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-123');
    });
  });

  describe('Data Import/Export', () => {
    let mockDB: IDBDatabaseMock;
    let mockTransaction: IDBTransactionMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      mockTransaction = new IDBTransactionMock();
      mockDB.transaction = vi.fn(() => mockTransaction);
      (clientDataService as any).db = mockDB;
    });

    it('should export all user data as JSON', async () => {
      const mockInteractions = [{ id: 1, annotationId: '1', action: 'view' }];
      const mockProgress = { sessionId: 'session-123', termsLearned: ['pico'] };
      const mockResults = [{ id: 1, exerciseId: '1', correct: true }];

      const mockStore = {
        getAll: vi.fn()
          .mockReturnValueOnce(new IDBRequestMock(mockInteractions))
          .mockReturnValueOnce(new IDBRequestMock(mockResults)),
        get: vi.fn(() => new IDBRequestMock(mockProgress))
      };

      mockTransaction.objectStore = vi.fn(() => mockStore);

      const exported = await clientDataService.exportData();

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('interactions');
      expect(parsed).toHaveProperty('progress');
      expect(parsed).toHaveProperty('exerciseResults');
      expect(parsed).toHaveProperty('exportedAt');
    });

    it('should import user data from JSON', async () => {
      const importData = {
        interactions: [{ annotationId: '1', action: 'view', timestamp: new Date() }],
        progress: { sessionId: 'session-123', termsLearned: ['pico'] },
        exerciseResults: [{ exerciseId: '1', answer: 'test', correct: true, sessionId: 'session-123' }]
      };

      const mockStore = {
        add: vi.fn(() => new IDBRequestMock(true)),
        put: vi.fn(() => new IDBRequestMock(true))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      await clientDataService.importData(JSON.stringify(importData));

      expect(mockStore.add).toHaveBeenCalled();
      expect(mockStore.put).toHaveBeenCalled();
    });

    it('should throw StorageError on invalid import data', async () => {
      await expect(
        clientDataService.importData('invalid json')
      ).rejects.toThrow(StorageError);
    });

    it('should handle partial import data', async () => {
      const partialData = {
        progress: { sessionId: 'session-123', termsLearned: [] }
      };

      const mockStore = {
        put: vi.fn(() => new IDBRequestMock(true))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      await clientDataService.importData(JSON.stringify(partialData));

      expect(mockStore.put).toHaveBeenCalled();
    });
  });

  describe('Clear All Data', () => {
    let mockDB: IDBDatabaseMock;
    let mockTransaction: IDBTransactionMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      mockTransaction = new IDBTransactionMock();
      mockDB.transaction = vi.fn(() => mockTransaction);
      (clientDataService as any).db = mockDB;
    });

    it('should clear all IndexedDB stores', async () => {
      const mockStore = {
        clear: vi.fn(() => new IDBRequestMock(true))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      await clientDataService.clearAllData();

      expect(mockDB.transaction).toHaveBeenCalledWith(
        ['interactions', 'progress', 'exerciseResults'],
        'readwrite'
      );
      expect(mockStore.clear).toHaveBeenCalledTimes(3);
    });

    it('should clear localStorage and sessionStorage', async () => {
      const mockStore = {
        clear: vi.fn(() => new IDBRequestMock(true))
      };
      mockTransaction.objectStore = vi.fn(() => mockStore);

      await clientDataService.clearAllData();

      expect(localStorage.clear).toHaveBeenCalled();
      expect(sessionStorage.clear).toHaveBeenCalled();
    });
  });
});
