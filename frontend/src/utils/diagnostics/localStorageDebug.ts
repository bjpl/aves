/**
 * localStorage Diagnostic Utility
 *
 * USAGE: Run this in browser console to inspect localStorage and find Supabase token
 *
 * In browser console:
 * ```javascript
 * // Copy and paste this entire function, then call it:
 * debugLocalStorage()
 * ```
 */

export function debugLocalStorage(): void {
  console.log('='.repeat(80));
  console.log('🔍 LOCALSTORAGE DIAGNOSTIC REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 Summary:');
  console.log(`   Total items: ${localStorage.length}`);

  // Collect all keys
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      allKeys.push(key);
    }
  }

  console.log('\n📝 All localStorage keys:');
  allKeys.forEach((key, index) => {
    console.log(`   [${index}] ${key}`);
  });

  // Search for Supabase-related keys
  console.log('\n🔍 Supabase-related keys:');
  const supabaseKeys = allKeys.filter(key =>
    key.includes('supabase') ||
    key.startsWith('sb-') ||
    key.includes('auth')
  );

  if (supabaseKeys.length === 0) {
    console.log('   ❌ No Supabase-related keys found!');
  } else {
    supabaseKeys.forEach(key => {
      console.log(`   ✓ ${key}`);
      const value = localStorage.getItem(key);
      console.log(`     Length: ${value?.length || 0} characters`);

      // Try to parse JSON
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log(`     Type: JSON object`);
          console.log(`     Keys: ${Object.keys(parsed).join(', ')}`);

          // Check for access_token
          if ('access_token' in parsed) {
            console.log(`     ✅ HAS ACCESS_TOKEN`);
            console.log(`     Token preview: ${parsed.access_token.substring(0, 30)}...`);
          } else {
            console.log(`     ⚠️ No access_token field`);
          }

          // Show structure
          console.log(`     Structure:`, JSON.stringify(parsed, null, 2).substring(0, 200) + '...');
        } catch (e) {
          console.log(`     Type: String (not JSON)`);
          console.log(`     Preview: ${value.substring(0, 100)}...`);
        }
      }
      console.log('');
    });
  }

  // Search specifically for pattern: sb-*-auth-token
  console.log('\n🎯 Keys matching pattern "sb-*-auth-token":');
  const authTokenKeys = allKeys.filter(key =>
    key.startsWith('sb-') && key.endsWith('-auth-token')
  );

  if (authTokenKeys.length === 0) {
    console.log('   ❌ No keys match the expected pattern!');
    console.log('   Expected format: sb-{project-ref}-auth-token');
    console.log('   Example: sb-abcdefghijklmnop-auth-token');
  } else {
    authTokenKeys.forEach(key => {
      console.log(`   ✅ MATCH: ${key}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(80));

  if (authTokenKeys.length > 0) {
    console.log('✅ Supabase auth token key found!');
    console.log('   The axios interceptor should be able to find it.');
  } else if (supabaseKeys.length > 0) {
    console.log('⚠️ Supabase keys found, but none match the expected pattern.');
    console.log('   Actual keys:', supabaseKeys);
    console.log('   You may need to adjust the pattern matching in axios.ts');
  } else {
    console.log('❌ No Supabase keys found at all!');
    console.log('   Possible issues:');
    console.log('   1. User is not actually signed in');
    console.log('   2. Supabase is configured to use a different storage method');
    console.log('   3. Auth token is stored under a different naming convention');
  }

  console.log('\n' + '='.repeat(80));
}

// Also expose as window global for easy console access
if (typeof window !== 'undefined') {
  (window as any).debugLocalStorage = debugLocalStorage;
  console.log('💡 Diagnostic function loaded! Run: debugLocalStorage()');
}
