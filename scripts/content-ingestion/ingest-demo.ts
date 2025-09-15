import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

// PATTERN: Content Ingestion Pipeline
// WHY: Systematic data import with validation
// CONCEPT: ETL (Extract, Transform, Load) for CMS

interface Config {
  strapiUrl: string;
  apiToken: string;
  demoDataPath: string;
}

class DemoContentIngester {
  private config: Config;
  private strapiClient: any;
  private birdIdMap: Map<number, number> = new Map();
  private lessonIdMap: Map<number, number> = new Map();

  constructor(config: Config) {
    this.config = config;
    this.strapiClient = axios.create({
      baseURL: `${config.strapiUrl}/api`,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Main ingestion flow
  async ingest(): Promise<void> {
    console.log('🚀 Starting demo content ingestion...');

    try {
      // Load demo data
      const demoData = this.loadDemoData();

      // Step 1: Clear existing demo data (optional)
      if (process.env.CLEAR_EXISTING === 'true') {
        await this.clearExistingData();
      }

      // Step 2: Ingest birds
      console.log('📦 Ingesting birds...');
      await this.ingestBirds(demoData.birds);

      // Step 3: Ingest lessons
      console.log('📚 Ingesting lessons...');
      await this.ingestLessons(demoData.lessons);

      // Step 4: Create relationships
      console.log('🔗 Creating relationships...');
      await this.createRelationships(demoData.lessons);

      // Step 5: Validate ingestion
      console.log('✅ Validating ingestion...');
      await this.validateIngestion();

      console.log('✨ Demo content ingestion completed successfully!');
      this.printSummary();

    } catch (error) {
      console.error('❌ Ingestion failed:', error);
      throw error;
    }
  }

  private loadDemoData(): any {
    const dataPath = path.resolve(this.config.demoDataPath);
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(rawData);
  }

  private async clearExistingData(): Promise<void> {
    console.log('🗑️ Clearing existing demo data...');

    // Get all existing records
    const [birds, lessons, quizzes] = await Promise.all([
      this.strapiClient.get('/birds?pagination[limit]=1000'),
      this.strapiClient.get('/lessons?pagination[limit]=1000'),
      this.strapiClient.get('/quizzes?pagination[limit]=1000')
    ]);

    // Delete in reverse order due to relationships
    for (const quiz of quizzes.data.data) {
      await this.strapiClient.delete(`/quizzes/${quiz.id}`);
    }

    for (const lesson of lessons.data.data) {
      await this.strapiClient.delete(`/lessons/${lesson.id}`);
    }

    for (const bird of birds.data.data) {
      await this.strapiClient.delete(`/birds/${bird.id}`);
    }

    console.log('✅ Existing data cleared');
  }

  private async ingestBirds(birds: any[]): Promise<void> {
    for (const [index, bird] of birds.entries()) {
      try {
        // Transform bird data to match Strapi schema
        const birdData = {
          data: {
            spanishName: bird.spanishName,
            englishName: bird.englishName,
            scientificName: bird.scientificName,
            description: bird.description,
            habitat: bird.habitat,
            size: bird.size,
            diet: bird.diet,
            conservationStatus: bird.conservationStatus,
            difficulty: bird.difficulty,
            regions: bird.regions,
            funFacts: bird.funFacts
          }
        };

        // Create bird
        const response = await this.strapiClient.post('/birds', birdData);
        const createdBird = response.data.data;

        // Store mapping for relationships
        this.birdIdMap.set(index + 1, createdBird.id);

        console.log(`✅ Ingested bird: ${bird.spanishName} (ID: ${createdBird.id})`);

        // Add delay to avoid rate limiting
        await this.delay(100);

      } catch (error) {
        console.error(`❌ Failed to ingest bird: ${bird.spanishName}`, error.response?.data || error);
      }
    }
  }

  private async ingestLessons(lessons: any[]): Promise<void> {
    for (const [index, lesson] of lessons.entries()) {
      try {
        // Create lesson
        const lessonData = {
          data: {
            title: lesson.title,
            description: lesson.description,
            objectives: lesson.objectives,
            content: lesson.content,
            difficulty: lesson.difficulty,
            duration: lesson.duration,
            order: lesson.order,
            category: lesson.category,
            tags: lesson.tags || []
          }
        };

        const response = await this.strapiClient.post('/lessons', lessonData);
        const createdLesson = response.data.data;

        // Store mapping
        this.lessonIdMap.set(index + 1, createdLesson.id);

        console.log(`✅ Ingested lesson: ${lesson.title} (ID: ${createdLesson.id})`);

        // Ingest quizzes for this lesson
        if (lesson.quizzes && lesson.quizzes.length > 0) {
          await this.ingestQuizzes(lesson.quizzes, createdLesson.id);
        }

        await this.delay(100);

      } catch (error) {
        console.error(`❌ Failed to ingest lesson: ${lesson.title}`, error.response?.data || error);
      }
    }
  }

  private async ingestQuizzes(quizzes: any[], lessonId: number): Promise<void> {
    for (const quiz of quizzes) {
      try {
        const quizData = {
          data: {
            question: quiz.question,
            type: quiz.type,
            options: quiz.options || null,
            correctAnswer: quiz.correctAnswer,
            explanation: quiz.explanation,
            points: quiz.points,
            difficulty: quiz.difficulty,
            lesson: lessonId
          }
        };

        await this.strapiClient.post('/quizzes', quizData);
        console.log(`  ✅ Added quiz: ${quiz.question.substring(0, 50)}...`);

      } catch (error) {
        console.error(`  ❌ Failed to add quiz:`, error.response?.data || error);
      }
    }
  }

  private async createRelationships(lessons: any[]): Promise<void> {
    for (const [index, lesson] of lessons.entries()) {
      if (lesson.birdIds && lesson.birdIds.length > 0) {
        try {
          const lessonId = this.lessonIdMap.get(index + 1);
          const birdIds = lesson.birdIds.map((id: number) => this.birdIdMap.get(id)).filter(Boolean);

          if (lessonId && birdIds.length > 0) {
            await this.strapiClient.put(`/lessons/${lessonId}`, {
              data: {
                birds: birdIds
              }
            });

            console.log(`🔗 Linked lesson "${lesson.title}" with ${birdIds.length} birds`);
          }
        } catch (error) {
          console.error(`❌ Failed to create relationships for lesson: ${lesson.title}`, error);
        }
      }
    }
  }

  private async validateIngestion(): Promise<void> {
    const [birds, lessons, quizzes] = await Promise.all([
      this.strapiClient.get('/birds?pagination[limit]=100'),
      this.strapiClient.get('/lessons?pagination[limit]=100'),
      this.strapiClient.get('/quizzes?pagination[limit]=100')
    ]);

    const validation = {
      birds: birds.data.data.length,
      lessons: lessons.data.data.length,
      quizzes: quizzes.data.data.length
    };

    console.log('📊 Validation Results:');
    console.log(`  - Birds: ${validation.birds}`);
    console.log(`  - Lessons: ${validation.lessons}`);
    console.log(`  - Quizzes: ${validation.quizzes}`);

    if (validation.birds === 0 || validation.lessons === 0) {
      throw new Error('Validation failed: No content was ingested');
    }
  }

  private printSummary(): void {
    console.log('\n📈 Ingestion Summary:');
    console.log(`  - Birds ingested: ${this.birdIdMap.size}`);
    console.log(`  - Lessons ingested: ${this.lessonIdMap.size}`);
    console.log('\n🎯 Next Steps:');
    console.log('  1. Access Strapi admin at http://localhost:1337/admin');
    console.log('  2. Review and publish content');
    console.log('  3. Test API endpoints');
    console.log('  4. Run frontend to see content');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Execution
async function main() {
  const config: Config = {
    strapiUrl: process.env.STRAPI_URL || 'http://localhost:1337',
    apiToken: process.env.STRAPI_API_TOKEN || '',
    demoDataPath: process.env.DEMO_DATA_PATH || './demo-data.json'
  };

  if (!config.apiToken) {
    console.error('❌ STRAPI_API_TOKEN environment variable is required');
    console.log('📝 To create an API token:');
    console.log('  1. Go to Strapi admin panel');
    console.log('  2. Navigate to Settings > API Tokens');
    console.log('  3. Create a new token with full access');
    console.log('  4. Set STRAPI_API_TOKEN environment variable');
    process.exit(1);
  }

  const ingester = new DemoContentIngester(config);
  await ingester.ingest();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { DemoContentIngester };