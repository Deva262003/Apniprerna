const request = require('supertest');
const createApp = require('../../src/app');
const { AdminCommand } = require('../../src/models');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Parents Routes (Admin)', () => {
  describe('POST /api/v1/parents', () => {
    it('should create numeric parent ID (8 digits) and return temp password', async () => {
      const admin = await createTestAdmin({ role: 'super_admin' });
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const res = await request(app)
        .post('/api/v1/parents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Parent One',
          parentIdType: 'numeric',
          students: [student._id]
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tempPassword).toBeDefined();
      expect(res.body.data.parent.parentId).toMatch(/^\d{8}$/);
      expect(res.body.data.parent.mustChangePassword).toBe(true);
      expect(res.body.data.parent.students.length).toBe(1);
    });

    it('should accept explicit alphanumeric parentId case-insensitively and store uppercase', async () => {
      const admin = await createTestAdmin({ role: 'super_admin' });
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const res = await request(app)
        .post('/api/v1/parents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Parent Two',
          parentIdType: 'alphanumeric',
          parentId: 'ab12cd34',
          students: [student._id]
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.parent.parentId).toBe('AB12CD34');
    });

    it('should reject pod_admin creating parents for other center', async () => {
      const center1 = await createTestCenter({ code: 'P001' });
      const center2 = await createTestCenter({ code: 'P002' });
      const podAdmin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(podAdmin);
      const studentOther = await createTestStudent(center2);

      const res = await request(app)
        .post('/api/v1/parents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Parent Three',
          parentIdType: 'numeric',
          students: [studentOther._id]
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/parents/:id/reset-password', () => {
    it('should reset parent password and return new temp password', async () => {
      const admin = await createTestAdmin({ role: 'super_admin' });
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      const createRes = await request(app)
        .post('/api/v1/parents')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Parent Four', parentIdType: 'numeric', students: [student._id] })
        .expect(201);

      const parentId = createRes.body.data.parent._id;

      const resetRes = await request(app)
        .post(`/api/v1/parents/${parentId}/reset-password`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.data.tempPassword).toBeDefined();
    });

    it('should return 400 for invalid parent id format', async () => {
      const admin = await createTestAdmin({ role: 'super_admin' });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/parents/not-a-mongo-id/reset-password')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.errors)).toBe(true);
    });
  });

  describe('RBAC: /api/v1/admin/commands', () => {
    it('should reject viewer from creating FORCE_LOGOUT command', async () => {
      const admin = await createTestAdmin({ role: 'viewer' });
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);

      await request(app)
        .post('/api/v1/admin/commands')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'FORCE_LOGOUT', targetType: 'student', targetId: student._id })
        .expect(403);
    });
  });
});
