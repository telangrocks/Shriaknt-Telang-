# Northflank Setup Guide for Web Dashboard

## Required Configuration

The web dashboard requires the following environment variables to be set in Northflank:

1. **VITE_SUPABASE_URL** - Your Supabase project URL
2. **VITE_SUPABASE_ANON_KEY** - Your Supabase anon/public key
3. **VITE_API_BASE_URL** - Your backend API URL (optional, for API proxy)

## ⚠️ CRITICAL: Both Build Arguments AND Runtime Environment Variables

For Vite applications, you **MUST** set these as **Build Arguments** because Vite embeds them into the JavaScript bundle during the build process. However, it's also recommended to set them as Runtime Environment Variables for consistency.

## Step-by-Step Northflank Configuration

### Step 1: Configure Build Arguments (REQUIRED)

Build arguments are **critical** because Vite needs these values during the build process to embed them into the production bundle.

1. **Go to your service** in Northflank
2. **Navigate to Settings** → **Build Settings** (or **Configuration** → **Build**)
3. **Find "Build Arguments"** or **"Build-time Environment Variables"**
4. **Add the following build arguments:**

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://snkyvhitsqvnqmzbbovj.supabase.co` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI` | Your Supabase anon/public key |
   | `VITE_API_BASE_URL` | `https://your-api-domain.com` | Your backend API URL (if applicable) |

### Step 2: Configure Runtime Environment Variables (RECOMMENDED)

While build arguments are required, it's also good practice to set these as runtime environment variables for consistency and debugging.

1. **Go to your service** in Northflank
2. **Navigate to Settings** → **Environment Variables** (or **Configuration** → **Environment**)
3. **Add the following runtime environment variables:**

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://snkyvhitsqvnqmzbbovj.supabase.co` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI` | Your Supabase anon/public key |
   | `VITE_API_BASE_URL` | `https://your-api-domain.com` | Your backend API URL (if applicable) |

### Step 3: Save and Rebuild

1. **Save** both the build arguments and runtime environment variables
2. **Trigger a new build** or **redeploy** the service
3. The build should now include these variables in the production bundle
4. Verify the deployment succeeds without "Missing Supabase configuration" errors

## Important Notes

### ⚠️ Build Arguments vs Environment Variables

- **Build Arguments**: Required for Vite apps. These are embedded into the JavaScript bundle during build.
- **Environment Variables**: Not sufficient for Vite apps. These are only available at runtime, but Vite needs them at build time.

### ✅ Correct Setup

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **Build Arguments**
- The Dockerfile will accept these as `ARG` and set them as `ENV` during build
- Vite will embed them into the production bundle

### ❌ Incorrect Setup

- Setting them only as runtime Environment Variables (won't work)
- Setting them after the build is complete (too late)
- Using wrong variable names (must be exactly as shown)

## Verification

After setting up build arguments and rebuilding:

1. **Check build logs** - Should show no errors about missing variables
2. **Deploy and test** - The app should load without errors
3. **Check browser console** - Should not show "Missing Supabase configuration" errors
4. **Test authentication** - Should be able to sign in/register

## Troubleshooting

### Build Fails with "Missing Supabase configuration"

**Cause**: Build arguments are not set or not accessible during build.

**Solution**:
1. Verify build arguments are set in Northflank build settings
2. Check that variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Verify the values are not empty
4. Rebuild the service

### App Loads but Authentication Fails

**Cause**: Values might be incorrect or the anon key is wrong.

**Solution**:
1. Verify you're using the **anon/public** key, not the service_role key
2. Check that the Supabase URL is correct
3. Verify the API base URL points to your backend
4. Check browser console for specific error messages

### Variables Not Available in Production

**Cause**: Variables might be set as runtime environment variables instead of build arguments.

**Solution**:
1. Ensure variables are set as **Build Arguments** in Northflank
2. Verify the Dockerfile accepts ARG and sets ENV correctly
3. Rebuild the image after making changes

## Example Configuration

### Northflank Build Arguments (REQUIRED)

```
VITE_SUPABASE_URL=https://snkyvhitsqvnqmzbbovj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI
VITE_API_BASE_URL=https://your-api-domain.com
```

### Northflank Runtime Environment Variables (RECOMMENDED)

```
VITE_SUPABASE_URL=https://snkyvhitsqvnqmzbbovj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI
VITE_API_BASE_URL=https://your-api-domain.com
```

### Dockerfile Configuration

The Dockerfile is already configured to accept these as build arguments:

```dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
```

## Related Documentation

- `VITE_SUPABASE_SETUP.md` - Detailed setup guide
- `Dockerfile` - Docker build configuration
- `src/lib/supabaseClient.ts` - Supabase client initialization

## Summary

1. **Get values** from Supabase Dashboard → Settings → API
2. **Set as Build Arguments** in Northflank (not just Environment Variables)
3. **Rebuild** the service
4. **Verify** the app loads correctly
5. **Test** authentication functionality

---

**Note**: If you're unsure how to set build arguments in Northflank, check the Northflank documentation or contact their support. The exact location might vary depending on your Northflank plan or interface version.

