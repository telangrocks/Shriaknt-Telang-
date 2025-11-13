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
  'SUPABASE_JWT_SECRET'
];

function validateEnv() {
  const missing = [];
  const empty = [];
  
  // Log environment information for debugging (in production, this helps diagnose issues)
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, log which required vars are available (without values)
    const availableVars = requiredEnvVars.filter(varName => {
      const value = process.env[varName];
      return value !== undefined && value !== null && value !== '';
    });
    logger.info(`Environment validation: ${availableVars.length}/${requiredEnvVars.length} required variables are set`);
    
    // Log specifically about SUPABASE_JWT_SECRET for debugging
    if (!process.env.SUPABASE_JWT_SECRET) {
      logger.warn('SUPABASE_JWT_SECRET is not set. Checking for common alternative names...');
      
      // Check all env vars that contain 'SUPABASE' or 'JWT'
      const relatedVars = Object.keys(process.env).filter(key => 
        key.toUpperCase().includes('SUPABASE') || key.toUpperCase().includes('JWT')
      );
      
      if (relatedVars.length > 0) {
        // Log each related variable separately for clarity
        logger.info(`Found ${relatedVars.length} related environment variable(s):`);
        relatedVars.forEach(varName => {
          const value = process.env[varName];
          const hasValue = value && value.length > 0;
          const preview = hasValue && value.length > 10 
            ? `(value length: ${value.length})`
            : '(empty or undefined)';
          logger.info(`  - ${varName}: ${preview}`);
        });
        
        // Check for close matches to SUPABASE_JWT_SECRET
        const targetVar = 'SUPABASE_JWT_SECRET';
        const closeMatches = relatedVars.filter(varName => {
          const upperVar = varName.toUpperCase().trim();
          const upperTarget = targetVar.toUpperCase();
          // Check if variable starts with SUPABASE_JWT_SECRE (might be missing T)
          // or is very close (missing/extra one character)
          return upperVar.startsWith('SUPABASE_JWT_SECRE') || 
                 (upperVar.length >= targetVar.length - 2 && 
                  upperVar.length <= targetVar.length + 2 &&
                  upperVar.includes('SUPABASE') && 
                  upperVar.includes('JWT') && 
                  upperVar.includes('SECRET'));
        });
        
        if (closeMatches.length > 0) {
          logger.error(`⚠️  CRITICAL: Found variable(s) with similar names to 'SUPABASE_JWT_SECRET':`);
          closeMatches.forEach(varName => {
            const exactMatch = varName.toUpperCase().trim() === targetVar.toUpperCase();
            if (!exactMatch) {
              logger.error(`   ❌ Found: '${varName}' (length: ${varName.length})`);
              logger.error(`   ✅ Expected: 'SUPABASE_JWT_SECRET' (length: ${targetVar.length})`);
              logger.error(`   🔧 Action Required: Rename '${varName}' to exactly 'SUPABASE_JWT_SECRET' in Northflank`);
              logger.error(`   📍 Location: Northflank → Your Service → Settings → Environment Variables`);
              
              // Check for common issues
              if (varName.length < targetVar.length) {
                logger.error(`   ⚠️  Issue: Variable name appears to be shorter (missing characters?)`);
              } else if (varName.length > targetVar.length) {
                logger.error(`   ⚠️  Issue: Variable name appears to be longer (extra characters?)`);
              }
              if (varName !== varName.trim()) {
                logger.error(`   ⚠️  Issue: Variable name has leading/trailing whitespace`);
              }
            }
          });
        }
        
        // Also check if there's a variable that starts with SUPABASE_JWT_SECRET but has extra characters
        const prefixMatches = relatedVars.filter(varName => {
          const upperVar = varName.toUpperCase().trim();
          return upperVar.startsWith('SUPABASE_JWT_SECRET') && upperVar !== 'SUPABASE_JWT_SECRET';
        });
        
        if (prefixMatches.length > 0) {
          logger.error(`⚠️  Found variables starting with 'SUPABASE_JWT_SECRET' but with extra characters:`);
          prefixMatches.forEach(varName => {
            logger.error(`   - '${varName}' - Remove extra characters, use exactly 'SUPABASE_JWT_SECRET'`);
          });
        }
      }
      
      // Check for common alternative names
      const alternatives = ['SUPABASE_JWT', 'JWT_SECRET_SUPABASE', 'SUPABASE_SECRET'];
      const found = alternatives.find(alt => process.env[alt]);
      if (found) {
        logger.error(`Found alternative name '${found}' but expected 'SUPABASE_JWT_SECRET'. Please update your configuration.`);
      }
    }
  }
  
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
    if (missing.includes('SUPABASE_JWT_SECRET') || empty.includes('SUPABASE_JWT_SECRET')) {
      logger.error('SUPABASE_JWT_SECRET is required for Supabase authentication.');
      logger.error('To get this value:');
      logger.error('1. Go to your Supabase project dashboard');
      logger.error('2. Navigate to Settings > API');
      logger.error('3. Copy the JWT Secret value');
      logger.error('4. Set it as an environment variable named exactly: SUPABASE_JWT_SECRET');
      logger.error('5. In Northflank: Ensure the secret is named exactly "SUPABASE_JWT_SECRET" (case-sensitive)');
    }
    
    throw new Error(`Missing required environment variables: ${missing.concat(empty).join(', ')}`);
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

