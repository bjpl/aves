import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';
import FormData from 'form-data';

// PATTERN: Production-Scale Content Pipeline
// WHY: Handle large datasets efficiently
// CONCEPT: Stream processing for memory efficiency

interface ProductionConfig {
  strapiUrl: string;
  apiToken: string;
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  dataSource: 'csv' | 'api' | 'database';
  validationLevel: 'strict' | 'moderate' | 'lenient';
}

interface ContentSource {
  type: string;
  path?: string;
  url?: string;
  credentials?: any;
}

interface ValidationReport {
  total: number;
  valid: number;
  invalid: number;
  warnings: string[];
  errors: string[];
}

class ProductionContentIngester {
  private config: ProductionConfig;
  private strapiClient: any;
  private stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    startTime: Date.now()
  };
  private validationReport: ValidationReport = {
    total: 0,
    valid: 0,
    invalid: 0,
    warnings: [],
    errors: []
  };

  constructor(config: ProductionConfig) {
    this.config = config;
    this.strapiClient = axios.create({
      baseURL: `${config.strapiUrl}/api`,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // Main production ingestion pipeline
  async ingestFromSource(source: ContentSource): Promise<void> {
    console.log('🚀 Starting production content ingestion...');
    console.log(`📊 Configuration: Batch size=${this.config.batchSize}, Max concurrency=${this.config.maxConcurrency}`);

    try {
      switch (source.type) {
        case 'csv':
          await this.ingestFromCSV(source.path!);
          break;
        case 'api':
          await this.ingestFromAPI(source.url!, source.credentials);
          break;
        case 'database':
          await this.ingestFromDatabase(source.credentials);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      await this.generateReport();
      console.log('✅ Production ingestion completed');

    } catch (error) {
      console.error('❌ Production ingestion failed:', error);
      await this.handleFailure(error);
      throw error;
    }
  }

  // CSV ingestion with streaming
  private async ingestFromCSV(filePath: string): Promise<void> {
    console.log(`📁 Ingesting from CSV: ${filePath}`);

    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const transformer = new Transform({
      objectMode: true,
      transform: async (chunk, encoding, callback) => {
        try {
          await this.processBirdRecord(chunk);
          callback();
        } catch (error) {
          callback(error);
        }
      }
    });

    const stream = fs.createReadStream(filePath)
      .pipe(parser)
      .pipe(transformer);

    await promisify(pipeline)(stream);
  }

  // API ingestion with pagination
  private async ingestFromAPI(apiUrl: string, credentials: any): Promise<void> {
    console.log(`🌐 Ingesting from API: ${apiUrl}`);

    let page = 1;
    let hasMore = true;
    const headers = credentials ? { 'Authorization': `Bearer ${credentials.token}` } : {};

    while (hasMore) {
      try {
        const response = await axios.get(apiUrl, {
          headers,
          params: {
            page,
            limit: this.config.batchSize
          }
        });

        const data = response.data;

        // Process batch
        await this.processBatch(data.items || data.data || data);

        // Check for more pages
        hasMore = data.hasNextPage || (data.total && page * this.config.batchSize < data.total);
        page++;

        // Rate limiting
        await this.delay(1000);

      } catch (error) {
        console.error(`❌ Failed to fetch page ${page}:`, error);
        hasMore = false;
      }
    }
  }

  // Database ingestion with connection pooling
  private async ingestFromDatabase(credentials: any): Promise<void> {
    console.log('🗄️ Ingesting from database...');

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: credentials.connectionString,
      max: 5
    });

    try {
      // Example: Fetch birds from external database
      const query = `
        SELECT
          spanish_name,
          english_name,
          scientific_name,
          description,
          habitat,
          size,
          diet,
          conservation_status,
          difficulty_level,
          image_url,
          sound_url,
          metadata
        FROM birds
        WHERE active = true
        ORDER BY id
        LIMIT $1 OFFSET $2
      `;

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const result = await pool.query(query, [this.config.batchSize, offset]);

        if (result.rows.length === 0) {
          hasMore = false;
        } else {
          await this.processBatch(result.rows.map(this.transformDatabaseRecord));
          offset += this.config.batchSize;
        }

        // Progress update
        if (offset % 100 === 0) {
          this.printProgress();
        }
      }

    } finally {
      await pool.end();
    }
  }

  // Process batch with concurrency control
  private async processBatch(records: any[]): Promise<void> {
    const chunks = this.chunkArray(records, this.config.maxConcurrency);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(record => this.processRecordWithRetry(record))
      );
    }
  }

  // Process individual record with retry logic
  private async processRecordWithRetry(record: any, attempt = 1): Promise<void> {
    try {
      // Validate record
      const validation = await this.validateRecord(record);

      if (!validation.isValid) {
        this.validationReport.invalid++;
        this.validationReport.errors.push(`Invalid record: ${record.spanishName || record.title} - ${validation.errors.join(', ')}`);
        this.stats.skipped++;
        return;
      }

      // Transform and enrich data
      const enrichedData = await this.enrichRecord(record);

      // Ingest to Strapi
      await this.ingestToStrapi(enrichedData);

      this.stats.succeeded++;
      this.validationReport.valid++;

    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        console.log(`⚠️ Retry ${attempt}/${this.config.retryAttempts} for record: ${record.spanishName || record.title}`);
        await this.delay(1000 * attempt);
        return this.processRecordWithRetry(record, attempt + 1);
      }

      console.error(`❌ Failed after ${this.config.retryAttempts} attempts:`, error);
      this.stats.failed++;
      this.validationReport.errors.push(`Failed to process: ${record.spanishName || record.title}`);
    } finally {
      this.stats.processed++;
    }
  }

  // Process bird record
  private async processBirdRecord(record: any): Promise<void> {
    const birdData = {
      spanishName: record.spanish_name || record.spanishName,
      englishName: record.english_name || record.englishName,
      scientificName: record.scientific_name || record.scientificName,
      description: record.description,
      habitat: record.habitat,
      size: record.size,
      diet: record.diet,
      conservationStatus: this.mapConservationStatus(record.conservation_status),
      difficulty: this.mapDifficulty(record.difficulty || record.difficulty_level),
      regions: this.parseRegions(record.regions),
      funFacts: this.parseFunFacts(record.fun_facts)
    };

    await this.processRecordWithRetry(birdData);
  }

  // Validate record against schema
  private async validateRecord(record: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Required fields validation
    if (!record.spanishName && !record.title) {
      errors.push('Missing required field: spanishName or title');
    }

    // Field length validation
    if (record.spanishName?.length > 100) {
      errors.push('Spanish name exceeds maximum length');
    }

    // Enum validation
    if (record.difficulty && !['beginner', 'intermediate', 'advanced'].includes(record.difficulty)) {
      errors.push(`Invalid difficulty level: ${record.difficulty}`);
    }

    // Custom business rules
    if (this.config.validationLevel === 'strict') {
      if (!record.description || record.description.length < 50) {
        errors.push('Description too short (minimum 50 characters)');
      }

      if (!record.scientificName) {
        errors.push('Scientific name is required in strict mode');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Enrich record with additional data
  private async enrichRecord(record: any): Promise<any> {
    const enriched = { ...record };

    // Add timestamps
    enriched.importedAt = new Date().toISOString();

    // Fetch additional data if needed
    if (record.externalId) {
      try {
        const additionalData = await this.fetchAdditionalData(record.externalId);
        Object.assign(enriched, additionalData);
      } catch (error) {
        this.validationReport.warnings.push(`Could not fetch additional data for: ${record.spanishName || record.title}`);
      }
    }

    // Generate SEO-friendly slug
    if (record.spanishName) {
      enriched.slug = this.generateSlug(record.spanishName);
    }

    return enriched;
  }

  // Ingest to Strapi
  private async ingestToStrapi(data: any): Promise<void> {
    const endpoint = data.spanishName ? '/birds' : '/lessons';

    // Check if record already exists
    const existingQuery = data.spanishName
      ? `/birds?filters[spanishName][$eq]=${encodeURIComponent(data.spanishName)}`
      : `/lessons?filters[title][$eq]=${encodeURIComponent(data.title)}`;

    const existing = await this.strapiClient.get(existingQuery);

    if (existing.data.data.length > 0) {
      // Update existing record
      const id = existing.data.data[0].id;
      await this.strapiClient.put(`${endpoint}/${id}`, { data });
      console.log(`📝 Updated: ${data.spanishName || data.title}`);
    } else {
      // Create new record
      await this.strapiClient.post(endpoint, { data });
      console.log(`✅ Created: ${data.spanishName || data.title}`);
    }
  }

  // Helper methods
  private transformDatabaseRecord(row: any): any {
    return {
      spanishName: row.spanish_name,
      englishName: row.english_name,
      scientificName: row.scientific_name,
      description: row.description,
      habitat: row.habitat,
      size: row.size,
      diet: row.diet,
      conservationStatus: row.conservation_status,
      difficulty: row.difficulty_level,
      imageUrl: row.image_url,
      soundUrl: row.sound_url,
      metadata: row.metadata
    };
  }

  private mapConservationStatus(status: string): string {
    const mapping: Record<string, string> = {
      'LC': 'least_concern',
      'NT': 'near_threatened',
      'VU': 'vulnerable',
      'EN': 'endangered',
      'CR': 'critically_endangered',
      'EW': 'extinct_in_wild',
      'EX': 'extinct'
    };
    return mapping[status?.toUpperCase()] || 'least_concern';
  }

  private mapDifficulty(level: string): string {
    const mapping: Record<string, string> = {
      '1': 'beginner',
      '2': 'intermediate',
      '3': 'advanced',
      'easy': 'beginner',
      'medium': 'intermediate',
      'hard': 'advanced'
    };
    return mapping[level?.toLowerCase()] || 'beginner';
  }

  private parseRegions(regions: string | string[]): string[] {
    if (Array.isArray(regions)) return regions;
    if (typeof regions === 'string') {
      return regions.split(',').map(r => r.trim());
    }
    return [];
  }

  private parseFunFacts(facts: string | string[]): string[] {
    if (Array.isArray(facts)) return facts;
    if (typeof facts === 'string') {
      return facts.split('|').map(f => f.trim()).filter(f => f.length > 0);
    }
    return [];
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async fetchAdditionalData(externalId: string): Promise<any> {
    // Implement external data fetching if needed
    return {};
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printProgress(): void {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rate = this.stats.processed / elapsed;

    console.log(`📊 Progress: ${this.stats.processed} processed | ${this.stats.succeeded} succeeded | ${this.stats.failed} failed | ${rate.toFixed(1)} records/sec`);
  }

  private async generateReport(): Promise<void> {
    const report = {
      summary: {
        totalProcessed: this.stats.processed,
        succeeded: this.stats.succeeded,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
        duration: `${((Date.now() - this.stats.startTime) / 1000).toFixed(2)} seconds`
      },
      validation: this.validationReport,
      timestamp: new Date().toISOString()
    };

    // Save report to file
    const reportPath = path.join(process.cwd(), `ingestion-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 Ingestion Report:');
    console.log(`  Total Processed: ${report.summary.totalProcessed}`);
    console.log(`  Succeeded: ${report.summary.succeeded}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Skipped: ${report.summary.skipped}`);
    console.log(`  Duration: ${report.summary.duration}`);
    console.log(`\n  Report saved to: ${reportPath}`);
  }

  private async handleFailure(error: any): Promise<void> {
    // Implement failure handling: notifications, rollback, etc.
    console.error('🚨 Critical failure in content ingestion pipeline');

    // Could send alerts, create tickets, etc.
    if (process.env.ALERT_WEBHOOK) {
      await axios.post(process.env.ALERT_WEBHOOK, {
        text: `Content ingestion failed: ${error.message}`,
        stats: this.stats
      }).catch(() => {});
    }
  }
}

// Export for use in other scripts
export { ProductionContentIngester, ProductionConfig, ContentSource };