const request = require('supertest');
const createApp = require('../../src/app');

const app = createApp();

describe('API Routes', () => {
  describe('GET /api/v1/health', () => {
    it('should return health check status', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('API is running');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app)
        .get('/api/v1/unknown-route')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Route not found');
    });
  });
});
