// Load environment variables from .env file (for local development)
// In production/Docker, environment variables are injected directly by the platform
// dotenv.config() won't override existing environment variables
require('dotenv').config({ override: false });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createPool, initializeDatabaseSchema } = require('./database/pool');
const { createRedisClient } = require('./services/redis');
const { validateEnv } = require('./utils/validateEnv');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const tradeRoutes = require('./routes/trade');
const exchangeRoutes = require('./routes/exchange');
const userRoutes = require('./routes/user');
const marketRoutes = require('./routes/market');
const strategyRoutes = require('./routes/strategy');
const adminRoutes = require('./routes/admin');

// Import services
const { startAIService } = require('./services/aiEngine');
const { startMarketDataService } = require('./services/marketData');
const { startSubscriptionMonitor } = require('./services/subscriptionMonitor');

const app = express();
const PORT = process.env.PORT || 3000;

// Log startup sequence
logger.info('=== Backend Service Startup Sequence ===');
logger.info('[STEP 1/8] Loading environment variables...');

// Validate environment variables on startup
try {
  logger.info('[STEP 2/8] Validating environment variables...');
  validateEnv();
  logger.info('[STEP 2/8] ✅ Environment variables validated successfully');
} catch (error) {
  logger.error('[STEP 2/8] ❌ Environment validation failed:', {
    error: error.message,
    name: error.name,
    stack: error.stack
  });
  logger.error('Service cannot start without required environment variables.');
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  req.requestId = requestId
  const startTime = Date.now()
  
  // Log request
  logger.info(`[HTTP_REQUEST] [${requestId}] ${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  })
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime
    logger.info(`[HTTP_RESPONSE] [${requestId}] ${req.method} ${req.path} - ${res.statusCode}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    })
  })
  
  next()
})

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const pool = createPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cryptopulse Trading Bot API',
    version: '1.0.0',
    status: 'operational'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use(errorHandler);

// Initialize database and start services
async function startServer() {
  try {
    logger.info('[STEP 3/8] Creating database pool...');
    // Initialize database pool
    const pool = createPool();
    logger.info('[STEP 3/8] ✅ Database pool created');
    
    logger.info('[STEP 4/8] Initializing database schema...');
    await initializeDatabaseSchema();
    logger.info('[STEP 4/8] ✅ Database schema initialized successfully');

    logger.info('[STEP 5/8] Creating Redis client...');
    // Initialize Redis
    const redis = createRedisClient();
    logger.info('[STEP 5/8] ✅ Redis client created');
    
    logger.info('[STEP 6/8] Connecting to Redis...');
    try {
      await redis.connect();
      logger.info('[STEP 6/8] ✅ Redis client connected successfully');
    } catch (redisError) {
      logger.error('[STEP 6/8] ❌ Redis connection failed:', {
        error: redisError.message,
        name: redisError.name,
        code: redisError.code,
        stack: redisError.stack
      });
      logger.warn('⚠️  Continuing startup without Redis (cache/sessions may be unavailable)');
      // Don't exit - Redis is optional for basic functionality
    }

    logger.info('[STEP 7/8] Starting background services...');
    try {
      startAIService();
      logger.info('[STEP 7/8] ✅ AI Service started');
    } catch (aiError) {
      logger.error('[STEP 7/8] ❌ AI Service failed to start:', {
        error: aiError.message,
        name: aiError.name
      });
      // Continue - AI service is optional
    }
    
    try {
      startMarketDataService();
      logger.info('[STEP 7/8] ✅ Market Data Service started');
    } catch (marketError) {
      logger.error('[STEP 7/8] ❌ Market Data Service failed to start:', {
        error: marketError.message,
        name: marketError.name
      });
      // Continue - Market data service is optional
    }
    
    try {
      startSubscriptionMonitor();
      logger.info('[STEP 7/8] ✅ Subscription Monitor started');
    } catch (subError) {
      logger.error('[STEP 7/8] ❌ Subscription Monitor failed to start:', {
        error: subError.message,
        name: subError.name
      });
      // Continue - Subscription monitor is optional
    }

    logger.info('[STEP 8/8] Starting HTTP server...');
    // Start server
    app.listen(PORT, () => {
      logger.info('=== ✅ Backend Service Started Successfully ===');
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('=== ❌ Backend Service Startup Failed ===');
    logger.error('Failed to start server:', {
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      sqlState: error.sqlState,
      errno: error.errno
    });
    logger.error('Exiting with code 1...');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('=== ❌ Unhandled Promise Rejection ===');
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', {
    error: reason?.message || reason,
    name: reason?.name,
    stack: reason?.stack,
    code: reason?.code
  });
  // Don't exit in production - log and continue
  // In development, you might want to exit for debugging
  if (process.env.NODE_ENV !== 'production') {
    logger.error('Exiting due to unhandled rejection in development mode');
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('=== ❌ Uncaught Exception ===');
  logger.error('Uncaught Exception:', {
    error: error.message,
    name: error.name,
    stack: error.stack,
    code: error.code
  });
  logger.error('Exiting due to uncaught exception...');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
logger.info('Starting server initialization...');
startServer().catch((error) => {
  logger.error('=== ❌ Fatal Error in startServer() ===');
  logger.error('Unhandled error in startServer():', {
    error: error.message,
    name: error.name,
    stack: error.stack,
    code: error.code
  });
  process.exit(1);
});

module.exports = app;

