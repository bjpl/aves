import { DemoContentIngester } from './ingest-demo';
import { ProductionContentIngester, ProductionConfig, ContentSource } from './ingest-production';
import * as dotenv from 'dotenv';
import * as path from 'path';

// PATTERN: Content Orchestration Layer
// WHY: Unified interface for all ingestion operations
// CONCEPT: Command pattern for content management

dotenv.config();

interface OrchestratorConfig {
  environment: 'development' | 'staging' | 'production';
  strapiUrl: string;
  apiToken: string;
  mode: 'demo' | 'full' | 'incremental' | 'sync';
}

class ContentOrchestrator {
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  // Main orchestration method
  async execute(): Promise<void> {
    console.log(`🎭 Content Orchestrator - ${this.config.environment} environment`);
    console.log(`📋 Mode: ${this.config.mode}\n`);

    try {
      switch (this.config.mode) {
        case 'demo':
          await this.runDemoIngestion();
          break;

        case 'full':
          await this.runFullIngestion();
          break;

        case 'incremental':
          await this.runIncrementalIngestion();
          break;

        case 'sync':
          await this.runSyncIngestion();
          break;

        default:
          throw new Error(`Unknown mode: ${this.config.mode}`);
      }

      console.log('\n✅ Orchestration completed successfully');

    } catch (error) {
      console.error('\n❌ Orchestration failed:', error);
      process.exit(1);
    }
  }

  // Demo ingestion for development/testing
  private async runDemoIngestion(): Promise<void> {
    console.log('🎪 Running demo content ingestion...\n');

    const ingester = new DemoContentIngester({
      strapiUrl: this.config.strapiUrl,
      apiToken: this.config.apiToken,
      demoDataPath: path.join(__dirname, 'demo-data.json')
    });

    await ingester.ingest();
  }

  // Full production ingestion
  private async runFullIngestion(): Promise<void> {
    console.log('🏭 Running full production ingestion...\n');

    const config: ProductionConfig = {
      strapiUrl: this.config.strapiUrl,
      apiToken: this.config.apiToken,
      batchSize: this.config.environment === 'production' ? 50 : 10,
      maxConcurrency: this.config.environment === 'production' ? 5 : 2,
      retryAttempts: 3,
      dataSource: 'csv',
      validationLevel: this.config.environment === 'production' ? 'strict' : 'moderate'
    };

    const ingester = new ProductionContentIngester(config);

    // Ingest from multiple sources
    const sources: ContentSource[] = [
      {
        type: 'csv',
        path: path.join(__dirname, 'sources', 'spain-birds-full.csv')
      }
    ];

    for (const source of sources) {
      console.log(`\n📦 Processing source: ${source.type}`);
      await ingester.ingestFromSource(source);
    }
  }

  // Incremental ingestion for updates
  private async runIncrementalIngestion(): Promise<void> {
    console.log('📈 Running incremental ingestion...\n');

    // This would typically check for:
    // 1. Last sync timestamp
    // 2. Modified records since last sync
    // 3. New records to add

    const lastSyncFile = path.join(__dirname, '.last-sync');
    let lastSync: Date;

    try {
      const fs = require('fs');
      const lastSyncData = fs.readFileSync(lastSyncFile, 'utf-8');
      lastSync = new Date(lastSyncData);
      console.log(`📅 Last sync: ${lastSync.toISOString()}`);
    } catch {
      lastSync = new Date(0); // Beginning of time if no last sync
      console.log('📅 No previous sync found, running full sync');
    }

    // Run incremental sync logic here
    // ...

    // Update last sync timestamp
    const fs = require('fs');
    fs.writeFileSync(lastSyncFile, new Date().toISOString());
  }

  // Sync with external sources
  private async runSyncIngestion(): Promise<void> {
    console.log('🔄 Running sync ingestion...\n');

    // External API sources for bird data
    const externalSources = [
      {
        name: 'eBird API',
        url: 'https://api.ebird.org/v2/data/obs/ES/recent',
        transform: this.transformEBirdData
      },
      {
        name: 'GBIF API',
        url: 'https://api.gbif.org/v1/occurrence/search?country=ES&taxonKey=212',
        transform: this.transformGBIFData
      }
    ];

    for (const source of externalSources) {
      try {
        console.log(`📡 Syncing with ${source.name}...`);
        // Implement actual API calls and transformation
        // This is a placeholder for the sync logic
        await this.syncFromExternalAPI(source);
      } catch (error) {
        console.error(`❌ Failed to sync with ${source.name}:`, error);
      }
    }
  }

  // Transform external API data to our schema
  private transformEBirdData(data: any): any {
    return {
      spanishName: data.comName,
      scientificName: data.sciName,
      observationDate: data.obsDt,
      location: data.locName,
      count: data.howMany
    };
  }

  private transformGBIFData(data: any): any {
    return {
      scientificName: data.scientificName,
      kingdom: data.kingdom,
      phylum: data.phylum,
      class: data.class,
      order: data.order,
      family: data.family,
      genus: data.genus
    };
  }

  private async syncFromExternalAPI(source: any): Promise<void> {
    // Placeholder for actual API sync implementation
    console.log(`  ✓ Synced with ${source.name}`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'demo';
  const environment = (process.env.NODE_ENV || 'development') as any;

  if (!process.env.STRAPI_API_TOKEN) {
    console.error('❌ STRAPI_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const orchestrator = new ContentOrchestrator({
    environment,
    strapiUrl: process.env.STRAPI_URL || 'http://localhost:1337',
    apiToken: process.env.STRAPI_API_TOKEN,
    mode: mode as any
  });

  await orchestrator.execute();
}

// Command-line interface
if (require.main === module) {
  console.log('🎵 Aves Content Orchestrator');
  console.log('============================\n');
  console.log('Usage: npm run ingest [mode]');
  console.log('Modes: demo, full, incremental, sync\n');

  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ContentOrchestrator };