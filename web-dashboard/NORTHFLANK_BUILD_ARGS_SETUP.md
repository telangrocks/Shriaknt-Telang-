# How to Add Build Arguments in Northflank

## Problem Identified ✅

The build logs confirm that build arguments are **NOT being passed** from Northflank:
```
RUN if [ -z "" ]; then ...  # Empty string means no build args!
ERROR: VITE_SUPABASE_URL is not set!
```

## Solution: Add Build Arguments in Northflank

### Step 1: Navigate to Web Dashboard Service

1. Log into your **Northflank Dashboard**
2. Select your **project**
3. Find and click on the **web-dashboard** service (or whatever you named it)

### Step 2: Open Build Settings

1. Click on **Settings** (or gear icon)
2. Navigate to **Build Settings** (or **Configuration** → **Build**)
3. Look for **"Build Arguments"** or **"Build-time Environment Variables"** section

### Step 3: Add Build Arguments

Click **"Add Build Argument"** or **"Add Variable"** and add these **TWO** build arguments:

#### Build Argument 1:
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://snkyvhitsqvnqmzbbovj.supabase.co`
- **Type**: Build Argument (not Runtime Environment Variable)

#### Build Argument 2:
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI`
- **Type**: Build Argument (not Runtime Environment Variable)

### Step 4: Save and Rebuild

1. **Save** the build arguments
2. **Trigger a new build** (or it may auto-trigger)
3. **Check the build logs** - you should now see:
   ```
   ✓ Build arguments validated: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
   ```

## Important Notes

### ⚠️ Build Arguments vs Environment Variables

- **Build Arguments**: Required for Vite builds. These are passed to Docker during the build process.
- **Runtime Environment Variables**: NOT sufficient. These are only available when the container runs, but Vite needs them during build.

### ✅ Correct Setup

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **Build Arguments**
- The Dockerfile will accept these as `ARG` and set them as `ENV` during build
- Vite will embed them into the JavaScript bundle

### ❌ Incorrect Setup

- Setting them only as Runtime Environment Variables (won't work)
- Setting them in the wrong service (make sure it's web-dashboard, not backend-api)
- Using wrong variable names (must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)

## Verification

After adding build arguments and rebuilding, check the build logs for:

### Success ✅
```
# [builder 3/7] RUN if [ -z "$VITE_SUPABASE_URL" ]; then ...
✓ Build arguments validated: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
# [builder 4/7] COPY package.json yarn.lock .yarnrc.yml ./
# [builder 5/7] RUN corepack enable && yarn install ...
# [builder 6/7] COPY . .
# [builder 7/7] RUN yarn run build
vite v5.x.x building for production...
```

### Failure ❌ (Current State)
```
# [builder 3/7] RUN if [ -z "" ]; then ...  # Empty!
ERROR: VITE_SUPABASE_URL is not set!
```

## Troubleshooting

### If Build Arguments Section Doesn't Exist

Some Northflank interfaces may call it:
- **"Build-time Environment Variables"**
- **"Docker Build Arguments"**
- **"Build Args"**
- **"ARG Variables"**

Look for any section related to **build-time** configuration, not runtime.

### If You Can't Find the Section

1. Check if you're in the correct service (web-dashboard, not backend-api)
2. Check if you have the right permissions
3. Try looking in **Advanced Settings** or **Configuration** tabs
4. Contact Northflank support if the option is missing

### After Adding Build Arguments

1. **Save** the configuration
2. **Trigger a new build** manually if it doesn't auto-trigger
3. **Watch the build logs** - the validation should now pass
4. **Verify the app works** - the Supabase error should be gone

## Quick Reference

**Build Arguments to Add:**
```
VITE_SUPABASE_URL=https://snkyvhitsqvnqmzbbovj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3l2aGl0c3F2bnFtemJib3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDg3MjUsImV4cCI6MjA3ODUyNDcyNX0.a9o4r_YvAzzA5m2Ev0_Q5kT8NwsCgj8eUPDdtM264NI
```

**Where to Add:** Northflank → Your Project → web-dashboard Service → Settings → Build Settings → Build Arguments

