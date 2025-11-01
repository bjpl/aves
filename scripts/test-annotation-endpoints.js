/**
 * Test script to verify annotation endpoints are working
 * Run with: node scripts/test-annotation-endpoints.js
 */

const fetch = require('node-fetch');

// Get the Supabase token from localStorage in browser
// For testing, you'll need to copy your token from browser console:
// localStorage.getItem('supabase.auth.token')
const TOKEN = process.env.SUPABASE_TOKEN || '';

const API_URL = 'http://localhost:3001/api';

async function testEndpoint(name, path) {
  console.log(`\n📍 Testing ${name}...`);
  console.log(`   URL: ${API_URL}${path}`);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Authorization': TOKEN ? `Bearer ${TOKEN}` : undefined,
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    console.log(`   Status: ${status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS:`, JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(`   ❌ ERROR:`, text);
    }

    return { endpoint: path, status, success: response.ok };
  } catch (error) {
    console.log(`   ❌ NETWORK ERROR:`, error.message);
    return { endpoint: path, status: 0, success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Annotation Endpoints');
  console.log('================================');

  if (!TOKEN) {
    console.log('\n⚠️  WARNING: No authentication token provided.');
    console.log('   To test with authentication:');
    console.log('   1. Open browser console on the admin page');
    console.log('   2. Run: localStorage.getItem("supabase.auth.token")');
    console.log('   3. Copy the JSON object');
    console.log('   4. Extract the access_token value');
    console.log('   5. Set environment variable: set SUPABASE_TOKEN=<your_token>');
    console.log('   6. Run this script again\n');
  }

  const results = [];

  // Test health check first
  results.push(await testEndpoint('Health Check', '/health'));

  // Test annotation endpoints
  results.push(await testEndpoint('Pending Annotations', '/ai/annotations/pending'));
  results.push(await testEndpoint('Stats Endpoint', '/ai/annotations/stats'));
  results.push(await testEndpoint('Analytics Endpoint', '/ai/annotations/analytics'));

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  console.log('\nEndpoint Results:');
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`  ${icon} ${r.endpoint} - Status: ${r.status}`);
  });

  // Check specific issues
  if (!TOKEN) {
    console.log('\n💡 Tip: Most endpoints require authentication. Please provide a token to test fully.');
  }
}

// Run the tests
runTests().catch(console.error);