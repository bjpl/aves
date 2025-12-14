import request from 'supertest';
import express from 'express';
import speciesRouter from '../species';
import { pool } from '../../database/connection';

// Mock the database pool
jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api', speciesRouter);

describe('GET /api/species/:id/similar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return similar species based on family', async () => {
    // Mock the current species query
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{
          family_name: 'Trochilidae',
          order_name: 'Apodiformes',
          habitats: ['Forest', 'Gardens']
        }]
      })
      // Mock the similar species query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '2',
            scientificName: 'Archilochus colubris',
            spanishName: 'Colibrí de Garganta Rubí',
            englishName: 'Ruby-throated Hummingbird',
            familyName: 'Trochilidae',
            orderName: 'Apodiformes',
            primaryImageUrl: 'https://example.com/bird.jpg',
            annotationCount: 5
          }
        ]
      });

    const response = await request(app)
      .get('/api/species/1/similar')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('similarSpecies');
    expect(Array.isArray(response.body.similarSpecies)).toBe(true);
  });

  it('should limit similar species to 4 results', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{
          family_name: 'Trochilidae',
          order_name: 'Apodiformes',
          habitats: ['Forest']
        }]
      })
      .mockResolvedValueOnce({
        rows: [
          { id: '2', scientificName: 'Species 2', englishName: 'Bird 2' },
          { id: '3', scientificName: 'Species 3', englishName: 'Bird 3' },
          { id: '4', scientificName: 'Species 4', englishName: 'Bird 4' },
          { id: '5', scientificName: 'Species 5', englishName: 'Bird 5' }
        ]
      });

    const response = await request(app)
      .get('/api/species/1/similar')
      .expect(200);

    expect(response.body.similarSpecies.length).toBeLessThanOrEqual(4);
  });

  it('should return 404 for non-existent species', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: []
    });

    const response = await request(app)
      .get('/api/species/999999/similar')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Species not found');
  });

  it('should not include the current species in results', async () => {
    const speciesId = '1';
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{
          family_name: 'Trochilidae',
          order_name: 'Apodiformes',
          habitats: ['Forest']
        }]
      })
      .mockResolvedValueOnce({
        rows: [
          { id: '2', scientificName: 'Species 2', englishName: 'Bird 2' },
          { id: '3', scientificName: 'Species 3', englishName: 'Bird 3' }
        ]
      });

    const response = await request(app)
      .get(`/api/species/${speciesId}/similar`)
      .expect(200);

    const similarIds = response.body.similarSpecies.map((s: any) => s.id.toString());
    expect(similarIds).not.toContain(speciesId);
  });

  it('should include required species fields', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{
          family_name: 'Trochilidae',
          order_name: 'Apodiformes',
          habitats: ['Forest']
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: '2',
          scientificName: 'Archilochus colubris',
          spanishName: 'Colibrí',
          englishName: 'Ruby-throated Hummingbird',
          familyName: 'Trochilidae',
          orderName: 'Apodiformes'
        }]
      });

    const response = await request(app)
      .get('/api/species/1/similar')
      .expect(200);

    if (response.body.similarSpecies.length > 0) {
      const species = response.body.similarSpecies[0];
      expect(species).toHaveProperty('id');
      expect(species).toHaveProperty('scientificName');
      expect(species).toHaveProperty('spanishName');
      expect(species).toHaveProperty('englishName');
      expect(species).toHaveProperty('familyName');
      expect(species).toHaveProperty('orderName');
    }
  });

  it('should handle database errors gracefully', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app)
      .get('/api/species/1/similar')
      .expect(500);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Failed to fetch similar species');
  });
});
