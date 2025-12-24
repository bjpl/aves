import { Pool } from 'pg';
import { VocabularyService, Interaction } from '../../services/VocabularyService';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('VocabularyService', () => {
  let service: VocabularyService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new VocabularyService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnrichment', () => {
    it('should return cached enrichment data', async () => {
      const term = 'pájaro';
      const mockEnrichment = {
        etymology: 'From Latin...',
        mnemonic: 'Remember by...',
        relatedTerms: JSON.stringify([{ term: 'ave', relationship: 'synonym' }]),
        commonPhrases: JSON.stringify([{ spanish: 'pájaro azul', english: 'blue bird' }]),
        usageExamples: JSON.stringify(['El pájaro canta']),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockEnrichment],
      });

      const result = await service.getEnrichment(term);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [term]
      );
      expect(result.etymology).toBe(mockEnrichment.etymology);
      expect(Array.isArray(result.relatedTerms)).toBe(true);
    });

    it('should generate and cache enrichment if not found', async () => {
      const term = 'nuevo';

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Cache miss
        .mockResolvedValueOnce({}); // Insert success

      const result = await service.getEnrichment(term);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO vocabulary_enrichment'),
        expect.arrayContaining([term])
      );
      expect(result.etymology).toContain(term);
      expect(result.mnemonic).toContain(term);
    });

    it('should handle JSON parsing for cached data', async () => {
      const term = 'pájaro';
      const mockEnrichment = {
        etymology: 'From Latin...',
        mnemonic: 'Remember by...',
        relatedTerms: '[{"term":"ave","relationship":"synonym"}]',
        commonPhrases: '[{"spanish":"pájaro azul","english":"blue bird"}]',
        usageExamples: '["El pájaro canta"]',
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockEnrichment],
      });

      const result = await service.getEnrichment(term);

      expect(result.relatedTerms).toEqual([{ term: 'ave', relationship: 'synonym' }]);
      expect(result.commonPhrases).toEqual([{ spanish: 'pájaro azul', english: 'blue bird' }]);
      expect(result.usageExamples).toEqual(['El pájaro canta']);
    });
  });

  describe('trackInteraction', () => {
    it('should track a vocabulary interaction', async () => {
      const interaction: Interaction = {
        sessionId: 'session_123',
        annotationId: 5,
        spanishTerm: 'pájaro',
        disclosureLevel: 2,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({});

      await service.trackInteraction(interaction);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vocabulary_interactions'),
        [
          interaction.sessionId,
          interaction.annotationId,
          interaction.spanishTerm,
          interaction.disclosureLevel,
        ]
      );
    });

    it('should handle duplicate interactions', async () => {
      const interaction: Interaction = {
        sessionId: 'session_123',
        annotationId: 5,
        spanishTerm: 'pájaro',
        disclosureLevel: 2,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({});

      await service.trackInteraction(interaction);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT DO NOTHING'),
        expect.any(Array)
      );
    });
  });

  describe('getSessionProgress', () => {
    it('should return progress for an active session', async () => {
      const sessionId = 'session_123';
      const mockProgress = {
        termsViewed: '15',
        maxLevel: '3',
        totalInteractions: '42',
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProgress],
      });

      const result = await service.getSessionProgress(sessionId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT annotation_id)'),
        [sessionId]
      );
      expect(result).toEqual({
        termsViewed: 15,
        maxLevel: 3,
        totalInteractions: 42,
      });
    });

    it('should return zero stats for empty session', async () => {
      const sessionId = 'session_empty';
      const mockProgress = {
        termsViewed: '0',
        maxLevel: null,
        totalInteractions: '0',
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProgress],
      });

      const result = await service.getSessionProgress(sessionId);

      expect(result).toEqual({
        termsViewed: 0,
        maxLevel: 0,
        totalInteractions: 0,
      });
    });
  });
});
