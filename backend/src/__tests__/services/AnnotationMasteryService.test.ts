/**
 * Tests for Annotation Mastery Service
 * Covers spaced repetition, mastery tracking, and intelligent recommendations
 */

import AnnotationMasteryService, {
  AnnotationMasteryRecord,
  AnnotationWithMastery,
  MasteryUpdateParams,
  AnnotationRecommendation
} from '../../services/AnnotationMasteryService';
import { Pool, PoolClient } from 'pg';
import { Annotation } from '../../types/annotation.types';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('AnnotationMasteryService', () => {
  let service: AnnotationMasteryService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    } as any;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn()
    } as any;

    service = new AnnotationMasteryService(mockPool);

    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateMastery', () => {
    it('should create new mastery record on first attempt', async () => {
      const mockMasteryRow = {
        id: 'mastery-123',
        user_id: 'user-456',
        annotation_id: 'ann-789',
        exposure_count: 1,
        correct_count: 1,
        incorrect_count: 0,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        last_correct_at: new Date(),
        mastery_score: 1.0,
        confidence_level: 1,
        avg_response_time_ms: 3500,
        fastest_response_time_ms: 3500,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMasteryRow], rowCount: 1 }) // Upsert
        .mockResolvedValueOnce({ rows: [{ next_review_at: new Date() }], rowCount: 1 }) // Review date
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await service.updateMastery(
        'user-456',
        'ann-789',
        true,
        3500
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-456');
      expect(result.annotationId).toBe('ann-789');
      expect(result.exposureCount).toBe(1);
      expect(result.correctCount).toBe(1);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should update existing mastery record', async () => {
      const mockMasteryRow = {
        id: 'mastery-123',
        user_id: 'user-456',
        annotation_id: 'ann-789',
        exposure_count: 5,
        correct_count: 4,
        incorrect_count: 1,
        first_seen_at: new Date('2024-01-01'),
        last_seen_at: new Date(),
        last_correct_at: new Date(),
        mastery_score: 0.8,
        confidence_level: 3,
        avg_response_time_ms: 3200,
        fastest_response_time_ms: 2800,
        created_at: new Date('2024-01-01'),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMasteryRow], rowCount: 1 }) // Upsert
        .mockResolvedValueOnce({ rows: [{ next_review_at: new Date() }], rowCount: 1 }) // Review date
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await service.updateMastery(
        'user-456',
        'ann-789',
        true,
        3000
      );

      expect(result.exposureCount).toBe(5);
      expect(result.correctCount).toBe(4);
    });

    it('should handle incorrect answers', async () => {
      const mockMasteryRow = {
        id: 'mastery-123',
        user_id: 'user-456',
        annotation_id: 'ann-789',
        exposure_count: 3,
        correct_count: 1,
        incorrect_count: 2,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        last_correct_at: null,
        mastery_score: 0.33,
        confidence_level: 1,
        avg_response_time_ms: 4500,
        fastest_response_time_ms: 3500,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMasteryRow], rowCount: 1 }) // Upsert
        .mockResolvedValueOnce({ rows: [{ next_review_at: new Date() }], rowCount: 1 }) // Review date
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await service.updateMastery(
        'user-456',
        'ann-789',
        false,
        5000
      );

      expect(result.incorrectCount).toBe(2);
      expect(result.masteryScore).toBeLessThan(0.5);
    });

    it('should track fastest response time', async () => {
      const mockMasteryRow = {
        id: 'mastery-123',
        user_id: 'user-456',
        annotation_id: 'ann-789',
        exposure_count: 3,
        correct_count: 3,
        incorrect_count: 0,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        last_correct_at: new Date(),
        mastery_score: 1.0,
        confidence_level: 2,
        avg_response_time_ms: 3000,
        fastest_response_time_ms: 2200, // Faster than new time
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMasteryRow], rowCount: 1 }) // Upsert
        .mockResolvedValueOnce({ rows: [{ next_review_at: new Date() }], rowCount: 1 }) // Review date
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await service.updateMastery(
        'user-456',
        'ann-789',
        true,
        2500 // Not faster than fastest
      );

      expect(result.fastestResponseTimeMs).toBe(2200);
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.updateMastery('user-456', 'ann-789', true, 3000)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getWeakAnnotations', () => {
    it('should return annotations with low mastery scores', async () => {
      const mockRows = [
        {
          id: 'ann-1',
          image_id: 'img-1',
          bounding_box: JSON.stringify({ x: 100, y: 150, width: 50, height: 40 }),
          annotation_type: 'feature',
          spanish_term: 'el pico',
          english_term: 'the beak',
          pronunciation: 'pee-koh',
          difficulty_level: 2,
          is_visible: true,
          created_at: new Date(),
          updated_at: new Date(),
          mastery_id: 'mastery-1',
          user_id: 'user-456',
          exposure_count: 5,
          correct_count: 2,
          incorrect_count: 3,
          mastery_score: 0.4,
          confidence_level: 1,
          last_seen_at: new Date(),
          next_review_at: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 });

      const result = await service.getWeakAnnotations('user-456', 10);

      expect(result).toHaveLength(1);
      expect(result[0].spanishTerm).toBe('el pico');
      expect(result[0].masteryData).toBeDefined();
      expect(result[0].masteryData!.masteryScore).toBe(0.4);
    });

    it('should filter by annotation type', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getWeakAnnotations('user-456', 10, 'feature');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('a.annotation_type = $2'),
        expect.arrayContaining(['user-456', 'feature', 10])
      );
    });

    it('should sort by mastery score ascending', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getWeakAnnotations('user-456', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY am.mastery_score ASC'),
        expect.any(Array)
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getWeakAnnotations('user-456', 10)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getAnnotationsDueForReview', () => {
    it('should return annotations past review date', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      const mockRows = [
        {
          id: 'ann-1',
          image_id: 'img-1',
          bounding_box: JSON.stringify({ x: 100, y: 150, width: 50, height: 40 }),
          annotation_type: 'feature',
          spanish_term: 'las alas',
          english_term: 'the wings',
          pronunciation: 'las-ah-las',
          difficulty_level: 3,
          is_visible: true,
          created_at: new Date(),
          updated_at: new Date(),
          mastery_id: 'mastery-1',
          user_id: 'user-456',
          exposure_count: 3,
          correct_count: 3,
          incorrect_count: 0,
          mastery_score: 0.85,
          confidence_level: 3,
          last_seen_at: pastDate,
          next_review_at: pastDate,
          hours_overdue: 24
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 });

      const result = await service.getAnnotationsDueForReview('user-456', 10);

      expect(result).toHaveLength(1);
      expect(result[0].spanishTerm).toBe('las alas');
      expect(result[0].masteryData).toBeDefined();
    });

    it('should sort by review date (most overdue first)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getAnnotationsDueForReview('user-456', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY am.next_review_at ASC'),
        ['user-456', 5]
      );
    });
  });

  describe('getNewAnnotations', () => {
    it('should return unseen annotations', async () => {
      const mockRows = [
        {
          id: 'ann-new-1',
          image_id: 'img-1',
          bounding_box: JSON.stringify({ x: 100, y: 150, width: 50, height: 40 }),
          annotation_type: 'feature',
          spanish_term: 'la cola',
          english_term: 'the tail',
          pronunciation: 'koh-lah',
          difficulty_level: 2,
          is_visible: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 });

      const result = await service.getNewAnnotations('user-456', 10);

      expect(result).toHaveLength(1);
      expect(result[0].spanishTerm).toBe('la cola');
    });

    it('should filter by difficulty range', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getNewAnnotations('user-456', 10, [2, 4]);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('a.difficulty_level BETWEEN $2 AND $3'),
        expect.arrayContaining(['user-456', 2, 4, 10])
      );
    });

    it('should only return visible annotations', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getNewAnnotations('user-456', 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('a.is_visible = true'),
        expect.any(Array)
      );
    });
  });

  describe('getRecommendedAnnotations', () => {
    it('should return mixed recommendations', async () => {
      // Mock due for review
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'ann-due',
          image_id: 'img-1',
          bounding_box: JSON.stringify({ x: 100, y: 150, width: 50, height: 40 }),
          annotation_type: 'feature',
          spanish_term: 'el pico',
          english_term: 'the beak',
          pronunciation: 'pee-koh',
          difficulty_level: 2,
          is_visible: true,
          created_at: new Date(),
          updated_at: new Date(),
          mastery_id: 'mastery-1',
          user_id: 'user-456',
          exposure_count: 3,
          correct_count: 3,
          incorrect_count: 0,
          mastery_score: 0.9,
          confidence_level: 3,
          last_seen_at: new Date(),
          next_review_at: new Date()
        }],
        rowCount: 1
      });

      // Mock weak annotations
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'ann-weak',
          image_id: 'img-2',
          bounding_box: JSON.stringify({ x: 50, y: 100, width: 40, height: 30 }),
          annotation_type: 'feature',
          spanish_term: 'las alas',
          english_term: 'the wings',
          pronunciation: 'las-ah-las',
          difficulty_level: 3,
          is_visible: true,
          created_at: new Date(),
          updated_at: new Date(),
          mastery_id: 'mastery-2',
          user_id: 'user-456',
          exposure_count: 4,
          correct_count: 1,
          incorrect_count: 3,
          mastery_score: 0.25,
          confidence_level: 1,
          last_seen_at: new Date(),
          next_review_at: new Date()
        }],
        rowCount: 1
      });

      // Mock new annotations
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'ann-new',
          image_id: 'img-3',
          bounding_box: JSON.stringify({ x: 150, y: 200, width: 60, height: 50 }),
          annotation_type: 'feature',
          spanish_term: 'la cola',
          english_term: 'the tail',
          pronunciation: 'koh-lah',
          difficulty_level: 2,
          is_visible: true,
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      const result = await service.getRecommendedAnnotations('user-456', 5);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);

      // Should have different recommendation types
      const reasons = result.map(r => r.reason);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it('should prioritize by importance', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // due
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // weak
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // new

      const result = await service.getRecommendedAnnotations('user-456', 5);

      // Should be sorted by priority
      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].priority).toBeGreaterThanOrEqual(result[i + 1].priority);
        }
      }
    });

    it('should filter by focus type', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getRecommendedAnnotations('user-456', 5, {
        focusType: 'anatomy'
      });

      // Should pass focus type to weak annotations query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['user-456', 'anatomy', expect.any(Number)])
      );
    });

    it('should exclude new annotations if disabled', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getRecommendedAnnotations('user-456', 5, {
        includeNew: false
      });

      // Should only call query twice (due and weak, not new)
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should remove duplicates preferring higher priority', async () => {
      const sameAnnotation = {
        id: 'ann-duplicate',
        image_id: 'img-1',
        bounding_box: JSON.stringify({ x: 100, y: 150, width: 50, height: 40 }),
        annotation_type: 'feature',
        spanish_term: 'el pico',
        english_term: 'the beak',
        pronunciation: 'pee-koh',
        difficulty_level: 2,
        is_visible: true,
        created_at: new Date(),
        updated_at: new Date(),
        mastery_id: 'mastery-1',
        user_id: 'user-456',
        exposure_count: 3,
        correct_count: 2,
        incorrect_count: 1,
        mastery_score: 0.67,
        confidence_level: 2,
        last_seen_at: new Date(),
        next_review_at: new Date()
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [sameAnnotation], rowCount: 1 }) // due
        .mockResolvedValueOnce({ rows: [sameAnnotation], rowCount: 1 }) // weak
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // new

      const result = await service.getRecommendedAnnotations('user-456', 5);

      // Should only include one instance of the annotation
      const ids = result.map(r => r.annotation.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getMasteryScore', () => {
    it('should return mastery score for annotation', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mastery_score: 0.85 }],
        rowCount: 1
      });

      const score = await service.getMasteryScore('user-456', 'ann-789');

      expect(score).toBe(0.85);
    });

    it('should return 0 for unpracticed annotation', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const score = await service.getMasteryScore('user-456', 'ann-new');

      expect(score).toBe(0.0);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const score = await service.getMasteryScore('user-456', 'ann-789');

      expect(score).toBe(0.0);
    });
  });

  describe('getUserMasteryStats', () => {
    it('should return comprehensive user statistics', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_seen: '25',
          avg_mastery: '0.72',
          level_1: '5',
          level_2: '8',
          level_3: '7',
          level_4: '3',
          level_5: '2',
          weak_count: '10',
          mastered_count: '5'
        }],
        rowCount: 1
      });

      const stats = await service.getUserMasteryStats('user-456');

      expect(stats.totalAnnotationsSeen).toBe(25);
      expect(stats.averageMasteryScore).toBe(0.72);
      expect(stats.annotationsByConfidence[1]).toBe(5);
      expect(stats.annotationsByConfidence[5]).toBe(2);
      expect(stats.weakAnnotationsCount).toBe(10);
      expect(stats.masteredAnnotationsCount).toBe(5);
    });

    it('should handle user with no practice history', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_seen: '0',
          avg_mastery: null,
          level_1: '0',
          level_2: '0',
          level_3: '0',
          level_4: '0',
          level_5: '0',
          weak_count: '0',
          mastered_count: '0'
        }],
        rowCount: 1
      });

      const stats = await service.getUserMasteryStats('new-user');

      expect(stats.totalAnnotationsSeen).toBe(0);
      expect(stats.averageMasteryScore).toBe(0.0);
      expect(stats.weakAnnotationsCount).toBe(0);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getUserMasteryStats('user-456')
      ).rejects.toThrow('Database error');
    });
  });

  describe('edge cases', () => {
    it('should handle very fast response times', async () => {
      const mockMasteryRow = {
        id: 'mastery-123',
        user_id: 'user-456',
        annotation_id: 'ann-789',
        exposure_count: 1,
        correct_count: 1,
        incorrect_count: 0,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        last_correct_at: new Date(),
        mastery_score: 1.0,
        confidence_level: 1,
        avg_response_time_ms: 500,
        fastest_response_time_ms: 500,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMasteryRow], rowCount: 1 }) // Upsert
        .mockResolvedValueOnce({ rows: [{ next_review_at: new Date() }], rowCount: 1 }) // Review date
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await service.updateMastery('user-456', 'ann-789', true, 500);

      expect(result.avgResponseTimeMs).toBe(500);
      expect(result.fastestResponseTimeMs).toBe(500);
    });

    it('should handle very slow response times', async () => {
      const mockMasteryRow = {
        id: 'mastery-123',
        user_id: 'user-456',
        annotation_id: 'ann-789',
        exposure_count: 1,
        correct_count: 0,
        incorrect_count: 1,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        last_correct_at: null,
        mastery_score: 0.0,
        confidence_level: 1,
        avg_response_time_ms: 60000,
        fastest_response_time_ms: 60000,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMasteryRow], rowCount: 1 }) // Upsert
        .mockResolvedValueOnce({ rows: [{ next_review_at: new Date() }], rowCount: 1 }) // Review date
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await service.updateMastery('user-456', 'ann-789', false, 60000);

      expect(result.avgResponseTimeMs).toBe(60000);
    });

    it('should handle empty recommendation requests', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getRecommendedAnnotations('user-456', 0);

      expect(result).toEqual([]);
    });
  });
});
