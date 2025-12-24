import { Annotation } from '../../../../shared/types/annotation.types';

export const createMockAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: 'ann-1',
  imageId: 'img-1',
  spanishTerm: 'pico',
  englishTerm: 'beak',
  type: 'anatomical',
  boundingBox: {
    topLeft: { x: 100, y: 100 },
    bottomRight: { x: 200, y: 200 },
    width: 100,
    height: 100,
  },
  difficultyLevel: 2,
  isVisible: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockAnnotations = (count: number = 5): Annotation[] => {
  const terms = [
    { spanish: 'pico', english: 'beak' },
    { spanish: 'ala', english: 'wing' },
    { spanish: 'cola', english: 'tail' },
    { spanish: 'pata', english: 'leg' },
    { spanish: 'pluma', english: 'feather' },
  ];

  return Array.from({ length: count }, (_, i) => {
    const term = terms[i % terms.length];
    return createMockAnnotation({
      id: `ann-${i + 1}`,
      spanishTerm: term.spanish,
      englishTerm: term.english,
      difficultyLevel: (i % 3) + 1,
      boundingBox: {
        topLeft: { x: i * 50, y: i * 50 },
        bottomRight: { x: i * 50 + 100, y: i * 50 + 100 },
        width: 100,
        height: 100,
      },
    });
  });
};
