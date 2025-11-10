#!/bin/bash

# Deployment Verification Script
echo "🔍 Verifying Deployment..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_BASE_URL:-http://localhost:3000}"

# Check health endpoint
echo -e "${YELLOW}1. Checking health endpoint...${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH)${NC}"
    exit 1
fi

# Check database connectivity
echo -e "${YELLOW}2. Checking database connectivity...${NC}"
DB_CHECK=$(curl -s "${API_URL}/health" | grep -o '"status":"healthy"' || echo "")
if [ -n "$DB_CHECK" ]; then
    echo -e "${GREEN}✅ Database connection verified${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Check API endpoints
echo -e "${YELLOW}3. Testing API endpoints...${NC}"
ENDPOINTS=(
    "/api/market/signals"
    "/api/strategy"
)

for endpoint in "${ENDPOINTS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}${endpoint}")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
        echo -e "${GREEN}✅ ${endpoint} (HTTP $STATUS)${NC}"
    else
        echo -e "${RED}❌ ${endpoint} failed (HTTP $STATUS)${NC}"
    fi
done

# Check Firebase login endpoint (should reject missing token)
echo -e "${YELLOW}4. Validating Firebase login endpoint...${NC}"
FIREBASE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "${API_URL}/api/auth/firebase-login")
if [ "$FIREBASE_STATUS" = "400" ] || [ "$FIREBASE_STATUS" = "401" ]; then
    echo -e "${GREEN}✅ /api/auth/firebase-login (HTTP $FIREBASE_STATUS)${NC}"
else
    echo -e "${RED}❌ /api/auth/firebase-login failed (HTTP $FIREBASE_STATUS)${NC}"
fi

# Check CORS headers
echo -e "${YELLOW}5. Checking CORS configuration...${NC}"
CORS=$(curl -s -I -H "Origin: https://example.com" "${API_URL}/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS" ]; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
else
    echo -e "${YELLOW}⚠️  CORS headers not found${NC}"
fi

# Check security headers
echo -e "${YELLOW}6. Checking security headers...${NC}"
SECURITY=$(curl -s -I "${API_URL}/health" | grep -i "x-content-type-options\|x-frame-options" || echo "")
if [ -n "$SECURITY" ]; then
    echo -e "${GREEN}✅ Security headers present${NC}"
else
    echo -e "${YELLOW}⚠️  Some security headers missing${NC}"
fi

# Performance check
echo -e "${YELLOW}7. Checking response time...${NC}"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "${API_URL}/health" | awk '{printf "%.0f", $1*1000}')
if [ "$RESPONSE_TIME" -lt 100 ]; then
    echo -e "${GREEN}✅ Response time: ${RESPONSE_TIME}ms (< 100ms target)${NC}"
else
    echo -e "${YELLOW}⚠️  Response time: ${RESPONSE_TIME}ms (target: < 100ms)${NC}"
fi

echo -e "\n${GREEN}✅ Deployment verification complete!${NC}"

