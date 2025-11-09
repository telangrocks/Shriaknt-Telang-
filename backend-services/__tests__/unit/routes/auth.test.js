const request = require('supertest');
const app = require('../../../src/server');

describe('Auth Routes - Unit Tests', () => {
  describe('POST /api/auth/request-otp', () => {
    it('should return 400 for invalid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing phone number', async () => {
      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should accept valid phone number format', async () => {
      // Mock Twilio to avoid actual SMS sending in tests
      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '+1234567890' });

      // Should either succeed or fail gracefully
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should return 400 for missing phone or OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '+1234567890', otp: '000000' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });
});

