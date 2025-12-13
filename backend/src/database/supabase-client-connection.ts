import logger from '../utils/logger';
/**
 * Alternative connection using Supabase Client Library
 * This bypasses all IPv6 and pooler issues by using the Supabase SDK
 */

import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://ubqnfiwxghkxltluyczd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

/**
 * Create a Pool-like wrapper around Supabase client for compatibility
 */
export class SupabasePoolWrapper {
  async connect() {
    // Test connection
    const { error } = await supabase.from('species').select('count').single();
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is OK
      throw error;
    }

    return {
      query: async (text: string, params?: (string | number | boolean | Date | null | undefined)[]) => {
        // Handle basic SELECT NOW() for connection test
        if (text === 'SELECT NOW()') {
          return { rows: [{ now: new Date() }] };
        }

        // For other queries, you'd need to parse and convert to Supabase format
        // This is a simplified implementation
        logger.info({ text }, 'Query via Supabase client');

        // Use Supabase RPC for raw SQL if needed
        const { data, error } = await supabase.rpc('exec_sql', { query: text, params });
        if (error) throw error;

        return { rows: data || [] };
      },
      release: () => {
        // No-op for Supabase client
      }
    };
  }

  async end() {
    // No-op for Supabase client
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  on(_event: string, _callback: (...args: unknown[]) => void) {
    // No-op for compatibility
  }

  get totalCount() { return 1; }
  get idleCount() { return 1; }
  get waitingCount() { return 0; }
}