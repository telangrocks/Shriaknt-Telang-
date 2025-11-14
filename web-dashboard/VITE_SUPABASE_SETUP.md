# VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY Setup Guide

## Problem
The web dashboard requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables to connect to Supabase for authentication. These must be set at **build time** because Vite embeds them into the production bundle.

## Where to Get These Values

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to **Settings** → **API**

2. **Copy the values:**
   - **VITE_SUPABASE_URL**: Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **VITE_SUPABASE_ANON_KEY**: Copy the **anon/public** key (the one labeled "anon" or "public")

## Setup for Local Development

1. **Create a `.env` file** in the `web-dashboard` directory:
   ```bash
   cd web-dashboard
   cp .env.example .env
   ```

2. **Edit `.env` file** and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Setup for Production (Docker/Northflank)

### Option 1: Using Build Arguments (Recommended)

In your deployment platform (Northflank), set these as **build arguments**:

1. **Go to your service settings**
2. **Navigate to Build Settings**
3. **Add Build Arguments:**
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`
   - `VITE_API_BASE_URL` = `https://your-api-domain.com`

### Option 2: Using Environment Variables (If Build Args Not Supported)

Some platforms allow setting environment variables that are available during build:

1. **Set as Environment Variables:**
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`
   - `VITE_API_BASE_URL` = `https://your-api-domain.com`

2. **Ensure they're available at build time** (not just runtime)

### Option 3: Using Docker Build Command

If building manually with Docker:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key-here \
  --build-arg VITE_API_BASE_URL=https://your-api-domain.com \
  -t cryptopulse-web-dashboard \
  .
```

## Important Notes

1. **VITE_ Prefix Required**: All environment variables that should be available in the browser **must** be prefixed with `VITE_`. This is a Vite security feature.

2. **Build-Time Only**: These variables are embedded into the JavaScript bundle during build. They cannot be changed at runtime without rebuilding.

3. **Public Values**: The `VITE_SUPABASE_ANON_KEY` is the **anon/public** key, which is safe to expose in the browser. Never use the **service_role** key here.

4. **Email Confirmation Disabled**: The application uses instant email/password authentication without email confirmation. Ensure email confirmation is disabled in Supabase Dashboard:
   - Go to **Authentication → Settings** in Supabase Dashboard
   - Disable "Enable email confirmations" if you want instant authentication
   - Users will be authenticated immediately after signup

4. **Different from Backend**: These are **different** from the backend environment variables:
   - Backend uses: `SUPABASE_JWT_SECRET` (for verifying tokens)
   - Frontend uses: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (for client-side auth)

## Verification

### Local Development
1. Start the dev server
2. Open browser console
3. Check for errors about missing Supabase configuration
4. The app should load without errors

### Production
1. Build the Docker image with the build arguments
2. Check build logs for any errors
3. Deploy and verify the app loads correctly
4. Test authentication functionality

## Troubleshooting

### Error: "Missing Supabase configuration: VITE_SUPABASE_URL is not set"

**Cause**: The environment variable is not set or not available during build.

**Solution**:
1. Verify the variable is set in your `.env` file (local) or build arguments (production)
2. Ensure the variable name is exactly `VITE_SUPABASE_URL` (case-sensitive)
3. Restart the dev server after changing `.env` file
4. Rebuild the Docker image after changing build arguments

### Error: "Missing Supabase configuration: VITE_SUPABASE_ANON_KEY is not set"

**Cause**: The environment variable is not set or not available during build.

**Solution**:
1. Verify the variable is set in your `.env` file (local) or build arguments (production)
2. Ensure the variable name is exactly `VITE_SUPABASE_ANON_KEY` (case-sensitive)
3. Verify you're using the **anon/public** key, not the service_role key
4. Restart the dev server after changing `.env` file
5. Rebuild the Docker image after changing build arguments

### Variables Not Working in Production

**Cause**: Variables might be set as runtime environment variables instead of build-time.

**Solution**:
1. In Northflank, ensure variables are set as **Build Arguments**, not just Environment Variables
2. Verify the Dockerfile is correctly configured to accept ARG and set ENV
3. Rebuild the image after making changes

## Related Files

- `web-dashboard/src/lib/supabaseClient.ts` - Supabase client initialization
- `web-dashboard/.env.example` - Example environment variables file
- `web-dashboard/Dockerfile` - Docker build configuration
- `web-dashboard/vite.config.js` - Vite configuration

## Summary

1. **Get values** from Supabase Dashboard → Settings → API
2. **Local**: Create `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Production**: Set as build arguments in your deployment platform
4. **Verify**: Check that the app loads without errors
5. **Test**: Verify authentication works correctly

