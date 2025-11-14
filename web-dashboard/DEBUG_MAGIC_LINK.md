# Magic Link Debugging Guide

## Enhanced Error Logging

The AuthCallback component now includes comprehensive error logging to help identify issues with magic link verification.

## What to Look For in Console

When testing the magic link flow, check the browser console for these log messages:

### 1. Initial Callback Load
```
AuthCallback - Current URL: {
  href: "...",
  hash: "#access_token=...",
  pathname: "/auth/callback",
  search: ""
}
```
**What it means:** Shows the full URL when the callback page loads. Check if `hash` contains tokens.

### 2. Token Detection
```
Magic link tokens found in URL hash: {
  hasAccessToken: true,
  hasRefreshToken: true,
  type: "magiclink",
  tokenLength: 123
}
```
**What it means:** Tokens were found in the URL hash. If `hasAccessToken` or `hasRefreshToken` is false, the link didn't include tokens.

### 3. Error in URL Hash
```
Magic link error in URL: {
  error: "invalid_request",
  error_description: "...",
  fullHash: "..."
}
```
**What it means:** Supabase returned an error in the URL. Check `error` and `error_description` for details.

### 4. Session Establishment
```
setSession error: {
  message: "...",
  status: 400,
  name: "AuthApiError",
  code: "...",
  error: {...}
}
```
**What it means:** Failed to establish Supabase session. Common causes:
- Invalid or expired tokens
- Token format issues
- Supabase configuration problems

### 5. Session Exchange
```
exchangeSession - Starting session exchange...
exchangeSession - API error: {...}
```
**What it means:** Error exchanging Supabase session with backend. Check:
- Backend API is accessible
- `SUPABASE_JWT_SECRET` is configured correctly
- Backend `/auth/supabase-login` endpoint is working

### 6. Full Error Details
```
Magic link verification error - Full details: {
  message: "...",
  name: "...",
  code: "...",
  status: 400,
  stack: "...",
  url: "...",
  hash: "..."
}
```
**What it means:** Complete error information. Use this to identify the root cause.

## Common Error Scenarios

### Error: "ie" or Minified Error
**Cause:** Error object is minified or doesn't have a proper message.
**Solution:** Check the "Full details" log object for all error properties.

### Error: "invalid_request" in URL
**Cause:** Supabase rejected the redirect URL or request.
**Solution:** 
- Verify redirect URLs in Supabase Dashboard
- Check Site URL configuration
- Ensure callback URL matches exactly

### Error: "setSession error" with status 400
**Cause:** Invalid tokens or expired magic link.
**Solution:**
- Request a new magic link (they expire after 1 hour)
- Check if tokens are properly formatted in URL hash
- Verify Supabase project settings

### Error: "Session exchange failed"
**Cause:** Backend API error or configuration issue.
**Solution:**
- Check backend logs for `/auth/supabase-login` endpoint
- Verify `SUPABASE_JWT_SECRET` is set correctly
- Check network tab for API request/response

### No Tokens in URL Hash
**Cause:** Magic link didn't include tokens or was already processed.
**Solution:**
- Check if URL hash is empty
- Verify magic link hasn't been used already
- Check if browser cleared the hash before callback loaded

## Debugging Steps

1. **Open Browser Console** (F12 or DevTools)
2. **Request a new magic link** from the registration page
3. **Click the magic link** in the email
4. **Watch console logs** as the callback page loads
5. **Look for error messages** starting with "Magic link verification error"
6. **Check the "Full details" object** for complete error information
7. **Share the console logs** if you need help debugging

## What the Enhanced Logging Provides

- ✅ Full error object details (message, code, name, status, stack)
- ✅ URL state at callback time (href, hash, pathname)
- ✅ Token presence and format validation
- ✅ Session establishment status
- ✅ Backend API exchange status
- ✅ Auth state change events
- ✅ Step-by-step flow logging

## Next Steps After Seeing Logs

Once you see the detailed error logs:

1. **Identify the error type** from the "Full details" object
2. **Check the specific error code/message** for Supabase errors
3. **Verify configuration** matches the error (redirect URLs, Site URL, etc.)
4. **Test with a fresh magic link** if tokens are expired
5. **Check backend logs** if the error is in session exchange

The enhanced logging should now reveal the exact cause of the "ie" error or any other magic link verification failures.

