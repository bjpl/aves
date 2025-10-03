// IndexedDB and storage-related type definitions

import { VocabularyInteraction } from './index';
import { UserProgress, ExerciseResult } from './api.types';

/**
 * IndexedDB database schema
 */
export interface DatabaseSchema {
  interactions: VocabularyInteraction;
  progress: ProgressRecord;
  exerciseResults: ExerciseResultRecord;
}

/**
 * Progress record stored in IndexedDB
 */
export interface ProgressRecord extends UserProgress {
  sessionId: string;
  lastUpdated: Date;
}

/**
 * Exercise result record stored in IndexedDB
 */
export interface ExerciseResultRecord extends ExerciseResult {
  id?: number; // Auto-incremented by IndexedDB
  sessionId: string;
  completedAt: Date;
}

/**
 * Interaction record stored in IndexedDB
 */
export interface InteractionRecord extends VocabularyInteraction {
  id?: number; // Auto-incremented by IndexedDB
  userSessionId: string;
  timestamp: Date;
}

/**
 * Export data structure
 */
export interface ExportData {
  interactions: InteractionRecord[];
  progress: ProgressRecord | null;
  exerciseResults: ExerciseResultRecord[];
  exportedAt: string;
}

/**
 * IndexedDB store names
 */
export type StoreName = keyof DatabaseSchema;

/**
 * IndexedDB transaction mode
 */
export type TransactionMode = 'readonly' | 'readwrite';

/**
 * Generic IndexedDB request wrapper
 */
export interface IDBRequestWrapper<T> {
  request: IDBRequest<T>;
  promise: Promise<T>;
}

/**
 * IndexedDB query options
 */
export interface QueryOptions {
  index?: string;
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
}
