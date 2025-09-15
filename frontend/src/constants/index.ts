// API Configuration
export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
export const UNSPLASH_ACCESS_KEY = import.meta.env?.VITE_UNSPLASH_ACCESS_KEY || '';

// App Configuration
export const APP_NAME = 'Aves';
export const APP_DESCRIPTION = 'Visual Spanish Bird Learning Platform';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Image Sizes
export const IMAGE_SIZES = {
  thumbnail: { width: 400, height: 300 },
  regular: { width: 1200, height: 900 },
  full: { width: 2400, height: 1800 }
};

// Exercise Configuration
export const EXERCISE_CONFIG = {
  minOptions: 3,
  maxOptions: 4,
  autoAdvanceDelay: 2500,
  sessionGoal: 10
};

// Vocabulary Disclosure Levels
export const DISCLOSURE_LEVELS = {
  HIDDEN: 0,
  HOVER: 1,
  CLICK: 2,
  ETYMOLOGY: 3,
  MASTERED: 4
} as const;

// Species Categories
export const SIZE_CATEGORIES = ['small', 'medium', 'large'] as const;
export const HABITAT_TYPES = [
  'forest',
  'wetland',
  'coastal',
  'mountain',
  'urban',
  'agricultural',
  'garden'
] as const;