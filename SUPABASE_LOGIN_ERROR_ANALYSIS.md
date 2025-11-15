# Supabase Login Error Analysis: "required field 'unknown' is missing"

## Quick Answer Summary

### 1. What specific field should be included in the JSON request payload?

**Answer:** The field name is `accessToken` (camelCase), and it should contain the Supabase JWT access token.

**Correct Payload:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Your frontend code should look like:**
```javascript
const response = await api.post('/auth/supabase-login', {
  accessToken: session.access_token  // Note: 'accessToken', not 'access_token'
})
```

### 2. Expected JSON payload structure

The endpoint expects a simple JSON object with one field:

```typescript
{
  accessToken: string  // Required: Supabase JWT access token
}
```

**Full Example:**
```javascript
// After Supabase authentication
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Exchange token
const response = await api.post('/auth/supabase-login', {
  accessToken: session.access_token
})
```

### 3. How to debug in frontend code

Add this debugging code to your frontend:

```javascript
const exchangeSession = async (session) => {
  if (!session?.access_token) {
    throw new Error('Supabase did not return a valid session.')
  }

  // DEBUG: Log the payload before sending
  const payload = {
    accessToken: session.access_token
  }
  
  console.log('[DEBUG] Supabase login request:', {
    hasAccessToken: !!payload.accessToken,
    accessTokenType: typeof payload.accessToken,
    accessTokenLength: payload.accessToken?.length,
    accessTokenPrefix: payload.accessToken?.substring(0, 20) + '...',
    fullPayload: payload  // Remove in production!
  })

  try {
    const response = await api.post('/auth/supabase-login', payload)
    // ... rest of your code
  } catch (error) {
    // DEBUG: Log full error details
    console.error('[DEBUG] Supabase login error:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      responseData: error?.response?.data,
      requestPayload: payload,
      requestHeaders: error?.config?.headers
    })
    throw error
  }
}
```

**Check Browser Network Tab:**
1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "supabase-login"
4. Click on the request
5. Check:
   - **Request Payload**: Should show `{"accessToken":"..."}`
   - **Request Headers**: Should include `Content-Type: application/json`
   - **Response**: Check the error message and status code

### 4. Common misconfigurations

#### A. Wrong field name
**Problem:** Using `access_token` instead of `accessToken`
```javascript
// ❌ Wrong
{ access_token: session.access_token }

// ✅ Correct
{ accessToken: session.access_token }
```

#### B. Missing Content-Type header
**Problem:** Request not sent as JSON
**Solution:** Ensure your API client (axios/fetch) sends JSON:
```javascript
// Axios (usually automatic)
axios.post('/auth/supabase-login', { accessToken: token })

// Fetch (explicit)
fetch('/auth/supabase-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accessToken: token })
})
```

#### C. Database schema issue (most likely cause of "unknown" field error)
**Problem:** Database column has NOT NULL constraint without DEFAULT
**Solution:** Check your database schema:
```sql
-- Check which columns are NOT NULL without defaults
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND is_nullable = 'NO'
  AND column_default IS NULL;
```

Common culprits:
- `is_active` - Should have `DEFAULT true`
- `created_at` - Should have `DEFAULT CURRENT_TIMESTAMP`
- `updated_at` - Should have `DEFAULT CURRENT_TIMESTAMP`

#### D. Invalid or expired token
**Problem:** Token is expired or invalid
**Solution:** 
- Ensure token is fresh (obtained immediately after Supabase login)
- Verify `SUPABASE_JWT_SECRET` matches Supabase project settings
- Check token expiration

#### E. Missing environment variables
**Problem:** Backend not configured properly
**Required:**
- `SUPABASE_JWT_SECRET`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `DATABASE_URL`

## Understanding the "unknown" field error

The error message "required field 'unknown' is missing" indicates:

1. **The request payload is correct** - The endpoint received `accessToken` and processed it
2. **Token verification succeeded** - The Supabase JWT was valid
3. **Database insertion failed** - A NOT NULL column is missing a value
4. **Column name extraction failed** - The system couldn't identify which column

### Why "unknown"?

The backend tries to extract the column name from the PostgreSQL error, but if the error format doesn't match expected patterns, it defaults to 'unknown'.

### How to find the actual missing field

**Option 1: Check backend logs**
Look for this log entry:
```
[BACKEND_ERROR] [req_xxx] Database NOT NULL violation details:
```
This includes the actual column name if extractable.

**Option 2: Query database directly**
```sql
-- Try the INSERT that the code does
INSERT INTO users (
  email,
  supabase_user_id,
  is_verified,
  trial_start_date,
  trial_end_date,
  subscription_status
)
VALUES (
  NULL,
  '00000000-0000-0000-0000-000000000000'::UUID,
  true,
  NOW(),
  NOW() + INTERVAL '5 days',
  'trial'
);
```

This will show you exactly which column is missing.

**Option 3: Check schema**
```sql
-- Find columns that require values but have no default
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY ordinal_position;
```

## Immediate Action Items

1. ✅ **Verify your frontend payload** - Ensure you're sending `{ accessToken: "..." }`
2. ✅ **Add debugging logs** - Use the code above to see what's being sent
3. ✅ **Check backend logs** - Look for the detailed error information
4. ✅ **Verify database schema** - Run the SQL queries above
5. ✅ **Test with direct database query** - Identify the exact missing column

## Files to Review

- **Backend endpoint:** `backend-services/src/routes/auth.js` (line 424)
- **User creation logic:** `backend-services/src/routes/auth.js` (function `getOrCreateUserByEmail`, line 36)
- **Database schema:** `backend-services/src/database/pool.js` (function `initializeSchema`, line 250)
- **Frontend usage:** `web-dashboard/src/pages/Registration.jsx` (function `exchangeSession`, line 135)

## Recent Improvements Made

I've improved the error handling to better extract column names from PostgreSQL errors. The updated code now:

1. Tries multiple methods to extract the column name
2. Logs more detailed error information
3. Provides better error messages

After deploying these changes, you should see the actual column name instead of 'unknown' in most cases.

