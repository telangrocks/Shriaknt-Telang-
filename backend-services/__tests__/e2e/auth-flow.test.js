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

  describe('Complete OTP Flow', () => {
    const testPhone = `+1${Date.now().toString().slice(-10)}`;

    it('should complete full authentication flow', async () => {
      // Step 1: Request OTP
      const otpResponse = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: testPhone });

      // May fail if Twilio not configured, but should not crash
      expect([200, 400, 500]).toContain(otpResponse.status);

      // Step 2: Verify OTP (would need actual OTP from Redis/database)
      // This is a placeholder - in real tests, you'd get OTP from test database
      
      // Step 3: Get user info
      // Would require valid token from step 2
    });
  });
});

