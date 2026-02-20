const request = require('supertest');
const createApp = require('../../src/app');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Admin Commands Routes', () => {
  it('should create a command for a student', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);
    const center = await createTestCenter();
    const student = await createTestStudent(center);

    const res = await request(app)
      .post('/api/v1/admin/commands')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'FORCE_LOGOUT',
        targetType: 'student',
        targetId: student._id
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
  });

  it('should return command history', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);
    const center = await createTestCenter();
    const student = await createTestStudent(center);

    await request(app)
      .post('/api/v1/admin/commands')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'SYNC_BLOCKLIST',
        targetType: 'student',
        targetId: student._id
      })
      .expect(201);

    const res = await request(app)
      .get('/api/v1/admin/commands')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('SYNC_BLOCKLIST');
  });

  it('should return single command', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);
    const center = await createTestCenter();
    const student = await createTestStudent(center);

    const createRes = await request(app)
      .post('/api/v1/admin/commands')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'FORCE_LOGOUT',
        targetType: 'student',
        targetId: student._id
      })
      .expect(201);

    const historyRes = await request(app)
      .get('/api/v1/admin/commands')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const commandId = historyRes.body.data[0]._id;

    const res = await request(app)
      .get(`/api/v1/admin/commands/${commandId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id.toString()).toBe(commandId.toString());
  });

  it('should reject viewer from executing a command', async () => {
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);
    const center = await createTestCenter();
    const student = await createTestStudent(center);

    await request(app)
      .post('/api/v1/admin/commands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'FORCE_LOGOUT',
        targetType: 'student',
        targetId: student._id
      })
      .expect(201);

    const historyRes = await request(app)
      .get('/api/v1/admin/commands')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const commandId = historyRes.body.data[0]._id;

    const viewer = await createTestAdmin({ role: 'viewer' });
    const viewerToken = generateAdminToken(viewer);

    await request(app)
      .post(`/api/v1/admin/commands/${commandId}/execute`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });
});
