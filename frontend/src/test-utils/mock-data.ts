/**
 * Mock Data for Visual Testing
 *
 * Provides consistent mock data for component and page testing
 * across different UI states (loading, empty, populated, error).
 */

// ============================================================================
// Species Mock Data
// ============================================================================

export const mockSpecies = {
  id: 'sp-001',
  commonName: 'House Sparrow',
  scientificName: 'Passer domesticus',
  spanishName: 'Gorrión común',
  family: 'Passeridae',
  order: 'Passeriformes',
  conservationStatus: 'LC',
  habitat: ['urban', 'suburban', 'farmland'],
  size: {
    length: { min: 14, max: 18, unit: 'cm' },
    wingspan: { min: 21, max: 25.5, unit: 'cm' },
    weight: { min: 24, max: 39.5, unit: 'g' },
  },
  description: 'A small, plump bird with a stout bill. Males have grey crowns, chestnut napes, and black bibs.',
  imageUrl: '/images/species/house-sparrow.jpg',
  thumbnailUrl: '/images/species/house-sparrow-thumb.jpg',
};

export const mockSpeciesList = [
  mockSpecies,
  {
    id: 'sp-002',
    commonName: 'European Robin',
    scientificName: 'Erithacus rubecula',
    spanishName: 'Petirrojo europeo',
    family: 'Muscicapidae',
    order: 'Passeriformes',
    conservationStatus: 'LC',
    habitat: ['woodland', 'gardens', 'parks'],
    imageUrl: '/images/species/european-robin.jpg',
  },
  {
    id: 'sp-003',
    commonName: 'Common Blackbird',
    scientificName: 'Turdus merula',
    spanishName: 'Mirlo común',
    family: 'Turdidae',
    order: 'Passeriformes',
    conservationStatus: 'LC',
    habitat: ['woodland', 'gardens', 'parks'],
    imageUrl: '/images/species/common-blackbird.jpg',
  },
];

// ============================================================================
// Annotation Mock Data
// ============================================================================

export const mockAnnotation = {
  id: 'ann-001',
  speciesId: 'sp-001',
  imageId: 'img-001',
  type: 'anatomy',
  label: 'Wing',
  spanishLabel: 'Ala',
  boundingBox: {
    x: 120,
    y: 80,
    width: 100,
    height: 60,
  },
  confidence: 0.95,
  createdAt: '2025-01-15T10:30:00Z',
  status: 'approved',
};

export const mockAnnotations = [
  mockAnnotation,
  {
    id: 'ann-002',
    speciesId: 'sp-001',
    imageId: 'img-001',
    type: 'anatomy',
    label: 'Beak',
    spanishLabel: 'Pico',
    boundingBox: { x: 50, y: 40, width: 30, height: 25 },
    confidence: 0.92,
    status: 'approved',
  },
  {
    id: 'ann-003',
    speciesId: 'sp-001',
    imageId: 'img-001',
    type: 'color',
    label: 'Brown Crown',
    spanishLabel: 'Corona marrón',
    boundingBox: { x: 45, y: 30, width: 40, height: 35 },
    confidence: 0.88,
    status: 'pending',
  },
];

// ============================================================================
// Exercise Mock Data
// ============================================================================

export const mockExercise = {
  id: 'ex-001',
  type: 'visual_identification',
  difficulty: 'medium',
  question: 'Identify the bird in the image',
  questionSpanish: 'Identifica el pájaro en la imagen',
  options: [
    { id: 'opt-1', text: 'House Sparrow', textSpanish: 'Gorrión común', isCorrect: true },
    { id: 'opt-2', text: 'European Robin', textSpanish: 'Petirrojo europeo', isCorrect: false },
    { id: 'opt-3', text: 'Common Blackbird', textSpanish: 'Mirlo común', isCorrect: false },
    { id: 'opt-4', text: 'Blue Tit', textSpanish: 'Herrerillo común', isCorrect: false },
  ],
  imageUrl: '/images/exercises/house-sparrow-quiz.jpg',
  hint: 'Look at the distinctive black bib',
};

export const mockExerciseSession = {
  id: 'session-001',
  userId: 'user-001',
  exercises: [mockExercise],
  currentIndex: 0,
  score: 0,
  totalQuestions: 10,
  startedAt: '2025-01-15T10:00:00Z',
  status: 'in_progress',
};

// ============================================================================
// User Mock Data
// ============================================================================

export const mockUser = {
  id: 'user-001',
  email: 'demo@aves.app',
  displayName: 'Demo User',
  avatarUrl: '/images/avatars/default.png',
  createdAt: '2024-06-01T00:00:00Z',
  stats: {
    totalExercises: 150,
    correctAnswers: 120,
    streak: 7,
    level: 5,
    xp: 1250,
  },
  preferences: {
    language: 'en',
    difficulty: 'medium',
    dailyGoal: 10,
  },
};

// ============================================================================
// Progress Mock Data
// ============================================================================

export const mockProgress = {
  userId: 'user-001',
  totalLessons: 50,
  completedLessons: 25,
  currentStreak: 7,
  longestStreak: 14,
  totalTimeSpent: 3600, // seconds
  lastActivity: '2025-01-15T10:30:00Z',
  achievements: [
    { id: 'ach-001', name: 'First Steps', unlockedAt: '2024-06-01T00:00:00Z' },
    { id: 'ach-002', name: 'Week Warrior', unlockedAt: '2024-06-08T00:00:00Z' },
  ],
};

// ============================================================================
// State Builders (for different UI states)
// ============================================================================

export const UIStates = {
  loading: {
    isLoading: true,
    data: null,
    error: null,
  },
  empty: {
    isLoading: false,
    data: [],
    error: null,
  },
  populated: {
    isLoading: false,
    data: mockSpeciesList,
    error: null,
  },
  error: {
    isLoading: false,
    data: null,
    error: { message: 'Failed to load data. Please try again.' },
  },
} as const;

/**
 * Create a state object for testing
 */
export function createState<T>(state: keyof typeof UIStates, data?: T) {
  const baseState = UIStates[state];
  if (data !== undefined && state === 'populated') {
    return { ...baseState, data };
  }
  return baseState;
}
