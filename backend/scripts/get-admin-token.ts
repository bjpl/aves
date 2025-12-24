import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAdminToken() {
  console.log('🔑 Getting admin session token...\n');

  // Try common admin credentials
  const credentials = [
    { email: 'admin@aves.test', password: 'Admin123!@#' },
    { email: 'admin@aves.test', password: 'admin123' },
    { email: 'test@example.com', password: 'password123' }
  ];

  for (const cred of credentials) {
    try {
      console.log(`Trying ${cred.email}...`);
      const { data, error } = await supabase.auth.signInWithPassword(cred);

      if (error) {
        console.log(`  ❌ ${error.message}`);
        continue;
      }

      if (data.session) {
        console.log('\n✅ Successfully logged in!');
        console.log('📧 Email:', cred.email);
        console.log('🆔 User ID:', data.user.id);
        console.log('\n🔑 Access Token:');
        console.log(data.session.access_token);
        console.log('\n💡 Use this in Authorization header:');
        console.log(`Authorization: Bearer ${data.session.access_token}`);
        console.log('\n📝 Test command:');
        console.log(`curl -H "Authorization: Bearer ${data.session.access_token}" http://localhost:3001/api/ai/annotations/stats`);
        return;
      }
    } catch (err) {
      console.log(`  ❌ Error:`, err);
    }
  }

  console.log('\n❌ Could not login with any credentials');
  console.log('💡 Please create a user manually or use dev bypass');
}

getAdminToken();