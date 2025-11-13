# 🚀 Cryptopulse Trading Bot System

Complete AI-powered cryptocurrency trading bot system with Android app, web dashboard, and backend services.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Backend Services
- ✅ Supabase-backed email authentication and session exchange
- ✅ AI-powered trading signal generation (85-90% target profitability)
- ✅ Multi-exchange support (Binance, Bybit, OKX)
- ✅ Real-time market data scanning (2-second intervals)
- ✅ 10 built-in trading strategies (5 scalping, 5 day trading)
- ✅ Automatic trade execution
- ✅ Subscription management (5-day trial, ₹999/month)
- ✅ Cashfree payment integration
- ✅ PostgreSQL database with 9 tables
- ✅ Redis caching layer
- ✅ JWT authentication
- ✅ Encrypted API key storage

- ✅ Splash screen
- ✅ Email authentication flow (Supabase + backend session)
- ✅ Real-time trading signals dashboard
- ✅ In-app bell notifications for trade alerts
- ✅ Trading interface
- ✅ Exchange API key management
- ✅ Payment integration
- ✅ Background services for market scanning

### Web Dashboard
- ✅ Admin overview with real-time stats
- ✅ Trading signals monitoring
- ✅ Trade history and analytics
- ✅ User management
- ✅ Performance charts
- ✅ Real-time updates (5-second intervals)

## 🏗️ Architecture

```
┌─────────────────┐
│  Android App    │
│  (Kotlin)       │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼─────────────────┐
│   Backend API             │
│   (Node.js + Express)     │
│                           │
│  ┌──────────┐ ┌─────────┐│
│  │PostgreSQL│ │  Redis  ││
│  └──────────┘ └─────────┘│
└────────┬──────────────────┘
         │
         │
┌────────▼────────┐
│  Web Dashboard  │
│  (React)         │
└─────────────────┘
```

## 📦 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Android Studio (for Android app)
- Git

## 🔧 Installation

### Backend Services

```bash
cd backend-services
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### Web Dashboard

```bash
cd web-dashboard
npm install
npm run dev
```

### Android App

1. Open `android-app` in Android Studio
2. Sync Gradle files
3. Update API endpoint in `build.gradle.kts`
4. Build and run

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cryptopulse

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (32+ characters)
JWT_SECRET=your-super-secret-jwt-key
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key

# Supabase Auth
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Cashfree Payment
CASHFREE_APP_ID=your-cashfree-app-id
CASHFREE_SECRET_KEY=your-cashfree-secret-key
CASHFREE_WEBHOOK_SECRET=your-webhook-secret
CASHFREE_ENV=production

# Application
API_BASE_URL=https://your-api-domain.com
ALLOWED_ORIGINS=https://your-web-dashboard.com

# AI Configuration
AI_MIN_CONFIDENCE=75
AI_TARGET_PROFITABILITY=85

# Encryption Key (64 characters hex)
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
```

## 🚀 Deployment

### Northflank Deployment

1. Create a Northflank account
2. Create a new project
3. Add PostgreSQL and Redis addons
4. Connect your Git repository
5. Configure environment variables
6. Deploy using `deployment/northflank.json`

### Docker Deployment

```bash
cd backend-services
docker build -t cryptopulse-backend .
docker run -p 3000:3000 --env-file .env cryptopulse-backend
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/supabase-login` - Exchange Supabase access token for Cryptopulse session
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Trading

- `GET /api/market/signals` - Get active trading signals
- `POST /api/trade/execute` - Execute a trade
- `GET /api/trade/history` - Get trade history
- `GET /api/trade/stats` - Get trade statistics

### Exchange

- `POST /api/exchange/keys` - Add exchange API keys
- `GET /api/exchange/keys` - Get user's exchange keys
- `DELETE /api/exchange/keys/:exchangeName` - Delete exchange keys

### Payment

- `POST /api/payment/create-order` - Create payment order
- `POST /api/payment/webhook` - Cashfree webhook
- `GET /api/payment/history` - Get payment history

## 🧪 Testing

```bash
# Backend tests
cd backend-services
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 📊 Performance Targets

- API Response Time: <100ms
- Signal Generation: Every 5 seconds
- AI Confidence: >75%
- Target Profitability: 85-90%
- Uptime: >99.9%

## 🔒 Security

- All API keys encrypted at rest (AES-256-GCM)
- JWT tokens with strong secrets
- HTTPS/TLS enforced
- Rate limiting on all endpoints
- SQL injection prevention
- XSS protection
- CORS properly configured

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📞 Support

For support, email support@cryptopulse.com or open an issue.

---

**Built with ❤️ for cryptocurrency traders**

