# JWT Secret Validation and Error Handling Fix

## Problem
The application was experiencing 500 errors during magic link verification and session exchange. The root cause was suspected to be related to JWT secret validation or incorrect configuration.

## JWT Secret Validation

The provided JWT secret has been validated:
- **Length**: 88 characters ✅
- **Format**: Valid base64-encoded string ✅
- **Expected**: 64-128 characters (typically 88 for base64-encoded) ✅

## Changes Made

### 1. Enhanced JWT Secret Validation (`getSupabaseJwtSecret.js`)
- Added base64 format validation
- Improved trimming to handle whitespace issues
- Added debug logging for secret length (without exposing the actual secret)
- Validates secret format at load time

### 2. Improved Error Logging (`auth.js`)
- Enhanced JWT verification error logging with specific error types:
  - `JsonWebTokenError`: Signature verification failed
  - `TokenExpiredError`: Token has expired
  - `NotBeforeError`: Token not yet valid
- Added detailed logging for token verification attempts
- Logs secret length and token prefix for debugging (without exposing sensitive data)

### 3. Startup Validation
- Validates JWT secret format and length at application startup
- Logs warnings if secret format is unexpected
- Provides helpful information about expected secret format

## Next Steps

1. **Verify JWT Secret in Northflank**:
   - Ensure `SUPABASE_JWT_SECRET` environment variable is set
   - Verify the value matches exactly: `BBrv3zDPOzC/iyRZjvb2PmJ9Tcv2/JTRcceRgoWwxMbwMv6gsyYNbs4pTKK0+laTkcXKzYpfLGq/qOtXETeJvw==`
   - Check for any leading/trailing whitespace
   - Ensure it's set as a Runtime Environment Variable (not a build argument)

2. **Check Backend Logs**:
   - Look for log entries: "Supabase JWT Secret loaded" with length information
   - Check for "Verifying Supabase access token..." entries
   - Review any JWT verification error messages

3. **Verify Supabase Dashboard**:
   - Go to Supabase Dashboard → Settings → API
   - Copy the JWT Secret value
   - Compare with the value in Northflank (should match exactly)

## Expected Log Output

On successful startup, you should see:
```
[INFO] Supabase JWT Secret loaded { length: 88, isValidBase64: true, expectedLength: '64-128 characters (typically 88 for base64-encoded)' }
```

On token verification:
```
[INFO] Verifying Supabase access token... { secretLength: 88, tokenLength: <number>, tokenPrefix: '<first 20 chars>...' }
[INFO] Supabase token verified successfully { userId: '<id>', email: '<email>', tokenClaims: [...] }
```

## Troubleshooting

If you still see 500 errors:

1. **Check JWT Secret Match**:
   - The secret in Northflank must exactly match the secret in Supabase Dashboard
   - Even a single character difference will cause verification to fail

2. **Check Logs for Specific Errors**:
   - `JsonWebTokenError`: Secret mismatch
   - `TokenExpiredError`: Token expired (request new magic link)
   - Database errors: Check database connection
   - Token issuance errors: Check `JWT_SECRET` and `REFRESH_TOKEN_SECRET`

3. **Verify Environment Variables**:
   - `SUPABASE_JWT_SECRET`: Must be set and match Supabase Dashboard
   - `JWT_SECRET`: Required for issuing application tokens
   - `REFRESH_TOKEN_SECRET`: Required for issuing refresh tokens

