const request = require('supertest');
const createApp = require('../../src/app');
const {
  createTestAdmin,
  createTestCenter,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Policies Routes', () => {
  it('should create a center-scoped policy', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);
    const center = await createTestCenter();

    const res = await request(app)
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Center Blocklist',
        policyType: 'blocklist',
        scope: 'center',
        center: center._id,
        rules: {
          blockedDomains: ['example.com']
        },
        priority: 2
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.scope).toBe('center');
    expect(res.body.data.center._id.toString()).toBe(center._id.toString());
  });

  it('should list policies for admin', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);
    const center = await createTestCenter();

    await request(app)
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Global Allowlist',
        policyType: 'allowlist',
        scope: 'global',
        rules: {
          allowedDomains: ['khanacademy.org']
        },
        priority: 1
      })
      .expect(201);

    await request(app)
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Center Blocklist',
        policyType: 'blocklist',
        scope: 'center',
        center: center._id,
        rules: {
          blockedDomains: ['example.com']
        },
        priority: 2
      })
      .expect(201);

    const res = await request(app)
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it('should toggle policy active state', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);

    const createRes = await request(app)
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Time Restrictions',
        policyType: 'time_restriction',
        scope: 'global',
        rules: {
          allowedDays: ['monday', 'tuesday']
        },
        priority: 1
      })
      .expect(201);

    const policyId = createRes.body.data._id;

    const toggleRes = await request(app)
      .patch(`/api/v1/policies/${policyId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(toggleRes.body.success).toBe(true);
    expect(toggleRes.body.data.isActive).toBe(false);
  });
});
