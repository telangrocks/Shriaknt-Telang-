const request = require('supertest');
const app = require('../../../src/server');

describe('Auth Routes - Unit Tests', () => {
  describe('POST /api/auth/firebase-login', () => {
    it('should return 400 when idToken is missing', async () => {
      const response = await request(app)
        .post('/api/auth/firebase-login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
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

