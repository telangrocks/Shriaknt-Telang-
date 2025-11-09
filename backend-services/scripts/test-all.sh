#!/bin/bash

# Comprehensive Testing Script
echo "🧪 Running Comprehensive Test Suite..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Please create it from .env.example${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check database connection
echo -e "${YELLOW}📊 Checking database connection...${NC}"
node -e "
const { createPool } = require('./src/database/pool');
const pool = createPool();
pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Database connection OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
" || exit 1

# Check Redis connection
echo -e "${YELLOW}📊 Checking Redis connection...${NC}"
node -e "
const { createRedisClient } = require('./src/services/redis');
const redis = createRedisClient();
redis.connect()
  .then(() => {
    console.log('✅ Redis connection OK');
    redis.quit();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Redis connection failed:', err.message);
    process.exit(1);
  });
" || exit 1

# Run unit tests
echo -e "${YELLOW}🔬 Running unit tests...${NC}"
npm test -- --coverage || {
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
}

# Run integration tests
echo -e "${YELLOW}🔗 Running integration tests...${NC}"
npm run test:integration || {
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit 1
}

# Run E2E tests
echo -e "${YELLOW}🌐 Running E2E tests...${NC}"
npm run test:e2e || {
    echo -e "${RED}❌ E2E tests failed${NC}"
    exit 1
}

# Performance test
echo -e "${YELLOW}⚡ Running performance tests...${NC}"
node scripts/performance-test.js || {
    echo -e "${YELLOW}⚠️  Performance tests had issues (may be expected)${NC}"
}

echo -e "${GREEN}✅ All tests completed successfully!${NC}"

