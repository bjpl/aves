import request from 'supertest';
import express from 'express';
import { pool } from '../../database/connection';

// Mock the database pool BEFORE importing router
jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Import router AFTER mocking
import vocabularyRouter from '../../routes/vocabulary';

const app = express();
app.use(express.json());
app.use('/api', vocabularyRouter);

describe('Vocabulary API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/vocabulary/enrichment/:term', () => {
    it('should return cached enrichment data if available', async () => {
      const mockEnrichment = {
        etymology: 'From Latin picarium',
        mnemonic: 'Think of a peak - pointed like a beak',
        relatedTerms: JSON.stringify([{ term: 'pico', relationship: 'synonym' }]),
        commonPhrases: JSON.stringify([{ spanish: 'el pico del pájaro', english: 'the bird\'s beak' }]),
        usageExamples: JSON.stringify(['El pico es amarillo', 'Un pico largo'])
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockEnrichment]
      });

      const response = await request(app)
        .get('/api/vocabulary/enrichment/pico')
        .expect(200);

      expect(response.body).toMatchObject({
        etymology: 'From Latin picarium',
        mnemonic: 'Think of a peak - pointed like a beak'
      });
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should generate and cache enrichment if not found', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Cache miss
        .mockResolvedValueOnce({ rows: [] }); // INSERT success

      const response = await request(app)
        .get('/api/vocabulary/enrichment/ala')
        .expect(200);

      expect(response.body).toHaveProperty('etymology');
      expect(response.body).toHaveProperty('mnemonic');
      expect(response.body).toHaveProperty('relatedTerms');
      expect(response.body.etymology).toContain('ala');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in term', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/vocabulary/enrichment/pluma%20pequeña')
        .expect(200);

      expect(response.body.etymology).toContain('pluma pequeña');
    });

    it('should store JSON arrays correctly', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/vocabulary/enrichment/cola')
        .expect(200);

      const insertCall = (pool.query as jest.Mock).mock.calls[1];
      const relatedTermsParam = insertCall[1][3];
      const phrasesParam = insertCall[1][4];
      const examplesParam = insertCall[1][5];

      expect(() => JSON.parse(relatedTermsParam)).not.toThrow();
      expect(() => JSON.parse(phrasesParam)).not.toThrow();
      expect(() => JSON.parse(examplesParam)).not.toThrow();
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .get('/api/vocabulary/enrichment/test')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch vocabulary enrichment');
    });
  });

  describe('POST /api/vocabulary/track-interaction', () => {
    it('should track vocabulary interaction successfully', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const interactionData = {
        sessionId: 'session-123',
        annotationId: 456,  // Must be positive integer per schema
        spanishTerm: 'pico',
        disclosureLevel: 2
      };

      const response = await request(app)
        .post('/api/vocabulary/track-interaction')
        .send(interactionData)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vocabulary_interactions'),
        ['session-123', 456, 'pico', 2]
      );
    });

    it('should handle ON CONFLICT gracefully', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/vocabulary/track-interaction')
        .send({
          sessionId: 'session-123',
          annotationId: 456,  // Must be positive integer per schema
          spanishTerm: 'ala',
          disclosureLevel: 1
        })
        .expect(200);

      const queryCall = (pool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('ON CONFLICT DO NOTHING');
    });

    it('should reject requests missing required fields', async () => {
      // All fields are required per schema: sessionId, annotationId, spanishTerm, disclosureLevel
      const response = await request(app)
        .post('/api/vocabulary/track-interaction')
        .send({
          sessionId: 'session-123',
          spanishTerm: 'cola'
          // Missing annotationId and disclosureLevel
        })
        .expect(400);  // Validation should fail

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Insert failed'));

      const response = await request(app)
        .post('/api/vocabulary/track-interaction')
        .send({
          sessionId: 'session-123',
          annotationId: 789,
          spanishTerm: 'test',
          disclosureLevel: 1
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to track interaction');
    });
  });

  describe('GET /api/vocabulary/session-progress/:sessionId', () => {
    it('should return session vocabulary progress', async () => {
      const mockProgress = {
        termsViewed: '15',
        maxLevel: '3',
        totalInteractions: '42'
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockProgress]
      });

      const response = await request(app)
        .get('/api/vocabulary/session-progress/session-123')
        .expect(200);

      // Service parses strings to integers
      expect(response.body).toMatchObject({
        termsViewed: 15,
        maxLevel: 3,
        totalInteractions: 42
      });
    });

    it('should handle sessions with no interactions', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/vocabulary/session-progress/empty-session')
        .expect(200);

      expect(response.body).toMatchObject({
        termsViewed: 0,
        maxLevel: 0,
        totalInteractions: 0
      });
    });

    it('should use sessionId parameter correctly', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ termsViewed: '5', maxLevel: '2', totalInteractions: '10' }]
      });

      const response = await request(app)
        .get('/api/vocabulary/session-progress/test-session-456')
        .expect(200);

      // Verify correct response
      expect(response.body.termsViewed).toBe(5);
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['test-session-456']
      );
    });

    it('should count distinct annotations', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ termsViewed: '8', maxLevel: '3', totalInteractions: '20' }]
      });

      const response = await request(app)
        .get('/api/vocabulary/session-progress/session-123')
        .expect(200);

      // Verify service returned parsed integers
      expect(response.body.termsViewed).toBe(8);

      const queryCall = (pool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('COUNT(DISTINCT annotation_id)');
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Query failed'));

      const response = await request(app)
        .get('/api/vocabulary/session-progress/session-123')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch session progress');
    });
  });
});
