# SUPABASE_JWT_SECRET Troubleshooting Guide

## Issue
The application is failing to start with the error:
```
Missing required environment variables: SUPABASE_JWT_SECRET
```

## What is SUPABASE_JWT_SECRET?

`SUPABASE_JWT_SECRET` is the JWT signing secret used by Supabase to sign access tokens. This secret is required to verify Supabase authentication tokens in the backend API.

**Important:** This is different from:
- `SUPABASE_ANON_KEY` - The public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - The service role key
- `SUPABASE_URL` - Your Supabase project URL

The JWT Secret is the secret key used to verify that JWT tokens issued by Supabase are authentic.

## Where to Find SUPABASE_JWT_SECRET

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Scroll down to the **JWT Settings** section
4. Copy the **JWT Secret** value (this is a long string, usually base64-encoded)

## How to Verify It's Set Correctly in Northflank

### Step 1: Verify the Secret Name
1. Log in to Northflank
2. Navigate to your service/project
3. Go to **Settings** → **Environment Variables** (or **Secrets**)
4. Look for a variable named exactly: `SUPABASE_JWT_SECRET` (case-sensitive)
5. Verify it's set as an **Environment Variable** (not a build argument)

### Step 2: Verify the Value
1. Click on the `SUPABASE_JWT_SECRET` variable
2. Verify it's not empty
3. Verify it matches the JWT Secret from your Supabase dashboard
4. Ensure there are no extra spaces or newlines

### Step 3: Check Variable Type
- ✅ **Environment Variable**: Available at runtime (correct)
- ❌ **Build Argument**: Only available during build (incorrect)
- ❌ **Secret Reference**: Should work, but verify the reference is correct

## Common Issues and Solutions

### Issue 1: Variable Name Mismatch
**Symptoms:**
- Error says `SUPABASE_JWT_SECRET` is missing
- You see variables like `SUPABASE_JWT`, `JWT_SECRET_SUPABASE`, etc.

**Solution:**
- Rename the variable to exactly `SUPABASE_JWT_SECRET` (case-sensitive)
- Ensure no typos or extra characters

### Issue 2: Variable Not Set as Environment Variable
**Symptoms:**
- Variable exists but application still can't find it
- Variable is set as a build argument

**Solution:**
- In Northflank, ensure the variable is set as an **Environment Variable** (runtime)
- Not as a **Build Argument** (build-time only)

### Issue 3: Empty or Whitespace Value
**Symptoms:**
- Variable exists but validation still fails
- Value might contain only spaces or newlines

**Solution:**
- Verify the value is not empty
- Remove any leading/trailing whitespace
- Copy the value directly from Supabase dashboard

### Issue 4: Wrong Value
**Symptoms:**
- Variable exists but Supabase authentication fails
- JWT verification errors

**Solution:**
- Verify you copied the **JWT Secret** (not the anon key or service role key)
- Go to Supabase → Settings → API → JWT Settings
- Copy the **JWT Secret** value
- Update the variable in Northflank

## Using the Diagnostic Script

We've created a diagnostic script to help identify the issue:

```bash
# Run the diagnostic script
node scripts/check-env.js

# To see all environment variables (including values for non-secrets)
node scripts/check-env.js --show-all
```

This script will:
- Check which required environment variables are set
- Identify missing or empty variables
- Check for similar variable names
- Provide guidance on how to fix issues

## Verification Steps

1. **Verify in Supabase:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the JWT Secret value

2. **Verify in Northflank:**
   - Go to your service → Settings → Environment Variables
   - Verify `SUPABASE_JWT_SECRET` exists
   - Verify it's set as an Environment Variable (not build arg)
   - Verify the value matches Supabase

3. **Verify in Container:**
   - After deployment, check the logs
   - Look for the diagnostic messages
   - Check if related variables are found

4. **Test the Fix:**
   - Redeploy the service
   - Check the startup logs
   - Verify the application starts successfully

## Expected Logs (After Fix)

When `SUPABASE_JWT_SECRET` is correctly set, you should see:
```
[INFO] Environment validation: 24/24 required variables are set
[INFO] Environment variables validated successfully
```

## Still Having Issues?

If you've verified all the above and still have issues:

1. **Check the logs:**
   - Look for diagnostic messages about related variables
   - Check if alternative names are found
   - Verify the validation count

2. **Verify Northflank Configuration:**
   - Check the `northflank.json` file (if using)
   - Verify environment variable references
   - Ensure secrets are properly linked

3. **Check Docker Configuration:**
   - Verify the Dockerfile doesn't override environment variables
   - Check if there's a custom entrypoint script
   - Ensure environment variables are passed to the container

4. **Contact Support:**
   - Provide the diagnostic script output
   - Include relevant log excerpts
   - Share your Northflank configuration (without secrets)

## Related Documentation

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Northflank Environment Variables](https://docs.northflank.com/features/environment-variables)
- [JWT Verification in Node.js](https://github.com/auth0/node-jsonwebtoken)

