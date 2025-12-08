import logger from '../utils/logger';
// CONCEPT: Example usage of UserContextBuilder
// WHY: Demonstrates how to use context builder for personalized exercises
// PATTERN: Example code showing integration patterns

import { Pool } from 'pg';
import { UserContextBuilder } from '../services/userContextBuilder';

/**
 * Example 1: Basic Context Building
 */
async function basicContextExample() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const builder = new UserContextBuilder(pool);

  // Build context for a user
  const userId = 'user-123';
  const context = await builder.buildContext(userId);

  logger.info('=== User Context ===');
  logger.info(builder.getContextSummary(context));
  logger.info('\nDetailed Context:', JSON.stringify(context, null, 2));

  await pool.end();
}

/**
 * Example 2: Using Context for AI Prompt Generation
 */
async function aiPromptExample() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const builder = new UserContextBuilder(pool);

  const userId = 'user-456';
  const context = await builder.buildContext(userId);

  // Generate a personalized AI prompt
  const prompt = `
You are a Spanish language tutor creating a bird vocabulary exercise.

Student Profile:
- Level: ${context.level} (${context.level === 'beginner' ? 'Keep it simple!' : context.level === 'advanced' ? 'Make it challenging!' : 'Moderate difficulty'})
- Current Performance: ${context.performance.accuracy.toFixed(1)}% accuracy
- Success Streak: ${context.streak} exercises

Areas Needing Practice (focus on these):
${context.weakTopics.length > 0
  ? context.weakTopics.map(t => `- ${t} (student struggling here)`).join('\n')
  : '- No weak areas identified yet'}

Mastered Topics (review occasionally):
${context.masteredTopics.length > 0
  ? context.masteredTopics.map(t => `- ${t} (student knows this well)`).join('\n')
  : '- No mastered topics yet'}

New Topics to Introduce:
${context.newTopics.slice(0, 3).map(t => `- ${t}`).join('\n')}

Recent Mistakes to Review:
${context.recentErrors.slice(0, 3).map(e => `- ${e.spanishTerm} (incorrect on ${e.completedAt.toLocaleDateString()})`).join('\n')}

Task: Create a fill-in-the-blank exercise at difficulty ${context.difficulty}/5 that:
1. Reviews 1 weak topic from the list above
2. Reinforces 1 mastered topic
3. Gently introduces 1 new topic
4. Creates a natural, memorable sentence

Return JSON format:
{
  "sentence": "El cardenal tiene plumas _____ brillantes.",
  "correctAnswer": "rojas",
  "hint": "This color is common in cardinals",
  "difficulty": ${context.difficulty},
  "vocabulary": [
    {"spanish": "plumas", "english": "feathers"},
    {"spanish": "rojas", "english": "red"}
  ]
}
`;

  logger.info('=== Generated AI Prompt ===');
  logger.info(prompt);

  await pool.end();
}

/**
 * Example 3: Adaptive Difficulty Tracking
 */
async function trackDifficultyChanges() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const builder = new UserContextBuilder(pool);

  const userId = 'user-789';

  logger.info('=== Tracking Difficulty Changes ===\n');

  // Simulate checking context over time
  for (let i = 0; i < 3; i++) {
    const context = await builder.buildContext(userId);

    logger.info(`Check ${i + 1}:`);
    logger.info(`  Level: ${context.level}`);
    logger.info(`  Difficulty: ${context.difficulty}/5`);
    logger.info(`  Accuracy: ${context.performance.accuracy.toFixed(1)}%`);
    logger.info(`  Streak: ${context.streak}`);
    logger.info(`  Decision: ${getDifficultyReasoning(context)}`);
    logger.info('');

    // Wait a bit (in real usage, this would be between actual exercises)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await pool.end();
}

/**
 * Example 4: Topic Analysis for Curriculum Planning
 */
async function topicAnalysisExample() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const builder = new UserContextBuilder(pool);

  const userId = 'user-101';
  const context = await builder.buildContext(userId);

  // Get exercise history for detailed analysis
  const history = await builder.getExerciseHistory(userId, 50);
  const topicStats = builder.analyzeTopics(history);

  logger.info('=== Topic Analysis ===\n');

  logger.info('Weak Topics (Need Practice):');
  context.weakTopics.forEach(topic => {
    const stats = topicStats.find(t => t.topic === topic);
    if (stats) {
      logger.info(`  - ${topic}: ${(stats.accuracy * 100).toFixed(1)}% accuracy (${stats.count} attempts, ${stats.avgTime.toFixed(1)}s avg)`);
    }
  });

  logger.info('\nMastered Topics (Occasional Review):');
  context.masteredTopics.forEach(topic => {
    const stats = topicStats.find(t => t.topic === topic);
    if (stats) {
      logger.info(`  - ${topic}: ${(stats.accuracy * 100).toFixed(1)}% accuracy (${stats.count} attempts, ${stats.avgTime.toFixed(1)}s avg)`);
    }
  });

  logger.info('\nNew Topics (Ready to Learn):');
  context.newTopics.slice(0, 5).forEach(topic => {
    logger.info(`  - ${topic}: Never attempted`);
  });

  logger.info('\nRecommended Focus:');
  logger.info(`  1. Primary: ${context.weakTopics[0] || 'Explore new topics'}`);
  logger.info(`  2. Secondary: ${context.weakTopics[1] || 'Review mastered content'}`);
  logger.info(`  3. Explore: ${context.newTopics[0] || 'Continue current curriculum'}`);

  await pool.end();
}

/**
 * Example 5: Cache Key Generation
 */
async function cacheKeyExample() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const builder = new UserContextBuilder(pool);

  const userId = 'user-202';

  logger.info('=== Cache Key Generation ===\n');

  // Get context multiple times
  const context1 = await builder.buildContext(userId);
  const context2 = await builder.buildContext(userId);

  logger.info('First context hash:', context1.hash);
  logger.info('Second context hash:', context2.hash);
  logger.info('Hashes match:', context1.hash === context2.hash);
  logger.info('\nBenefit: Same hash = cache hit = no AI generation needed = $0.003 saved!\n');

  // Simulate performance change (in reality, this would be from completing exercises)
  logger.info('After user completes more exercises...');
  logger.info('Context would change → New hash → Fresh exercises generated');

  await pool.end();
}

/**
 * Helper function to explain difficulty reasoning
 */
function getDifficultyReasoning(context: { difficulty: number; streak: number; performance: { accuracy: number } }): string {
  if (context.difficulty === 1) {
    return 'Starting easy for new user or helping rebuild confidence';
  } else if (context.difficulty === 5) {
    return 'Maximum challenge for high performer';
  } else if (context.streak > 5 && context.performance.accuracy > 85) {
    return 'Increasing difficulty - user performing well with good streak';
  } else if (context.performance.accuracy < 60) {
    return 'Keeping difficulty low - user needs more practice';
  } else {
    return 'Maintaining moderate difficulty - steady progress';
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  logger.info('╔═══════════════════════════════════════════════════════════╗');
  logger.info('║     User Context Builder - Examples                      ║');
  logger.info('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    logger.info('Example 1: Basic Context Building');
    logger.info('─'.repeat(60));
    await basicContextExample();

    logger.info('\n\nExample 2: AI Prompt Generation');
    logger.info('─'.repeat(60));
    await aiPromptExample();

    logger.info('\n\nExample 3: Adaptive Difficulty Tracking');
    logger.info('─'.repeat(60));
    await trackDifficultyChanges();

    logger.info('\n\nExample 4: Topic Analysis');
    logger.info('─'.repeat(60));
    await topicAnalysisExample();

    logger.info('\n\nExample 5: Cache Key Generation');
    logger.info('─'.repeat(60));
    await cacheKeyExample();

  } catch (error) {
    logger.error('Error running examples:', error);
  }
}

// Export for use in other modules
export {
  basicContextExample,
  aiPromptExample,
  trackDifficultyChanges,
  topicAnalysisExample,
  cacheKeyExample,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().then(() => {
    logger.info('\n✓ All examples completed successfully!');
    process.exit(0);
  }).catch(err => {
    logger.error('\n✗ Examples failed:', err);
    process.exit(1);
  });
}
