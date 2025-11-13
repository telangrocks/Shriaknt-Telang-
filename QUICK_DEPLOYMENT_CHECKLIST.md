# ⚡ Quick Deployment Checklist

## 🚨 CRITICAL: Add SUPABASE_JWT_SECRET to Northflank

Your deployment is failing because `SUPABASE_JWT_SECRET` is missing. Follow these steps:

### Step 1: Get Your Supabase JWT Secret (2 minutes)

1. Go to: **https://app.supabase.com**
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Scroll down to **JWT Settings** section
5. Find **"JWT Secret"** (also called "JWT Signing Secret")
6. Click **"Reveal"** button
7. **Copy the entire secret** (it's a long string)

### Step 2: Add to Northflank (1 minute)

1. Go to your Northflank project
2. Select your **backend-api** service
3. Go to **Environment Variables** or **Secrets** section
4. Click **"Add Variable"** or **"Add Secret"**
5. Set:
   - **Name**: `SUPABASE_JWT_SECRET`
   - **Value**: (paste the secret from Step 1)
   - **Type**: Select **"Secret"** (not plain text)
6. Click **Save**

### Step 3: Verify Other Supabase Variables

Make sure these are also set in Northflank:

- ✅ `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- ✅ `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- ✅ `SUPABASE_JWT_SECRET` - The JWT secret (from Step 1) ← **THIS IS MISSING**

### Step 4: Redeploy

1. After adding `SUPABASE_JWT_SECRET`, trigger a new deployment
2. Check the logs - you should see:
   ```
   Environment variables validated successfully
   ```
3. The application should start successfully

## 📋 Complete Environment Variables Checklist

Copy this list and check off each variable in Northflank:

### Supabase (Required)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_JWT_SECRET` ← **CRITICAL - ADD THIS NOW**

### Database & Cache (Auto-provided)
- [ ] `DATABASE_URL` (from PostgreSQL addon)
- [ ] `REDIS_URL` (from Redis addon)

### JWT Secrets (Generate if needed)
- [ ] `JWT_SECRET` (32+ characters)
- [ ] `REFRESH_TOKEN_SECRET` (32+ characters)

### Encryption
- [ ] `ENCRYPTION_KEY` (64 hex characters)

### Cashfree Payment
- [ ] `CASHFREE_APP_ID`
- [ ] `CASHFREE_SECRET_KEY`
- [ ] `CASHFREE_WEBHOOK_SECRET`
- [ ] `CASHFREE_ENV` (set to `production`)

### Application Config
- [ ] `NODE_ENV` (set to `production`)
- [ ] `PORT` (set to `3000`)
- [ ] `API_BASE_URL`
- [ ] `ALLOWED_ORIGINS`
- [ ] `TRIAL_DAYS` (set to `5`)
- [ ] `MONTHLY_PRICE` (set to `999`)
- [ ] `CURRENCY` (set to `INR`)
- [ ] `AI_MIN_CONFIDENCE` (set to `75`)
- [ ] `AI_TARGET_PROFITABILITY` (set to `85`)
- [ ] `MAX_CONCURRENT_TRADES` (set to `10`)
- [ ] `LOG_LEVEL` (set to `info`)

## 🔍 How to Find Supabase JWT Secret

**Location in Supabase Dashboard:**
```
Dashboard → Your Project → Settings → API → JWT Settings → JWT Secret
```

**What it looks like:**
- It's a long base64-encoded string
- Usually starts with something like `your-project-ref-` followed by a long string
- Click "Reveal" to see the full value

## ⚠️ Common Mistakes

1. **Copying the wrong value**: Make sure you're copying the **JWT Secret**, not the anon key or service role key
2. **Adding spaces**: Don't add any spaces before or after the secret
3. **Using wrong variable name**: Must be exactly `SUPABASE_JWT_SECRET` (case-sensitive)
4. **Not saving**: Make sure to click "Save" after adding the variable

## ✅ Success Indicators

After adding `SUPABASE_JWT_SECRET` and redeploying, you should see:

```
Environment variables validated successfully
Database pool initialized
Redis client connected
Server running on port 3000 in production mode
```

**NOT:**
```
Missing required environment variables: SUPABASE_JWT_SECRET
Process terminated with exit code 1
```

## 🆘 Still Having Issues?

1. Double-check the variable name is exactly `SUPABASE_JWT_SECRET`
2. Verify you copied the entire JWT Secret (no truncation)
3. Make sure it's saved as a **Secret** type in Northflank
4. Check that you're editing the correct service (backend-api)
5. Try redeploying after adding the variable

---

**Quick Fix**: Add `SUPABASE_JWT_SECRET` to Northflank → Redeploy → Done! ✅

