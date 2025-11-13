# 🚀 Deployment Setup Guide

This guide walks you through setting up all required environment variables for deploying Cryptopulse to Northflank.

## Prerequisites

- Northflank account with a project created
- PostgreSQL and Redis addons added to your project
- Supabase project created
- Git repository connected to Northflank

## Step-by-Step Setup

### 1. Get Supabase Credentials

1. **Go to your Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Get SUPABASE_URL**:
   - Go to **Settings** → **API**
   - Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`)
4. **Get SUPABASE_ANON_KEY**:
   - In the same **Settings** → **API** page
   - Copy the **anon/public** key
5. **Get SUPABASE_JWT_SECRET** (CRITICAL):
   - Go to **Settings** → **API**
   - Scroll down to **JWT Settings**
   - Find **JWT Secret** (also called "JWT Signing Secret")
   - Click **Reveal** and copy the entire secret
   - ⚠️ **This is required for authentication to work!**

### 2. Configure Northflank Environment Variables

1. **Go to your Northflank service** (backend-api)
2. **Navigate to Environment Variables** section
3. **Add each variable** as a **Secret** (for sensitive values) or **Environment Variable**:

#### Supabase Variables (REQUIRED)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here  ← CRITICAL!
```

#### Database & Cache (Auto-provided by addons)
```
DATABASE_URL=${postgresql.DATABASE_URL}  ← Auto-set by PostgreSQL addon
REDIS_URL=${redis.REDIS_URL}  ← Auto-set by Redis addon
```

#### JWT Secrets (Generate secure random strings)
```
JWT_SECRET=generate-32-plus-character-secret-here
REFRESH_TOKEN_SECRET=generate-32-plus-character-secret-here
```

#### Encryption Key (64 hex characters)
```
ENCRYPTION_KEY=generate-64-hexadecimal-characters-here
```

You can generate this with:
```bash
openssl rand -hex 32
```

#### Cashfree Payment (Get from Cashfree Dashboard)
```
CASHFREE_APP_ID=your-cashfree-app-id
CASHFREE_SECRET_KEY=your-cashfree-secret-key
CASHFREE_WEBHOOK_SECRET=your-webhook-secret
CASHFREE_ENV=production
```

#### Application Configuration
```
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://dashboard.yourdomain.com,https://your-mobile-app.com
TRIAL_DAYS=5
MONTHLY_PRICE=999
CURRENCY=INR
AI_MIN_CONFIDENCE=75
AI_TARGET_PROFITABILITY=85
AI_SCAN_INTERVAL=5000
AI_SIGNAL_EXPIRY=300000
MAX_CONCURRENT_TRADES=10
SUPPORTED_EXCHANGES=binance,bybit,okx
LOG_LEVEL=info
```

### 3. Verify Configuration

After adding all variables, verify:
- ✅ All Supabase variables are set (especially `SUPABASE_JWT_SECRET`)
- ✅ Database and Redis URLs are auto-provided by addons
- ✅ All secrets are marked as "Secret" type in Northflank
- ✅ No variables have placeholder values like "your-xxx"

### 4. Deploy

1. **Trigger a deployment** in Northflank
2. **Check the logs** - you should see:
   ```
   Environment variables validated successfully
   ```
3. **If you see errors** about missing variables, double-check step 2

## Troubleshooting

### Error: "Missing required environment variables: SUPABASE_JWT_SECRET"

**Solution**: 
1. Go to Supabase Dashboard → Settings → API
2. Copy the JWT Secret
3. Add it to Northflank as `SUPABASE_JWT_SECRET`
4. Redeploy the service

### Error: "Authentication will fail until this is configured"

**Solution**: This warning appears if `SUPABASE_JWT_SECRET` is missing. Follow the steps above to add it.

### How to Generate Secure Secrets

**JWT Secrets (32+ characters):**
```bash
# Linux/Mac
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# PowerShell (Windows)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Encryption Key (64 hex characters):**
```bash
# Linux/Mac
openssl rand -hex 32

# PowerShell (Windows)
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

## Quick Reference

| Variable | Where to Get It |
|----------|----------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Secret |
| `DATABASE_URL` | Auto-provided by Northflank PostgreSQL addon |
| `REDIS_URL` | Auto-provided by Northflank Redis addon |
| `JWT_SECRET` | Generate (32+ characters) |
| `REFRESH_TOKEN_SECRET` | Generate (32+ characters) |
| `ENCRYPTION_KEY` | Generate (64 hex characters) |
| `CASHFREE_*` | Cashfree Dashboard → App Settings |

## Next Steps

After all environment variables are configured:
1. Deploy the service
2. Check health endpoint: `https://your-api-domain.com/health`
3. Test authentication flow
4. Verify Supabase token exchange works

