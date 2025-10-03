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

console.log('\n=== AI Configuration Validation ===\n');

// Load configuration
const config = getAIConfig();

// Validate configuration
const validation = validateAIConfig(config);

// Display results
console.log('Configuration Status:');
console.log('--------------------');

if (validation.valid) {
  console.log('✅ Configuration is VALID\n');
} else {
  console.log('❌ Configuration has ERRORS\n');
  console.log('Errors:');
  validation.errors.forEach(error => {
    console.log(`  - ${error}`);
  });
  console.log('');
}

// Display configuration summary
console.log('\nConfiguration Summary:');
console.log('---------------------');

// OpenAI
console.log('\n📡 OpenAI Configuration:');
console.log(`  API Key: ${config.openai.apiKey ? '✅ Set' : '❌ Not set'}`);
console.log(`  Model: ${config.openai.model}`);
console.log(`  Vision Model: ${config.openai.visionModel}`);
console.log(`  Max Tokens: ${config.openai.maxTokens}`);
console.log(`  Temperature: ${config.openai.temperature}`);
console.log(`  Timeout: ${config.openai.timeout}ms`);
console.log(`  Max Retries: ${config.openai.maxRetries}`);

// Unsplash
console.log('\n🖼️  Unsplash Configuration:');
console.log(`  Access Key: ${config.unsplash.accessKey ? '✅ Set' : '❌ Not set'}`);
console.log(`  Secret Key: ${config.unsplash.secretKey ? '✅ Set' : '❌ Not set'}`);
console.log(`  API URL: ${config.unsplash.apiUrl}`);
console.log(`  Rate Limit: ${config.unsplash.rateLimitPerHour}/hour`);

// Vision API
console.log('\n👁️  Vision API Configuration:');
console.log(`  Provider: ${config.vision.provider}`);
console.log(`  Timeout: ${config.vision.timeout}ms`);
console.log(`  Max Retries: ${config.vision.maxRetries}`);
console.log(`  Rate Limit: ${config.vision.rateLimitPerMinute}/min`);

// Feature Flags
console.log('\n🚩 Feature Flags:');
console.log(`  Vision AI: ${config.features.enableVisionAI ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  Image Generation: ${config.features.enableImageGeneration ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  Image Analysis: ${config.features.enableImageAnalysis ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  Annotation AI: ${config.features.enableAnnotationAI ? '✅ Enabled' : '❌ Disabled'}`);

// Cost Tracking
console.log('\n💰 Cost Tracking:');
console.log(`  Enabled: ${config.costTracking.enabled ? '✅ Yes' : '❌ No'}`);
console.log(`  Alert Threshold: $${config.costTracking.alertThreshold}`);
console.log(`  Log Level: ${config.costTracking.logLevel}`);

// Recommendations
console.log('\n💡 Recommendations:');
console.log('-------------------');

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
  console.log('✅ No recommendations - configuration looks good!');
} else {
  recommendations.forEach(rec => console.log(rec));
}

// Quick start guide
console.log('\n📚 Next Steps:');
console.log('--------------');
console.log('1. Get API keys: https://platform.openai.com/api-keys');
console.log('2. Add keys to backend/.env file');
console.log('3. Enable features as needed');
console.log('4. See docs/API_KEYS_SETUP.md for detailed guide');
console.log('5. See docs/QUICK_START_AI_CONFIG.md for quick reference\n');

// Exit with appropriate code
process.exit(validation.valid ? 0 : 1);
