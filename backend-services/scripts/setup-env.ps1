# Environment Setup Script for Windows PowerShell
Write-Host "🔧 Setting up environment..." -ForegroundColor Yellow

# Check if .env.example exists
if (-not (Test-Path ".env.example")) {
    Write-Host "❌ .env.example not found" -ForegroundColor Red
    exit 1
}

# Create .env from .env.example if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env and fill in all required values" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Validate required environment variables
Write-Host "🔍 Validating environment variables..." -ForegroundColor Yellow

$requiredVars = @(
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_SECRET",
    "REFRESH_TOKEN_SECRET",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "CASHFREE_APP_ID",
    "CASHFREE_SECRET_KEY",
    "ENCRYPTION_KEY"
)

$missingVars = @()

foreach ($var in $requiredVars) {
    $content = Get-Content ".env" -ErrorAction SilentlyContinue
    $found = $false
    foreach ($line in $content) {
        if ($line -match "^$var=" -and $line -notmatch "^$var=$" -and $line -notmatch "^$var=your-") {
            $found = $true
            break
        }
    }
    if (-not $found) {
        $missingVars += $var
    }
}

if ($missingVars.Count -eq 0) {
    Write-Host "✅ All required environment variables are set" -ForegroundColor Green
} else {
    Write-Host "❌ Missing or incomplete environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    Write-Host "`n⚠️  Please update .env file with actual values" -ForegroundColor Yellow
    exit 1
}

# Generate encryption key if missing
$envContent = Get-Content ".env"
$needsEncryptionKey = $false
foreach ($line in $envContent) {
    if ($line -match "^ENCRYPTION_KEY=your-" -or $line -match "^ENCRYPTION_KEY=$") {
        $needsEncryptionKey = $true
        break
    }
}

if ($needsEncryptionKey) {
    Write-Host "🔐 Generating encryption key..." -ForegroundColor Yellow
    $encryptionKey = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    (Get-Content ".env") -replace "^ENCRYPTION_KEY=.*", "ENCRYPTION_KEY=$encryptionKey" | Set-Content ".env"
    Write-Host "✅ Encryption key generated" -ForegroundColor Green
}

# Generate JWT secrets if missing
$envContent = Get-Content ".env"
$needsJWTSecret = $false
foreach ($line in $envContent) {
    if ($line -match "^JWT_SECRET=your-") {
        $needsJWTSecret = $true
        break
    }
}

if ($needsJWTSecret) {
    Write-Host "🔐 Generating JWT secrets..." -ForegroundColor Yellow
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $refreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    (Get-Content ".env") -replace "^JWT_SECRET=.*", "JWT_SECRET=$jwtSecret" | Set-Content ".env"
    (Get-Content ".env") -replace "^REFRESH_TOKEN_SECRET=.*", "REFRESH_TOKEN_SECRET=$refreshSecret" | Set-Content ".env"
    Write-Host "✅ JWT secrets generated" -ForegroundColor Green
}

Write-Host "`n✅ Environment setup complete!" -ForegroundColor Green
Write-Host "📝 Remember to:" -ForegroundColor Yellow
Write-Host "   1. Update DATABASE_URL with your PostgreSQL connection string"
Write-Host "   2. Update REDIS_URL with your Redis connection string"
Write-Host "   3. Add your Firebase service account (FIREBASE_SERVICE_ACCOUNT)"
Write-Host "   4. Add your Cashfree credentials"
Write-Host "   5. Set API_BASE_URL to your production domain"

