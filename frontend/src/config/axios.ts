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

if (typeof window !== 'undefined' && import.meta.env.DEV) {
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

    // Search for auth token (try both patterns)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key) {
        // Check if it matches Supabase pattern OR Aves pattern
        const matchesSupabase = key.startsWith('sb-') && key.endsWith('-auth-token');
        const matchesAves = key === 'aves-auth-token';
        const matchesPattern = matchesSupabase || matchesAves;

        if (matchesPattern) {
          const value = localStorage.getItem(key);

          if (value) {
            try {
              const parsed = JSON.parse(value);
              accessToken = parsed?.access_token || null;
              if (accessToken) {
                if (import.meta.env.DEV) {
                  console.log('✅ Found auth token from key:', key);
                }
                break;
              } else {
                console.warn('⚠️ Key matched pattern but no access_token field found:', key);
              }
            } catch (e) {
              console.error('❌ Failed to parse auth token from key:', key, e);
            }
          } else {
            console.warn('⚠️ Key matched pattern but value is null/empty:', key);
          }
        }
      }
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      console.error('❌ No auth token found - request will be unauthorized');
      console.error('❌ Expected pattern: sb-*-auth-token or aves-auth-token');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error logging
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);

export default api;
