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

  console.log('=== User Context ===');
  console.log(builder.getContextSummary(context));
  console.log('\nDetailed Context:', JSON.stringify(context, null, 2));

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

  console.log('=== Generated AI Prompt ===');
  console.log(prompt);

  await pool.end();
}

/**
 * Example 3: Adaptive Difficulty Tracking
 */
async function trackDifficultyChanges() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const builder = new UserContextBuilder(pool);

  const userId = 'user-789';

  console.log('=== Tracking Difficulty Changes ===\n');

  // Simulate checking context over time
  for (let i = 0; i < 3; i++) {
    const context = await builder.buildContext(userId);

    console.log(`Check ${i + 1}:`);
    console.log(`  Level: ${context.level}`);
    console.log(`  Difficulty: ${context.difficulty}/5`);
    console.log(`  Accuracy: ${context.performance.accuracy.toFixed(1)}%`);
    console.log(`  Streak: ${context.streak}`);
    console.log(`  Decision: ${getDifficultyReasoning(context)}`);
    console.log('');

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

  console.log('=== Topic Analysis ===\n');

  console.log('Weak Topics (Need Practice):');
  context.weakTopics.forEach(topic => {
    const stats = topicStats.find(t => t.topic === topic);
    if (stats) {
      console.log(`  - ${topic}: ${(stats.accuracy * 100).toFixed(1)}% accuracy (${stats.count} attempts, ${stats.avgTime.toFixed(1)}s avg)`);
    }
  });

  console.log('\nMastered Topics (Occasional Review):');
  context.masteredTopics.forEach(topic => {
    const stats = topicStats.find(t => t.topic === topic);
    if (stats) {
      console.log(`  - ${topic}: ${(stats.accuracy * 100).toFixed(1)}% accuracy (${stats.count} attempts, ${stats.avgTime.toFixed(1)}s avg)`);
    }
  });

  console.log('\nNew Topics (Ready to Learn):');
  context.newTopics.slice(0, 5).forEach(topic => {
    console.log(`  - ${topic}: Never attempted`);
  });

  console.log('\nRecommended Focus:');
  console.log(`  1. Primary: ${context.weakTopics[0] || 'Explore new topics'}`);
  console.log(`  2. Secondary: ${context.weakTopics[1] || 'Review mastered content'}`);
  console.log(`  3. Explore: ${context.newTopics[0] || 'Continue current curriculum'}`);

  await pool.end();
}

/**
 * Example 5: Cache Key Generation
 */
async function cacheKeyExample() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const builder = new UserContextBuilder(pool);

  const userId = 'user-202';

  console.log('=== Cache Key Generation ===\n');

  // Get context multiple times
  const context1 = await builder.buildContext(userId);
  const context2 = await builder.buildContext(userId);

  console.log('First context hash:', context1.hash);
  console.log('Second context hash:', context2.hash);
  console.log('Hashes match:', context1.hash === context2.hash);
  console.log('\nBenefit: Same hash = cache hit = no AI generation needed = $0.003 saved!\n');

  // Simulate performance change (in reality, this would be from completing exercises)
  console.log('After user completes more exercises...');
  console.log('Context would change → New hash → Fresh exercises generated');

  await pool.end();
}

/**
 * Helper function to explain difficulty reasoning
 */
function getDifficultyReasoning(context: any): string {
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
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     User Context Builder - Examples                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    console.log('Example 1: Basic Context Building');
    console.log('─'.repeat(60));
    await basicContextExample();

    console.log('\n\nExample 2: AI Prompt Generation');
    console.log('─'.repeat(60));
    await aiPromptExample();

    console.log('\n\nExample 3: Adaptive Difficulty Tracking');
    console.log('─'.repeat(60));
    await trackDifficultyChanges();

    console.log('\n\nExample 4: Topic Analysis');
    console.log('─'.repeat(60));
    await topicAnalysisExample();

    console.log('\n\nExample 5: Cache Key Generation');
    console.log('─'.repeat(60));
    await cacheKeyExample();

  } catch (error) {
    console.error('Error running examples:', error);
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
    console.log('\n✓ All examples completed successfully!');
    process.exit(0);
  }).catch(err => {
    console.error('\n✗ Examples failed:', err);
    process.exit(1);
  });
}
