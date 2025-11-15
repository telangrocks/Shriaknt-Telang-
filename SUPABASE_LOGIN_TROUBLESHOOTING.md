# Supabase Login Endpoint Troubleshooting Guide

## Endpoint Information

**URL:** `POST /api/auth/supabase-login`  
**Content-Type:** `application/json`

## Expected Request Payload Structure

The endpoint expects a JSON payload with the following structure:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Required Fields

- **`accessToken`** (string, required): The Supabase JWT access token obtained after successful authentication with Supabase. This token should be the `access_token` from the Supabase session object.

### Example Frontend Code

```javascript
// After successful Supabase authentication
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Exchange Supabase token for backend session
const response = await api.post('/auth/supabase-login', {
  accessToken: session.access_token  // Note: 'accessToken' (camelCase), not 'access_token'
})
```

## Error: "required field 'unknown' is missing"

### What This Error Means

This error indicates that the backend is trying to create a user record in the database, but a required (NOT NULL) database column is missing a value. The error message shows 'unknown' when the system cannot identify which specific column is missing.

### How to Identify the Missing Field

1. **Check Backend Logs**: The backend logs detailed error information including:
   - The actual PostgreSQL error code and message
   - The column name (if extractable)
   - All values being inserted

2. **Look for Database Schema Issues**: The error typically occurs when:
   - A database column has a NOT NULL constraint without a DEFAULT value
   - The INSERT statement doesn't include all required columns
   - There's a mismatch between the code and database schema

3. **Common Missing Fields**:
   - `is_active` - Should have DEFAULT true, but might be missing
   - `created_at` - Should have DEFAULT CURRENT_TIMESTAMP
   - `updated_at` - Should have DEFAULT CURRENT_TIMESTAMP
   - Other columns that were added with NOT NULL but no default

### Debugging Steps

#### 1. Verify Request Payload

Add logging in your frontend to verify the payload:

```javascript
const payload = {
  accessToken: session.access_token
}

console.log('[DEBUG] Supabase login payload:', {
  hasAccessToken: !!payload.accessToken,
  accessTokenLength: payload.accessToken?.length,
  accessTokenPrefix: payload.accessToken?.substring(0, 20),
  fullPayload: payload
})

const response = await api.post('/auth/supabase-login', payload)
```

#### 2. Check Backend Logs

The backend logs detailed information when this error occurs. Look for:

```
[BACKEND_ERROR] [req_xxx] Database NOT NULL violation details:
```

This log entry includes:
- `column`: The column name (if extractable)
- `errorCode`: PostgreSQL error code (23502 = NOT NULL violation)
- `errorMessage`: Full error message
- `email`: Email being inserted
- `supabaseUserId`: User ID being inserted
- `allErrorProps`: All available error properties

#### 3. Verify Database Schema

Check your database schema to ensure all required columns have defaults or are being provided:

```sql
-- Check users table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

#### 4. Test with Direct Database Query

You can test the INSERT statement directly:

```sql
-- This should match what the code is doing
INSERT INTO users (
  email,
  supabase_user_id,
  is_verified,
  trial_start_date,
  trial_end_date,
  subscription_status
)
VALUES (
  NULL,  -- or 'test@example.com'
  '00000000-0000-0000-0000-000000000000'::UUID,
  true,
  NOW(),
  NOW() + INTERVAL '5 days',
  'trial'
);
```

If this fails, it will show you exactly which column is missing.

## Common Misconfigurations

### 1. Missing JSON Body Parser

**Symptom**: Request body is empty or undefined

**Solution**: Ensure Express JSON middleware is configured (already done in `server.js`):
```javascript
app.use(express.json({ limit: '10mb' }))
```

### 2. Wrong Field Name

**Symptom**: "Missing accessToken" error

**Solution**: Ensure you're sending `accessToken` (camelCase), not `access_token` (snake_case):
```javascript
// ✅ Correct
{ accessToken: session.access_token }

// ❌ Wrong
{ access_token: session.access_token }
```

### 3. Invalid or Expired Token

**Symptom**: "Invalid Supabase token" error

**Solution**: 
- Ensure the token is fresh (obtained immediately after Supabase login)
- Verify `SUPABASE_JWT_SECRET` matches your Supabase project settings
- Check token expiration in Supabase dashboard

### 4. Database Schema Mismatch

**Symptom**: "required field 'unknown' is missing"

**Solution**: 
- Run database migrations to ensure schema is up to date
- Check that all NOT NULL columns have DEFAULT values or are being provided
- Verify the `users` table structure matches the code expectations

### 5. Missing Environment Variables

**Symptom**: Various authentication errors

**Required Environment Variables**:
- `SUPABASE_JWT_SECRET`: JWT secret from Supabase project settings
- `JWT_SECRET`: Secret for issuing backend JWT tokens
- `REFRESH_TOKEN_SECRET`: Secret for refresh tokens
- `DATABASE_URL`: PostgreSQL connection string

## Frontend Debugging Checklist

- [ ] Verify `session.access_token` exists and is a non-empty string
- [ ] Check that the payload is being sent as JSON (not form data)
- [ ] Verify `Content-Type: application/json` header is set
- [ ] Log the full request payload before sending
- [ ] Check browser Network tab for actual request/response
- [ ] Verify API base URL is correct
- [ ] Check for CORS errors in browser console

## Backend Debugging Checklist

- [ ] Check backend logs for detailed error information
- [ ] Verify `SUPABASE_JWT_SECRET` is set correctly
- [ ] Verify database connection is working
- [ ] Check database schema matches code expectations
- [ ] Verify all required environment variables are set
- [ ] Check for database constraint violations
- [ ] Review INSERT statement in `getOrCreateUserByEmail` function

## Getting More Information

If the error persists, collect the following information:

1. **Backend Logs**: Full error log entry with `[BACKEND_ERROR]` tag
2. **Request Details**: 
   - Request payload (with token masked)
   - Request headers
   - Response status and body
3. **Database Schema**: Output of the SQL query above
4. **Environment**: Node version, database version, deployment platform

## Next Steps After Identifying the Missing Field

Once you identify which field is missing:

1. **If it's a schema issue**: Add a DEFAULT value to the column or update the INSERT statement
2. **If it's a code issue**: Update the `getOrCreateUserByEmail` function to include the missing field
3. **If it's a data issue**: Ensure the Supabase token contains the required claims (email, sub)

## Related Files

- Backend endpoint: `backend-services/src/routes/auth.js` (line 424)
- User creation: `backend-services/src/routes/auth.js` (function `getOrCreateUserByEmail`)
- Database schema: `backend-services/src/database/pool.js` (function `initializeSchema`)
- Frontend usage: `web-dashboard/src/pages/Registration.jsx` (function `exchangeSession`)

