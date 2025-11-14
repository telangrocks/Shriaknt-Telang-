# Supabase Login 500 Error Troubleshooting Guide

## Error
```
POST /api/auth/supabase-login
500 Internal Server Error
{"error":"Internal server error","message":"Failed to authenticate with Supabase"}
```

## Enhanced Error Logging

The `/api/auth/supabase-login` endpoint now includes comprehensive error logging to help identify the exact failure point. Check your backend logs for detailed error information.

## Common Causes and Solutions

### 1. Missing Environment Variables

#### SUPABASE_JWT_SECRET
**Symptoms:**
- Log shows: `"SUPABASE_JWT_SECRET is missing - cannot verify Supabase tokens"`
- Response: `500 - "Server is missing SUPABASE_JWT_SECRET configuration"`

**Solution:**
1. Get JWT Secret from Supabase Dashboard → Settings → API → JWT Settings
2. Add to Northflank Environment Variables as `SUPABASE_JWT_SECRET`
3. Restart the backend service

#### JWT_SECRET
**Symptoms:**
- Log shows: `"JWT_SECRET is missing - cannot issue authentication tokens"`
- Response: `500 - "JWT_SECRET is not configured"`

**Solution:**
1. Generate a secure 32+ character secret
2. Add to Northflank Environment Variables as `JWT_SECRET`
3. Restart the backend service

#### REFRESH_TOKEN_SECRET
**Symptoms:**
- Log shows: `"REFRESH_TOKEN_SECRET is missing - cannot issue refresh tokens"`
- Response: `500 - "REFRESH_TOKEN_SECRET is not configured"`

**Solution:**
1. Generate a secure 32+ character secret (different from JWT_SECRET)
2. Add to Northflank Environment Variables as `REFRESH_TOKEN_SECRET`
3. Restart the backend service

### 2. Database Connection Issues

**Symptoms:**
- Log shows: `"Database error during user lookup/creation"`
- Error includes database connection details
- Response: `500 - "Failed to retrieve or create user account"`

**Solution:**
1. Check `DATABASE_URL` environment variable is set correctly
2. Verify PostgreSQL addon is running in Northflank
3. Check database connection string format
4. Verify database schema is initialized
5. Check backend logs for specific database error messages

### 3. Redis Connection Issues

**Symptoms:**
- Log shows: `"Failed to store session in Redis"` or `"Error storing session in Redis"`
- Note: Redis failures are non-blocking - authentication will still succeed

**Solution:**
1. Check `REDIS_URL` environment variable is set correctly
2. Verify Redis addon is running in Northflank
3. Check Redis connection string format
4. Note: Redis failures won't cause 500 errors, but sessions won't be cached

### 4. Invalid Supabase Token

**Symptoms:**
- Log shows: `"Failed to verify Supabase access token"`
- Response: `401 - "Invalid Supabase token"`

**Solution:**
1. Verify `SUPABASE_JWT_SECRET` matches the JWT Secret in Supabase Dashboard
2. Check if the token has expired (magic links expire after 1 hour)
3. Request a new magic link from the frontend
4. Verify the token is being sent correctly from frontend

### 5. Token Missing Required Claims

**Symptoms:**
- Log shows: `"Supabase token missing email claim"` or `"Supabase token missing subject claim"`
- Response: `400 - "Missing email"` or `"Missing subject"`

**Solution:**
1. This usually indicates a Supabase configuration issue
2. Verify email authentication is enabled in Supabase
3. Check Supabase project settings
4. Ensure the token is from a valid Supabase authentication flow

## Debugging Steps

### Step 1: Check Backend Logs
Look for these log messages in order:

1. `"Verifying Supabase access token..."` - Token verification started
2. `"Supabase token verified successfully"` - Token is valid
3. `"Getting or creating user by email"` - Database lookup started
4. `"User retrieved/created successfully"` - Database operation succeeded
5. `"Issuing authentication tokens"` - Token generation started
6. `"Authentication tokens issued successfully"` - Tokens generated
7. `"Supabase login successful"` - Complete success

If any step fails, the log will show detailed error information.

### Step 2: Verify Environment Variables
Check that all required variables are set in Northflank:

- ✅ `SUPABASE_JWT_SECRET` - From Supabase Dashboard
- ✅ `JWT_SECRET` - Generated secure secret (32+ chars)
- ✅ `REFRESH_TOKEN_SECRET` - Generated secure secret (32+ chars)
- ✅ `DATABASE_URL` - From PostgreSQL addon
- ✅ `REDIS_URL` - From Redis addon (optional but recommended)

### Step 3: Test Database Connection
If database errors appear:
1. Check PostgreSQL addon status in Northflank
2. Verify `DATABASE_URL` is correct
3. Check if database schema is initialized
4. Test database connection manually if possible

### Step 4: Test Redis Connection
If Redis errors appear (non-blocking):
1. Check Redis addon status in Northflank
2. Verify `REDIS_URL` is correct
3. Note: Redis failures won't cause 500 errors, just warnings

### Step 5: Verify Supabase Configuration
1. Check Supabase Dashboard → Settings → API
2. Verify JWT Secret matches `SUPABASE_JWT_SECRET` in backend
3. Ensure email authentication is enabled
4. Check Supabase project is active and not paused

## Error Log Format

The enhanced logging provides detailed information:

```javascript
{
  error: "Error message",
  name: "Error name (e.g., 'Error', 'TypeError')",
  code: "Error code if available",
  stack: "Full stack trace",
  // Additional context specific to the operation
  userId: "...",
  email: "...",
  supabaseUserId: "..."
}
```

## Next Steps After Identifying Error

1. **If missing environment variable**: Add it to Northflank and restart service
2. **If database error**: Check database connection and schema
3. **If token verification fails**: Verify `SUPABASE_JWT_SECRET` matches Supabase
4. **If token issuance fails**: Check `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are set
5. **If unexpected error**: Check the full error object in logs for details

## Prevention

To prevent these issues:
1. Use environment variable validation on startup
2. Monitor backend logs for warnings about missing configuration
3. Set up health checks that verify all required services are accessible
4. Use proper error handling and logging throughout the authentication flow

The enhanced error logging should now reveal the exact cause of any 500 errors during Supabase login.

