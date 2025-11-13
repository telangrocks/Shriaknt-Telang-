const request = require('supertest');
const { createPool } = require('../../src/database/pool');

describe('E2E: Authentication Flow', () => {
  let app;
  let pool;

  beforeAll(async () => {
    app = require('../../src/server');
    pool = createPool();
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  describe('Supabase Login Validation', () => {
    it('should reject login attempt without Supabase token', async () => {
      const response = await request(app)
        .post('/api/auth/supabase-login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});

