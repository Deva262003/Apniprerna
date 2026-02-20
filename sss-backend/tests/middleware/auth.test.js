const request = require('supertest');
const createApp = require('../../src/app');
const { Admin, Student, Center, Session } = require('../../src/models');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  createTestSession,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Auth Middleware', () => {
  describe('protectAdmin', () => {
    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/v1/centers')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized, no token');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized, token invalid');
    });

    it('should reject request with token for non-existent admin', async () => {
      const fakeToken = require('jsonwebtoken').sign(
        { id: '507f1f77bcf86cd799439011', role: 'super_admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin not found');
    });

    it('should reject request with token for deactivated admin', async () => {
      const admin = await createTestAdmin({ isActive: false });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Account is deactivated');
    });

    it('should allow request with valid token', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('protectStudent', () => {
    it('should reject request without session token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/student/session')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized, no session token');
    });

    it('should reject request with invalid session token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/student/session')
        .set('x-session-token', 'invalid-session-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Session expired or invalid');
    });

    it('should reject request with expired session', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student, {
        expiresAt: new Date(Date.now() - 1000)
      });

      const res = await request(app)
        .get('/api/v1/auth/student/session')
        .set('x-session-token', sessionToken)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Session expired or invalid');
    });

    it('should reject request with revoked session', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student, {
        status: 'revoked'
      });

      const res = await request(app)
        .get('/api/v1/auth/student/session')
        .set('x-session-token', sessionToken)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Session expired or invalid');
    });

    it('should reject request for deactivated student', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center, { isActive: false });
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .get('/api/v1/auth/student/session')
        .set('x-session-token', sessionToken)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Student account is deactivated');
    });

    it('should allow request with valid session token', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .get('/api/v1/auth/student/session')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
    });
  });

  describe('authorize', () => {
    it('should reject request without admin on req', async () => {
      // This is tested indirectly through routes that use authorize
      const admin = await createTestAdmin({ role: 'viewer' });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', code: 'TEST' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized');
    });

    it('should allow super_admin to access protected routes', async () => {
      const admin = await createTestAdmin({ role: 'super_admin' });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/centers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Center', code: 'NC001' })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe('centerAccess', () => {
    it('should allow super_admin to access any center', async () => {
      const admin = await createTestAdmin({ role: 'super_admin' });
      const token = generateAdminToken(admin);
      const center = await createTestCenter();

      const res = await request(app)
        .get(`/api/v1/centers/${center._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow pod_admin to access their own center', async () => {
      const center = await createTestCenter();
      const admin = await createTestAdmin({
        role: 'pod_admin',
        center: center._id
      });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get(`/api/v1/centers/${center._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject pod_admin accessing other center', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({
        role: 'pod_admin',
        center: center1._id
      });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get(`/api/v1/centers/${center2._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not authorized');
    });
  });
});
