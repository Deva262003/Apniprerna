const request = require('supertest');
const createApp = require('../../src/app');
const { BlockedSite } = require('../../src/models');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  createTestBlockedSite,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Blocklist Routes', () => {
  describe('GET /api/v1/blocklist', () => {
    it('should return empty array when no blocked sites', async () => {
      const res = await request(app)
        .get('/api/v1/blocklist')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return all blocked sites', async () => {
      const admin = await createTestAdmin();
      await createTestBlockedSite(admin, { pattern: 'site1.com' });
      await createTestBlockedSite(admin, { pattern: 'site2.com' });

      const res = await request(app)
        .get('/api/v1/blocklist')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter by scope', async () => {
      const admin = await createTestAdmin();
      await createTestBlockedSite(admin, { pattern: 'global.com', scope: 'global' });
      await createTestBlockedSite(admin, { pattern: 'center.com', scope: 'center' });

      const res = await request(app)
        .get('/api/v1/blocklist?scope=global')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].scope).toBe('global');
    });

    it('should filter by category', async () => {
      const admin = await createTestAdmin();
      await createTestBlockedSite(admin, { pattern: 'site1.com', category: 'adult' });
      await createTestBlockedSite(admin, { pattern: 'site2.com', category: 'gambling' });

      const res = await request(app)
        .get('/api/v1/blocklist?category=adult')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe('adult');
    });

    it('should filter by isActive', async () => {
      const admin = await createTestAdmin();
      await createTestBlockedSite(admin, { pattern: 'active.com', isActive: true });
      await createTestBlockedSite(admin, { pattern: 'inactive.com', isActive: false });

      const res = await request(app)
        .get('/api/v1/blocklist?isActive=true')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isActive).toBe(true);
    });

    it('should search by pattern', async () => {
      const admin = await createTestAdmin();
      await createTestBlockedSite(admin, { pattern: 'facebook.com' });
      await createTestBlockedSite(admin, { pattern: 'twitter.com' });

      const res = await request(app)
        .get('/api/v1/blocklist?search=face')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].pattern).toBe('facebook.com');
    });
  });

  describe('GET /api/v1/blocklist/:id', () => {
    it('should return 404 for non-existent blocked site', async () => {
      const res = await request(app)
        .get('/api/v1/blocklist/507f1f77bcf86cd799439011')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Blocked site not found');
    });

    it('should return blocked site by ID', async () => {
      const admin = await createTestAdmin();
      const blockedSite = await createTestBlockedSite(admin);

      const res = await request(app)
        .get(`/api/v1/blocklist/${blockedSite._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pattern).toBe('badsite.com');
    });
  });

  describe('POST /api/v1/blocklist', () => {
    it('should create global blocked site', async () => {
      const res = await request(app)
        .post('/api/v1/blocklist')
        .send({
          pattern: 'newbadsite.com',
          patternType: 'domain',
          category: 'adult',
          scope: 'global',
          description: 'Bad site'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pattern).toBe('newbadsite.com');
      expect(res.body.data.scope).toBe('global');
    });

    it('should create center-scoped blocked site', async () => {
      const center = await createTestCenter();

      const res = await request(app)
        .post('/api/v1/blocklist')
        .send({
          pattern: 'centerbad.com',
          scope: 'center',
          scopeId: center._id.toString()
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.scope).toBe('center');
    });

    it('should reject invalid center scopeId', async () => {
      const res = await request(app)
        .post('/api/v1/blocklist')
        .send({
          pattern: 'bad.com',
          scope: 'center',
          scopeId: '507f1f77bcf86cd799439011'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Center not found');
    });

    it('should reject invalid student scopeId', async () => {
      const res = await request(app)
        .post('/api/v1/blocklist')
        .send({
          pattern: 'bad.com',
          scope: 'student',
          scopeId: '507f1f77bcf86cd799439011'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Student not found');
    });

    it('should create student-scoped blocked site', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const res = await request(app)
        .post('/api/v1/blocklist')
        .send({
          pattern: 'studentbad.com',
          scope: 'student',
          scopeId: student._id.toString()
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.scope).toBe('student');
    });
  });

  describe('PUT /api/v1/blocklist/:id', () => {
    it('should return 404 for non-existent blocked site', async () => {
      const res = await request(app)
        .put('/api/v1/blocklist/507f1f77bcf86cd799439011')
        .send({ pattern: 'updated.com' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should update blocked site fields', async () => {
      const admin = await createTestAdmin();
      const blockedSite = await createTestBlockedSite(admin);

      const res = await request(app)
        .put(`/api/v1/blocklist/${blockedSite._id}`)
        .send({
          pattern: 'updated.com',
          category: 'gambling',
          isActive: false,
          description: 'Updated description'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pattern).toBe('updated.com');
      expect(res.body.data.category).toBe('gambling');
      expect(res.body.data.isActive).toBe(false);
    });

    it('should update scope to global', async () => {
      const center = await createTestCenter();
      const admin = await createTestAdmin();
      const blockedSite = await createTestBlockedSite(admin, { scope: 'center', scopeId: center._id });

      const res = await request(app)
        .put(`/api/v1/blocklist/${blockedSite._id}`)
        .send({ scope: 'global' })
        .expect(200);

      expect(res.body.data.scope).toBe('global');
      expect(res.body.data.scopeId).toBeUndefined();
    });

    it('should update scope to center', async () => {
      const center = await createTestCenter();
      const admin = await createTestAdmin();
      const blockedSite = await createTestBlockedSite(admin, { scope: 'global' });

      const res = await request(app)
        .put(`/api/v1/blocklist/${blockedSite._id}`)
        .send({ scope: 'center', scopeId: center._id.toString() })
        .expect(200);

      expect(res.body.data.scope).toBe('center');
    });
  });

  describe('DELETE /api/v1/blocklist/:id', () => {
    it('should return 404 for non-existent blocked site', async () => {
      const res = await request(app)
        .delete('/api/v1/blocklist/507f1f77bcf86cd799439011')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should delete blocked site', async () => {
      const admin = await createTestAdmin();
      const blockedSite = await createTestBlockedSite(admin);

      const res = await request(app)
        .delete(`/api/v1/blocklist/${blockedSite._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Blocked site deleted');

      const deleted = await BlockedSite.findById(blockedSite._id);
      expect(deleted).toBeNull();
    });
  });

  describe('PATCH /api/v1/blocklist/:id/toggle', () => {
    it('should return 404 for non-existent blocked site', async () => {
      const res = await request(app)
        .patch('/api/v1/blocklist/507f1f77bcf86cd799439011/toggle')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should toggle isActive status', async () => {
      const admin = await createTestAdmin();
      const blockedSite = await createTestBlockedSite(admin, { isActive: true });

      const res = await request(app)
        .patch(`/api/v1/blocklist/${blockedSite._id}/toggle`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      // Toggle again
      const res2 = await request(app)
        .patch(`/api/v1/blocklist/${blockedSite._id}/toggle`)
        .expect(200);

      expect(res2.body.data.isActive).toBe(true);
    });
  });

  describe('POST /api/v1/blocklist/bulk', () => {
    it('should reject missing sites array', async () => {
      const res = await request(app)
        .post('/api/v1/blocklist/bulk')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Sites array is required');
    });

    it('should bulk import sites as strings', async () => {
      const res = await request(app)
        .post('/api/v1/blocklist/bulk')
        .send({
          sites: ['site1.com', 'site2.com', 'site3.com'],
          category: 'adult'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.message).toBe('3 sites added to blocklist');
    });

    it('should bulk import sites as objects', async () => {
      const res = await request(app)
        .post('/api/v1/blocklist/bulk')
        .send({
          sites: [
            { pattern: 'obj1.com', category: 'gambling' },
            { pattern: 'obj2.com', category: 'adult' }
          ]
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should bulk import with scope', async () => {
      const center = await createTestCenter();

      const res = await request(app)
        .post('/api/v1/blocklist/bulk')
        .send({
          sites: ['scoped1.com', 'scoped2.com'],
          scope: 'center',
          scopeId: center._id.toString()
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].scope).toBe('center');
    });
  });

  describe('GET /api/v1/blocklist/stats/summary', () => {
    it('should return empty stats when no blocked sites', async () => {
      const res = await request(app)
        .get('/api/v1/blocklist/stats/summary')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total).toBe(0);
    });

    it('should return correct stats', async () => {
      const admin = await createTestAdmin();
      await createTestBlockedSite(admin, { scope: 'global', isActive: true, category: 'adult' });
      await createTestBlockedSite(admin, { scope: 'global', isActive: true, category: 'adult', pattern: 'site2.com' });
      await createTestBlockedSite(admin, { scope: 'center', isActive: true, category: 'gambling', pattern: 'site3.com' });
      await createTestBlockedSite(admin, { scope: 'student', isActive: false, category: 'social_media', pattern: 'site4.com' });

      const res = await request(app)
        .get('/api/v1/blocklist/stats/summary')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total).toBe(4);
      expect(res.body.data.summary.active).toBe(3);
      expect(res.body.data.summary.global).toBe(2);
      expect(res.body.data.summary.center).toBe(1);
      expect(res.body.data.summary.student).toBe(1);
      expect(res.body.data.byCategory).toBeDefined();
    });
  });
});
