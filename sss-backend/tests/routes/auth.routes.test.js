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

describe('Auth Routes', () => {
  describe('POST /api/v1/auth/student/login', () => {
    it('should reject invalid studentId format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '123', pin: '1234' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject invalid PIN format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '123456', pin: '12' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject non-existent student', async () => {
      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '999999', pin: '1234' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject deactivated student', async () => {
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '567890', isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '567890', pin: '1234' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Account is deactivated');
    });

    it('should reject wrong PIN', async () => {
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '123456' });

      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '123456', pin: '9999' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should login student with correct credentials', async () => {
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '234567' });

      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '234567', pin: '1234' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionToken).toBeDefined();
      expect(res.body.data.student.studentId).toBe('234567');
    });

    it('should revoke previous sessions on new login', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center, { studentId: '345678' });

      // First login
      await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '345678', pin: '1234' });

      // Second login
      await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '345678', pin: '1234' });

      // Check that first session is revoked
      const sessions = await Session.find({ student: student._id });
      const activeSessions = sessions.filter(s => s.status === 'active');
      expect(activeSessions.length).toBe(1);
    });

    it('should accept optional deviceId', async () => {
      const center = await createTestCenter();
      await createTestStudent(center, { studentId: '456789' });

      const res = await request(app)
        .post('/api/v1/auth/student/login')
        .send({ studentId: '456789', pin: '1234', deviceId: 'dev_123' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/auth/student/session', () => {
    it('should return valid session info', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center, { studentId: '888888' });
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .get('/api/v1/auth/student/session')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.student.studentId).toBe('888888');
    });
  });

  describe('POST /api/v1/auth/student/logout', () => {
    it('should logout student and revoke session', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { session, sessionToken } = await createTestSession(student);

      const res = await request(app)
        .post('/api/v1/auth/student/logout')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');

      // Verify session is revoked
      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.status).toBe('revoked');
    });
  });

  describe('POST /api/v1/auth/admin/login', () => {
    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'invalid', password: 'password123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'admin@test.com', password: '123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject non-existent admin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'notexist@test.com', password: 'password123' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject deactivated admin', async () => {
      await createTestAdmin({ email: 'deactivated@test.com', isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'deactivated@test.com', password: 'password123' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Account is deactivated');
    });

    it('should reject wrong password', async () => {
      await createTestAdmin({ email: 'wrongpass@test.com' });

      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'wrongpass@test.com', password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should login admin with correct credentials', async () => {
      await createTestAdmin({ email: 'logintest@test.com' });

      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'logintest@test.com', password: 'password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.admin.email).toBe('logintest@test.com');
    });
  });

  describe('GET /api/v1/auth/admin/me', () => {
    it('should return current admin info', async () => {
      const admin = await createTestAdmin({ email: 'metest@test.com' });
      const token = generateAdminToken(admin);

      const res = await request(app)
        .get('/api/v1/auth/admin/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('metest@test.com');
      expect(res.body.data.passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/admin/logout', () => {
    it('should return success on logout', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);

      const res = await request(app)
        .post('/api/v1/auth/admin/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
