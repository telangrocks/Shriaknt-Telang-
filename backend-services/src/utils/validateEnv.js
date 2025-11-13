const crypto = require('crypto');
const logger = require('./logger');
const { getSupabaseJwtSecret } = require('./getSupabaseJwtSecret');

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
  // Note: SUPABASE_JWT_SECRET is validated separately to support alternative names
];

function validateEnv() {
  const missing = [];
  const empty = [];
  
  // Log environment information for debugging (in production, this helps diagnose issues)
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Check for SUPABASE_JWT_SECRET using helper (supports alternative names)
    const supabaseJwtSecret = getSupabaseJwtSecret();
    
    // In production, log which required vars are available (without values)
    const availableVars = requiredEnvVars.filter(varName => {
      const value = process.env[varName];
      return value !== undefined && value !== null && value !== '';
    });
    
    // Add SUPABASE_JWT_SECRET to count if found (via any accepted name)
    const totalVars = requiredEnvVars.length + 1; // +1 for SUPABASE_JWT_SECRET
    const availableCount = availableVars.length + (supabaseJwtSecret ? 1 : 0);
    logger.info(`Environment validation: ${availableCount}/${totalVars} required variables are set`);
    
    // Log which variable name was used for SUPABASE_JWT_SECRET
    if (supabaseJwtSecret) {
      const usedName = ['SUPABASE_JWT_SECRET', 'SUPABASE_JWT_SECRE', 'SUPABASE_JWT', 'JWT_SECRET_SUPABASE', 'SUPABASE_SECRET']
        .find(name => process.env[name] && process.env[name].trim().length > 0);
      if (usedName && usedName !== 'SUPABASE_JWT_SECRET') {
        logger.info(`Using '${usedName}' for Supabase JWT Secret (working correctly, but consider renaming to 'SUPABASE_JWT_SECRET' for consistency)`);
      } else if (usedName === 'SUPABASE_JWT_SECRET') {
        logger.info(`Using 'SUPABASE_JWT_SECRET' for Supabase JWT Secret (correct configuration)`);
      }
    } else {
      logger.warn('SUPABASE_JWT_SECRET is not set. Checking for common alternative names...');
      
      // Check all env vars that contain 'SUPABASE' or 'JWT'
      const relatedVars = Object.keys(process.env).filter(key => 
        key.toUpperCase().includes('SUPABASE') || key.toUpperCase().includes('JWT')
      );
      
      if (relatedVars.length > 0) {
        logger.info(`Found ${relatedVars.length} related environment variable(s), but none contain a valid Supabase JWT Secret:`);
        relatedVars.forEach(varName => {
          const value = process.env[varName];
          const hasValue = value && value.length > 0;
          const preview = hasValue && value.length > 10 
            ? `(value length: ${value.length})`
            : '(empty or undefined)';
          logger.info(`  - ${varName}: ${preview}`);
        });
      }
    }
  }
  
  // Validate standard required variables
  requiredEnvVars.forEach(varName => {
    if (varName === 'ENCRYPTION_KEY') {
      return;
    }

    const value = process.env[varName];
    if (value === undefined || value === null) {
      missing.push(varName);
    } else if (value === '') {
      empty.push(varName);
    }
  });

  // Validate SUPABASE_JWT_SECRET (supports alternative names)
  const supabaseJwtSecret = getSupabaseJwtSecret();
  if (!supabaseJwtSecret) {
    missing.push('SUPABASE_JWT_SECRET');
  }

  if (missing.length > 0 || empty.length > 0) {
    const issues = [];
    if (missing.length > 0) {
      issues.push(`Missing: ${missing.join(', ')}`);
    }
    if (empty.length > 0) {
      issues.push(`Empty: ${empty.join(', ')}`);
    }
    
    logger.error(`Environment validation failed. ${issues.join('; ')}`);
    
    // Provide helpful guidance for SUPABASE_JWT_SECRET
    if (missing.includes('SUPABASE_JWT_SECRET')) {
      logger.error('SUPABASE_JWT_SECRET is required for Supabase authentication.');
      logger.error('Accepted variable names:');
      logger.error('  - SUPABASE_JWT_SECRET (preferred)');
      logger.error('  - SUPABASE_JWT_SECRE (alternative)');
      logger.error('  - SUPABASE_JWT (alternative)');
      logger.error('  - JWT_SECRET_SUPABASE (alternative)');
      logger.error('  - SUPABASE_SECRET (alternative)');
      logger.error('');
      logger.error('To get this value:');
      logger.error('1. Go to your Supabase project dashboard');
      logger.error('2. Navigate to Settings > API');
      logger.error('3. Copy the JWT Secret value');
      logger.error('4. Set it as an environment variable with one of the names above');
      logger.error('5. In Northflank: Add the secret as an environment variable');
    }
    
    throw new Error(`Missing required environment variables: ${missing.concat(empty).join(', ')}`);
  } else {
    // Log which variable name was used (if not the preferred one)
    if (!process.env.SUPABASE_JWT_SECRET && supabaseJwtSecret) {
      const usedName = ['SUPABASE_JWT_SECRET', 'SUPABASE_JWT_SECRE', 'SUPABASE_JWT', 'JWT_SECRET_SUPABASE', 'SUPABASE_SECRET']
        .find(name => process.env[name] && process.env[name].trim().length > 0);
      if (usedName) {
        logger.info(`Using '${usedName}' for Supabase JWT Secret (consider renaming to 'SUPABASE_JWT_SECRET' for consistency)`);
      }
    }
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

