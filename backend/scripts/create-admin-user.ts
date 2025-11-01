import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('👤 Creating admin user...\n');

  const adminEmail = 'admin@aves.test';
  const adminPassword = 'Admin123!@#'; // Change this in production!

  try {
    // Create user with admin role
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: 'Admin User'
      },
      app_metadata: {
        role: 'admin',
        is_admin: true
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('ℹ️  Admin user already exists, updating metadata...');

        // Get existing user
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users.find(u => u.email === adminEmail);

        if (existingUser) {
          // Update user metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              user_metadata: {
                role: 'admin',
                full_name: 'Admin User'
              },
              app_metadata: {
                role: 'admin',
                is_admin: true
              }
            }
          );

          if (updateError) {
            console.error('❌ Error updating user:', updateError);
          } else {
            console.log('✅ Admin user metadata updated');
            console.log('📧 Email:', adminEmail);
            console.log('🔐 Password:', adminPassword);
            console.log('🆔 User ID:', existingUser.id);
          }
        }
      } else {
        console.error('❌ Error creating admin user:', error);
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🔐 Password:', adminPassword);
      console.log('🆔 User ID:', data.user?.id);
      console.log('\n💡 You can now login with these credentials');
    }

    // Generate a session token for testing
    console.log('\n🔑 Generating session token...');
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (sessionError) {
      console.error('❌ Error generating session:', sessionError);
    } else {
      console.log('✅ Session token generated!');
      console.log('\n📝 Access Token (copy this for testing):');
      console.log(sessionData.session?.access_token);
      console.log('\n💡 Use this token in Authorization header:');
      console.log(`Authorization: Bearer ${sessionData.session?.access_token}`);
    }

  } catch (err) {
    console.error('Fatal error:', err);
  }
}

createAdminUser();