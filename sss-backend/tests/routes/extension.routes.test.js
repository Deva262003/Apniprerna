const request = require('supertest');
const createApp = require('../../src/app');
const { BlockedSite, Policy, Session } = require('../../src/models');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  createTestSession,
  createTestBlockedSite
} = require('../helpers');

const app = createApp();

// Helper to create a test policy
const createTestPolicy = async (overrides = {}) => {
  const defaults = {
    name: 'Test Policy',
    policyType: 'blocklist',
    scope: 'global',
    rules: {
      blockedDomains: ['blocked-by-policy.com'],
      blockedPatterns: ['*gambling*']
    },
    priority: 1,
    isActive: true
  };

  const policy = new Policy({ ...defaults, ...overrides });
  await policy.save();
  return policy;
};

describe('Extension Routes', () => {
  describe('GET /api/v1/extension/blocklist', () => {
    it('should reject request without session token', async () => {
      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid session token', async () => {
      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', 'invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return empty rules when no blocked sites', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rules).toEqual([]);
      expect(res.body.data.version).toBeDefined();
    });

    it('should return global blocked sites', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'global-block.com',
        scope: 'global',
        patternType: 'domain'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rules.length).toBe(1);
      expect(res.body.data.rules[0].condition.urlFilter).toBe('||global-block.com');
      expect(res.body.data.rules[0].priority).toBe(51);
    });

    it('should normalize domain patterns containing scheme/path', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'https://www.youtube.com/watch',
        scope: 'global',
        patternType: 'domain'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rules[0].condition.urlFilter).toBe('||youtube.com');
      expect(res.body.data.blockedDomains).toContain('youtube.com');
    });

    it('should return center-scoped blocked sites for student center', async () => {
      const admin = await createTestAdmin();
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const student = await createTestStudent(center1);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'center1-block.com',
        scope: 'center',
        scopeId: center1._id,
        patternType: 'domain'
      });
      await createTestBlockedSite(admin, {
        pattern: 'center2-block.com',
        scope: 'center',
        scopeId: center2._id,
        patternType: 'domain'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rules.length).toBe(1);
      expect(res.body.data.rules[0].condition.urlFilter).toBe('||center1-block.com');
      expect(res.body.data.rules[0].priority).toBe(52);
    });

    it('should return student-scoped blocked sites for specific student', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student1 = await createTestStudent(center, { studentId: '111111' });
      const student2 = await createTestStudent(center, { studentId: '222222' });
      const { sessionToken } = await createTestSession(student1);

      await createTestBlockedSite(admin, {
        pattern: 'student1-block.com',
        scope: 'student',
        scopeId: student1._id,
        patternType: 'domain'
      });
      await createTestBlockedSite(admin, {
        pattern: 'student2-block.com',
        scope: 'student',
        scopeId: student2._id,
        patternType: 'domain'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rules.length).toBe(1);
      expect(res.body.data.rules[0].condition.urlFilter).toBe('||student1-block.com');
      expect(res.body.data.rules[0].priority).toBe(53);
    });

    it('should return combined rules from all scopes', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'global.com',
        scope: 'global',
        patternType: 'domain'
      });
      await createTestBlockedSite(admin, {
        pattern: 'center.com',
        scope: 'center',
        scopeId: center._id,
        patternType: 'domain'
      });
      await createTestBlockedSite(admin, {
        pattern: 'student.com',
        scope: 'student',
        scopeId: student._id,
        patternType: 'domain'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rules.length).toBe(3);
    });

    it('should not return inactive blocked sites', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'active.com',
        isActive: true,
        patternType: 'domain'
      });
      await createTestBlockedSite(admin, {
        pattern: 'inactive.com',
        isActive: false,
        patternType: 'domain'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.data.rules.length).toBe(1);
      expect(res.body.data.blockedDomains).toContain('active.com');
      expect(res.body.data.blockedDomains).not.toContain('inactive.com');
    });

    it('should handle non-domain pattern types', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: '*://*.badsite.com/*',
        patternType: 'regex',
        scope: 'global'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.data.rules[0].condition.regexFilter).toBe('*://*.badsite.com/*');
    });

    it('should use regex catch-all rule for allow-only-listed policies', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestPolicy({
        name: 'Strict Allowlist',
        policyType: 'allowlist',
        scope: 'global',
        rules: {
          allowedDomains: ['wikipedia.org'],
          allowOnlyListed: true
        },
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      const catchAllRule = res.body.data.rules.find((rule) => rule.priority === 1);
      expect(catchAllRule).toBeDefined();
      expect(catchAllRule.condition.regexFilter).toBe('^https?://.+');
      expect(catchAllRule.condition.urlFilter).toBeUndefined();
    });

    it('should include rules from blocklist policies', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestPolicy({
        name: 'Global Blocklist',
        policyType: 'blocklist',
        scope: 'global',
        rules: {
          blockedDomains: ['policy-blocked.com'],
          blockedPatterns: ['*malware*']
        },
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rules.length).toBe(2);
    });

    it('should include center-scoped policies', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestPolicy({
        name: 'Center Blocklist',
        policyType: 'blocklist',
        scope: 'center',
        center: center._id,
        rules: {
          blockedDomains: ['center-policy.com']
        },
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.data.rules.length).toBe(1);
      expect(res.body.data.rules[0].condition.urlFilter).toBe('||center-policy.com');
      expect(res.body.data.rules[0].priority).toBe(52);
    });

    it('should return categories from blocked sites', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'adult.com',
        category: 'adult',
        patternType: 'domain'
      });
      await createTestBlockedSite(admin, {
        pattern: 'gambling.com',
        category: 'gambling',
        patternType: 'domain'
      });

      const res = await request(app)
        .get('/api/v1/extension/blocklist')
        .set('x-session-token', sessionToken)
        .expect(200);

      expect(res.body.data.categories).toContain('adult');
      expect(res.body.data.categories).toContain('gambling');
    });
  });

  describe('POST /api/v1/extension/heartbeat', () => {
    it('should reject request without session token', async () => {
      const res = await request(app)
        .post('/api/v1/extension/heartbeat')
        .send({})
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should accept heartbeat with minimal data', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .post('/api/v1/extension/heartbeat')
        .set('x-session-token', sessionToken)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.commands).toEqual([]);
      expect(res.body.data.serverTime).toBeDefined();
    });

    it('should accept heartbeat with full device info', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .post('/api/v1/extension/heartbeat')
        .set('x-session-token', sessionToken)
        .send({
          deviceId: 'device_123',
          extensionVersion: '1.0.0',
          browserVersion: 'Chrome/120',
          currentUrl: 'https://example.com',
          isActive: true
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should update session with deviceId if not set', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { session, sessionToken } = await createTestSession(student);

      await request(app)
        .post('/api/v1/extension/heartbeat')
        .set('x-session-token', sessionToken)
        .send({ deviceId: 'new_device_456' })
        .expect(200);

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.deviceId).toBe('new_device_456');
    });

    it('should not update deviceId if already set', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { session, sessionToken } = await createTestSession(student);

      // Set initial deviceId
      session.deviceId = 'original_device';
      await session.save();

      await request(app)
        .post('/api/v1/extension/heartbeat')
        .set('x-session-token', sessionToken)
        .send({ deviceId: 'different_device' })
        .expect(200);

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.deviceId).toBe('original_device');
    });
  });

  describe('POST /api/v1/extension/check-url', () => {
    it('should reject request without session token', async () => {
      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .send({ url: 'https://example.com', domain: 'example.com' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return not blocked for allowed domain', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .set('x-session-token', sessionToken)
        .send({ url: 'https://allowed.com', domain: 'allowed.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.blocked).toBe(false);
    });

    it('should return blocked for globally blocked domain', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'blocked.com',
        scope: 'global',
        patternType: 'domain',
        category: 'adult'
      });

      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .set('x-session-token', sessionToken)
        .send({ url: 'https://blocked.com/page', domain: 'blocked.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.blocked).toBe(true);
      expect(res.body.data.category).toBe('adult');
    });

    it('should return blocked for center-scoped blocked domain', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'center-blocked.com',
        scope: 'center',
        scopeId: center._id,
        patternType: 'domain'
      });

      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .set('x-session-token', sessionToken)
        .send({ url: 'https://center-blocked.com', domain: 'center-blocked.com' })
        .expect(200);

      expect(res.body.data.blocked).toBe(true);
    });

    it('should return blocked for student-scoped blocked domain', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'student-blocked.com',
        scope: 'student',
        scopeId: student._id,
        patternType: 'domain'
      });

      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .set('x-session-token', sessionToken)
        .send({ url: 'https://student-blocked.com', domain: 'student-blocked.com' })
        .expect(200);

      expect(res.body.data.blocked).toBe(true);
    });

    it('should not block domain blocked for different center', async () => {
      const admin = await createTestAdmin();
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const student = await createTestStudent(center1);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'other-center.com',
        scope: 'center',
        scopeId: center2._id,
        patternType: 'domain'
      });

      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .set('x-session-token', sessionToken)
        .send({ url: 'https://other-center.com', domain: 'other-center.com' })
        .expect(200);

      // Should NOT be blocked since it's scoped to a different center
      expect(res.body.data.blocked).toBe(false);
    });

    it('should not block inactive blocked site', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'inactive-blocked.com',
        scope: 'global',
        patternType: 'domain',
        isActive: false
      });

      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .set('x-session-token', sessionToken)
        .send({ url: 'https://inactive-blocked.com', domain: 'inactive-blocked.com' })
        .expect(200);

      expect(res.body.data.blocked).toBe(false);
    });

    it('should include reason when blocked', async () => {
      const admin = await createTestAdmin();
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await createTestBlockedSite(admin, {
        pattern: 'gambling-site.com',
        scope: 'global',
        patternType: 'domain',
        category: 'gambling'
      });

      const res = await request(app)
        .post('/api/v1/extension/check-url')
        .set('x-session-token', sessionToken)
        .send({ url: 'https://gambling-site.com', domain: 'gambling-site.com' })
        .expect(200);

      expect(res.body.data.blocked).toBe(true);
      expect(res.body.data.reason).toBe('gambling');
      expect(res.body.data.category).toBe('gambling');
    });
  });
});
