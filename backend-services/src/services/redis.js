const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis connection failed');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  return redisClient;
}

// Cache operations
async function getCache(key) {
  try {
    const client = createRedisClient();
    if (!client.isOpen) await client.connect();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error(`Redis get error for key ${key}:`, error);
    return null;
  }
}

async function setCache(key, value, ttl = 3600) {
  try {
    const client = createRedisClient();
    if (!client.isOpen) await client.connect();
    await client.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Redis set error for key ${key}:`, error);
    return false;
  }
}

async function deleteCache(key) {
  try {
    const client = createRedisClient();
    if (!client.isOpen) await client.connect();
    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Redis delete error for key ${key}:`, error);
    return false;
  }
}

// Session management
async function setSession(userId, token, refreshToken) {
  const sessionKey = `session:${userId}`;
  const sessionData = {
    token,
    refreshToken,
    createdAt: new Date().toISOString()
  };
  return await setCache(sessionKey, sessionData, 7 * 24 * 60 * 60); // 7 days
}

async function getSession(userId) {
  const sessionKey = `session:${userId}`;
  return await getCache(sessionKey);
}

async function deleteSession(userId) {
  const sessionKey = `session:${userId}`;
  return await deleteCache(sessionKey);
}

// Market data caching
async function cacheMarketData(exchange, pair, data, ttl = 2) {
  const key = `market:${exchange}:${pair}`;
  return await setCache(key, data, ttl);
}

async function getCachedMarketData(exchange, pair) {
  const key = `market:${exchange}:${pair}`;
  return await getCache(key);
}

// AI signals caching
async function cacheAISignal(signalId, signal, ttl = 300) {
  const key = `signal:${signalId}`;
  return await setCache(key, signal, ttl);
}

async function getCachedAISignal(signalId) {
  const key = `signal:${signalId}`;
  return await getCache(key);
}

// Rate limiting
async function checkRateLimit(identifier, maxRequests = 10, windowSeconds = 60) {
  const key = `ratelimit:${identifier}`;
  const client = createRedisClient();
  if (!client.isOpen) await client.connect();
  
  const current = await client.incr(key);
  if (current === 1) {
    await client.expire(key, windowSeconds);
  }
  
  return {
    allowed: current <= maxRequests,
    remaining: Math.max(0, maxRequests - current),
    resetIn: windowSeconds
  };
}

// User preferences caching
async function cacheUserPreferences(userId, preferences, ttl = 3600) {
  const key = `prefs:${userId}`;
  return await setCache(key, preferences, ttl);
}

async function getCachedUserPreferences(userId) {
  const key = `prefs:${userId}`;
  return await getCache(key);
}

// Trade execution locks
async function acquireTradeLock(userId, pair, ttl = 60) {
  const key = `tradelock:${userId}:${pair}`;
  const client = createRedisClient();
  if (!client.isOpen) await client.connect();
  
  const result = await client.setNX(key, 'locked');
  if (result) {
    await client.expire(key, ttl);
  }
  return result;
}

async function releaseTradeLock(userId, pair) {
  const key = `tradelock:${userId}:${pair}`;
  return await deleteCache(key);
}

module.exports = {
  createRedisClient,
  getCache,
  setCache,
  deleteCache,
  setSession,
  getSession,
  deleteSession,
  cacheMarketData,
  getCachedMarketData,
  cacheAISignal,
  getCachedAISignal,
  checkRateLimit,
  cacheUserPreferences,
  getCachedUserPreferences,
  acquireTradeLock,
  releaseTradeLock
};

