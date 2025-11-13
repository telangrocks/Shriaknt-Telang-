# Cryptopulse Deployment Environment Reference

Use these values (replace placeholders with real secrets and domains) when configuring production services such as Northflank, Vercel, or on-prem containers. All values are required unless noted otherwise.

> **Tip:** keep the same names for both plain environment variables and secret managers so the Docker images can consume them without additional wiring.

---

## Backend (`backend-services`)

| Variable | Example | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Required by Express rate-limits and logging. |
| `PORT` | `3000` | Container port exposed in the Dockerfile. |
| `API_BASE_URL` | `https://api.cryptopulse.live` | Base URL advertised to clients (used in CORS validation). |
| `ALLOWED_ORIGINS` | `https://dashboard.cryptopulse.live,https://p01--web-dashboard--sg8rdlcdjdjw.code.run` | Comma separated list. Include every URL the frontend runs on. |
| `DATABASE_URL` | `postgres://user:pass@host:5432/cryptopulse` | PostgreSQL connection string. |
| `REDIS_URL` | `redis://default:pass@host:6379` | Redis connection string. |
| `JWT_SECRET` | `generate-64-chars-or-more` | At least 32 chars. |
| `REFRESH_TOKEN_SECRET` | `generate-64-chars-or-more` | At least 32 chars. |
| `ENCRYPTION_KEY` | `44033186c3c09829f79555f937bcd2e5a7892090e2c27d7c176fe5d53839f962` | 64 hex characters (32 bytes). |
| `TRIAL_DAYS` | `5` | Number of trial days for new accounts. |
| `MONTHLY_PRICE` | `999` | Subscription price (in smallest currency unit if needed). |
| `CURRENCY` | `INR` | Currency code. |
| `CASHFREE_APP_ID` | `cf_app_id` | Cashfree credentials. |
| `CASHFREE_SECRET_KEY` | `cf_secret` | Cashfree credentials. |
| `CASHFREE_WEBHOOK_SECRET` | `cf_webhook_secret` | Cashfree credentials. |
| `CASHFREE_ENV` | `production` | `test` for sandbox. |
| `AI_MIN_CONFIDENCE` | `75` | Strategy tuning. |
| `AI_TARGET_PROFITABILITY` | `85` | Strategy tuning. |
| `MAX_CONCURRENT_TRADES` | `10` | Strategy tuning. |
| `SUPPORTED_EXCHANGES` | `binance,bybit,okx` | Optional. |
| `SUPABASE_JWT_SECRET` | `super-secret-from-supabase` | Required to validate Supabase access tokens. |

> **CORS:** make sure `ALLOWED_ORIGINS` contains the exact protocol + host (and port if any) for every frontend deployment. Missing origins will block the Supabase token exchange with “Unable to reach Cryptopulse servers”.

---

## Web Dashboard (`web-dashboard`)

When building with GitHub Actions or Northflank, supply the following build-time variables:

| Variable | Example | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://api.cryptopulse.live` | Must match backend `API_BASE_URL` (no trailing slash). |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | `supabase-anon-key` | Supabase anonymous key. |

Optional (only if you customise preview/serve commands):

| Variable | Example | Notes |
| --- | --- | --- |
| `PORT` | `4173` | For `vite preview` / `serve -s dist`. |

---

## Android App (`android-app`)

Edit `app/build.gradle.kts` or use CI variables:

```properties
API_BASE_URL=https://api.cryptopulse.live/api/
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=supabase-anon-key
```

Compose other SDK-related keys (`CASHFREE_APP_ID`, etc.) via Gradle buildConfig fields or CI.

---

## Deployment Checklist

1. **Backend**
   - Configure all environment variables above.
   - Verify container logs show “Environment variables validated successfully”.
2. **Frontend**
   - Set `VITE_API_BASE_URL` before building.
   - Ensure build artifacts are pushed to Nginx/serving layer (`web-dashboard/Dockerfile` already does this).
3. **Networking**
   - Backend exposed via HTTPS (Northflank ingress) on port 3000.
   - Frontend reachable via HTTPS and allowed in `ALLOWED_ORIGINS`.
4. **Smoke Test**
   - Visit splash → registration.
   - Complete email registration via Supabase.
   - Confirm dashboards load with valid JWT session and in-app bell notifications appear.

Keep this document updated when new services or variables are introduced.

