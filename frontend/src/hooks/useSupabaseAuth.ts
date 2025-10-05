/**
 * Supabase Authentication Hook
 *
 * CONCEPT: React hook for managing Supabase authentication state
 * WHY: Provides centralized auth state management across the app
 * PATTERN: Custom hook with useEffect for session management
 */

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut as supabaseSignOut } from '../lib/supabase';
import { info, error as logError } from '../utils/logger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useSupabaseAuth = (): AuthState & AuthActions => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) {
        info('User session restored', { userId: session.user.id });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) {
        info('Auth state changed', { userId: session.user.id, event: _event });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await signIn(email, password);
      setSession(data.session);
      setUser(data.user);
      info('User signed in successfully', { userId: data.user?.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      logError('Sign in failed', err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await signUp(email, password, name);
      setSession(data.session);
      setUser(data.user);
      info('User signed up successfully', { userId: data.user?.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';
      setError(errorMessage);
      logError('Sign up failed', err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await supabaseSignOut();
      setSession(null);
      setUser(null);
      info('User signed out successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
      logError('Sign out failed', err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      setSession(session);
      setUser(session?.user ?? null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh session';
      setError(errorMessage);
      logError('Session refresh failed', err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshSession,
  };
};

export default useSupabaseAuth;
