const request = require('supertest');
const createApp = require('../../src/app');
const { AdminCommand } = require('../../src/models');
const {
  createTestCenter,
  createTestStudent,
  createTestActivity,
  createTestParent,
  generateParentToken
} = require('../helpers');

const app = createApp();

describe('Parent Routes (Parent Portal)', () => {
  it('should require password change before accessing student data', async () => {
    const center = await createTestCenter();
    const student = await createTestStudent(center);
    const parent = await createTestParent(center, [student], { mustChangePassword: true, passwordHash: 'TempPass123' });
    const token = generateParentToken(parent);

    await request(app)
      .get('/api/v1/parent/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const blocked = await request(app)
      .get('/api/v1/parent/students')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(blocked.body.message).toBe('Password change required');
  });

  it('should allow parent to change password, then view linked student stats/activity and force logout', async () => {
    const center = await createTestCenter();
    const student = await createTestStudent(center);
    const parent = await createTestParent(center, [student], { mustChangePassword: true, passwordHash: 'TempPass123' });
    const token = generateParentToken(parent);

    await request(app)
      .post('/api/v1/parent/me/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'TempPass123', newPassword: 'NewPass123' })
      .expect(200);

    const studentsRes = await request(app)
      .get('/api/v1/parent/students')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(studentsRes.body.success).toBe(true);
    expect(studentsRes.body.data.length).toBe(1);
    expect(studentsRes.body.data[0]._id.toString()).toBe(student._id.toString());

    await createTestActivity(student, center, { domain: 'example.com', durationSeconds: 30 });

    const statsRes = await request(app)
      .get(`/api/v1/parent/students/${student._id}/stats`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.data.totalActivity).toBeDefined();

    const activityRes = await request(app)
      .get(`/api/v1/parent/students/${student._id}/activity?limit=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(activityRes.body.success).toBe(true);
    expect(activityRes.body.data.length).toBeGreaterThan(0);

    const logoutRes = await request(app)
      .post(`/api/v1/parent/students/${student._id}/force-logout`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(logoutRes.body.success).toBe(true);

    const commands = await AdminCommand.find({ student: student._id });
    expect(commands.length).toBe(1);
    expect(commands[0].createdByParent.toString()).toBe(parent._id.toString());
  });

  it('should return 400 for invalid student id format on force logout', async () => {
    const center = await createTestCenter();
    const student = await createTestStudent(center);
    const parent = await createTestParent(center, [student], { mustChangePassword: false, passwordHash: 'TempPass123' });
    const token = generateParentToken(parent);

    const res = await request(app)
      .post('/api/v1/parent/students/not-a-mongo-id/force-logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('should allow parent auth login using alphanumeric parentId case-insensitively', async () => {
    const center = await createTestCenter();
    const student = await createTestStudent(center);
    await createTestParent(center, [student], {
      parentIdType: 'alphanumeric',
      parentId: 'ab12cd34',
      passwordHash: 'TempPass123',
      mustChangePassword: true
    });

    const res = await request(app)
      .post('/api/v1/auth/parent/login')
      .send({ parentId: 'ab12cd34', password: 'TempPass123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.parent.parentId).toBe('AB12CD34');
    expect(res.body.data.token).toBeDefined();
  });
});
