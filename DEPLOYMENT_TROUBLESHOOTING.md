# 🔧 Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue: Docker Build Fails with "Node engine incompatible" Error

**Error Message:**
```
error @supabase/supabase-js@2.81.1: The engine "node" is incompatible with this module. Expected version ">=20.0.0". Got "18.20.8"
```

**Cause:**
- Docker is using a cached layer with Node.js 18
- The Dockerfile has been updated to use Node.js 20, but the cache hasn't been cleared

**Solution:**

1. **Clear Docker Build Cache in Northflank:**
   - Go to your service in Northflank
   - Navigate to **Build Settings**
   - Enable **"Clear build cache"** or **"No cache"** option
   - Trigger a new build

2. **Or Force a Fresh Build:**
   - In Northflank, go to your service
   - Click **"Rebuild"** or **"Redeploy"**
   - Select **"Clear cache"** option if available
   - This will force Docker to rebuild from scratch using the updated Dockerfile

3. **Verify Dockerfile is Using Node 20:**
   - Check that `backend-services/Dockerfile` has:
     ```dockerfile
     FROM node:20-alpine AS builder
     ```
   - Not `node:18-alpine`

4. **Check Git Repository:**
   - Ensure the latest commit with Node 20 Dockerfile is pushed
   - Verify Northflank is building from the correct branch (usually `main`)

### Issue: Missing SUPABASE_JWT_SECRET

**Error Message:**
```
Missing required environment variables: SUPABASE_JWT_SECRET
```

**Solution:**
1. Go to Supabase Dashboard → Settings → API → JWT Settings
2. Copy the JWT Secret
3. Add it to Northflank as `SUPABASE_JWT_SECRET`
4. Redeploy the service

See `DEPLOYMENT_SETUP.md` for detailed instructions.

### Issue: Application Won't Start

**Check Logs For:**
- Missing environment variables
- Database connection errors
- Redis connection errors
- Invalid Supabase credentials

**Solution:**
1. Review service logs in Northflank
2. Verify all required environment variables are set
3. Check database and Redis addons are running
4. Verify Supabase credentials are correct

### Issue: Build Succeeds But Service Crashes

**Possible Causes:**
- Missing environment variables
- Invalid database connection string
- Port conflicts
- Memory limits exceeded

**Solution:**
1. Check application logs
2. Verify health endpoint: `https://your-api-domain.com/health`
3. Review resource limits (CPU/Memory)
4. Check for error messages in logs

## Quick Fixes

### Force Docker Cache Clear

If you're experiencing cached build issues:

1. **Option 1: Northflank UI**
   - Service → Build Settings → Clear Cache → Rebuild

2. **Option 2: Update Dockerfile**
   - Add a comment with timestamp to force cache invalidation
   - Commit and push
   - Trigger new build

3. **Option 3: Change Base Image Tag**
   - Use specific version: `node:20.11.0-alpine` instead of `node:20-alpine`
   - This forces Docker to pull a fresh image

### Verify Node Version in Build

Add this to your Dockerfile to verify:
```dockerfile
RUN node --version && npm --version
```

This will show in build logs what version is actually being used.

## Still Having Issues?

1. Check the latest commits are pushed to your repository
2. Verify Northflank is building from the correct branch
3. Review build logs for specific error messages
4. Ensure all environment variables are properly set
5. Check that addons (PostgreSQL, Redis) are running

