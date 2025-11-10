# 🚀 Deployment Guide

Complete step-by-step guide for deploying the Cryptopulse Trading Bot System.

## Prerequisites

- Northflank account
- PostgreSQL database (or use Northflank addon)
- Redis instance (or use Northflank addon)
- Firebase project with Phone Auth & Cloud Messaging enabled
- Cashfree account with production credentials
- Domain name (optional but recommended)

## Step 1: Environment Setup

### 1.1 Clone and Setup

```bash
git clone <your-repo-url>
cd cryptopulse-trading-bot
cd backend-services
```

### 1.2 Configure Environment Variables

```bash
# Run setup script
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh

# Edit .env file with your values
nano .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - 32+ character random string
- `REFRESH_TOKEN_SECRET` - 32+ character random string
- `FIREBASE_SERVICE_ACCOUNT` - Base64 encoded Firebase service account JSON
- `CASHFREE_APP_ID` - From Cashfree dashboard
- `CASHFREE_SECRET_KEY` - From Cashfree dashboard
- `CASHFREE_WEBHOOK_SECRET` - Webhook secret
- `ENCRYPTION_KEY` - 64 character hex string (32 bytes)

### 1.3 Generate Secrets

```bash
# Generate encryption key
openssl rand -hex 32

# Generate JWT secrets
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

## Step 2: Local Testing

### 2.1 Install Dependencies

```bash
npm install
```

### 2.2 Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
chmod +x scripts/test-all.sh
./scripts/test-all.sh
```

### 2.3 Start Locally

```bash
npm start
```

Verify:
- Health endpoint: `http://localhost:3000/health`
- API responds correctly
- Database connection works
- Redis connection works

## Step 3: Northflank Deployment

### 3.1 Create Project

1. Log in to [Northflank](https://northflank.com)
2. Create new project: "cryptopulse-trading-bot"
3. Select region closest to your users

### 3.2 Add Database Addon

1. Go to Addons → PostgreSQL
2. Select version 15
3. Choose plan (Standard recommended)
4. Note the connection string

### 3.3 Add Redis Addon

1. Go to Addons → Redis
2. Select version 7
3. Choose plan (Standard recommended)
4. Note the connection string

### 3.4 Create Service

1. Go to Services → Create Service
2. Connect your Git repository
3. Set build context: `backend-services`
4. Set Dockerfile path: `backend-services/Dockerfile`
5. Set start command: `node src/server.js`

### 3.5 Configure Environment Variables

Add all variables from your `.env` file:
- Use Northflank's environment variable interface
- For addon URLs, use: `${postgresql.DATABASE_URL}` and `${redis.REDIS_URL}`
- Mark sensitive variables as "Secret"

### 3.6 Configure Scaling

1. Set minimum replicas: 2
2. Set maximum replicas: 10
3. Set CPU target: 70%
4. Set memory target: 80%

### 3.7 Configure Health Checks

1. Path: `/health`
2. Interval: 30 seconds
3. Timeout: 5 seconds
4. Retries: 3

### 3.8 Configure Domain

1. Go to Domains
2. Add your domain (e.g., `api.yourdomain.com`)
3. Enable TLS/SSL
4. Northflank will provision certificate automatically

### 3.9 Deploy

1. Click "Deploy"
2. Monitor build logs
3. Wait for deployment to complete
4. Verify health endpoint

## Step 4: Verify Deployment

### 4.1 Run Verification Script

```bash
export API_BASE_URL=https://api.yourdomain.com
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

### 4.2 Manual Verification

```bash
# Health check
curl https://api.yourdomain.com/health

# Test endpoints
curl https://api.yourdomain.com/api/strategy
curl https://api.yourdomain.com/api/market/signals
```

### 4.3 Monitor Logs

1. Go to Northflank dashboard
2. View service logs
3. Check for errors
4. Verify AI engine is running
5. Verify market data service is running

## Step 5: Android App Configuration

### 5.1 Update API Endpoint

Edit `android-app/app/build.gradle.kts`:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"https://api.yourdomain.com\"")
```

### 5.2 Update Cashfree Credentials

```kotlin
buildConfigField("String", "CASHFREE_APP_ID", "\"your-cashfree-app-id\"")
buildConfigField("String", "CASHFREE_ENV", "\"production\"")
```

### 5.3 Build Release APK

```bash
cd android-app
./gradlew assembleRelease
```

### 5.4 Sign APK

1. Generate keystore (if not exists)
2. Sign APK with release key
3. Verify signature

### 5.5 Test

- Install on test device
- Test OTP login
- Test signal notifications
- Test payment flow

## Step 6: Web Dashboard Deployment

### 6.1 Configure Environment

Create `.env` in `web-dashboard/`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 6.2 Build

```bash
cd web-dashboard
npm install
npm run build
```

### 6.3 Deploy

Deploy `dist/` folder to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting

### 6.4 Configure Domain

Point your domain to the hosting service and enable HTTPS.

## Step 7: Monitoring Setup

### 7.1 Enable Logging

- Logs are automatically sent to Northflank
- Configure log retention
- Set up log alerts

### 7.2 Set Up Alerts

Configure alerts for:
- High error rate (> 1%)
- High response time (> 200ms)
- Service down
- Database connection issues
- Redis connection issues

### 7.3 Monitor Metrics

Track:
- Request rate
- Response time
- Error rate
- CPU usage
- Memory usage
- Database connections
- Redis memory usage

## Step 8: Backup Strategy

### 8.1 Database Backups

- Northflank PostgreSQL addon includes automatic backups
- Configure backup retention (7-30 days)
- Test restore procedure

### 8.2 Application Backups

- Git repository is your backup
- Keep environment variables secure
- Document configuration

## Step 9: Post-Deployment

### 9.1 Run Health Monitor

```bash
node scripts/monitor-health.js
```

### 9.2 Test Complete Flow

1. Create test user
2. Request OTP
3. Verify OTP
4. Add exchange keys
5. Select trading pairs
6. Receive signals
7. Execute test trade
8. Test payment

### 9.3 Performance Testing

```bash
node scripts/performance-test.js
```

## Troubleshooting

### Database Connection Issues

1. Verify DATABASE_URL format
2. Check firewall rules
3. Verify database is accessible
4. Check connection pool settings

### Redis Connection Issues

1. Verify REDIS_URL format
2. Check Redis is running
3. Verify network connectivity
4. Check Redis memory limits

### API Not Responding

1. Check service logs
2. Verify health endpoint
3. Check environment variables
4. Verify service is running

### Payment Issues

1. Verify Cashfree credentials
2. Check webhook URL is accessible
3. Verify webhook signature
4. Check payment logs

### Firebase Auth Issues

1. Verify Firebase service account credentials
2. Confirm Phone Auth is enabled for the project
3. Check Firebase Authentication logs for rate limits or errors
4. Ensure reCAPTCHA and device verification complete successfully on clients

## Support

For issues:
1. Check logs in Northflank dashboard
2. Review error messages
3. Check environment variables
4. Verify service health
5. Contact support if needed

---

**Last Updated**: $(date)

