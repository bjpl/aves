import logger from '../utils/logger';
#!/usr/bin/env tsx
/**
 * Configuration Validation Script
 * Run this script to validate your AI configuration setup
 *
 * Usage: npx tsx src/scripts/validate-config.ts
 */

import { getAIConfig, validateAIConfig } from '../config';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

logger.info('\n=== AI Configuration Validation ===\n');

// Load configuration
const config = getAIConfig();

// Validate configuration
const validation = validateAIConfig(config);

// Display results
logger.info('Configuration Status:');
logger.info('--------------------');

if (validation.valid) {
  logger.info('✅ Configuration is VALID\n');
} else {
  logger.info('❌ Configuration has ERRORS\n');
  logger.info('Errors:');
  validation.errors.forEach(error => {
    logger.info(`  - ${error}`);
  });
  logger.info('');
}

// Display configuration summary
logger.info('\nConfiguration Summary:');
logger.info('---------------------');

// OpenAI
logger.info('\n📡 OpenAI Configuration:');
logger.info(`  API Key: ${config.openai.apiKey ? '✅ Set' : '❌ Not set'}`);
logger.info(`  Model: ${config.openai.model}`);
logger.info(`  Vision Model: ${config.openai.visionModel}`);
logger.info(`  Max Tokens: ${config.openai.maxTokens}`);
logger.info(`  Temperature: ${config.openai.temperature}`);
logger.info(`  Timeout: ${config.openai.timeout}ms`);
logger.info(`  Max Retries: ${config.openai.maxRetries}`);

// Unsplash
logger.info('\n🖼️  Unsplash Configuration:');
logger.info(`  Access Key: ${config.unsplash.accessKey ? '✅ Set' : '❌ Not set'}`);
logger.info(`  Secret Key: ${config.unsplash.secretKey ? '✅ Set' : '❌ Not set'}`);
logger.info(`  API URL: ${config.unsplash.apiUrl}`);
logger.info(`  Rate Limit: ${config.unsplash.rateLimitPerHour}/hour`);

// Vision API
logger.info('\n👁️  Vision API Configuration:');
logger.info(`  Provider: ${config.vision.provider}`);
logger.info(`  Timeout: ${config.vision.timeout}ms`);
logger.info(`  Max Retries: ${config.vision.maxRetries}`);
logger.info(`  Rate Limit: ${config.vision.rateLimitPerMinute}/min`);

// Feature Flags
logger.info('\n🚩 Feature Flags:');
logger.info(`  Vision AI: ${config.features.enableVisionAI ? '✅ Enabled' : '❌ Disabled'}`);
logger.info(`  Image Generation: ${config.features.enableImageGeneration ? '✅ Enabled' : '❌ Disabled'}`);
logger.info(`  Image Analysis: ${config.features.enableImageAnalysis ? '✅ Enabled' : '❌ Disabled'}`);
logger.info(`  Annotation AI: ${config.features.enableAnnotationAI ? '✅ Enabled' : '❌ Disabled'}`);

// Cost Tracking
logger.info('\n💰 Cost Tracking:');
logger.info(`  Enabled: ${config.costTracking.enabled ? '✅ Yes' : '❌ No'}`);
logger.info(`  Alert Threshold: $${config.costTracking.alertThreshold}`);
logger.info(`  Log Level: ${config.costTracking.logLevel}`);

// Recommendations
logger.info('\n💡 Recommendations:');
logger.info('-------------------');

const recommendations: string[] = [];

if (!config.openai.apiKey) {
  recommendations.push('⚠️  Add OPENAI_API_KEY to your .env file');
}

if (!config.unsplash.accessKey) {
  recommendations.push('⚠️  Add UNSPLASH_ACCESS_KEY to your .env file');
}

if (!config.unsplash.secretKey) {
  recommendations.push('⚠️  Add UNSPLASH_SECRET_KEY to your .env file');
}

if (config.features.enableVisionAI && !config.openai.apiKey) {
  recommendations.push('⚠️  Vision AI is enabled but OpenAI API key is missing');
}

if (config.vision.rateLimitPerMinute > 20 && !config.openai.apiKey) {
  recommendations.push('⚠️  High rate limit set without API key - consider lowering');
}

if (!config.costTracking.enabled) {
  recommendations.push('💡 Enable cost tracking to monitor API usage');
}

if (config.openai.temperature > 0.8) {
  recommendations.push('💡 High temperature setting may produce less consistent results');
}

if (config.openai.timeout < 10000) {
  recommendations.push('💡 Low timeout setting may cause failures for complex requests');
}

if (recommendations.length === 0) {
  logger.info('✅ No recommendations - configuration looks good!');
} else {
  recommendations.forEach(rec => logger.info(rec));
}

// Quick start guide
logger.info('\n📚 Next Steps:');
logger.info('--------------');
logger.info('1. Get API keys: https://platform.openai.com/api-keys');
logger.info('2. Add keys to backend/.env file');
logger.info('3. Enable features as needed');
logger.info('4. See docs/API_KEYS_SETUP.md for detailed guide');
logger.info('5. See docs/QUICK_START_AI_CONFIG.md for quick reference\n');

// Exit with appropriate code
process.exit(validation.valid ? 0 : 1);
