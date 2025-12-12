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
class IDBRequestMock {
  result: any = null;
  error: any = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(result?: any, error?: any) {
    this.result = result;
    this.error = error;
    // Use queueMicrotask for more reliable async behavior in tests
    queueMicrotask(() => {
      if (error && this.onerror) {
        this.onerror({ target: this });
      } else if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    });
  }
}

class IDBObjectStoreMock {
  get = vi.fn((key: any) => new IDBRequestMock(null));
  put = vi.fn((data: any) => new IDBRequestMock(true));
  add = vi.fn((data: any) => new IDBRequestMock(true));
  getAll = vi.fn(() => new IDBRequestMock([]));
  clear = vi.fn(() => new IDBRequestMock(true));
  createIndex = vi.fn();
}

class IDBTransactionMock {
  private stores: Map<string, IDBObjectStoreMock> = new Map();

  objectStore = vi.fn((name: string) => {
    if (!this.stores.has(name)) {
      this.stores.set(name, new IDBObjectStoreMock());
    }
    return this.stores.get(name)!;
  });

  getStore(name: string): IDBObjectStoreMock {
    return this.stores.get(name) || new IDBObjectStoreMock();
  }
}

class IDBDatabaseMock {
  objectStoreNames = {
    contains: vi.fn(() => false)
  };

  private transactions: Map<string, IDBTransactionMock> = new Map();

  transaction = vi.fn((storeNames: string | string[], mode?: string) => {
    const key = Array.isArray(storeNames) ? storeNames.join(',') : storeNames;
    if (!this.transactions.has(key)) {
      this.transactions.set(key, new IDBTransactionMock());
    }
    return this.transactions.get(key)!;
  });

  createObjectStore = vi.fn((name: string, options?: any) => {
    return new IDBObjectStoreMock();
  });

  getTransaction(storeNames: string | string[]): IDBTransactionMock | undefined {
    const key = Array.isArray(storeNames) ? storeNames.join(',') : storeNames;
    return this.transactions.get(key);
  }
}

const mockIndexedDB = {
  open: vi.fn((name: string, version: number) => {
    const db = new IDBDatabaseMock();
    const request = new IDBRequestMock(db);
    (request as any).onupgradeneeded = null;

    queueMicrotask(() => {
      if ((request as any).onupgradeneeded) {
        (request as any).onupgradeneeded({
          target: { result: db }
        });
      }
    });

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
      // Create a fresh mock that will capture the upgrade event
      let capturedDB: IDBDatabaseMock | null = null;
      const openRequest = new IDBRequestMock();

      // Override the open mock for this test
      vi.mocked(mockIndexedDB.open).mockImplementationOnce(() => {
        capturedDB = new IDBDatabaseMock();
        openRequest.result = capturedDB;

        queueMicrotask(() => {
          if ((openRequest as any).onupgradeneeded) {
            (openRequest as any).onupgradeneeded({
              target: { result: capturedDB }
            });
          }
          if (openRequest.onsuccess) {
            openRequest.onsuccess({ target: openRequest });
          }
        });

        return openRequest;
      });

      await clientDataService.initialize();

      expect(capturedDB).toBeDefined();
      expect(capturedDB!.createObjectStore).toHaveBeenCalledWith(
        'interactions',
        expect.objectContaining({ keyPath: 'id', autoIncrement: true })
      );
      expect(capturedDB!.createObjectStore).toHaveBeenCalledWith(
        'progress',
        expect.objectContaining({ keyPath: 'sessionId' })
      );
      expect(capturedDB!.createObjectStore).toHaveBeenCalledWith(
        'exerciseResults',
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

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      (clientDataService as any).db = mockDB;
    });

    it('should save interaction to IndexedDB', async () => {
      const interaction = {
        annotationId: '1',
        action: 'view' as const,
        timestamp: new Date()
      };

      await clientDataService.saveInteraction(interaction);

      // Verify transaction was created with correct parameters
      expect(mockDB.transaction).toHaveBeenCalledWith(['interactions'], 'readwrite');

      // Get the transaction that was created
      const transaction = mockDB.getTransaction(['interactions']);
      expect(transaction).toBeDefined();

      // Verify objectStore was called
      expect(transaction!.objectStore).toHaveBeenCalledWith('interactions');

      // Get the store and verify add was called with correct data
      const store = transaction!.getStore('interactions');
      expect(store.add).toHaveBeenCalledWith(
        expect.objectContaining({
          annotationId: '1',
          action: 'view',
          userSessionId: expect.any(String),
          timestamp: expect.any(Date)
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

      // Set up the mock to return interactions
      const transaction = mockDB.transaction(['interactions'], 'readonly');
      const store = transaction.objectStore('interactions');
      store.getAll = vi.fn(() => new IDBRequestMock(mockInteractions));

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

      // Set up the mock to return interactions
      const transaction = mockDB.transaction(['interactions'], 'readonly');
      const store = transaction.objectStore('interactions');
      store.getAll = vi.fn(() => new IDBRequestMock(mockInteractions));

      const result = await clientDataService.getInteractions('session-123');

      expect(result).toHaveLength(1);
      expect(result[0].userSessionId).toBe('session-123');
    });
  });

  describe('Progress Methods', () => {
    let mockDB: IDBDatabaseMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      (clientDataService as any).db = mockDB;
    });

    it('should save progress to IndexedDB', async () => {
      const progress = {
        sessionId: 'session-123',
        termsLearned: ['pico', 'ala'],
        currentStreak: 5,
        totalInteractions: 20
      };

      await clientDataService.saveProgress(progress);

      expect(mockDB.transaction).toHaveBeenCalledWith(['progress'], 'readwrite');

      const transaction = mockDB.getTransaction(['progress']);
      const store = transaction!.getStore('progress');

      expect(store.put).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          termsLearned: ['pico', 'ala'],
          lastUpdated: expect.any(Date)
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

      const transaction = mockDB.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      store.get = vi.fn(() => new IDBRequestMock(mockProgress));

      const result = await clientDataService.getProgress('session-123');

      expect(mockDB.transaction).toHaveBeenCalledWith(['progress'], 'readonly');
      expect(result).toEqual(mockProgress);
    });

    it('should return null if progress not found', async () => {
      const transaction = mockDB.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      store.get = vi.fn(() => new IDBRequestMock(null));

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

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      (clientDataService as any).db = mockDB;
    });

    it('should save exercise result to IndexedDB', async () => {
      const result = {
        exerciseId: '1',
        answer: 'option1',
        correct: true,
        sessionId: 'session-123'
      };

      await clientDataService.saveExerciseResult(result);

      expect(mockDB.transaction).toHaveBeenCalledWith(['exerciseResults'], 'readwrite');

      const transaction = mockDB.getTransaction(['exerciseResults']);
      const store = transaction!.getStore('exerciseResults');

      expect(store.add).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseId: '1',
          correct: true,
          completedAt: expect.any(Date)
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

      const transaction = mockDB.transaction(['exerciseResults'], 'readonly');
      const store = transaction.objectStore('exerciseResults');
      store.getAll = vi.fn(() => new IDBRequestMock(mockResults));

      const results = await clientDataService.getExerciseResults('session-123');

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-123');
    });
  });

  describe('Data Import/Export', () => {
    let mockDB: IDBDatabaseMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      (clientDataService as any).db = mockDB;

      // Mock sessionStorage for current session ID
      vi.mocked(sessionStorage.getItem).mockReturnValue('test-session');
    });

    it('should export all user data as JSON', async () => {
      const mockInteractions = [{ id: 1, annotationId: '1', action: 'view', userSessionId: 'test-session' }];
      const mockProgress = { sessionId: 'test-session', termsLearned: ['pico'] };
      const mockResults = [{ id: 1, exerciseId: '1', correct: true, sessionId: 'test-session' }];

      // Set up interactions
      const interactionsTransaction = mockDB.transaction(['interactions'], 'readonly');
      const interactionsStore = interactionsTransaction.objectStore('interactions');
      interactionsStore.getAll = vi.fn(() => new IDBRequestMock(mockInteractions));

      // Set up progress
      const progressTransaction = mockDB.transaction(['progress'], 'readonly');
      const progressStore = progressTransaction.objectStore('progress');
      progressStore.get = vi.fn(() => new IDBRequestMock(mockProgress));

      // Set up exercise results
      const resultsTransaction = mockDB.transaction(['exerciseResults'], 'readonly');
      const resultsStore = resultsTransaction.objectStore('exerciseResults');
      resultsStore.getAll = vi.fn(() => new IDBRequestMock(mockResults));

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

      await clientDataService.importData(JSON.stringify(importData));

      // Verify interactions were added
      const interactionsTransaction = mockDB.getTransaction(['interactions']);
      const interactionsStore = interactionsTransaction!.getStore('interactions');
      expect(interactionsStore.add).toHaveBeenCalled();

      // Verify progress was saved
      const progressTransaction = mockDB.getTransaction(['progress']);
      const progressStore = progressTransaction!.getStore('progress');
      expect(progressStore.put).toHaveBeenCalled();

      // Verify exercise results were added
      const resultsTransaction = mockDB.getTransaction(['exerciseResults']);
      const resultsStore = resultsTransaction!.getStore('exerciseResults');
      expect(resultsStore.add).toHaveBeenCalled();
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

      await clientDataService.importData(JSON.stringify(partialData));

      const progressTransaction = mockDB.getTransaction(['progress']);
      const progressStore = progressTransaction!.getStore('progress');
      expect(progressStore.put).toHaveBeenCalled();
    });
  });

  describe('Clear All Data', () => {
    let mockDB: IDBDatabaseMock;

    beforeEach(() => {
      mockDB = new IDBDatabaseMock();
      (clientDataService as any).db = mockDB;
    });

    it('should clear all IndexedDB stores', async () => {
      await clientDataService.clearAllData();

      expect(mockDB.transaction).toHaveBeenCalledWith(
        ['interactions', 'progress', 'exerciseResults'],
        'readwrite'
      );

      const transaction = mockDB.getTransaction(['interactions', 'progress', 'exerciseResults']);
      expect(transaction).toBeDefined();

      const interactionsStore = transaction!.getStore('interactions');
      const progressStore = transaction!.getStore('progress');
      const resultsStore = transaction!.getStore('exerciseResults');

      expect(interactionsStore.clear).toHaveBeenCalled();
      expect(progressStore.clear).toHaveBeenCalled();
      expect(resultsStore.clear).toHaveBeenCalled();
    });

    it('should clear localStorage and sessionStorage', async () => {
      await clientDataService.clearAllData();

      expect(localStorage.clear).toHaveBeenCalled();
      expect(sessionStorage.clear).toHaveBeenCalled();
    });
  });
});
