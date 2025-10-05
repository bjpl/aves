/**
 * Supabase Client Configuration
 *
 * CONCEPT: Centralized Supabase client for database and auth operations
 * WHY: Provides type-safe access to Supabase with environment configuration
 * PATTERN: Singleton client instance shared across the application
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

// Create Supabase client instance
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'aves-auth-token',
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'aves-frontend@0.1.0'
    }
  }
});

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }

  return user;
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/**
 * Sign up with email and password
 */
export const signUp = async (email: string, password: string, name?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0]
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export default supabase;
