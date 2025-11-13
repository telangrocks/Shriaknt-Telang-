#!/usr/bin/env node

/**
 * Environment Variable Diagnostic Script
 * 
 * This script checks which environment variables are set and helps diagnose
 * configuration issues, particularly with SUPABASE_JWT_SECRET.
 */

const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_JWT_SECRET',
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
  'ENCRYPTION_KEY'
];

console.log('='.repeat(80));
console.log('Environment Variable Diagnostic Report');
console.log('='.repeat(80));
console.log('');

// Check all required variables
const missing = [];
const empty = [];
const set = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value === undefined || value === null) {
    missing.push(varName);
  } else if (value === '') {
    empty.push(varName);
  } else {
    set.push(varName);
    // Show first/last few characters for secrets (for verification)
    if (varName.includes('SECRET') || varName.includes('KEY') || varName === 'DATABASE_URL') {
      const preview = value.length > 20 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
        : '***';
      console.log(`✓ ${varName}: ${preview} (length: ${value.length})`);
    } else {
      console.log(`✓ ${varName}: ${value}`);
    }
  }
});

console.log('');
console.log('='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Set: ${set.length}/${requiredVars.length}`);
console.log(`Missing: ${missing.length}`);
console.log(`Empty: ${empty.length}`);
console.log('');

if (missing.length > 0) {
  console.log('❌ Missing Variables:');
  missing.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
}

if (empty.length > 0) {
  console.log('⚠️  Empty Variables:');
  empty.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
}

// Special check for SUPABASE_JWT_SECRET
if (missing.includes('SUPABASE_JWT_SECRET') || empty.includes('SUPABASE_JWT_SECRET')) {
  console.log('='.repeat(80));
  console.log('⚠️  SUPABASE_JWT_SECRET Issue Detected');
  console.log('='.repeat(80));
  console.log('');
  console.log('Checking for similar variable names...');
  console.log('');
  
  // Check for alternative names
  const alternatives = [
    'SUPABASE_JWT',
    'JWT_SECRET_SUPABASE',
    'SUPABASE_SECRET',
    'SUPABASE_JWT_SECRET_KEY',
    'JWT_SECRET'
  ];
  
  const foundAlternatives = alternatives.filter(alt => process.env[alt]);
  if (foundAlternatives.length > 0) {
    console.log('Found variables with similar names:');
    foundAlternatives.forEach(alt => {
      const value = process.env[alt];
      const preview = value.length > 20 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
        : '***';
      console.log(`   - ${alt}: ${preview} (length: ${value.length})`);
    });
    console.log('');
    console.log('⚠️  These variables exist but the application expects "SUPABASE_JWT_SECRET"');
    console.log('   Please rename them to SUPABASE_JWT_SECRET in your deployment platform.');
    console.log('');
  }
  
  // Check all Supabase-related variables
  const supabaseVars = Object.keys(process.env).filter(key => 
    key.toUpperCase().includes('SUPABASE')
  );
  if (supabaseVars.length > 0) {
    console.log('All Supabase-related environment variables:');
    supabaseVars.forEach(key => {
      const value = process.env[key];
      const preview = value.length > 30 
        ? `${value.substring(0, 15)}...${value.substring(value.length - 15)}`
        : '***';
      console.log(`   - ${key}: ${preview}`);
    });
    console.log('');
  }
  
  // Check all JWT-related variables
  const jwtVars = Object.keys(process.env).filter(key => 
    key.toUpperCase().includes('JWT') && !key.toUpperCase().includes('SUPABASE')
  );
  if (jwtVars.length > 0) {
    console.log('Other JWT-related environment variables:');
    jwtVars.forEach(key => {
      const value = process.env[key];
      const preview = value.length > 30 
        ? `${value.substring(0, 15)}...${value.substring(value.length - 15)}`
        : '***';
      console.log(`   - ${key}: ${preview}`);
    });
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('How to Fix:');
  console.log('='.repeat(80));
  console.log('');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy the "JWT Secret" value (this is the JWT signing secret)');
  console.log('4. In Northflank:');
  console.log('   a. Go to your service/project');
  console.log('   b. Navigate to Settings > Environment Variables');
  console.log('   c. Add a new environment variable');
  console.log('   d. Name: SUPABASE_JWT_SECRET (exactly, case-sensitive)');
  console.log('   e. Value: <paste the JWT Secret from Supabase>');
  console.log('   f. Ensure it\'s set as an environment variable (not a build argument)');
  console.log('   g. Save and redeploy');
  console.log('');
  console.log('Note: The JWT Secret is different from the "anon" or "service_role" keys.');
  console.log('      It\'s the secret used to sign and verify JWT tokens.');
  console.log('');
}

// Check all environment variables (for debugging)
if (process.argv.includes('--show-all')) {
  console.log('='.repeat(80));
  console.log('All Environment Variables');
  console.log('='.repeat(80));
  const allVars = Object.keys(process.env).sort();
  allVars.forEach(key => {
    const value = process.env[key];
    if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
      console.log(`${key}: *** (length: ${value.length})`);
    } else {
      console.log(`${key}: ${value}`);
    }
  });
  console.log('');
}

// Exit with appropriate code
if (missing.length > 0 || empty.length > 0) {
  console.log('❌ Environment validation failed');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
  process.exit(0);
}

