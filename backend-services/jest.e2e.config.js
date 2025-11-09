module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/__tests__/e2e/**/*.test.js'],
  testTimeout: 60000
};

