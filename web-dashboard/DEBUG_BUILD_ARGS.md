# Debugging Build Arguments in Northflank

## Issue
The web dashboard is showing "Missing Supabase configuration: VITE_SUPABASE_URL is not set" error.

## Root Cause
This error occurs when build arguments are not passed to the Docker build process in Northflank. Vite requires these variables at **build time** to embed them into the JavaScript bundle.

## Quick Fix Checklist

### 1. Verify Build Arguments in Northflank

1. Go to your **web-dashboard** service in Northflank
2. Navigate to **Settings** → **Build Settings** (or **Configuration** → **Build**)
3. Look for **"Build Arguments"** or **"Build-time Environment Variables"**
4. Verify these are set:
   - `VITE_SUPABASE_URL` = `https://snkyvhitsqvnqmzbbovj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI`

### 2. Check Build Logs

After the Dockerfile update, the build will now fail early with a clear error message if build arguments are missing:

```
ERROR: VITE_SUPABASE_URL is not set!
Please set VITE_SUPABASE_URL as a build argument in Northflank Build Settings.
```

If you see this error, it means the build arguments are not being passed correctly.

### 3. Common Issues

#### Issue: Build Arguments Not Set
**Symptom**: Build fails with "ERROR: VITE_SUPABASE_URL is not set!"
**Solution**: 
- Go to Northflank Build Settings
- Add the build arguments (see values above)
- Save and rebuild

#### Issue: Build Arguments Set as Runtime Variables Only
**Symptom**: Build succeeds but app shows error at runtime
**Solution**: 
- Build arguments MUST be set in "Build Arguments" section, not just "Environment Variables"
- Runtime environment variables are not sufficient for Vite builds

#### Issue: Wrong Service Configuration
**Symptom**: Changes don't take effect
**Solution**: 
- Ensure you're editing the **web-dashboard** service, not the backend-api service
- Verify the Dockerfile path is `web-dashboard/Dockerfile`
- Check the build context is set to `web-dashboard` directory

### 4. Verify Build Context

In Northflank, ensure:
- **Dockerfile Path**: `web-dashboard/Dockerfile`
- **Build Context**: `web-dashboard` (or root if Dockerfile handles it)
- **Working Directory**: Should match the build context

### 5. Test Locally

To verify the Dockerfile works correctly, test locally:

```bash
cd web-dashboard
docker build \
  --build-arg VITE_SUPABASE_URL=https://snkyvhitsqvnqmzbbovj.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI \
  -t web-dashboard-test .
```

The build should:
1. Show "✓ Build arguments validated: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set"
2. Complete successfully
3. The built app should work without errors

### 6. What the Updated Dockerfile Does

The updated Dockerfile now:
1. Accepts build arguments (`ARG`)
2. Sets them as environment variables (`ENV`)
3. **Validates they are not empty** (NEW)
4. Fails the build early with a clear error if missing
5. Proceeds with the build if validation passes

This ensures you get immediate feedback if build arguments are missing, rather than discovering the issue at runtime.

## Next Steps

1. **Set build arguments in Northflank** (if not already set)
2. **Trigger a new build**
3. **Check build logs** for the validation message:
   - ✅ Success: "✓ Build arguments validated: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set"
   - ❌ Failure: "ERROR: VITE_SUPABASE_URL is not set!" (means build args not passed)
4. **If build succeeds**, the app should work correctly
5. **If build fails**, follow the error message to fix the configuration

