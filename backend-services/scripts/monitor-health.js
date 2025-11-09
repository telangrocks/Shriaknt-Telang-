const http = require('http');
const { createPool } = require('../src/database/pool');
const { createRedisClient } = require('../src/services/redis');

const API_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const CHECK_INTERVAL = 30000; // 30 seconds

async function checkHealth() {
  return new Promise((resolve, reject) => {
    const url = new URL('/health', API_URL);
    const start = Date.now();
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const health = JSON.parse(data);
          resolve({ ...health, responseTime: duration, statusCode: res.statusCode });
        } catch (e) {
          resolve({ status: 'unknown', responseTime: duration, statusCode: res.statusCode });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function checkDatabase() {
  try {
    const pool = createPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'healthy', message: 'Database connection OK' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

async function checkRedis() {
  try {
    const redis = createRedisClient();
    if (!redis.isOpen) {
      await redis.connect();
    }
    await redis.ping();
    return { status: 'healthy', message: 'Redis connection OK' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

async function runHealthCheck() {
  console.log(`\n[${new Date().toISOString()}] Health Check\n`);
  
  try {
    // API Health
    const apiHealth = await checkHealth();
    console.log(`API: ${apiHealth.status} (${apiHealth.responseTime}ms)`);
    
    // Database Health
    const dbHealth = await checkDatabase();
    console.log(`Database: ${dbHealth.status} - ${dbHealth.message}`);
    
    // Redis Health
    const redisHealth = await checkRedis();
    console.log(`Redis: ${redisHealth.status} - ${redisHealth.message}`);
    
    // Overall status
    const allHealthy = 
      apiHealth.status === 'healthy' &&
      dbHealth.status === 'healthy' &&
      redisHealth.status === 'healthy';
    
    if (allHealthy) {
      console.log('\n✅ All systems operational\n');
    } else {
      console.log('\n⚠️  Some systems are unhealthy\n');
    }
    
    return allHealthy;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

// Run continuously if called directly
if (require.main === module) {
  console.log('Starting health monitoring...');
  console.log(`Checking every ${CHECK_INTERVAL / 1000} seconds\n`);
  
  runHealthCheck();
  setInterval(runHealthCheck, CHECK_INTERVAL);
}

module.exports = { runHealthCheck, checkHealth, checkDatabase, checkRedis };

