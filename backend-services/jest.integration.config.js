module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  testTimeout: 30000
};

