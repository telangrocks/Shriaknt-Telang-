const request = require('supertest');
const { createPool } = require('../../src/database/pool');
const { createRedisClient } = require('../../src/services/redis');

describe('API Integration Tests', () => {
  let app;
  let pool;
  let redis;

  beforeAll(async () => {
    app = require('../../src/server');
    pool = createPool();
    redis = createRedisClient();
    if (!redis.isOpen) {
      await redis.connect();
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
    if (redis && redis.isOpen) {
      await redis.quit();
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array.from({ length: 110 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      // At least one should be rate limited
      expect(rateLimited).toBe(true);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});

