require('dotenv').config();
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

// Validate environment variables on startup
validateEnv();

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
    // Initialize database pool
    const pool = createPool();
    await initializeDatabaseSchema();
    logger.info('Database pool initialized');

    // Initialize Redis
    const redis = createRedisClient();
    await redis.connect();
    logger.info('Redis client connected');

    // Start background services
    startAIService();
    startMarketDataService();
    startSubscriptionMonitor();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

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
startServer();

module.exports = app;

