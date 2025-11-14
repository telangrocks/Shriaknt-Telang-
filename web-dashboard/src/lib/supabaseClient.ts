import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  const errorMessage = 
    'Missing Supabase configuration: VITE_SUPABASE_URL is not set.\n\n' +
    'To fix this:\n' +
    '1. For local development: Create a .env file in the web-dashboard directory with:\n' +
    '   VITE_SUPABASE_URL=your-supabase-project-url\n' +
    '   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key\n\n' +
    '2. For production: Set these as build-time environment variables in your deployment platform.\n' +
    '   In Northflank/Docker: Use ARG and ENV in Dockerfile or set as build arguments.\n\n' +
    '3. Get these values from: Supabase Dashboard > Settings > API\n\n' +
    'Note: These variables must be prefixed with VITE_ to be available in the browser.'
  throw new Error(errorMessage)
}

if (!supabaseAnonKey) {
  const errorMessage = 
    'Missing Supabase configuration: VITE_SUPABASE_ANON_KEY is not set.\n\n' +
    'To fix this:\n' +
    '1. For local development: Create a .env file in the web-dashboard directory with:\n' +
    '   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key\n\n' +
    '2. For production: Set this as a build-time environment variable in your deployment platform.\n' +
    '   In Northflank/Docker: Use ARG and ENV in Dockerfile or set as build arguments.\n\n' +
    '3. Get this value from: Supabase Dashboard > Settings > API > anon/public key\n\n' +
    'Note: This variable must be prefixed with VITE_ to be available in the browser.'
  throw new Error(errorMessage)
}

// Get the current origin for redirect URLs
// This ensures we always use the actual deployed URL, not localhost
const getRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    // Use the actual origin (works for both localhost and production)
    return `${window.location.origin}/auth/callback`
  }
  // Fallback for SSR (shouldn't happen in this app, but safe to have)
  // Note: This fallback won't be used in browser context
  return 'http://localhost:3001/auth/callback'
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Don't set redirectTo in client config - it will use localhost
    // Instead, we pass emailRedirectTo explicitly in signInWithOtp
    detectSessionInUrl: true,
    flowType: 'pkce' // Use PKCE flow for better security
  }
})


