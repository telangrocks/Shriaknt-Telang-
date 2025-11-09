#!/bin/bash

# Environment Setup Script
echo "🔧 Setting up environment..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env.example exists
if [ ! -f .env.example ]; then
    echo -e "${RED}❌ .env.example not found${NC}"
    exit 1
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and fill in all required values${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Validate required environment variables
echo -e "${YELLOW}🔍 Validating environment variables...${NC}"

REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "REFRESH_TOKEN_SECRET"
    "TWILIO_ACCOUNT_SID"
    "TWILIO_AUTH_TOKEN"
    "CASHFREE_APP_ID"
    "CASHFREE_SECRET_KEY"
    "ENCRYPTION_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env || grep -q "^${var}=your-" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
else
    echo -e "${RED}❌ Missing or incomplete environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "   - ${var}"
    done
    echo -e "\n${YELLOW}Please update .env file with actual values${NC}"
    exit 1
fi

# Generate encryption key if missing
if grep -q "^ENCRYPTION_KEY=your-" .env || ! grep -q "^ENCRYPTION_KEY=" .env; then
    echo -e "${YELLOW}🔐 Generating encryption key...${NC}"
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    if [ -n "$ENCRYPTION_KEY" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" .env
        else
            # Linux
            sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" .env
        fi
        echo -e "${GREEN}✅ Encryption key generated${NC}"
    else
        echo -e "${RED}❌ Failed to generate encryption key${NC}"
    fi
fi

# Generate JWT secrets if missing
if grep -q "^JWT_SECRET=your-" .env; then
    echo -e "${YELLOW}🔐 Generating JWT secrets...${NC}"
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    REFRESH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
        sed -i '' "s|^REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=${REFRESH_SECRET}|" .env
    else
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
        sed -i "s|^REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=${REFRESH_SECRET}|" .env
    fi
    echo -e "${GREEN}✅ JWT secrets generated${NC}"
fi

echo -e "\n${GREEN}✅ Environment setup complete!${NC}"
echo -e "${YELLOW}📝 Remember to:${NC}"
echo -e "   1. Update DATABASE_URL with your PostgreSQL connection string"
echo -e "   2. Update REDIS_URL with your Redis connection string"
echo -e "   3. Add your Twilio credentials"
echo -e "   4. Add your Cashfree credentials"
echo -e "   5. Set API_BASE_URL to your production domain"

