const request = require('supertest');
const createApp = require('../../src/app');
const { Student, Center, Activity } = require('../../src/models');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  createTestActivity,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Students Routes', () => {
  describe('GET /api/v1/students', () => {
    it('should return empty array when no students', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return all students with pagination', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '111111' });
      await createTestStudent(center, { studentId: '222222' });

      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by center', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      await createTestStudent(center1, { studentId: '111111' });
      await createTestStudent(center2, { studentId: '222222' });

      const res = await request(app)
        .get(`/api/v1/students?center=${center1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].studentId).toBe('111111');
    });

    it('should filter by search term', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '111111', name: 'John Doe' });
      await createTestStudent(center, { studentId: '222222', name: 'Jane Smith' });

      const res = await request(app)
        .get('/api/v1/students?search=John')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('John Doe');
    });

    it('should filter by isActive', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '111111', isActive: true });
      await createTestStudent(center, { studentId: '222222', isActive: false });

      const res = await request(app)
        .get('/api/v1/students?isActive=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isActive).toBe(true);
    });

    it('should only return center students for pod_admin', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(admin);
      await createTestStudent(center1, { studentId: '111111' });
      await createTestStudent(center2, { studentId: '222222' });

      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].studentId).toBe('111111');
    });
  });

  describe('GET /api/v1/students/:id', () => {
    it('should return 404 for non-existent student', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/students/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Student not found');
    });

    it('should return student details', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center, { studentId: '654321' });

      const res = await request(app)
        .get(`/api/v1/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.studentId).toBe('654321');
      expect(res.body.data.pinHash).toBeUndefined();
    });

    it('should reject pod_admin accessing other center student', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(admin);
      const student = await createTestStudent(center2);

      const res = await request(app)
        .get(`/api/v1/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/students', () => {
    it('should reject invalid studentId format', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: '12345',
          pin: '1234',
          name: 'Test',
          center: center._id
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid PIN format', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: '123456',
          pin: '12',
          name: 'Test',
          center: center._id
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate studentId', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '777777' });

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: '777777',
          pin: '1234',
          name: 'Another',
          center: center._id
        })
        .expect(400);

      expect(res.body.message).toBe('Student ID already exists');
    });

    it('should reject non-existent center', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: '654321',
          pin: '1234',
          name: 'Test',
          center: '507f1f77bcf86cd799439011'
        })
        .expect(400);

      expect(res.body.message).toBe('Center not found');
    });

    it('should reject viewer role', async () => {
      const admin = await createTestAdmin({ role: 'viewer' });
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: '654321',
          pin: '1234',
          name: 'Test',
          center: center._id
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should create student successfully', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: '654321',
          pin: '1234',
          name: 'New Student',
          center: center._id,
          email: 'student@test.com',
          phone: '+91 9876543210',
          grade: '10',
          section: 'A'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.studentId).toBe('654321');
      expect(res.body.data.name).toBe('New Student');
    });

    it('should reject pod_admin adding to other center', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: '654321',
          pin: '1234',
          name: 'Test',
          center: center2._id.toString()
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/students/:id', () => {
    it('should return 404 for non-existent student', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .put('/api/v1/students/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should update student fields', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const res = await request(app)
        .put(`/api/v1/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          email: 'new@email.com',
          isActive: false
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.email).toBe('new@email.com');
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('POST /api/v1/students/:id/reset-pin', () => {
    it('should return 404 for non-existent student', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/students/507f1f77bcf86cd799439011/reset-pin')
        .set('Authorization', `Bearer ${token}`)
        .send({ pin: '5678' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid PIN format', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const res = await request(app)
        .post(`/api/v1/students/${student._id}/reset-pin`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pin: '12' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reset PIN successfully', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const res = await request(app)
        .post(`/api/v1/students/${student._id}/reset-pin`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pin: '5678' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('PIN reset successfully');
    });
  });

  describe('DELETE /api/v1/students/:id', () => {
    it('should return 404 for non-existent student', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .delete('/api/v1/students/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should delete student', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const res = await request(app)
        .delete(`/api/v1/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Student deleted');
    });
  });

  describe('GET /api/v1/students/:id/stats', () => {
    it('should return 404 for non-existent student', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/students/507f1f77bcf86cd799439011/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return student stats', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center);
      await createTestActivity(student, center, { wasBlocked: true, blockCategory: 'adult' });

      const res = await request(app)
        .get(`/api/v1/students/${student._id}/stats`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.todayActivity).toBe(2);
      expect(res.body.data.todayBlocked).toBe(1);
      expect(res.body.data.topDomains).toBeDefined();
      expect(res.body.data.topBlockedCategories).toBeDefined();
    });

    it('should apply custom date range in student stats', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center, { studentId: '787878' });

      await createTestActivity(student, center, {
        domain: 'old.com',
        visitTime: new Date('2025-01-10T10:00:00.000Z')
      });
      await createTestActivity(student, center, {
        domain: 'new.com',
        visitTime: new Date('2025-01-20T10:00:00.000Z')
      });

      const res = await request(app)
        .get(`/api/v1/students/${student._id}/stats?startDate=2025-01-15&endDate=2025-01-31`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.todayActivity).toBe(1);
      expect(res.body.data.topDomains[0]._id).toBe('new.com');
    });
  });

  describe('GET /api/v1/students/:id/activity', () => {
    it('should return student activity with pagination', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center);
      await createTestActivity(student, center, { url: 'https://other.com' });

      const res = await request(app)
        .get(`/api/v1/students/${student._id}/activity`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by date range', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestActivity(student, center, { visitTime: today });
      await createTestActivity(student, center, { visitTime: yesterday });

      const res = await request(app)
        .get(`/api/v1/students/${student._id}/activity?startDate=${today.toISOString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });
});
