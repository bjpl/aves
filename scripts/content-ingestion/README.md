# Content Ingestion System

## Overview

The Aves Content Ingestion System provides a robust pipeline for importing bird data and educational content into the Strapi CMS. It supports multiple data sources, validation, and both demo and production-scale ingestion.

## Architecture

```
┌─────────────────────┐
│   Orchestrator      │ - Main control layer
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼───┐
│ Demo  │    │  Prod │ - Ingestion engines
└───┬───┘    └───┬───┘
    │             │
┌───▼─────────────▼───┐
│   Strapi CMS API    │ - Content storage
└─────────────────────┘
```

## Features

### Demo Ingestion
- Quick setup with sample data
- 5 bird species + 3 lessons
- Perfect for development/testing

### Production Ingestion
- Stream processing for large datasets
- Batch operations with concurrency control
- Retry logic and error handling
- Progress tracking and reporting

### Data Sources
- CSV files
- External APIs (eBird, GBIF)
- PostgreSQL databases
- JSON files

### Validation
- Schema validation with Zod
- Business rule enforcement
- Data quality checks
- Duplicate detection

## Quick Start

### 1. Setup Environment

```bash
# Create .env file
cp .env.example .env

# Edit .env with your credentials
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token-here
NODE_ENV=development
```

### 2. Install Dependencies

```bash
cd scripts/content-ingestion
npm install
```

### 3. Generate Strapi API Token

1. Go to Strapi Admin Panel
2. Navigate to Settings > API Tokens
3. Create new token with full access
4. Copy token to .env file

### 4. Run Ingestion

```bash
# Demo data (5 birds, 3 lessons)
npm run ingest:demo

# Full production data
npm run ingest:full

# Incremental updates
npm run ingest:incremental

# Sync with external APIs
npm run ingest:sync
```

## Data Schema

### Bird Schema
```typescript
{
  spanishName: string;       // Required, unique
  englishName: string;        // Required
  scientificName: string;     // Required
  description: string;        // Min 50 chars
  habitat?: string;
  size?: string;
  diet?: string;
  conservationStatus?: enum;  // LC, NT, VU, EN, CR, EW, EX
  difficulty: enum;           // beginner, intermediate, advanced
  regions?: string[];
  funFacts?: string[];
  images?: Media[];
  sounds?: Media[];
}
```

### Lesson Schema
```typescript
{
  title: string;              // Required
  description: string;        // Required
  objectives: string[];       // Required
  content: string;           // Rich text
  difficulty: enum;          // beginner, intermediate, advanced
  duration: number;          // Minutes
  order: number;
  category: enum;            // identification, habitat, behavior, etc.
  birds?: Relation[];
  quizzes?: Quiz[];
  resources?: Media[];
}
```

## Production Data Sources

### CSV Format
Place CSV files in `sources/` directory:
```csv
spanish_name,english_name,scientific_name,description,...
"Águila Imperial","Spanish Imperial Eagle","Aquila adalberti","...",...
```

### External APIs

#### eBird Integration
```typescript
// Automatically syncs recent observations
npm run ingest:sync
```

#### GBIF Integration
```typescript
// Fetches species occurrence data
npm run ingest:sync
```

### Database Import
```sql
-- Expected table structure
CREATE TABLE birds (
  id SERIAL PRIMARY KEY,
  spanish_name VARCHAR(100) NOT NULL,
  english_name VARCHAR(100) NOT NULL,
  scientific_name VARCHAR(150) NOT NULL,
  description TEXT,
  habitat TEXT,
  conservation_status VARCHAR(20),
  active BOOLEAN DEFAULT true
);
```

## Advanced Usage

### Custom Validation Rules

Edit `ingest-production.ts`:
```typescript
private async validateRecord(record: any) {
  // Add custom rules
  if (record.conservationStatus === 'EX' && !record.extinctionDate) {
    errors.push('Extinct species must have extinction date');
  }
}
```

### Batch Size Configuration

```typescript
const config: ProductionConfig = {
  batchSize: 100,        // Records per batch
  maxConcurrency: 5,     // Parallel operations
  retryAttempts: 3       // Retry failed records
};
```

### Progress Monitoring

The system provides real-time progress updates:
```
📊 Progress: 500 processed | 495 succeeded | 5 failed | 25.5 records/sec
```

### Error Handling

Failed records are logged with details:
```json
{
  "failed": [
    {
      "record": "Broken Bird Data",
      "error": "Missing required field: scientificName",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Reports

After each ingestion, a detailed report is generated:

```json
{
  "summary": {
    "totalProcessed": 1000,
    "succeeded": 995,
    "failed": 5,
    "duration": "45.2 seconds"
  },
  "validation": {
    "errors": ["..."],
    "warnings": ["..."]
  }
}
```

## Troubleshooting

### Common Issues

1. **API Token Invalid**
   - Regenerate token in Strapi
   - Check token permissions

2. **Connection Timeout**
   - Increase timeout in config
   - Check network/firewall

3. **Validation Errors**
   - Review data format
   - Check required fields
   - Validate enum values

4. **Rate Limiting**
   - Reduce batch size
   - Add delays between requests
   - Use exponential backoff

## Performance Tips

1. **Large Datasets**
   - Use streaming for CSV files
   - Process in batches
   - Enable connection pooling

2. **Optimization**
   - Index frequently queried fields
   - Use bulk operations
   - Cache validation results

3. **Monitoring**
   - Watch memory usage
   - Monitor API response times
   - Track error rates

## Maintenance

### Daily Tasks
- Check ingestion reports
- Monitor error logs
- Verify data quality

### Weekly Tasks
- Run full validation
- Backup CMS database
- Update external API keys

### Monthly Tasks
- Review and optimize queries
- Update data sources
- Performance analysis

## Contributing

1. Add new data sources in `sources/`
2. Implement transformers for external APIs
3. Enhance validation rules
4. Improve error handling

## Support

For issues or questions:
1. Check logs in `logs/`
2. Review error reports
3. Contact development team

## License

MIT