/**
 * Configured Axios Instance for API Calls
 *
 * CONCEPT: Pre-configured axios with correct baseURL for all environments
 * WHY: Ensure admin API calls go to Railway backend, not GitHub Pages
 * PATTERN: Singleton axios instance with environment-aware configuration
 */

import axios from 'axios';

// Determine environment and backend URL (with test-safe fallbacks)
const isGitHubPages = typeof window !== 'undefined' && window.location?.hostname?.includes('github.io') || false;
const isAdmin = typeof window !== 'undefined' && window.location?.pathname?.includes('/admin') || false;

// Get backend URL from environment variables
const env = import.meta.env as Record<string, unknown> | undefined;
const apiUrl = env?.VITE_API_URL as string | undefined;

// Configure baseURL based on environment
let baseURL: string;

if (isAdmin || !isGitHubPages) {
  // Admin pages or local dev: Use backend server
  baseURL = apiUrl || 'http://localhost:3001';
} else {
  // Public pages on GitHub Pages: Relative URLs (will use client storage via apiAdapter)
  baseURL = '';
}

if (typeof window !== 'undefined') {
  console.log('🔧 Axios Config:', {
    isGitHubPages,
    isAdmin,
    apiUrl,
    baseURL,
    pathname: window.location.pathname
  });
}

// Create configured axios instance
export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Don't send cookies cross-origin
});

// Request interceptor for auth tokens
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // Check for both Supabase pattern (sb-*-auth-token) and Aves pattern (aves-auth-token)
    let accessToken: string | null = null;

    console.log('🔍 DEBUG: Searching for auth token...');
    console.log('🔍 DEBUG: localStorage has', localStorage.length, 'items');

    // Log all localStorage keys for debugging
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    console.log('🔍 DEBUG: All localStorage keys:', allKeys);

    // Search for auth token (try both patterns)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key) {
        console.log(`🔍 DEBUG: Checking key [${i}]: "${key}"`);

        // Check if it matches Supabase pattern OR Aves pattern
        const matchesSupabase = key.startsWith('sb-') && key.endsWith('-auth-token');
        const matchesAves = key === 'aves-auth-token';
        const matchesPattern = matchesSupabase || matchesAves;

        console.log(`🔍 DEBUG: Key "${key}" matches pattern:`, matchesPattern);

        if (matchesPattern) {
          const value = localStorage.getItem(key);
          console.log(`🔍 DEBUG: Found matching key "${key}", value length:`, value?.length || 0);

          if (value) {
            try {
              const parsed = JSON.parse(value);
              console.log('🔍 DEBUG: Parsed token structure:', Object.keys(parsed));
              console.log('🔍 DEBUG: Has access_token field:', 'access_token' in parsed);

              accessToken = parsed?.access_token || null;
              if (accessToken) {
                console.log('✅ Found auth token from key:', key);
                console.log('✅ Token preview:', accessToken.substring(0, 20) + '...');
                break;
              } else {
                console.warn('⚠️ Key matched pattern but no access_token field found:', key);
              }
            } catch (e) {
              console.error('❌ Failed to parse auth token from key:', key, e);
              console.error('❌ Value that failed to parse:', value?.substring(0, 100));
            }
          } else {
            console.warn('⚠️ Key matched pattern but value is null/empty:', key);
          }
        }
      }
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      console.log('🔐 API Request with auth:', config.method?.toUpperCase(), config.url);
    } else {
      console.error('❌ No auth token found - request will be unauthorized');
      console.error('❌ Searched', localStorage.length, 'localStorage items');
      console.error('❌ Expected pattern: sb-*-auth-token or aves-auth-token');
      console.log('🔧 API Request (no auth):', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error logging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);

export default api;
