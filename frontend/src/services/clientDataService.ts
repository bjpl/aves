// CONCEPT: Client-side data persistence using IndexedDB and LocalStorage
// WHY: GitHub Pages only serves static files, no backend database
// PATTERN: Repository pattern with IndexedDB for complex data, LocalStorage for settings

import { Annotation, Species, Exercise, VocabularyInteraction } from '../types';
import {
  ProgressRecord,
  ExerciseResultRecord,
  InteractionRecord,
  ExportData,
} from '../types/storage.types';
import { StorageError } from '../types/error.types';
import { SpeciesFilter } from '../types';
import { error as logError } from '../utils/logger';

// Database structure defined in storage.types.ts
// Contains: interactions, progress, exerciseResults

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
      // Hardcoded base URL for GitHub Pages deployment at /aves/
      const baseUrl = '/aves/';

      // Load pre-configured annotation data
      const annotationsResponse = await fetch(`${baseUrl}data/annotations.json`);
      this.staticData.annotations = await annotationsResponse.json();

      // Load species taxonomy data
      const speciesResponse = await fetch(`${baseUrl}data/species.json`);
      this.staticData.species = await speciesResponse.json();

      // Load exercise templates (create empty if doesn't exist)
      try {
        const exercisesResponse = await fetch(`${baseUrl}data/exercises.json`);
        this.staticData.exercises = await exercisesResponse.json();
      } catch {
        this.staticData.exercises = [];
      }
    } catch (error) {
      logError('Failed to load static data:', error instanceof Error ? error : new Error(String(error)));
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
          x: 0.15,
          y: 0.1,
          width: 0.1,
          height: 0.05
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
          x: 0.2,
          y: 0.15,
          width: 0.08,
          height: 0.05
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
        sizeCategory: 'small',
        primaryColors: ['red', 'black'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=800',
        descriptionSpanish: 'Ave distintiva de color rojo brillante con cresta prominente.',
        descriptionEnglish: 'Distinctive bright red bird with prominent crest.',
        funFact: 'Cardinals are one of the few bird species where both males and females sing.',
        annotationCount: 2
      },
      {
        id: '2',
        scientificName: 'Cyanocitta cristata',
        englishName: 'Blue Jay',
        spanishName: 'Arrendajo Azul',
        orderName: 'Passeriformes',
        familyName: 'Corvidae',
        genus: 'Cyanocitta',
        habitats: ['forest', 'urban', 'garden'],
        sizeCategory: 'medium',
        primaryColors: ['blue', 'white', 'black'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=800',
        descriptionSpanish: 'Ave inteligente con plumaje azul brillante y cresta distintiva.',
        descriptionEnglish: 'Intelligent bird with bright blue plumage and distinctive crest.',
        funFact: 'Blue Jays can mimic hawk calls to scare other birds away from food.',
        annotationCount: 2
      },
      {
        id: '3',
        scientificName: 'Turdus migratorius',
        englishName: 'American Robin',
        spanishName: 'Petirrojo Americano',
        orderName: 'Passeriformes',
        familyName: 'Turdidae',
        genus: 'Turdus',
        habitats: ['forest', 'urban', 'garden', 'grassland'],
        sizeCategory: 'medium',
        primaryColors: ['red', 'brown', 'gray'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800',
        descriptionSpanish: 'Ave común con pecho anaranjado rojizo distintivo.',
        descriptionEnglish: 'Common bird with distinctive reddish-orange breast.',
        funFact: 'Robins can produce three broods in one year and are often the first sign of spring.',
        annotationCount: 2
      },
      {
        id: '4',
        scientificName: 'Zenaida macroura',
        englishName: 'Mourning Dove',
        spanishName: 'Paloma Huilota',
        orderName: 'Columbiformes',
        familyName: 'Columbidae',
        genus: 'Zenaida',
        habitats: ['urban', 'grassland', 'desert'],
        sizeCategory: 'medium',
        primaryColors: ['brown', 'gray', 'pink'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1596071915134-94f36f1d3188?w=800',
        descriptionSpanish: 'Ave gentil conocida por su canto melancólico.',
        descriptionEnglish: 'Gentle bird known for its melancholic cooing song.',
        funFact: 'Mourning Doves can drink water by suction, unlike most birds.',
        annotationCount: 2
      },
      {
        id: '5',
        scientificName: 'Passer domesticus',
        englishName: 'House Sparrow',
        spanishName: 'Gorrión Común',
        orderName: 'Passeriformes',
        familyName: 'Passeridae',
        genus: 'Passer',
        habitats: ['urban', 'garden'],
        sizeCategory: 'small',
        primaryColors: ['brown', 'gray', 'black'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800',
        descriptionSpanish: 'Una de las aves más adaptables del mundo.',
        descriptionEnglish: 'One of the most adaptable birds in the world.',
        funFact: 'House Sparrows were introduced to North America in 1851.',
        annotationCount: 2
      },
      {
        id: '6',
        scientificName: 'Spinus tristis',
        englishName: 'American Goldfinch',
        spanishName: 'Jilguero Americano',
        orderName: 'Passeriformes',
        familyName: 'Fringillidae',
        genus: 'Spinus',
        habitats: ['meadow', 'garden', 'forest edge'],
        sizeCategory: 'small',
        primaryColors: ['yellow', 'black', 'white'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1580774998750-bfb65320b286?w=800',
        descriptionSpanish: 'Ave pequeña con brillante plumaje amarillo en verano.',
        descriptionEnglish: 'Small bird with bright yellow plumage in summer.',
        funFact: 'Goldfinches are strict vegetarians and even feed their young seeds.',
        annotationCount: 2
      },
      {
        id: '7',
        scientificName: 'Agelaius phoeniceus',
        englishName: 'Red-winged Blackbird',
        spanishName: 'Tordo Sargento',
        orderName: 'Passeriformes',
        familyName: 'Icteridae',
        genus: 'Agelaius',
        habitats: ['wetland', 'marsh', 'meadow'],
        sizeCategory: 'medium',
        primaryColors: ['black', 'red', 'yellow'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1588690203882-81b0d1a39b51?w=800',
        descriptionSpanish: 'Ave con distintivas manchas rojas y amarillas en las alas.',
        descriptionEnglish: 'Bird with distinctive red and yellow shoulder patches.',
        funFact: 'Males fiercely defend their territories and may have up to 15 females.',
        annotationCount: 2
      },
      {
        id: '8',
        scientificName: 'Ardea herodias',
        englishName: 'Great Blue Heron',
        spanishName: 'Garza Azulada',
        orderName: 'Pelecaniformes',
        familyName: 'Ardeidae',
        genus: 'Ardea',
        habitats: ['wetland', 'coastal', 'lake'],
        sizeCategory: 'large',
        primaryColors: ['blue', 'gray', 'white'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1604608672516-f1b9a53a4ed6?w=800',
        descriptionSpanish: 'El ave zancuda más grande de América del Norte.',
        descriptionEnglish: 'The largest wading bird in North America.',
        funFact: 'Herons can strike at prey at lightning speed with their dagger-like bills.',
        annotationCount: 2
      },
      {
        id: '9',
        scientificName: 'Archilochus colubris',
        englishName: 'Ruby-throated Hummingbird',
        spanishName: 'Colibrí Garganta de Rubí',
        orderName: 'Apodiformes',
        familyName: 'Trochilidae',
        genus: 'Archilochus',
        habitats: ['forest', 'garden', 'meadow'],
        sizeCategory: 'small',
        primaryColors: ['green', 'red', 'white'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=800',
        descriptionSpanish: 'El único colibrí que anida al este del Mississippi.',
        descriptionEnglish: 'The only hummingbird that nests east of the Mississippi.',
        funFact: 'Their wings beat about 53 times per second and they can fly backwards.',
        annotationCount: 2
      },
      {
        id: '10',
        scientificName: 'Haliaeetus leucocephalus',
        englishName: 'Bald Eagle',
        spanishName: 'Águila Calva',
        orderName: 'Accipitriformes',
        familyName: 'Accipitridae',
        genus: 'Haliaeetus',
        habitats: ['coastal', 'lake', 'river', 'forest'],
        sizeCategory: 'large',
        primaryColors: ['brown', 'white', 'yellow'],
        conservationStatus: 'LC',
        primaryImageUrl: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800',
        descriptionSpanish: 'El símbolo nacional de los Estados Unidos.',
        descriptionEnglish: 'The national symbol of the United States.',
        funFact: 'Bald Eagles can see fish from a mile away and dive at speeds up to 100 mph.',
        annotationCount: 2
      }
    ];
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        logError('Failed to open IndexedDB');
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
        logError('Failed to migrate localStorage:', error instanceof Error ? error : new Error(String(error)));
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

  async getSpecies(filters?: SpeciesFilter): Promise<Species[]> {
    let results = [...this.staticData.species];

    if (filters) {
      if (filters.habitat) {
        results = results.filter(s => s.habitats?.includes(filters.habitat!) ?? false);
      }
      if (filters.sizeCategory) {
        results = results.filter(s => s.sizeCategory === filters.sizeCategory);
      }
      if (filters.primaryColor) {
        results = results.filter(s => s.primaryColors?.includes(filters.primaryColor!) ?? false);
      }
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        results = results.filter(s =>
          s.spanishName.toLowerCase().includes(searchLower) ||
          s.englishName.toLowerCase().includes(searchLower) ||
          s.scientificName.toLowerCase().includes(searchLower)
        );
      }
      if (filters.orderName) {
        results = results.filter(s => s.orderName === filters.orderName);
      }
      if (filters.familyName) {
        results = results.filter(s => s.familyName === filters.familyName);
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
      throw new StorageError('Database not initialized');
    }

    const transaction = this.db.transaction(['interactions'], 'readwrite');
    const store = transaction.objectStore('interactions');

    const interactionRecord: Omit<InteractionRecord, 'id'> = {
      ...interaction,
      userSessionId: this.getCurrentSessionId(),
      timestamp: new Date()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(interactionRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError('Failed to save interaction', { error: request.error }));
    });
  }

  async getInteractions(sessionId: string): Promise<VocabularyInteraction[]> {
    if (!this.db) {
      throw new StorageError('Database not initialized');
    }

    const transaction = this.db.transaction(['interactions'], 'readonly');
    const store = transaction.objectStore('interactions');

    return new Promise<VocabularyInteraction[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const interactions = (request.result as InteractionRecord[])
          .filter((i: InteractionRecord) => i.userSessionId === sessionId);
        resolve(interactions as VocabularyInteraction[]);
      };
      request.onerror = () => reject(new StorageError('Failed to get interactions', { error: request.error }));
    });
  }

  async saveProgress(progress: Omit<ProgressRecord, 'lastUpdated'>): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage if IndexedDB fails
      localStorage.setItem('aves-progress-backup', JSON.stringify(progress));
      return;
    }

    const transaction = this.db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');

    const progressRecord: ProgressRecord = {
      ...progress,
      lastUpdated: new Date()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(progressRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError('Failed to save progress', { error: request.error }));
    });
  }

  async getProgress(sessionId: string): Promise<ProgressRecord | null> {
    if (!this.db) {
      // Fallback to localStorage
      const backup = localStorage.getItem('aves-progress-backup');
      return backup ? JSON.parse(backup) as ProgressRecord : null;
    }

    const transaction = this.db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');

    return new Promise<ProgressRecord | null>((resolve, reject) => {
      const request = store.get(sessionId);
      request.onsuccess = () => resolve(request.result as ProgressRecord || null);
      request.onerror = () => reject(new StorageError('Failed to get progress', { error: request.error }));
    });
  }

  async saveExerciseResult(result: Omit<ExerciseResultRecord, 'id' | 'completedAt'>): Promise<void> {
    if (!this.db) {
      throw new StorageError('Database not initialized');
    }

    const transaction = this.db.transaction(['exerciseResults'], 'readwrite');
    const store = transaction.objectStore('exerciseResults');

    const resultRecord: Omit<ExerciseResultRecord, 'id'> = {
      ...result,
      completedAt: new Date()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(resultRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError('Failed to save exercise result', { error: request.error }));
    });
  }

  async getExerciseResults(sessionId: string): Promise<ExerciseResultRecord[]> {
    if (!this.db) {
      throw new StorageError('Database not initialized');
    }

    const transaction = this.db.transaction(['exerciseResults'], 'readonly');
    const store = transaction.objectStore('exerciseResults');

    return new Promise<ExerciseResultRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as ExerciseResultRecord[])
          .filter((r: ExerciseResultRecord) => r.sessionId === sessionId);
        resolve(results);
      };
      request.onerror = () => reject(new StorageError('Failed to get exercise results', { error: request.error }));
    });
  }

  // Utility methods

  async exportData(): Promise<string> {
    const sessionId = this.getCurrentSessionId();
    const interactions = await this.getInteractions(sessionId);
    const progress = await this.getProgress(sessionId);
    const exerciseResults = await this.getExerciseResults(sessionId);

    const data: ExportData = {
      interactions: interactions as InteractionRecord[],
      progress,
      exerciseResults,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString) as Partial<ExportData>;

      // Import interactions
      if (data.interactions && Array.isArray(data.interactions)) {
        for (const interaction of data.interactions) {
          await this.saveInteraction(interaction);
        }
      }

      // Import progress
      if (data.progress) {
        await this.saveProgress(data.progress);
      }

      // Import exercise results
      if (data.exerciseResults && Array.isArray(data.exerciseResults)) {
        for (const result of data.exerciseResults) {
          await this.saveExerciseResult(result);
        }
      }
    } catch (error) {
      logError('Failed to import data:', error instanceof Error ? error : new Error(String(error)));
      throw new StorageError('Invalid import data format', { error });
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
clientDataService.initialize().catch(logError);