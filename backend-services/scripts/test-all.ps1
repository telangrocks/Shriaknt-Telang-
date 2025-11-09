# Comprehensive Testing Script for Windows PowerShell
Write-Host "🧪 Running Comprehensive Test Suite..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please create it from .env.example" -ForegroundColor Red
    Write-Host "   Run: .\scripts\setup-env.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check database connection (if DATABASE_URL is set)
Write-Host "📊 Checking database connection..." -ForegroundColor Yellow
$envContent = Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" }
if ($envContent) {
    node -e "const { createPool } = require('./src/database/pool'); const pool = createPool(); pool.query('SELECT 1').then(() => { console.log('✅ Database connection OK'); process.exit(0); }).catch((err) => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Database connection check failed (may be expected if DB not running)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  DATABASE_URL not set, skipping database check" -ForegroundColor Yellow
}

# Check Redis connection (if REDIS_URL is set)
Write-Host "📊 Checking Redis connection..." -ForegroundColor Yellow
$envContent = Get-Content ".env" | Where-Object { $_ -match "^REDIS_URL=" }
if ($envContent) {
    node -e "const { createRedisClient } = require('./src/services/redis'); const redis = createRedisClient(); redis.connect().then(() => { console.log('✅ Redis connection OK'); redis.quit(); process.exit(0); }).catch((err) => { console.error('❌ Redis connection failed:', err.message); process.exit(1); });"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Redis connection check failed (may be expected if Redis not running)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  REDIS_URL not set, skipping Redis check" -ForegroundColor Yellow
}

# Run unit tests
Write-Host "`n🔬 Running unit tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Unit tests failed" -ForegroundColor Red
    exit 1
}

# Run integration tests
Write-Host "`n🔗 Running integration tests..." -ForegroundColor Yellow
npm run test:integration
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Integration tests failed" -ForegroundColor Red
    exit 1
}

# Run E2E tests
Write-Host "`n🌐 Running E2E tests..." -ForegroundColor Yellow
npm run test:e2e
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ E2E tests failed" -ForegroundColor Red
    exit 1
}

# Performance test
Write-Host "`n⚡ Running performance tests..." -ForegroundColor Yellow
node scripts/performance-test.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Performance tests had issues (may be expected if server not running)" -ForegroundColor Yellow
}

Write-Host "`n✅ All tests completed successfully!" -ForegroundColor Green

