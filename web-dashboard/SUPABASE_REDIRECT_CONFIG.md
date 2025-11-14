# Supabase Redirect URL Configuration Guide

## Problem
If magic links are pointing to `localhost` instead of your deployed URL, you need to configure Supabase's redirect URLs correctly.

## Your Deployed URL
Based on the network analysis, your deployed application URL is:
```
https://p01--web-dashboard--sg8rdlcdjdjw.code.run
```

## Required Supabase Configuration

### Step 1: Configure Site URL
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL** to:
   ```
   https://p01--web-dashboard--sg8rdlcdjdjw.code.run
   ```

### Step 2: Configure Redirect URLs
In the same **URL Configuration** section, add the following to **Redirect URLs**:

```
https://p01--web-dashboard--sg8rdlcdjdjw.code.run/auth/callback
https://p01--web-dashboard--sg8rdlcdjdjw.code.run/**
```

**Important Notes:**
- The callback URL must be **exactly** `/auth/callback` (as implemented in the app)
- The `/**` wildcard allows any path under your domain (useful for deep links)
- **Remove any localhost entries** unless you specifically need them for local development
- If you do need localhost for local dev, add: `http://localhost:3001/auth/callback`

### Step 3: Verify Email Templates
1. Go to **Authentication** → **Email Templates**
2. Check the **Magic Link** template
3. Ensure it uses the `{{ .ConfirmationURL }}` variable (this will use your configured redirect URLs)

## How the Application Works

### Registration Flow
1. User enters email on `/register`
2. App calls `supabase.auth.signInWithOtp()` with:
   ```javascript
   emailRedirectTo: `${window.location.origin}/auth/callback`
   ```
3. Supabase sends email with magic link
4. Magic link points to: `https://p01--web-dashboard--sg8rdlcdjdjw.code.run/auth/callback#access_token=...&refresh_token=...&type=magiclink`

### Callback Flow
1. User clicks magic link → lands on `/auth/callback`
2. App extracts `access_token` and `refresh_token` from URL hash
3. App calls `supabase.auth.setSession()` to establish session
4. App exchanges Supabase session with backend via `/auth/supabase-login`
5. App stores backend tokens and redirects to dashboard

## Troubleshooting

### Issue: Magic link still points to localhost
**Solution:**
- Verify **Site URL** is set to your production URL (not localhost)
- Check **Redirect URLs** includes your production callback URL
- Clear browser cache and request a new magic link
- Check Supabase logs to see what redirect URL was used

### Issue: "Page not found" after clicking magic link
**Solution:**
- Verify the callback URL in Supabase matches exactly: `/auth/callback`
- Check that your app is deployed and accessible at the production URL
- Verify the route is registered in your React Router (it should be in `App.jsx`)

### Issue: Tokens not being extracted from URL
**Solution:**
- Check browser console for errors
- Verify the URL hash contains `access_token`, `refresh_token`, and `type=magiclink`
- The callback handler should automatically extract these and call `setSession()`

### Issue: Session exchange fails
**Solution:**
- Check backend logs for `/auth/supabase-login` endpoint
- Verify `SUPABASE_JWT_SECRET` is correctly configured in backend
- Check that the Supabase token is valid and not expired

## Testing Checklist

- [ ] Site URL is set to production URL
- [ ] Redirect URLs include production callback URL
- [ ] No localhost entries in Redirect URLs (unless needed for dev)
- [ ] Request magic link from production app
- [ ] Verify email contains production URL (not localhost)
- [ ] Click magic link and verify it redirects to `/auth/callback`
- [ ] Verify tokens are extracted and session is established
- [ ] Verify user is redirected to dashboard after authentication

## Additional Notes

- The app uses `window.location.origin` to dynamically determine the redirect URL
- This ensures it works in both development and production without code changes
- The Supabase client is configured with `detectSessionInUrl: true` to automatically detect tokens in the URL
- The callback handler explicitly extracts tokens from the URL hash and calls `setSession()` for reliability

