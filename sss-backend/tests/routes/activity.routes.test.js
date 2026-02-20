const request = require('supertest');
const createApp = require('../../src/app');
const { Activity } = require('../../src/models');
const {
  createTestAdmin,
  createTestCenter,
  createTestStudent,
  createTestSession,
  createTestActivity,
  generateAdminToken
} = require('../helpers');

const app = createApp();

describe('Activity Routes', () => {
  describe('POST /api/v1/activity/batch', () => {
    it('should reject request without session token', async () => {
      const res = await request(app)
        .post('/api/v1/activity/batch')
        .send({ entries: [] })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject empty entries array', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .post('/api/v1/activity/batch')
        .set('x-session-token', sessionToken)
        .send({ entries: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject entries without url or visitTime', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .post('/api/v1/activity/batch')
        .set('x-session-token', sessionToken)
        .send({
          entries: [
            { title: 'Test' } // missing url and visitTime
          ]
        })
        .expect(400);

      expect(res.body.message).toBe('No valid entries');
    });

    it('should process valid entries', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      const res = await request(app)
        .post('/api/v1/activity/batch')
        .set('x-session-token', sessionToken)
        .send({
          entries: [
            {
              url: 'https://example.com/page1',
              visitTime: new Date().toISOString(),
              title: 'Page 1',
              durationSeconds: 30
            },
            {
              url: 'https://example.com/page2',
              visitTime: new Date().toISOString(),
              durationSeconds: 60,
              wasBlocked: true,
              blockReason: 'Restricted',
              blockCategory: 'adult'
            }
          ]
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.received).toBe(2);
      expect(res.body.data.processed).toBe(2);

      // Verify activities were saved
      const activities = await Activity.find({ student: student._id });
      expect(activities.length).toBe(2);
    });

    it('should extract domain from URL', async () => {
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      const { sessionToken } = await createTestSession(student);

      await request(app)
        .post('/api/v1/activity/batch')
        .set('x-session-token', sessionToken)
        .send({
          entries: [
            {
              url: 'https://www.google.com/search?q=test',
              visitTime: new Date().toISOString()
            }
          ]
        })
        .expect(200);

      const activity = await Activity.findOne({ student: student._id });
      expect(activity.domain).toBe('www.google.com');
    });
  });

  describe('GET /api/v1/activity', () => {
    it('should require admin authentication', async () => {
      const res = await request(app)
        .get('/api/v1/activity')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return activities with pagination', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center);
      await createTestActivity(student, center, { url: 'https://other.com' });

      const res = await request(app)
        .get('/api/v1/activity')
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
      const student1 = await createTestStudent(center1, { studentId: '111111' });
      const student2 = await createTestStudent(center2, { studentId: '222222' });
      await createTestActivity(student1, center1);
      await createTestActivity(student2, center2);

      const res = await request(app)
        .get(`/api/v1/activity?center=${center1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });

    it('should filter by student', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student1 = await createTestStudent(center, { studentId: '111111' });
      const student2 = await createTestStudent(center, { studentId: '222222' });
      await createTestActivity(student1, center);
      await createTestActivity(student2, center);

      const res = await request(app)
        .get(`/api/v1/activity?student=${student1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });

    it('should filter by multiple centers and students', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center1 = await createTestCenter({ code: 'C011' });
      const center2 = await createTestCenter({ code: 'C012' });
      const center3 = await createTestCenter({ code: 'C013' });
      const student1 = await createTestStudent(center1, { studentId: '311111' });
      const student2 = await createTestStudent(center2, { studentId: '322222' });
      const student3 = await createTestStudent(center3, { studentId: '333333' });
      await createTestActivity(student1, center1, { domain: 'first.com' });
      await createTestActivity(student2, center2, { domain: 'second.com' });
      await createTestActivity(student3, center3, { domain: 'third.com' });

      const res = await request(app)
        .get(`/api/v1/activity?center=${center1._id},${center2._id}&student=${student1._id},${student2._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      const domains = res.body.data.map((item) => item.domain);
      expect(domains).toContain('first.com');
      expect(domains).toContain('second.com');
    });

    it('should filter by domain', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center, { domain: 'google.com' });
      await createTestActivity(student, center, { domain: 'facebook.com' });

      const res = await request(app)
        .get('/api/v1/activity?domain=google')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
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
        .get(`/api/v1/activity?startDate=${today.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });

    it('should filter by wasBlocked', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center, { wasBlocked: false });
      await createTestActivity(student, center, { wasBlocked: true });

      const res = await request(app)
        .get('/api/v1/activity?wasBlocked=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].wasBlocked).toBe(true);
    });

    it('should limit results for pod_admin', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(admin);
      const student1 = await createTestStudent(center1, { studentId: '111111' });
      const student2 = await createTestStudent(center2, { studentId: '222222' });
      await createTestActivity(student1, center1);
      await createTestActivity(student2, center2);

      const res = await request(app)
        .get('/api/v1/activity')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/activity/blocked', () => {
    it('should return only blocked attempts from today', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center, { wasBlocked: false });
      await createTestActivity(student, center, { wasBlocked: true });
      await createTestActivity(student, center, { wasBlocked: true });

      const res = await request(app)
        .get('/api/v1/activity/blocked')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      res.body.data.forEach(activity => {
        expect(activity.wasBlocked).toBe(true);
      });
    });

    it('should filter by center for pod_admin', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(admin);
      const student1 = await createTestStudent(center1, { studentId: '111111' });
      const student2 = await createTestStudent(center2, { studentId: '222222' });
      await createTestActivity(student1, center1, { wasBlocked: true });
      await createTestActivity(student2, center2, { wasBlocked: true });

      const res = await request(app)
        .get('/api/v1/activity/blocked')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/activity/stats', () => {
    it('should return activity statistics', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter();
      const student = await createTestStudent(center);
      await createTestActivity(student, center, { domain: 'google.com', durationSeconds: 60 });
      await createTestActivity(student, center, { domain: 'google.com', durationSeconds: 30 });
      await createTestActivity(student, center, { domain: 'facebook.com', wasBlocked: true, blockCategory: 'social_media' });

      const res = await request(app)
        .get('/api/v1/activity/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalToday).toBe(3);
      expect(res.body.data.blockedToday).toBe(1);
      expect(res.body.data.topDomains).toBeDefined();
      expect(res.body.data.topDomains[0]._id).toBe('google.com');
      expect(res.body.data.topDomains[0].count).toBe(2);
      expect(res.body.data.topBlockedCategories).toBeDefined();
    });

    it('should rank top domains by active time when requested', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter({ code: 'C024' });
      const student = await createTestStudent(center, { studentId: '451111' });

      await createTestActivity(student, center, { domain: 'google.com', durationSeconds: 25 });
      await createTestActivity(student, center, { domain: 'google.com', durationSeconds: 25 });
      await createTestActivity(student, center, { domain: 'youtube.com', durationSeconds: 120 });

      const res = await request(app)
        .get('/api/v1/activity/stats?websiteRankBy=time')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.websiteRankBy).toBe('time');
      expect(res.body.data.topDomains[0]._id).toBe('youtube.com');
      expect(res.body.data.topDomains[0].totalDuration).toBe(120);
    });

    it('should filter stats for pod_admin', async () => {
      const center1 = await createTestCenter({ code: 'C001' });
      const center2 = await createTestCenter({ code: 'C002' });
      const admin = await createTestAdmin({ role: 'pod_admin', center: center1._id });
      const token = generateAdminToken(admin);
      const student1 = await createTestStudent(center1, { studentId: '111111' });
      const student2 = await createTestStudent(center2, { studentId: '222222' });
      await createTestActivity(student1, center1);
      await createTestActivity(student2, center2);
      await createTestActivity(student2, center2);

      const res = await request(app)
        .get('/api/v1/activity/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.totalToday).toBe(1);
    });

    it('should support multi-select center and student filters in stats', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center1 = await createTestCenter({ code: 'C021' });
      const center2 = await createTestCenter({ code: 'C022' });
      const center3 = await createTestCenter({ code: 'C023' });
      const student1 = await createTestStudent(center1, { studentId: '411111' });
      const student2 = await createTestStudent(center2, { studentId: '422222' });
      const student3 = await createTestStudent(center3, { studentId: '433333' });
      await createTestActivity(student1, center1, { domain: 'alpha.com' });
      await createTestActivity(student2, center2, { domain: 'beta.com' });
      await createTestActivity(student3, center3, { domain: 'gamma.com' });

      const res = await request(app)
        .get(`/api/v1/activity/stats?center=${center1._id},${center2._id}&student=${student1._id},${student2._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.totalToday).toBe(2);
      expect(res.body.data.totalUsers).toBe(2);
    });

    it('should derive active and inactive users from activity in selected range', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter({ code: 'C031' });
      const student1 = await createTestStudent(center, { studentId: '511111' });
      const student2 = await createTestStudent(center, { studentId: '522222' });

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestActivity(student1, center, { visitTime: today, category: 'Education' });
      await createTestActivity(student2, center, { visitTime: yesterday, category: 'Education' });

      const date = today.toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/v1/activity/stats?startDate=${date}&endDate=${date}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.totalUsers).toBe(2);
      expect(res.body.data.totalActiveUsers).toBe(1);
      expect(res.body.data.totalInactiveUsers).toBe(1);
    });

    it('should apply category filter to active and inactive user metrics', async () => {
      const admin = await createTestAdmin();
      const token = generateAdminToken(admin);
      const center = await createTestCenter({ code: 'C032' });
      const student1 = await createTestStudent(center, { studentId: '531111' });
      const student2 = await createTestStudent(center, { studentId: '542222' });

      await createTestActivity(student1, center, { category: 'Education' });
      await createTestActivity(student2, center, { category: 'Gaming' });

      const res = await request(app)
        .get('/api/v1/activity/stats?category=Education')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.totalUsers).toBe(2);
      expect(res.body.data.totalActiveUsers).toBe(1);
      expect(res.body.data.totalInactiveUsers).toBe(1);
    });
  });
});
