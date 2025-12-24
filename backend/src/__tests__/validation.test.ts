/**
 * Comprehensive validation tests for Zod schemas and middleware
 * Tests both valid inputs and various invalid inputs
 */

import {
  registerSchema,
  loginSchema,
  exerciseResultSchema,
  exerciseSessionStartSchema,
  vocabularyInteractionSchema,
  vocabularyEnrichmentSchema,
  createAnnotationSchema,
  updateAnnotationSchema,
  createSpeciesSchema,
  uploadImageMetadataSchema,
  paginationSchema,
  searchQuerySchema
} from '../validation/schemas';

describe('Validation Schemas', () => {
  // ============================================================================
  // AUTH SCHEMAS TESTS
  // ============================================================================

  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser'
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'SecurePass123!',
        username: 'testuser'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow('Invalid email format');
    });

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'securepass123!',
        username: 'testuser'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject password without number', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass!',
        username: 'testuser'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject password without special character', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123',
        username: 'testuser'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Pass1!',
        username: 'testuser'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject username with invalid characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'test@user'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword'
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password'
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  // ============================================================================
  // EXERCISE SCHEMAS TESTS
  // ============================================================================

  describe('exerciseSessionStartSchema', () => {
    it('should accept valid session start data', () => {
      const validData = {
        sessionId: 'session_12345'
      };

      expect(() => exerciseSessionStartSchema.parse(validData)).not.toThrow();
    });

    it('should accept empty data (optional sessionId)', () => {
      const validData = {};

      expect(() => exerciseSessionStartSchema.parse(validData)).not.toThrow();
    });
  });

  describe('exerciseResultSchema', () => {
    it('should accept valid exercise result', () => {
      const validData = {
        sessionId: 'session_12345',
        exerciseType: 'visual_discrimination',
        spanishTerm: 'pluma',
        userAnswer: 'feather',
        isCorrect: true,
        timeTaken: 5000
      };

      expect(() => exerciseResultSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid exercise type', () => {
      const invalidData = {
        sessionId: 'session_12345',
        exerciseType: 'invalid_type',
        spanishTerm: 'pluma',
        userAnswer: 'feather',
        isCorrect: true,
        timeTaken: 5000
      };

      expect(() => exerciseResultSchema.parse(invalidData)).toThrow();
    });

    it('should reject negative time taken', () => {
      const invalidData = {
        sessionId: 'session_12345',
        exerciseType: 'visual_discrimination',
        spanishTerm: 'pluma',
        userAnswer: 'feather',
        isCorrect: true,
        timeTaken: -1000
      };

      expect(() => exerciseResultSchema.parse(invalidData)).toThrow();
    });

    it('should reject unrealistic time taken', () => {
      const invalidData = {
        sessionId: 'session_12345',
        exerciseType: 'visual_discrimination',
        spanishTerm: 'pluma',
        userAnswer: 'feather',
        isCorrect: true,
        timeTaken: 99999999
      };

      expect(() => exerciseResultSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty spanish term', () => {
      const invalidData = {
        sessionId: 'session_12345',
        exerciseType: 'visual_discrimination',
        spanishTerm: '',
        userAnswer: 'feather',
        isCorrect: true,
        timeTaken: 5000
      };

      expect(() => exerciseResultSchema.parse(invalidData)).toThrow();
    });

    it('should accept optional annotationId', () => {
      const validData = {
        sessionId: 'session_12345',
        exerciseType: 'visual_discrimination',
        annotationId: 42,
        spanishTerm: 'pluma',
        userAnswer: 'feather',
        isCorrect: true,
        timeTaken: 5000
      };

      expect(() => exerciseResultSchema.parse(validData)).not.toThrow();
    });
  });

  // ============================================================================
  // VOCABULARY SCHEMAS TESTS
  // ============================================================================

  describe('vocabularyInteractionSchema', () => {
    it('should accept valid interaction data', () => {
      const validData = {
        sessionId: 'session_12345',
        annotationId: 42,
        spanishTerm: 'pluma',
        disclosureLevel: 3
      };

      expect(() => vocabularyInteractionSchema.parse(validData)).not.toThrow();
    });

    it('should reject negative disclosure level', () => {
      const invalidData = {
        sessionId: 'session_12345',
        annotationId: 42,
        spanishTerm: 'pluma',
        disclosureLevel: -1
      };

      expect(() => vocabularyInteractionSchema.parse(invalidData)).toThrow();
    });

    it('should reject disclosure level above 5', () => {
      const invalidData = {
        sessionId: 'session_12345',
        annotationId: 42,
        spanishTerm: 'pluma',
        disclosureLevel: 6
      };

      expect(() => vocabularyInteractionSchema.parse(invalidData)).toThrow();
    });

    it('should reject non-positive annotation ID', () => {
      const invalidData = {
        sessionId: 'session_12345',
        annotationId: 0,
        spanishTerm: 'pluma',
        disclosureLevel: 3
      };

      expect(() => vocabularyInteractionSchema.parse(invalidData)).toThrow();
    });
  });

  describe('vocabularyEnrichmentSchema', () => {
    it('should accept valid term', () => {
      const validData = {
        term: 'pluma'
      };

      expect(() => vocabularyEnrichmentSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty term', () => {
      const invalidData = {
        term: ''
      };

      expect(() => vocabularyEnrichmentSchema.parse(invalidData)).toThrow();
    });
  });

  // ============================================================================
  // ANNOTATION SCHEMAS TESTS
  // ============================================================================

  describe('createAnnotationSchema', () => {
    it('should accept valid annotation data', () => {
      const validData = {
        imageId: 1,
        speciesId: 5,
        boundingBox: {
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.4
        },
        bodyPart: 'wing',
        color: 'blue',
        pattern: 'striped',
        spanishTerm: 'ala',
        englishTranslation: 'wing',
        etymology: 'From Latin',
        mnemonic: 'Remember by...'
      };

      expect(() => createAnnotationSchema.parse(validData)).not.toThrow();
    });

    it('should reject bounding box coordinates outside 0-1 range', () => {
      const invalidData = {
        imageId: 1,
        boundingBox: {
          x: 1.5,
          y: 0.2,
          width: 0.3,
          height: 0.4
        },
        spanishTerm: 'ala',
        englishTranslation: 'wing'
      };

      expect(() => createAnnotationSchema.parse(invalidData)).toThrow();
    });

    it('should reject negative bounding box values', () => {
      const invalidData = {
        imageId: 1,
        boundingBox: {
          x: -0.1,
          y: 0.2,
          width: 0.3,
          height: 0.4
        },
        spanishTerm: 'ala',
        englishTranslation: 'wing'
      };

      expect(() => createAnnotationSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        imageId: 1,
        boundingBox: {
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.4
        },
        spanishTerm: 'ala'
        // Missing englishTranslation
      };

      expect(() => createAnnotationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('updateAnnotationSchema', () => {
    it('should accept partial update data', () => {
      const validData = {
        spanishTerm: 'pluma'
      };

      expect(() => updateAnnotationSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty update data', () => {
      const invalidData = {};

      expect(() => updateAnnotationSchema.parse(invalidData)).toThrow();
    });
  });

  // ============================================================================
  // SPECIES SCHEMAS TESTS
  // ============================================================================

  describe('createSpeciesSchema', () => {
    it('should accept valid species data', () => {
      const validData = {
        commonName: 'Blue Jay',
        scientificName: 'Cyanocitta cristata',
        spanishName: 'Arrendajo Azul',
        family: 'Corvidae',
        habitat: 'Forests and woodlands',
        description: 'A beautiful blue bird',
        conservationStatus: 'LC'
      };

      expect(() => createSpeciesSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid conservation status', () => {
      const invalidData = {
        commonName: 'Blue Jay',
        scientificName: 'Cyanocitta cristata',
        conservationStatus: 'INVALID'
      };

      expect(() => createSpeciesSchema.parse(invalidData)).toThrow();
    });

    it('should accept valid conservation statuses', () => {
      const statuses = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];

      statuses.forEach(status => {
        const validData = {
          commonName: 'Test Bird',
          scientificName: 'Testus birdus',
          conservationStatus: status
        };

        expect(() => createSpeciesSchema.parse(validData)).not.toThrow();
      });
    });
  });

  // ============================================================================
  // IMAGE SCHEMAS TESTS
  // ============================================================================

  describe('uploadImageMetadataSchema', () => {
    it('should accept valid image metadata', () => {
      const validData = {
        speciesId: 5,
        photographerName: 'John Doe',
        location: 'Central Park, New York',
        dateTaken: '2024-01-15T10:30:00Z',
        license: 'CC-BY',
        sourceUrl: 'https://example.com/image.jpg'
      };

      expect(() => uploadImageMetadataSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid license', () => {
      const invalidData = {
        license: 'INVALID_LICENSE'
      };

      expect(() => uploadImageMetadataSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        sourceUrl: 'not-a-url'
      };

      expect(() => uploadImageMetadataSchema.parse(invalidData)).toThrow();
    });

    it('should accept valid license types', () => {
      const licenses = ['CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-NC-SA', 'All Rights Reserved'];

      licenses.forEach(license => {
        const validData = { license };
        expect(() => uploadImageMetadataSchema.parse(validData)).not.toThrow();
      });
    });
  });

  // ============================================================================
  // QUERY PARAMETER SCHEMAS TESTS
  // ============================================================================

  describe('paginationSchema', () => {
    it('should accept valid pagination params', () => {
      const validData = {
        page: '1',
        limit: '20'
      };

      expect(() => paginationSchema.parse(validData)).not.toThrow();
    });

    it('should transform string numbers to actual numbers', () => {
      const data = {
        page: '2',
        limit: '50'
      };

      const result = paginationSchema.parse(data);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should reject non-numeric page', () => {
      const invalidData = {
        page: 'abc'
      };

      expect(() => paginationSchema.parse(invalidData)).toThrow();
    });

    it('should reject limit over 100', () => {
      const invalidData = {
        limit: '150'
      };

      expect(() => paginationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('searchQuerySchema', () => {
    it('should accept valid search query', () => {
      const validData = {
        q: 'blue bird',
        page: '1',
        limit: '10'
      };

      expect(() => searchQuerySchema.parse(validData)).not.toThrow();
    });

    it('should reject empty search query', () => {
      const invalidData = {
        q: ''
      };

      expect(() => searchQuerySchema.parse(invalidData)).toThrow();
    });
  });
});
