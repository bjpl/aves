// CONCEPT: Client-side data persistence using IndexedDB and LocalStorage
// WHY: GitHub Pages only serves static files, no backend database
// PATTERN: Repository pattern with IndexedDB for complex data, LocalStorage for settings

import { Annotation, Species, Exercise, VocabularyInteraction } from '../types';

// Database structure interface for reference
// interface ClientDatabase {
//   annotations: Annotation[];
//   species: Species[];
//   exercises: Exercise[];
//   interactions: VocabularyInteraction[];
//   progress: Map<string, any>;
// }

class ClientDataService {
  private dbName = 'aves-learning-db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Static data that ships with the app
  private staticData = {
    annotations: [] as Annotation[],
    species: [] as Species[],
    exercises: [] as Exercise[],
  };

  async initialize(): Promise<void> {
    // Load static data from JSON files
    await this.loadStaticData();

    // Initialize IndexedDB for user progress
    await this.initIndexedDB();

    // Migrate any existing localStorage data
    this.migrateLocalStorage();
  }

  private async loadStaticData(): Promise<void> {
    try {
      // Load pre-configured annotation data
      const annotationsResponse = await fetch('/data/annotations.json');
      this.staticData.annotations = await annotationsResponse.json();

      // Load species taxonomy data
      const speciesResponse = await fetch('/data/species.json');
      this.staticData.species = await speciesResponse.json();

      // Load exercise templates
      const exercisesResponse = await fetch('/data/exercises.json');
      this.staticData.exercises = await exercisesResponse.json();
    } catch (error) {
      console.error('Failed to load static data:', error);
      // Fall back to embedded sample data
      this.loadEmbeddedData();
    }
  }

  private loadEmbeddedData(): void {
    // Embedded sample data for offline functionality
    this.staticData.annotations = [
      {
        id: '1',
        imageId: 'cardinal-1',
        boundingBox: {
          topLeft: { x: 150, y: 100 },
          bottomRight: { x: 250, y: 150 },
          width: 100,
          height: 50
        },
        type: 'anatomical',
        spanishTerm: 'pico',
        englishTerm: 'beak',
        pronunciation: 'PEE-koh',
        difficultyLevel: 1,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        imageId: 'cardinal-1',
        boundingBox: {
          topLeft: { x: 200, y: 150 },
          bottomRight: { x: 280, y: 200 },
          width: 80,
          height: 50
        },
        type: 'color',
        spanishTerm: 'plumas rojas',
        englishTerm: 'red feathers',
        pronunciation: 'PLOO-mahs ROH-hahs',
        difficultyLevel: 2,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.staticData.species = [
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
        primaryColors: ['red', 'black'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1551031895-7f8e06d714f8?w=400',
        descriptionSpanish: 'Ave distintiva de color rojo brillante con cresta prominente.',
        descriptionEnglish: 'Distinctive bright red bird with prominent crest.',
        funFact: 'Cardinals are one of the few bird species where both males and females sing.',
        annotationCount: 2
      }
    ];
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for user data
        if (!db.objectStoreNames.contains('interactions')) {
          const interactionStore = db.createObjectStore('interactions', {
            keyPath: 'id',
            autoIncrement: true
          });
          interactionStore.createIndex('annotationId', 'annotationId', { unique: false });
          interactionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', {
            keyPath: 'sessionId'
          });
          progressStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        if (!db.objectStoreNames.contains('exerciseResults')) {
          const resultsStore = db.createObjectStore('exerciseResults', {
            keyPath: 'id',
            autoIncrement: true
          });
          resultsStore.createIndex('exerciseId', 'exerciseId', { unique: false });
          resultsStore.createIndex('completedAt', 'completedAt', { unique: false });
        }
      };
    });
  }

  private migrateLocalStorage(): void {
    // Migrate any existing localStorage data to IndexedDB
    const existingProgress = localStorage.getItem('aves-progress');
    if (existingProgress) {
      try {
        const progress = JSON.parse(existingProgress);
        this.saveProgress(progress);
        localStorage.removeItem('aves-progress');
      } catch (error) {
        console.error('Failed to migrate localStorage:', error);
      }
    }
  }

  // Public API methods

  async getAnnotations(imageId?: string): Promise<Annotation[]> {
    if (imageId) {
      return this.staticData.annotations.filter(a => a.imageId === imageId);
    }
    return this.staticData.annotations;
  }

  async getSpecies(filters?: any): Promise<Species[]> {
    let results = [...this.staticData.species];

    if (filters) {
      if (filters.habitat) {
        results = results.filter(s => s.habitats.includes(filters.habitat));
      }
      if (filters.sizeCategory) {
        results = results.filter(s => s.sizeCategory === filters.sizeCategory);
      }
      if (filters.primaryColor) {
        results = results.filter(s => s.primaryColors.includes(filters.primaryColor));
      }
    }

    return results;
  }

  async getExercises(type?: string): Promise<Exercise[]> {
    if (type) {
      return this.staticData.exercises.filter(e => e.type === type);
    }
    return this.staticData.exercises;
  }

  async saveInteraction(interaction: Omit<VocabularyInteraction, 'id'>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['interactions'], 'readwrite');
    const store = transaction.objectStore('interactions');

    await new Promise((resolve, reject) => {
      const request = store.add({
        ...interaction,
        timestamp: new Date()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getInteractions(sessionId: string): Promise<VocabularyInteraction[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['interactions'], 'readonly');
    const store = transaction.objectStore('interactions');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const interactions = request.result.filter(i => i.userSessionId === sessionId);
        resolve(interactions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveProgress(progress: any): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage if IndexedDB fails
      localStorage.setItem('aves-progress-backup', JSON.stringify(progress));
      return;
    }

    const transaction = this.db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');

    await new Promise((resolve, reject) => {
      const request = store.put({
        ...progress,
        lastUpdated: new Date()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProgress(sessionId: string): Promise<any> {
    if (!this.db) {
      // Fallback to localStorage
      const backup = localStorage.getItem('aves-progress-backup');
      return backup ? JSON.parse(backup) : null;
    }

    const transaction = this.db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');

    return new Promise((resolve, reject) => {
      const request = store.get(sessionId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveExerciseResult(result: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['exerciseResults'], 'readwrite');
    const store = transaction.objectStore('exerciseResults');

    await new Promise((resolve, reject) => {
      const request = store.add({
        ...result,
        completedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getExerciseResults(sessionId: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['exerciseResults'], 'readonly');
    const store = transaction.objectStore('exerciseResults');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.filter(r => r.sessionId === sessionId);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods

  async exportData(): Promise<string> {
    const data = {
      interactions: await this.getInteractions(this.getCurrentSessionId()),
      progress: await this.getProgress(this.getCurrentSessionId()),
      exerciseResults: await this.getExerciseResults(this.getCurrentSessionId()),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString);

      // Import interactions
      if (data.interactions) {
        for (const interaction of data.interactions) {
          await this.saveInteraction(interaction);
        }
      }

      // Import progress
      if (data.progress) {
        await this.saveProgress(data.progress);
      }

      // Import exercise results
      if (data.exerciseResults) {
        for (const result of data.exerciseResults) {
          await this.saveExerciseResult(result);
        }
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid import data format');
    }
  }

  private getCurrentSessionId(): string {
    let sessionId = sessionStorage.getItem('aves-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('aves-session-id', sessionId);
    }
    return sessionId;
  }

  async clearAllData(): Promise<void> {
    if (this.db) {
      const transaction = this.db.transaction(
        ['interactions', 'progress', 'exerciseResults'],
        'readwrite'
      );

      await Promise.all([
        this.clearObjectStore(transaction, 'interactions'),
        this.clearObjectStore(transaction, 'progress'),
        this.clearObjectStore(transaction, 'exerciseResults')
      ]);
    }

    localStorage.clear();
    sessionStorage.clear();
  }

  private clearObjectStore(transaction: IDBTransaction, storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const clientDataService = new ClientDataService();

// Initialize on first import
clientDataService.initialize().catch(console.error);