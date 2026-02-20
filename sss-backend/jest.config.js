module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/scripts/**',
    '!src/config/db.js'
  ],
  // NOTE: coverage thresholds are intentionally not enforced here.
  // The project uses coverage reporting, but hard thresholds would fail
  // until coverage is expanded across all routes/controllers.
  maxWorkers: 1,  // Run tests serially to avoid conflicts
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 30000,
  verbose: true
};
