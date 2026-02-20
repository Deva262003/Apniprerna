const mongoose = require('mongoose');
const { Admin, Student, Center, Session, Activity, BlockedSite, Policy } = require('../../src/models');

describe('Models', () => {
  describe('Admin Model', () => {
    it('should require email', async () => {
      const admin = new Admin({
        passwordHash: 'password123',
        name: 'Test Admin'
      });

      let error;
      try {
        await admin.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.email).toBeDefined();
    });

    it('should require password', async () => {
      const admin = new Admin({
        email: 'test@example.com',
        name: 'Test Admin'
      });

      let error;
      try {
        await admin.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.passwordHash).toBeDefined();
    });

    it('should require name', async () => {
      const admin = new Admin({
        email: 'test@example.com',
        passwordHash: 'password123'
      });

      let error;
      try {
        await admin.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.name).toBeDefined();
    });

    it('should hash password on save', async () => {
      const admin = new Admin({
        email: 'hash@test.com',
        passwordHash: 'plainpassword',
        name: 'Hash Test'
      });

      await admin.save();
      expect(admin.passwordHash).not.toBe('plainpassword');
      expect(admin.passwordHash.startsWith('$2')).toBe(true);
    });

    it('should not rehash password if not modified', async () => {
      const admin = new Admin({
        email: 'nohash@test.com',
        passwordHash: 'password123',
        name: 'No Hash Test'
      });

      await admin.save();
      const originalHash = admin.passwordHash;

      admin.name = 'Updated Name';
      await admin.save();

      expect(admin.passwordHash).toBe(originalHash);
    });

    it('should compare password correctly', async () => {
      const admin = new Admin({
        email: 'compare@test.com',
        passwordHash: 'mypassword',
        name: 'Compare Test'
      });

      await admin.save();

      const isMatch = await admin.comparePassword('mypassword');
      expect(isMatch).toBe(true);

      const isNotMatch = await admin.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should default role to viewer', async () => {
      const admin = new Admin({
        email: 'role@test.com',
        passwordHash: 'password123',
        name: 'Role Test'
      });

      await admin.save();
      expect(admin.role).toBe('viewer');
    });

    it('should default isActive to true', async () => {
      const admin = new Admin({
        email: 'active@test.com',
        passwordHash: 'password123',
        name: 'Active Test'
      });

      await admin.save();
      expect(admin.isActive).toBe(true);
    });

    it('should validate role enum', async () => {
      const admin = new Admin({
        email: 'roleEnum@test.com',
        passwordHash: 'password123',
        name: 'Role Enum Test',
        role: 'invalid_role'
      });

      let error;
      try {
        await admin.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.role).toBeDefined();
    });
  });

  describe('Student Model', () => {
    let center;

    beforeEach(async () => {
      center = await Center.create({
        name: 'Test Center',
        code: `ST${Date.now()}`
      });
    });

    it('should require studentId', async () => {
      const student = new Student({
        pinHash: '1234',
        name: 'Test Student',
        center: center._id
      });

      let error;
      try {
        await student.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.studentId).toBeDefined();
    });

    it('should require PIN', async () => {
      const student = new Student({
        studentId: '123456',
        name: 'Test Student',
        center: center._id
      });

      let error;
      try {
        await student.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.pinHash).toBeDefined();
    });

    it('should require name', async () => {
      const student = new Student({
        studentId: '123456',
        pinHash: '1234',
        center: center._id
      });

      let error;
      try {
        await student.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.name).toBeDefined();
    });

    it('should require center', async () => {
      const student = new Student({
        studentId: '123456',
        pinHash: '1234',
        name: 'Test Student'
      });

      let error;
      try {
        await student.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.center).toBeDefined();
    });

    it('should validate studentId format (6-8 digits)', async () => {
      const student = new Student({
        studentId: '123',
        pinHash: '1234',
        name: 'Test Student',
        center: center._id
      });

      let error;
      try {
        await student.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.studentId).toBeDefined();
      expect(error.errors.studentId.message).toBe('Student ID must be 6-8 digits');
    });

    it('should accept valid 6-digit studentId', async () => {
      const student = new Student({
        studentId: '123456',
        pinHash: '1234',
        name: 'Test Student',
        center: center._id
      });

      await student.validate();
    });

    it('should accept valid 8-digit studentId', async () => {
      const student = new Student({
        studentId: '12345678',
        pinHash: '1234',
        name: 'Test Student',
        center: center._id
      });

      await student.validate();
    });

    it('should hash PIN on save', async () => {
      const student = new Student({
        studentId: `${Date.now()}`.slice(-6),
        pinHash: '1234',
        name: 'Hash PIN Test',
        center: center._id
      });

      await student.save();
      expect(student.pinHash).not.toBe('1234');
      expect(student.pinHash.startsWith('$2')).toBe(true);
    });

    it('should compare PIN correctly', async () => {
      const student = new Student({
        studentId: `${Date.now()}`.slice(-6),
        pinHash: '5678',
        name: 'Compare PIN Test',
        center: center._id
      });

      await student.save();

      const isMatch = await student.comparePin('5678');
      expect(isMatch).toBe(true);

      const isNotMatch = await student.comparePin('0000');
      expect(isNotMatch).toBe(false);
    });

    it('should default isActive to true', async () => {
      const student = new Student({
        studentId: `${Date.now()}`.slice(-6),
        pinHash: '1234',
        name: 'Active Test',
        center: center._id
      });

      await student.save();
      expect(student.isActive).toBe(true);
    });
  });

  describe('Center Model', () => {
    it('should require name', async () => {
      const center = new Center({
        code: 'TEST01'
      });

      let error;
      try {
        await center.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.name).toBeDefined();
    });

    it('should require code', async () => {
      const center = new Center({
        name: 'Test Center'
      });

      let error;
      try {
        await center.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.code).toBeDefined();
    });

    it('should uppercase code on save', async () => {
      const center = new Center({
        name: 'Test Center',
        code: 'lowercase'
      });

      await center.save();
      expect(center.code).toBe('LOWERCASE');
    });

    it('should default isActive to true', async () => {
      const center = new Center({
        name: 'Active Test',
        code: `ACT${Date.now()}`
      });

      await center.save();
      expect(center.isActive).toBe(true);
    });

    it('should default timezone to Asia/Kolkata', async () => {
      const center = new Center({
        name: 'Timezone Test',
        code: `TZ${Date.now()}`
      });

      await center.save();
      expect(center.timezone).toBe('Asia/Kolkata');
    });

    it('should have virtual studentCount', async () => {
      const center = new Center({
        name: 'Virtual Test',
        code: `VT${Date.now()}`
      });

      await center.save();

      // Create students for this center
      await Student.create({
        studentId: `${Date.now()}`.slice(-6),
        pinHash: '1234',
        name: 'Student 1',
        center: center._id
      });

      await Student.create({
        studentId: `${Date.now() + 1}`.slice(-6),
        pinHash: '1234',
        name: 'Student 2',
        center: center._id
      });

      // Populate virtual
      const centerWithCount = await Center.findById(center._id).populate('studentCount');
      expect(centerWithCount.studentCount).toBe(2);
    });
  });

  describe('Session Model', () => {
    let student;
    let center;

    beforeEach(async () => {
      center = await Center.create({
        name: 'Session Center',
        code: `SC${Date.now()}`
      });

      student = await Student.create({
        studentId: `${Date.now()}`.slice(-6),
        pinHash: '1234',
        name: 'Session Student',
        center: center._id
      });
    });

    it('should require student', async () => {
      const session = new Session({
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      });

      let error;
      try {
        await session.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.student).toBeDefined();
    });

    it('should require sessionToken', async () => {
      const session = new Session({
        student: student._id,
        expiresAt: new Date(Date.now() + 3600000)
      });

      let error;
      try {
        await session.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.sessionToken).toBeDefined();
    });

    it('should require expiresAt', async () => {
      const session = new Session({
        student: student._id,
        sessionToken: 'token123'
      });

      let error;
      try {
        await session.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.expiresAt).toBeDefined();
    });

    it('should default status to active', async () => {
      const session = new Session({
        student: student._id,
        sessionToken: `tok_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000)
      });

      await session.save();
      expect(session.status).toBe('active');
    });

    it('should validate status enum', async () => {
      const session = new Session({
        student: student._id,
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000),
        status: 'invalid_status'
      });

      let error;
      try {
        await session.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.status).toBeDefined();
    });

    it('should generate unique token with generateToken static', () => {
      const token1 = Session.generateToken();
      const token2 = Session.generateToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(token1).not.toBe(token2);
    });
  });

  describe('Activity Model', () => {
    let student;
    let center;

    beforeEach(async () => {
      center = await Center.create({
        name: 'Activity Center',
        code: `AC${Date.now()}`
      });

      student = await Student.create({
        studentId: `${Date.now()}`.slice(-6),
        pinHash: '1234',
        name: 'Activity Student',
        center: center._id
      });
    });

    it('should require student', async () => {
      const activity = new Activity({
        center: center._id,
        url: 'https://example.com',
        domain: 'example.com',
        visitTime: new Date()
      });

      let error;
      try {
        await activity.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.student).toBeDefined();
    });

    it('should require center', async () => {
      const activity = new Activity({
        student: student._id,
        url: 'https://example.com',
        domain: 'example.com',
        visitTime: new Date()
      });

      let error;
      try {
        await activity.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.center).toBeDefined();
    });

    it('should require url', async () => {
      const activity = new Activity({
        student: student._id,
        center: center._id,
        domain: 'example.com',
        visitTime: new Date()
      });

      let error;
      try {
        await activity.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.url).toBeDefined();
    });

    it('should require domain', async () => {
      const activity = new Activity({
        student: student._id,
        center: center._id,
        url: 'https://example.com',
        visitTime: new Date()
      });

      let error;
      try {
        await activity.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.domain).toBeDefined();
    });

    it('should require visitTime', async () => {
      const activity = new Activity({
        student: student._id,
        center: center._id,
        url: 'https://example.com',
        domain: 'example.com'
      });

      let error;
      try {
        await activity.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.visitTime).toBeDefined();
    });

    it('should default wasBlocked to false', async () => {
      const activity = new Activity({
        student: student._id,
        center: center._id,
        url: 'https://example.com',
        domain: 'example.com',
        visitTime: new Date()
      });

      await activity.save();
      expect(activity.wasBlocked).toBe(false);
    });

    it('should default durationSeconds to 0', async () => {
      const activity = new Activity({
        student: student._id,
        center: center._id,
        url: 'https://example.com',
        domain: 'example.com',
        visitTime: new Date()
      });

      await activity.save();
      expect(activity.durationSeconds).toBe(0);
    });

    it('should default title to empty string', async () => {
      const activity = new Activity({
        student: student._id,
        center: center._id,
        url: 'https://example.com',
        domain: 'example.com',
        visitTime: new Date()
      });

      await activity.save();
      expect(activity.title).toBe('');
    });
  });

  describe('BlockedSite Model', () => {
    it('should require pattern', async () => {
      const blockedSite = new BlockedSite({});

      let error;
      try {
        await blockedSite.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.pattern).toBeDefined();
    });

    it('should default patternType to domain', async () => {
      const blockedSite = new BlockedSite({
        pattern: 'example.com'
      });

      await blockedSite.save();
      expect(blockedSite.patternType).toBe('domain');
    });

    it('should default category to custom', async () => {
      const blockedSite = new BlockedSite({
        pattern: 'example.com'
      });

      await blockedSite.save();
      expect(blockedSite.category).toBe('custom');
    });

    it('should default scope to global', async () => {
      const blockedSite = new BlockedSite({
        pattern: 'example.com'
      });

      await blockedSite.save();
      expect(blockedSite.scope).toBe('global');
    });

    it('should default isActive to true', async () => {
      const blockedSite = new BlockedSite({
        pattern: 'example.com'
      });

      await blockedSite.save();
      expect(blockedSite.isActive).toBe(true);
    });

    it('should validate patternType enum', async () => {
      const blockedSite = new BlockedSite({
        pattern: 'example.com',
        patternType: 'invalid'
      });

      let error;
      try {
        await blockedSite.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.patternType).toBeDefined();
    });

    it('should validate category enum', async () => {
      const blockedSite = new BlockedSite({
        pattern: 'example.com',
        category: 'invalid_category'
      });

      let error;
      try {
        await blockedSite.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.category).toBeDefined();
    });

    it('should validate scope enum', async () => {
      const blockedSite = new BlockedSite({
        pattern: 'example.com',
        scope: 'invalid_scope'
      });

      let error;
      try {
        await blockedSite.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.scope).toBeDefined();
    });
  });

  describe('Policy Model', () => {
    it('should require name', async () => {
      const policy = new Policy({
        policyType: 'blocklist',
        scope: 'global',
        rules: { blockedDomains: ['example.com'] }
      });

      let error;
      try {
        await policy.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.name).toBeDefined();
    });

    it('should require policyType', async () => {
      const policy = new Policy({
        name: 'Test Policy',
        scope: 'global',
        rules: { blockedDomains: ['example.com'] }
      });

      let error;
      try {
        await policy.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.policyType).toBeDefined();
    });

    it('should require scope', async () => {
      const policy = new Policy({
        name: 'Test Policy',
        policyType: 'blocklist',
        rules: { blockedDomains: ['example.com'] }
      });

      let error;
      try {
        await policy.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.scope).toBeDefined();
    });

    it('should require rules', async () => {
      const policy = new Policy({
        name: 'Test Policy',
        policyType: 'blocklist',
        scope: 'global'
      });

      let error;
      try {
        await policy.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.rules).toBeDefined();
    });

    it('should default priority to 0', async () => {
      const policy = new Policy({
        name: 'Test Policy',
        policyType: 'blocklist',
        scope: 'global',
        rules: { blockedDomains: ['example.com'] }
      });

      await policy.save();
      expect(policy.priority).toBe(0);
    });

    it('should default isActive to true', async () => {
      const policy = new Policy({
        name: 'Test Policy',
        policyType: 'blocklist',
        scope: 'global',
        rules: { blockedDomains: ['example.com'] }
      });

      await policy.save();
      expect(policy.isActive).toBe(true);
    });

    it('should validate policyType enum', async () => {
      const policy = new Policy({
        name: 'Test Policy',
        policyType: 'invalid_type',
        scope: 'global',
        rules: {}
      });

      let error;
      try {
        await policy.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.policyType).toBeDefined();
    });

    it('should validate scope enum', async () => {
      const policy = new Policy({
        name: 'Test Policy',
        policyType: 'blocklist',
        scope: 'invalid_scope',
        rules: {}
      });

      let error;
      try {
        await policy.validate();
      } catch (e) {
        error = e;
      }

      expect(error.errors.scope).toBeDefined();
    });

    it('should accept mixed rules schema', async () => {
      const policy = new Policy({
        name: 'Complex Policy',
        policyType: 'blocklist',
        scope: 'global',
        rules: {
          blockedCategories: ['adult', 'gambling'],
          blockedDomains: ['facebook.com'],
          blockedPatterns: ['*game*'],
          customField: true
        }
      });

      await policy.save();
      expect(policy.rules.blockedCategories).toContain('adult');
      expect(policy.rules.customField).toBe(true);
    });
  });
});
