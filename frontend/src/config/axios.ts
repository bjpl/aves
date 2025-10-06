/**
 * Configured Axios Instance for API Calls
 *
 * CONCEPT: Pre-configured axios with correct baseURL for all environments
 * WHY: Ensure admin API calls go to Railway backend, not GitHub Pages
 * PATTERN: Singleton axios instance with environment-aware configuration
 */

import axios from 'axios';

// Determine environment and backend URL
const isGitHubPages = window.location.hostname.includes('github.io');
const isAdmin = window.location.pathname.includes('/admin');

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

console.log('🔧 Axios Config:', {
  isGitHubPages,
  isAdmin,
  apiUrl,
  baseURL,
  pathname: window.location.pathname
});

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
    // Add Supabase auth token if available
    const token = localStorage.getItem('supabase.auth.token');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed?.currentSession?.access_token) {
          config.headers.Authorization = `Bearer ${parsed.currentSession.access_token}`;
        }
      } catch (e) {
        console.warn('Failed to parse auth token:', e);
      }
    }

    console.log('🔧 API Request:', config.method?.toUpperCase(), config.url, 'Base:', config.baseURL);
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
