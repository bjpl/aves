/**
 * Species Routes Tests
 * Comprehensive test suite for species-related API endpoints
 */

import request from 'supertest';
import express from 'express';
import { QueryResult } from 'pg';

// Mock dependencies BEFORE importing the router
jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Import after mocking
import speciesRouter from '../../routes/species';
import { pool } from '../../database/connection';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', speciesRouter);

// Mock the pool.query function
const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

// Test data
const mockSpeciesData = [
  {
    id: 1,
    scientificName: 'Anas platyrhynchos',
    spanishName: 'Ánade Real',
    englishName: 'Mallard',
    orderName: 'Anseriformes',
    familyName: 'Anatidae',
    genus: 'Anas',
    sizeCategory: 'medium',
    primaryColors: ['brown', 'green'],
    habitats: ['wetland', 'lake'],
    conservationStatus: 'LC',
    descriptionSpanish: 'Pato común de agua dulce',
    descriptionEnglish: 'Common freshwater duck',
    funFact: 'Males have distinctive green heads',
    annotationCount: '42',
    primaryImageUrl: 'https://example.com/mallard.jpg'
  },
  {
    id: 2,
    scientificName: 'Passer domesticus',
    spanishName: 'Gorrión Común',
    englishName: 'House Sparrow',
    orderName: 'Passeriformes',
    familyName: 'Passeridae',
    genus: 'Passer',
    sizeCategory: 'small',
    primaryColors: ['brown', 'gray'],
    habitats: ['urban', 'grassland'],
    conservationStatus: 'LC',
    descriptionSpanish: 'Ave urbana muy común',
    descriptionEnglish: 'Very common urban bird',
    funFact: 'Found in most human settlements',
    annotationCount: '28',
    primaryImageUrl: null
  }
];

describe('Species Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/species', () => {
    it('should return 200 status code', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should return JSON with data array', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return species with all required fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      expect(response.body.data).toHaveLength(2);

      // Verify first species has required fields
      const species = response.body.data[0];
      expect(species).toHaveProperty('id');
      expect(species).toHaveProperty('scientificName');
      expect(species).toHaveProperty('spanishName');
      expect(species).toHaveProperty('englishName');
      expect(species).toHaveProperty('orderName');
      expect(species).toHaveProperty('familyName');

      // Verify field values
      expect(species.id).toBe(1);
      expect(species.scientificName).toBe('Anas platyrhynchos');
      expect(species.spanishName).toBe('Ánade Real');
      expect(species.englishName).toBe('Mallard');
    });

    it('should include annotationCount for each species', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      response.body.data.forEach((species: any) => {
        expect(species).toHaveProperty('annotationCount');
        expect(typeof species.annotationCount === 'string' || typeof species.annotationCount === 'number').toBe(true);
      });

      expect(response.body.data[0].annotationCount).toBe('42');
      expect(response.body.data[1].annotationCount).toBe('28');
    });

    it('should include primaryImageUrl for each species (nullable)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      response.body.data.forEach((species: any) => {
        expect(species).toHaveProperty('primaryImageUrl');
      });

      // First species has image URL
      expect(response.body.data[0].primaryImageUrl).toBe('https://example.com/mallard.jpg');

      // Second species has no image URL
      expect(response.body.data[1].primaryImageUrl).toBeNull();
    });

    it('should execute correct SQL query', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      await request(app)
        .get('/api/species')
        .expect(200);

      expect(mockQuery).toHaveBeenCalledTimes(1);

      const sqlQuery = mockQuery.mock.calls[0][0] as string;

      // Verify query structure
      expect(sqlQuery).toContain('SELECT');
      expect(sqlQuery).toContain('FROM species s');
      expect(sqlQuery).toContain('LEFT JOIN images i ON i.species_id = s.id');
      expect(sqlQuery).toContain('GROUP BY s.id');
      expect(sqlQuery).toContain('ORDER BY s.spanish_name ASC');
      expect(sqlQuery).toContain('COUNT(DISTINCT i.id) as "annotationCount"');
      expect(sqlQuery).toContain('primaryImageUrl');
    });

    it('should return empty array when no species exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.data).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/species')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to fetch species');
    });

    it('should handle database timeout errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout exceeded'));

      const response = await request(app)
        .get('/api/species')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch species');
    });

    it('should include optional fields when present', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      const species = response.body.data[0];

      // Verify optional fields are included
      expect(species).toHaveProperty('genus');
      expect(species).toHaveProperty('sizeCategory');
      expect(species).toHaveProperty('primaryColors');
      expect(species).toHaveProperty('habitats');
      expect(species).toHaveProperty('conservationStatus');
      expect(species).toHaveProperty('descriptionSpanish');
      expect(species).toHaveProperty('descriptionEnglish');
      expect(species).toHaveProperty('funFact');
    });
  });

  describe('GET /api/species/:id/image', () => {
    const testSpeciesId = '1';
    const mockImageData = {
      url: 'https://example.com/mallard-full.jpg',
      thumbnail_url: 'https://example.com/mallard-thumb.jpg'
    };

    it('should return 302 redirect when image exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockImageData],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(302);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(mockImageData.url);
    });

    it('should redirect to thumbnail_url when url is null', async () => {
      const imageWithOnlyThumbnail = {
        url: null,
        thumbnail_url: 'https://example.com/mallard-thumb.jpg'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [imageWithOnlyThumbnail],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(302);

      expect(response.headers.location).toBe(imageWithOnlyThumbnail.thumbnail_url);
    });

    it('should return 404 when no image found for species', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No image found for this species');
    });

    it('should return 404 when image URL is not available', async () => {
      const imageWithNoUrls = {
        url: null,
        thumbnail_url: null
      };

      mockQuery.mockResolvedValueOnce({
        rows: [imageWithNoUrls],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(404);

      expect(response.body.error).toBe('Image URL not available');
    });

    it('should return 404 when image URL is local path', async () => {
      const imageWithLocalPath = {
        url: '/local/path/to/image.jpg',
        thumbnail_url: null
      };

      mockQuery.mockResolvedValueOnce({
        rows: [imageWithLocalPath],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(404);

      expect(response.body.error).toBe('Image URL not available');
    });

    it('should execute correct SQL query with species ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockImageData],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(302);

      expect(mockQuery).toHaveBeenCalledTimes(1);

      const [sqlQuery, params] = mockQuery.mock.calls[0];

      // Verify query structure
      expect(sqlQuery).toContain('SELECT url, thumbnail_url');
      expect(sqlQuery).toContain('FROM images');
      expect(sqlQuery).toContain('WHERE species_id = $1');
      expect(sqlQuery).toContain('ORDER BY annotation_count DESC NULLS LAST');
      expect(sqlQuery).toContain('LIMIT 1');

      // Verify parameters
      expect(params).toEqual([testSpeciesId]);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to fetch species image');
    });

    it('should handle non-numeric species ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species/invalid-id/image')
        .expect(404);

      expect(response.body.error).toBe('No image found for this species');
    });

    it('should prioritize images with highest annotation_count', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockImageData],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(302);

      const sqlQuery = mockQuery.mock.calls[0][0] as string;

      // Verify ordering prioritizes annotation_count
      expect(sqlQuery).toContain('ORDER BY annotation_count DESC NULLS LAST, created_at DESC');
    });

    it('should redirect to HTTPS URLs correctly', async () => {
      const httpsImage = {
        url: 'https://secure.example.com/image.jpg',
        thumbnail_url: null
      };

      mockQuery.mockResolvedValueOnce({
        rows: [httpsImage],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(302);

      expect(response.headers.location).toBe('https://secure.example.com/image.jpg');
    });

    it('should redirect to HTTP URLs correctly', async () => {
      const httpImage = {
        url: 'http://example.com/image.jpg',
        thumbnail_url: null
      };

      mockQuery.mockResolvedValueOnce({
        rows: [httpImage],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get(`/api/species/${testSpeciesId}/image`)
        .expect(302);

      expect(response.headers.location).toBe('http://example.com/image.jpg');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large species datasets', async () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        ...mockSpeciesData[0],
        id: i + 1,
        scientificName: `Species ${i + 1}`,
        annotationCount: String(i)
      }));

      mockQuery.mockResolvedValueOnce({
        rows: largeDataset,
        command: 'SELECT',
        rowCount: largeDataset.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      expect(response.body.data).toHaveLength(1000);
    });

    it('should handle species with special characters in names', async () => {
      const specialCharSpecies = [{
        ...mockSpeciesData[0],
        spanishName: 'Águila Real',
        scientificName: 'Aquila chrysaëtos',
        englishName: "Golden Eagle's Subspecies"
      }];

      mockQuery.mockResolvedValueOnce({
        rows: specialCharSpecies,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      expect(response.body.data[0].spanishName).toBe('Águila Real');
      expect(response.body.data[0].scientificName).toBe('Aquila chrysaëtos');
    });

    it('should handle concurrent requests to species list', async () => {
      mockQuery.mockResolvedValue({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/species')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });
    });

    it('should handle concurrent requests to species images', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ url: 'https://example.com/image.jpg', thumbnail_url: null }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/species/1/image')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('https://example.com/image.jpg');
      });
    });

    it('should handle null values in optional fields', async () => {
      const speciesWithNulls = [{
        id: 1,
        scientificName: 'Test species',
        spanishName: 'Especie de prueba',
        englishName: 'Test Species',
        orderName: 'Testiformes',
        familyName: 'Testidae',
        genus: null,
        sizeCategory: null,
        primaryColors: [],
        habitats: [],
        conservationStatus: null,
        descriptionSpanish: null,
        descriptionEnglish: null,
        funFact: null,
        annotationCount: '0',
        primaryImageUrl: null
      }];

      mockQuery.mockResolvedValueOnce({
        rows: speciesWithNulls,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      const species = response.body.data[0];
      expect(species.genus).toBeNull();
      expect(species.sizeCategory).toBeNull();
      expect(species.conservationStatus).toBeNull();
      expect(species.primaryImageUrl).toBeNull();
    });
  });

  describe('Response Structure Validation', () => {
    it('should return consistent JSON structure for species list', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      expect(response.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            scientificName: expect.any(String),
            spanishName: expect.any(String),
            englishName: expect.any(String),
            annotationCount: expect.anything(),
            primaryImageUrl: expect.anything()
          })
        ])
      });
    });

    it('should not leak internal database structure', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockSpeciesData,
        command: 'SELECT',
        rowCount: mockSpeciesData.length,
        oid: 0,
        fields: []
      } as QueryResult);

      const response = await request(app)
        .get('/api/species')
        .expect(200);

      const species = response.body.data[0];

      // Verify camelCase naming (not snake_case)
      expect(species).toHaveProperty('scientificName');
      expect(species).not.toHaveProperty('scientific_name');
      expect(species).toHaveProperty('spanishName');
      expect(species).not.toHaveProperty('spanish_name');
      expect(species).toHaveProperty('primaryImageUrl');
      expect(species).not.toHaveProperty('primary_image_url');
    });
  });
});
