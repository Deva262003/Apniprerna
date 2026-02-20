const request = require('supertest');
const createApp = require('../../src/app');
const { Center, Student, Activity } = require('../../src/models');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  createTestActivity,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Centers Routes', () => {
  describe('GET /api/v1/centers', () => {
    it('should return empty array when no centers', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return all centers for super_admin', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      await createTestCenter({ code: 'C001' });
      await createTestCenter({ code: 'C002' });

      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should return only assigned center for pod_admin', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('C001');
    });

    it('should include student counts', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '111111' });
      await createTestStudent(center, { studentId: '222222' });

      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data[0].studentCount).toBe(2);
    });
  });

  describe('GET /api/v1/centers/:id', () => {
    it('should return 404 for non-existent center', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/centers/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Center not found');
    });

    it('should return center details', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .get(`/api/v1/centers/${center._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Center');
      expect(res.body.data.studentCount).toBeDefined();
    });
  });

  describe('POST /api/v1/centers', () => {
    it('should reject missing name', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'TC001' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject missing code', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate code', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      await createTestCenter({ code: 'DUP01' });

      const res = await request(app)
        .post('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Another Center', code: 'DUP01' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Center code already exists');
    });

    it('should reject non-super_admin', async () => {
      const admin = await createTestAdmin({ role: 'viewer' });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Center', code: 'NC001' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should create center with all fields', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Full Center',
          code: 'FC001',
          city: 'Mumbai',
          state: 'Maharashtra',
          address: '123 Main St',
          pincode: '400001',
          contactName: 'John Doe',
          contactPhone: '+91 9876543210',
          contactEmail: 'john@example.com'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Full Center');
      expect(res.body.data.code).toBe('FC001');
    });
  });

  describe('PUT /api/v1/centers/:id', () => {
    it('should return 404 for non-existent center', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .put('/api/v1/centers/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should update center fields', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .put(`/api/v1/centers/${center._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Center',
          city: 'New City',
          isActive: false
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Center');
      expect(res.body.data.city).toBe('New City');
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('DELETE /api/v1/centers/:id', () => {
    it('should return 404 for non-existent center', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .delete('/api/v1/centers/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should reject deleting center with students', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      await createTestStudent(center);

      const res = await request(app)
        .delete(`/api/v1/centers/${center._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot delete center');
    });

    it('should delete center without students', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .delete(`/api/v1/centers/${center._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Center deleted');
    });
  });

  describe('GET /api/v1/centers/:id/stats', () => {
    it('should return 404 for non-existent center', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/centers/507f1f77bcf86cd799439011/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return center stats', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center);
      await createTestActivity(student, center, { wasBlocked: true });

      const res = await request(app)
        .get(`/api/v1/centers/${center._id}/stats`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalStudents).toBe(1);
      expect(res.body.data.todayActivity).toBe(2);
      expect(res.body.data.todayBlocked).toBe(1);
      expect(res.body.data.topDomains).toBeDefined();
    });

    it('should apply date range filters to center stats', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center, { studentId: '919191' });

      const oldDate = new Date('2025-01-05T10:00:00.000Z');
      const inRangeDate = new Date('2025-01-20T10:00:00.000Z');

      await createTestActivity(student, center, { visitTime: oldDate, domain: 'old.com' });
      await createTestActivity(student, center, { visitTime: inRangeDate, domain: 'new.com' });

      const res = await request(app)
        .get(`/api/v1/centers/${center._id}/stats?startDate=2025-01-10&endDate=2025-01-31`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.todayActivity).toBe(1);
      expect(res.body.data.topDomains[0]._id).toBe('new.com');
    });
  });

  describe('GET /api/v1/centers/:id/students', () => {
    it('should return students in center', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '111111' });
      await createTestStudent(center, { studentId: '222222' });

      const res = await request(app)
        .get(`/api/v1/centers/${center._id}/students`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      for (let i = 1; i <= 5; i++) {
        await createTestStudent(center, { studentId: `10000${i}` });
      }

      const res = await request(app)
        .get(`/api/v1/centers/${center._id}/students?page=1&limit=2`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });
  });
});
