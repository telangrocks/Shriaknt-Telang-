# Cryptopulse Environment Configuration

This document captures the runtime variables that must be present when deploying the backend API and the web dashboard. The values below are examples—replace them with the credentials for your infrastructure.

## Backend (`backend-services`)

| Variable | Example / Notes |
| --- | --- |
| `DATABASE_URL` | `postgresql://user:password@postgres-host:5432/cryptopulse` |
| `REDIS_URL` | `redis://redis-host:6379` |
| `JWT_SECRET` | 32+ character secret for access tokens |
| `REFRESH_TOKEN_SECRET` | 32+ character secret for refresh tokens |
| `CASHFREE_APP_ID` | Cashfree app ID |
| `CASHFREE_SECRET_KEY` | Cashfree secret |
| `CASHFREE_WEBHOOK_SECRET` | Cashfree webhook secret |
| `CASHFREE_ENV` | `production` or `sandbox` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `API_BASE_URL` | Public API origin, e.g. `https://api.cryptopulse.com` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins for CORS, e.g. `https://dashboard.cryptopulse.com,https://p01--web-dashboard--...` |
| `TRIAL_DAYS` | `5` |
| `MONTHLY_PRICE` | `999` |
| `CURRENCY` | `INR` |
| `AI_MIN_CONFIDENCE` | `75` |
| `AI_TARGET_PROFITABILITY` | `85` |
| `MAX_CONCURRENT_TRADES` | `10` |
| `ENCRYPTION_KEY` | 64-hex-char string (32 bytes), e.g. `44033186c3c09829f79555f937bcd2e5a7892090e2c27d7c176fe5d53839f962` |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret used to verify access tokens issued by Supabase Auth |

> The server refuses to start if `ENCRYPTION_KEY` is missing or not 64 hexadecimal characters (see `src/utils/validateEnv.js`).
> Obtain `SUPABASE_JWT_SECRET` from the Supabase project settings (`Authentication → Providers → JWT`).

## Web Dashboard (`web-dashboard`)

| Variable | Example / Notes |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL *without* `/api` suffix (the app appends `/api` automatically), e.g. `https://api.cryptopulse.com` |
| `VITE_SUPABASE_URL` | Supabase project URL, e.g. `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

> When deploying through Northflank ensure the environment variable is added to the service so the build step picks it up.

## Deployment workflow

Pushes to `main` run `.github/workflows/redeploy.yml`, which:

1. Enables Corepack and installs dependencies with Yarn.
2. Runs backend tests (`yarn test`) and builds the dashboard (`yarn run build`).
3. Optionally triggers a Northflank redeploy if the repository secrets `NORTHFLANK_API_TOKEN` and `NORTHFLANK_SERVICE_ID` are configured.

Ensure those secrets are present to automate deployments; otherwise trigger redeployments manually after pushing to `main`.

