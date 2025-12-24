/**
 * Image Processing Service
 *
 * CONCEPT: Centralized service for image processing, optimization, and storage
 * WHY: Isolates Sharp image processing logic, making it testable and reusable
 * PATTERN: Service layer with configurable processing options
 *
 * Features:
 * - Image resizing and optimization
 * - Thumbnail generation
 * - Format conversion (to JPEG)
 * - File system management
 * - Configurable quality and dimensions
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { info, error as logError } from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface ProcessedImageResult {
  imagePath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  size: number;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailQuality?: number;
}

export interface ImageProcessingConfig {
  uploadBaseDir: string;
  imagesDir: string;
  thumbnailsDir: string;
  maxImageWidth: number;
  maxImageHeight: number;
  jpegQuality: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  thumbnailQuality: number;
  maxFileSize: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ImageProcessingConfig = {
  uploadBaseDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  imagesDir: 'images',
  thumbnailsDir: 'thumbnails',
  maxImageWidth: 1200,
  maxImageHeight: 900,
  jpegQuality: 85,
  thumbnailWidth: 400,
  thumbnailHeight: 300,
  thumbnailQuality: 80,
  maxFileSize: 10 * 1024 * 1024 // 10MB
};

// ============================================================================
// Service Implementation
// ============================================================================

export class ImageProcessingService {
  private readonly config: ImageProcessingConfig;
  private readonly imagesDirPath: string;
  private readonly thumbnailsDirPath: string;

  constructor(config: Partial<ImageProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.imagesDirPath = path.join(this.config.uploadBaseDir, this.config.imagesDir);
    this.thumbnailsDirPath = path.join(this.config.uploadBaseDir, this.config.thumbnailsDir);

    // Ensure directories exist on initialization
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      this.config.uploadBaseDir,
      this.imagesDirPath,
      this.thumbnailsDirPath
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        info('Created upload directory', { dir });
      }
    });
  }

  /**
   * Generate a unique filename for an image
   */
  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const baseName = path.basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);

    return `${timestamp}_${randomStr}_${baseName}.jpg`;
  }

  /**
   * Process and save an uploaded image
   *
   * @param buffer - Image buffer to process
   * @param originalName - Original filename (for generating output name)
   * @param options - Optional processing parameters
   * @returns Processed image metadata with paths
   * @throws Error if processing fails
   */
  async processAndSave(
    buffer: Buffer,
    originalName: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImageResult> {
    try {
      // Merge options with defaults
      const maxWidth = options.maxWidth || this.config.maxImageWidth;
      const maxHeight = options.maxHeight || this.config.maxImageHeight;
      const quality = options.quality || this.config.jpegQuality;
      const thumbWidth = options.thumbnailWidth || this.config.thumbnailWidth;
      const thumbHeight = options.thumbnailHeight || this.config.thumbnailHeight;
      const thumbQuality = options.thumbnailQuality || this.config.thumbnailQuality;

      // Generate unique filename
      const filename = this.generateFilename(originalName);
      const imagePath = path.join(this.imagesDirPath, filename);
      const thumbnailPath = path.join(this.thumbnailsDirPath, filename);

      // Process main image - resize and optimize
      const mainImage = await sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality })
        .toFile(imagePath);

      // Create thumbnail
      await sharp(buffer)
        .resize(thumbWidth, thumbHeight, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: thumbQuality })
        .toFile(thumbnailPath);

      info('Image processed and saved', {
        filename,
        originalSize: buffer.length,
        processedSize: mainImage.size,
        dimensions: { width: mainImage.width, height: mainImage.height }
      });

      return {
        imagePath: `/uploads/${this.config.imagesDir}/${filename}`,
        thumbnailPath: `/uploads/${this.config.thumbnailsDir}/${filename}`,
        width: mainImage.width,
        height: mainImage.height,
        size: mainImage.size
      };

    } catch (err) {
      const error = err as Error;
      logError('Image processing failed', error, { originalName });
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Process an image from a URL
   *
   * @param imageUrl - URL of the image to download and process
   * @param originalName - Original filename (for generating output name)
   * @param options - Optional processing parameters
   * @returns Processed image metadata with paths
   * @throws Error if download or processing fails
   */
  async processFromUrl(
    imageUrl: string,
    originalName: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImageResult> {
    try {
      // Download image as buffer
      const axios = await import('axios');
      const response = await axios.default.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const buffer = Buffer.from(response.data);

      // Validate file size
      if (buffer.length > this.config.maxFileSize) {
        throw new Error(
          `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds ${(this.config.maxFileSize / 1024 / 1024)}MB limit`
        );
      }

      // Process the downloaded buffer
      return await this.processAndSave(buffer, originalName, options);

    } catch (err) {
      const error = err as Error;
      logError('Failed to process image from URL', error, { imageUrl });
      throw new Error(`Failed to process image from URL: ${error.message}`);
    }
  }

  /**
   * Delete an image and its thumbnail
   *
   * @param imagePath - Relative path to the image (e.g., "/uploads/images/file.jpg")
   * @returns true if deletion was successful
   */
  async deleteImage(imagePath: string): Promise<boolean> {
    try {
      // Extract filename from path
      const filename = path.basename(imagePath);

      // Build full paths
      const fullImagePath = path.join(this.imagesDirPath, filename);
      const fullThumbnailPath = path.join(this.thumbnailsDirPath, filename);

      // Delete files if they exist
      let deleted = false;

      if (fs.existsSync(fullImagePath)) {
        fs.unlinkSync(fullImagePath);
        deleted = true;
        info('Deleted image file', { path: fullImagePath });
      }

      if (fs.existsSync(fullThumbnailPath)) {
        fs.unlinkSync(fullThumbnailPath);
        info('Deleted thumbnail file', { path: fullThumbnailPath });
      }

      return deleted;

    } catch (err) {
      const error = err as Error;
      logError('Failed to delete image', error, { imagePath });
      return false;
    }
  }

  /**
   * Validate image buffer format and size
   *
   * @param buffer - Image buffer to validate
   * @returns true if valid
   * @throws Error if validation fails
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      // Check file size
      if (buffer.length > this.config.maxFileSize) {
        throw new Error(
          `File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds ${(this.config.maxFileSize / 1024 / 1024)}MB limit`
        );
      }

      // Try to get metadata to validate it's a valid image
      const metadata = await sharp(buffer).metadata();

      // Check format
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!metadata.format || !allowedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported format: ${metadata.format}. Only JPEG, PNG, and WebP are allowed.`);
      }

      return true;

    } catch (err) {
      const error = err as Error;
      logError('Image validation failed', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ImageProcessingConfig {
    return { ...this.config };
  }

  /**
   * Get allowed MIME types for uploads
   */
  getAllowedMimeTypes(): string[] {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  }

  /**
   * Get directory paths
   */
  getDirectoryPaths(): {
    base: string;
    images: string;
    thumbnails: string;
  } {
    return {
      base: this.config.uploadBaseDir,
      images: this.imagesDirPath,
      thumbnails: this.thumbnailsDirPath
    };
  }
}

// ============================================================================
// Singleton Instance (for backward compatibility)
// ============================================================================

export const imageProcessingService = new ImageProcessingService();
