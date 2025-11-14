# Comprehensive Logging Guide

## Overview

The application now includes comprehensive structured logging with clear prefixes to help debug authentication flows, magic link verification, session exchange, and backend errors.

## Log Prefixes

All logs use structured prefixes to make them easy to filter and identify:

- `[AUTH_FLOW]` - Authentication flow logs (magic link requests, auth state changes)
- `[MAGIC_LINK]` - Magic link verification logs (token extraction, session establishment)
- `[SESSION_EXCHANGE]` - Session exchange logs (backend API calls, token issuance)
- `[BACKEND_ERROR]` - Backend error logs (database errors, token issuance failures)
- `[HTTP_REQUEST]` - HTTP request logs (incoming requests)
- `[HTTP_RESPONSE]` - HTTP response logs (outgoing responses)

## Request IDs

Each request/operation gets a unique ID that allows you to trace the entire flow:

- Backend requests: `req_<timestamp>_<random>`
- Frontend sessions: `session_<timestamp>_<random>`
- Frontend exchanges: `exchange_<timestamp>_<random>`
- Frontend events: `event_<timestamp>_<random>`
- Magic link requests: `magic_link_req_<timestamp>_<random>`

## Backend Logs

### Startup Logs
```
[INFO] Environment validation: 20/20 required variables are set
[INFO] Supabase JWT Secret loaded { length: 88, isValidBase64: true, ... }
[INFO] Database pool initialized
[INFO] Redis client connected
[INFO] Server running on port 3000 in production mode
```

### HTTP Request/Response Logs
```
[HTTP_REQUEST] [req_1234567890_abc123] POST /api/auth/supabase-login
[HTTP_RESPONSE] [req_1234567890_abc123] POST /api/auth/supabase-login - 200
```

### Authentication Flow Logs
```
[AUTH_FLOW] [req_1234567890_abc123] Session exchange request received
[AUTH_FLOW] [req_1234567890_abc123] Access token received
[AUTH_FLOW] [req_1234567890_abc123] Getting or creating user by email
[AUTH_FLOW] [req_1234567890_abc123] User retrieved/created successfully
[AUTH_FLOW] [req_1234567890_abc123] Supabase login successful { duration: "45ms" }
```

### Magic Link Verification Logs
```
[MAGIC_LINK] [req_1234567890_abc123] Starting Supabase token verification
[MAGIC_LINK] [req_1234567890_abc123] Supabase token verified successfully
```

### Session Exchange Logs
```
[SESSION_EXCHANGE] [req_1234567890_abc123] Issuing authentication tokens
[SESSION_EXCHANGE] [req_1234567890_abc123] Authentication tokens issued successfully
```

### Error Logs
```
[BACKEND_ERROR] [req_1234567890_abc123] Database error during user lookup/creation
[BACKEND_ERROR] [req_1234567890_abc123] Error issuing authentication tokens
[MAGIC_LINK] [req_1234567890_abc123] JWT signature verification failed
```

## Frontend Logs (Browser Console)

### Magic Link Request
```
[AUTH_FLOW] [magic_link_req_1234567890_abc123] Requesting magic link: { email, redirectTo, ... }
[AUTH_FLOW] [magic_link_req_1234567890_abc123] Magic link sent successfully
```

### Magic Link Verification
```
[MAGIC_LINK] [session_1234567890_abc123] AuthCallback - Current URL: { href, hash, ... }
[MAGIC_LINK] [session_1234567890_abc123] Magic link tokens found in URL hash
[MAGIC_LINK] [session_1234567890_abc123] Setting Supabase session...
[MAGIC_LINK] [session_1234567890_abc123] Session established successfully
```

### Session Exchange
```
[SESSION_EXCHANGE] [exchange_1234567890_abc123] Starting session exchange...
[SESSION_EXCHANGE] [exchange_1234567890_abc123] Calling backend /auth/supabase-login...
[SESSION_EXCHANGE] [exchange_1234567890_abc123] Success, storing tokens... { duration: "120ms" }
```

### Auth State Changes
```
[AUTH_FLOW] [event_1234567890_abc123] Auth state change: { event: "SIGNED_IN", ... }
[AUTH_FLOW] [event_1234567890_abc123] SIGNED_IN event received, exchanging session...
```

## How to Use Logs for Debugging

### 1. Find a Request ID
Look for any log entry with a request ID, e.g., `[AUTH_FLOW] [req_1234567890_abc123]`

### 2. Filter by Request ID
Search for that ID in your logs to see the entire flow:
- Backend: Search for `req_1234567890_abc123`
- Frontend: Search for `session_1234567890_abc123` or `exchange_1234567890_abc123`

### 3. Filter by Log Type
- To see all authentication flows: Search for `[AUTH_FLOW]`
- To see all magic link operations: Search for `[MAGIC_LINK]`
- To see all session exchanges: Search for `[SESSION_EXCHANGE]`
- To see all errors: Search for `[BACKEND_ERROR]`

### 4. Trace a Complete Flow

**Example: Magic Link Authentication**

1. User requests magic link:
   ```
   [AUTH_FLOW] [magic_link_req_123] Requesting magic link
   [AUTH_FLOW] [magic_link_req_123] Magic link sent successfully
   ```

2. User clicks magic link:
   ```
   [MAGIC_LINK] [session_456] Magic link tokens found in URL hash
   [MAGIC_LINK] [session_456] Session established successfully
   ```

3. Session exchange:
   ```
   [SESSION_EXCHANGE] [exchange_456] Starting session exchange...
   [HTTP_REQUEST] [req_789] POST /api/auth/supabase-login
   [AUTH_FLOW] [req_789] Session exchange request received
   [MAGIC_LINK] [req_789] Supabase token verified successfully
   [SESSION_EXCHANGE] [req_789] Authentication tokens issued successfully
   [AUTH_FLOW] [req_789] Supabase login successful
   [HTTP_RESPONSE] [req_789] POST /api/auth/supabase-login - 200
   [SESSION_EXCHANGE] [exchange_456] Success, storing tokens...
   ```

## Log Locations

### Backend Logs
- **Northflank**: Go to your backend service → Logs → Runtime Logs
- **Local**: Check `backend-services/logs/combined.log` and `backend-services/logs/error.log`

### Frontend Logs
- **Browser Console**: Open Developer Tools → Console tab
- **Northflank**: Go to your web-dashboard service → Logs → Runtime Logs (for server-side rendering logs)

## Tips

1. **Use Request IDs**: Always include the request ID when reporting issues
2. **Check Duration**: Look for `duration` fields to identify slow operations
3. **Error Details**: Error logs include full stack traces and context
4. **Timestamps**: All logs include timestamps for correlation
5. **Filter in Northflank**: Use the search/filter feature to find specific log types

## Common Issues and Log Patterns

### Issue: 500 Error on Session Exchange
Look for:
```
[BACKEND_ERROR] [req_xxx] Error issuing authentication tokens
[BACKEND_ERROR] [req_xxx] Database error during user lookup/creation
```

### Issue: Magic Link Verification Fails
Look for:
```
[MAGIC_LINK] [session_xxx] setSession error
[MAGIC_LINK] [req_xxx] JWT signature verification failed
```

### Issue: Token Expired
Look for:
```
[MAGIC_LINK] [req_xxx] Supabase token expired
```

### Issue: Missing Environment Variables
Look for:
```
[BACKEND_ERROR] [req_xxx] SUPABASE_JWT_SECRET is missing
[BACKEND_ERROR] [req_xxx] JWT_SECRET is missing
```

