const crypto = require('crypto');
const logger = require('./logger');

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'CASHFREE_APP_ID',
  'CASHFREE_SECRET_KEY',
  'CASHFREE_WEBHOOK_SECRET',
  'CASHFREE_ENV',
  'NODE_ENV',
  'PORT',
  'API_BASE_URL',
  'ALLOWED_ORIGINS',
  'TRIAL_DAYS',
  'MONTHLY_PRICE',
  'CURRENCY',
  'AI_MIN_CONFIDENCE',
  'AI_TARGET_PROFITABILITY',
  'MAX_CONCURRENT_TRADES',
  'ENCRYPTION_KEY',
  'FIREBASE_SERVICE_ACCOUNT'
];

function validateEnv() {
  const missing = [];
  
  requiredEnvVars.forEach(varName => {
    if (varName === 'ENCRYPTION_KEY') {
      return;
    }

    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secrets length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters long for security');
  }

  if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
    logger.warn('REFRESH_TOKEN_SECRET should be at least 32 characters long for security');
  }

  // Validate encryption key
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    const generatedKey = crypto.randomBytes(32).toString('hex');
    process.env.ENCRYPTION_KEY = generatedKey;
    logger.warn('ENCRYPTION_KEY was missing; generated a new 64-character hex key. Persist this value securely to avoid data loss.');
  } else if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    logger.error('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).');
    throw new Error('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).');
  }

  logger.info('Environment variables validated successfully');
}

module.exports = { validateEnv };

