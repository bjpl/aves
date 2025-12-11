/**
 * ImageRepository Tests
 * Comprehensive test suite for image and species database operations
 */

import { Pool } from 'pg';
import { ImageRepository, SpeciesData, ImageData } from '../../repositories/ImageRepository';

// Mock the database pool
const mockPool = {
  query: jest.fn()
} as unknown as Pool;

describe('ImageRepository', () => {
  let repository: ImageRepository;

  beforeEach(() => {
    repository = new ImageRepository(mockPool);
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Species Operations Tests
  // ==========================================================================

  describe('upsertSpecies', () => {
    const speciesData: SpeciesData = {
      scientificName: 'Anas platyrhynchos',
      englishName: 'Mallard',
      spanishName: 'Ánade Real',
      order: 'Anseriformes',
      family: 'Anatidae',
      habitats: ['wetland', 'lake'],
      sizeCategory: 'medium',
      primaryColors: ['green', 'brown'],
      conservationStatus: 'LC'
    };

    test('should insert new species successfully', async () => {
      const mockResult = {
        rows: [{ id: 'species-uuid-123' }]
      };

      (mockPool.query as jest.Mock).mockResolvedValue(mockResult);

      const speciesId = await repository.upsertSpecies(speciesData);

      expect(speciesId).toBe('species-uuid-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO species'),
        expect.arrayContaining([
          speciesData.scientificName,
          speciesData.englishName,
          speciesData.spanishName
        ])
      );
    });

    test('should update existing species on conflict', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'existing-uuid' }]
      });

      const speciesId = await repository.upsertSpecies(speciesData);

      expect(speciesId).toBe('existing-uuid');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (scientific_name)'),
        expect.any(Array)
      );
    });

    test('should use default conservation status when not provided', async () => {
      const dataWithoutStatus = { ...speciesData };
      delete dataWithoutStatus.conservationStatus;

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'species-uuid' }]
      });

      await repository.upsertSpecies(dataWithoutStatus);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['LC']) // Default value
      );
    });

    test('should throw error on database failure', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(repository.upsertSpecies(speciesData))
        .rejects.toThrow('Failed to upsert species');
    });
  });

  describe('getSpeciesById', () => {
    test('should retrieve species by ID successfully', async () => {
      const mockSpecies = {
        id: 'species-123',
        scientificName: 'Anas platyrhynchos',
        englishName: 'Mallard',
        spanishName: 'Ánade Real',
        order: 'Anseriformes',
        family: 'Anatidae',
        habitats: ['wetland'],
        sizeCategory: 'medium',
        primaryColors: ['green'],
        conservationStatus: 'LC',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockSpecies] });

      const result = await repository.getSpeciesById('species-123');

      expect(result).toEqual(mockSpecies);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['species-123']
      );
    });

    test('should return null when species not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getSpeciesById('nonexistent');

      expect(result).toBeNull();
    });

    test('should throw error on database failure', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.getSpeciesById('123'))
        .rejects.toThrow('Failed to get species');
    });
  });

  describe('getSpeciesByScientificName', () => {
    test('should retrieve species by scientific name', async () => {
      const mockSpecies = {
        id: 'species-123',
        scientificName: 'Anas platyrhynchos'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockSpecies] });

      const result = await repository.getSpeciesByScientificName('Anas platyrhynchos');

      expect(result).toEqual(mockSpecies);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE scientific_name = $1'),
        ['Anas platyrhynchos']
      );
    });

    test('should return null when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getSpeciesByScientificName('Unknown species');

      expect(result).toBeNull();
    });
  });

  describe('getSpeciesByIds', () => {
    test('should retrieve multiple species by IDs', async () => {
      const mockSpecies = [
        { id: 'species-1', englishName: 'Mallard' },
        { id: 'species-2', englishName: 'Robin' }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockSpecies });

      const result = await repository.getSpeciesByIds(['species-1', 'species-2']);

      expect(result).toEqual(mockSpecies);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ANY($1)'),
        [['species-1', 'species-2']]
      );
    });

    test('should return empty array for empty input', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getSpeciesByIds([]);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Image Operations Tests
  // ==========================================================================

  describe('upsertImageFromUnsplash', () => {
    const mockPhoto = {
      id: 'unsplash-123',
      urls: { regular: 'https://images.unsplash.com/photo-123' },
      width: 1200,
      height: 800,
      description: 'Beautiful bird',
      alt_description: 'Bird in nature',
      user: {
        name: 'John Photographer',
        username: 'johnphoto'
      }
    };

    test('should insert new image from Unsplash', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'image-uuid-123' }]
      });

      const imageId = await repository.upsertImageFromUnsplash(
        'species-123',
        mockPhoto,
        'Mallard'
      );

      expect(imageId).toBe('image-uuid-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO images'),
        expect.arrayContaining([
          'species-123',
          'unsplash-123',
          mockPhoto.urls.regular,
          1200,
          800
        ])
      );
    });

    test('should use alt_description when description is null', async () => {
      const photoWithoutDescription = { ...mockPhoto, description: null };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'image-uuid' }]
      });

      await repository.upsertImageFromUnsplash('species-123', photoWithoutDescription, 'Mallard');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockPhoto.alt_description])
      );
    });

    test('should use species name fallback when both descriptions are null', async () => {
      const photoNoDesc = { ...mockPhoto, description: null, alt_description: null };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'image-uuid' }]
      });

      await repository.upsertImageFromUnsplash('species-123', photoNoDesc, 'Mallard');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Mallard photograph'])
      );
    });

    test('should handle conflict and update on duplicate', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'existing-image' }]
      });

      const imageId = await repository.upsertImageFromUnsplash('species-123', mockPhoto, 'Mallard');

      expect(imageId).toBe('existing-image');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (unsplash_id)'),
        expect.any(Array)
      );
    });
  });

  describe('insertImage', () => {
    const imageData: ImageData = {
      speciesId: 'species-123',
      url: 'https://example.com/bird.jpg',
      width: 1200,
      height: 800,
      description: 'Test image',
      photographer: 'Test Photographer',
      photographerUsername: 'testphoto',
      thumbnailUrl: 'https://example.com/bird-thumb.jpg',
      qualityScore: 85
    };

    test('should insert image successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'image-123' }]
      });

      const imageId = await repository.insertImage(imageData);

      expect(imageId).toBe('image-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO images'),
        expect.arrayContaining([
          imageData.speciesId,
          null, // unsplashId
          imageData.url,
          imageData.width,
          imageData.height
        ])
      );
    });

    test('should handle optional fields as null', async () => {
      const minimalData = {
        speciesId: 'species-123',
        url: 'https://example.com/bird.jpg',
        width: 1200,
        height: 800
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'image-123' }]
      });

      await repository.insertImage(minimalData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, null, null]) // Optional fields as null
      );
    });
  });

  describe('updateImageQuality', () => {
    test('should update image quality score', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await repository.updateImageQuality('image-123', 90);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE images'),
        [90, 'image-123']
      );
    });

    test('should throw error on database failure', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(repository.updateImageQuality('image-123', 90))
        .rejects.toThrow('Failed to update image quality');
    });
  });

  describe('getImages', () => {
    test('should retrieve paginated images with default options', async () => {
      const mockImages = [
        { id: 'img-1', url: 'https://example.com/1.jpg' },
        { id: 'img-2', url: 'https://example.com/2.jpg' }
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '10' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockImages }); // Data query

      const result = await repository.getImages({});

      expect(result.total).toBe(10);
      expect(result.images).toEqual(mockImages);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should filter by species ID', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repository.getImages({ speciesId: 'species-123' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND i.species_id = $1'),
        expect.arrayContaining(['species-123'])
      );
    });

    test('should filter by annotation status', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repository.getImages({ annotationStatus: 'completed' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("COALESCE(a.status, 'unannotated')"),
        expect.arrayContaining(['completed'])
      );
    });

    test('should handle pagination correctly', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repository.getImages({ page: 3, limit: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET'),
        expect.arrayContaining([10, 20]) // limit, offset
      );
    });
  });

  describe('deleteImage', () => {
    test('should delete image successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await repository.deleteImage('image-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM images WHERE id = $1',
        ['image-123']
      );
    });

    test('should throw error on database failure', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      await expect(repository.deleteImage('image-123'))
        .rejects.toThrow('Failed to delete image');
    });
  });

  describe('bulkDeleteImages', () => {
    test('should delete multiple images', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 3 });

      const deletedCount = await repository.bulkDeleteImages([
        'image-1',
        'image-2',
        'image-3'
      ]);

      expect(deletedCount).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM images WHERE id = ANY($1)',
        [['image-1', 'image-2', 'image-3']]
      );
    });

    test('should return 0 when no images deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const deletedCount = await repository.bulkDeleteImages(['nonexistent']);

      expect(deletedCount).toBe(0);
    });
  });

  // ==========================================================================
  // Statistics Operations Tests
  // ==========================================================================

  describe('getImageStats', () => {
    test('should retrieve image statistics', async () => {
      const statsData = {
        total_images: '150',
        unique_species: '45',
        avg_quality: '87.5'
      };

      const annotationData = {
        annotated: '120',
        unannotated: '30'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [statsData] })
        .mockResolvedValueOnce({ rows: [annotationData] });

      const result = await repository.getImageStats();

      expect(result).toEqual({
        totalImages: 150,
        uniqueSpecies: 45,
        annotated: 120,
        unannotated: 30,
        averageQuality: 87.5
      });
    });

    test('should handle null average quality', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total_images: '0', unique_species: '0', avg_quality: null }] })
        .mockResolvedValueOnce({ rows: [{ annotated: '0', unannotated: '0' }] });

      const result = await repository.getImageStats();

      expect(result.averageQuality).toBeUndefined();
    });

    test('should throw error on database failure', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Stats query failed'));

      await expect(repository.getImageStats())
        .rejects.toThrow('Failed to get image stats');
    });
  });

  describe('getImageCountBySpecies', () => {
    test('should retrieve image counts per species', async () => {
      const mockCounts = [
        { speciesId: 's1', scientificName: 'Anas platyrhynchos', englishName: 'Mallard', imageCount: '15' },
        { speciesId: 's2', scientificName: 'Turdus migratorius', englishName: 'Robin', imageCount: '12' }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockCounts });

      const result = await repository.getImageCountBySpecies();

      expect(result).toEqual(mockCounts);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY s.id')
      );
    });

    test('should order by image count descending', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await repository.getImageCountBySpecies();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "imageCount" DESC')
      );
    });

    test('should exclude species with no images', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await repository.getImageCountBySpecies();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('HAVING COUNT(i.id) > 0')
      );
    });
  });
});
