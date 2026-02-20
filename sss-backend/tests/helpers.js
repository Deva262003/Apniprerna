const jwt = require('jsonwebtoken');
const { Admin, Parent, Student, Center, Session, Activity, BlockedSite, Policy } = require('../src/models');

// Counter for unique IDs
let counter = 100000;
const getUniqueId = () => {
  counter++;
  return counter.toString();
};

// Create test admin
const createTestAdmin = async (overrides = {}) => {
  const uniqueId = getUniqueId();
  const adminData = {
    email: overrides.email || `admin_${uniqueId}@test.com`,
    passwordHash: 'password123',
    name: 'Test Admin',
    role: 'super_admin',
    isActive: true,
    ...overrides
  };
  const admin = await Admin.create(adminData);
  return admin;
};

// Create test center
const createTestCenter = async (overrides = {}) => {
  const uniqueId = getUniqueId();
  const centerData = {
    name: 'Test Center',
    code: overrides.code || `TC${uniqueId}`,
    city: 'Test City',
    state: 'Test State',
    isActive: true,
    ...overrides
  };
  const center = await Center.create(centerData);
  return center;
};

// Create test student
const createTestStudent = async (center, overrides = {}) => {
  const uniqueId = getUniqueId();
  const studentData = {
    studentId: overrides.studentId || uniqueId,
    pinHash: '1234',
    name: 'Test Student',
    center: center._id,
    isActive: true,
    ...overrides
  };
  const student = await Student.create(studentData);
  return student;
};

// Create test session
const createTestSession = async (student, overrides = {}) => {
  const sessionToken = Session.generateToken();
  const sessionData = {
    student: student._id,
    sessionToken,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    status: 'active',
    ...overrides
  };
  const session = await Session.create(sessionData);
  return { session, sessionToken };
};

// Create test activity
const createTestActivity = async (student, center, overrides = {}) => {
  const activityData = {
    student: student._id,
    center: center._id,
    url: 'https://example.com/page',
    domain: 'example.com',
    title: 'Example Page',
    visitTime: new Date(),
    durationSeconds: 60,
    wasBlocked: false,
    ...overrides
  };
  const activity = await Activity.create(activityData);
  return activity;
};

// Create test blocked site
const createTestBlockedSite = async (admin, overrides = {}) => {
  const blockedSiteData = {
    pattern: 'badsite.com',
    patternType: 'domain',
    category: 'adult',
    scope: 'global',
    isActive: true,
    addedBy: admin._id,
    ...overrides
  };
  const blockedSite = await BlockedSite.create(blockedSiteData);
  return blockedSite;
};

// Create test parent
const createTestParent = async (center, students = [], overrides = {}) => {
  const uniqueId = getUniqueId();
  const parentData = {
    parentId: overrides.parentId || `AB${uniqueId}`.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, '0').slice(0, 8),
    parentIdType: overrides.parentIdType || 'alphanumeric',
    passwordHash: overrides.passwordHash || 'tempPass123',
    mustChangePassword: overrides.mustChangePassword !== undefined ? overrides.mustChangePassword : true,
    name: overrides.name || 'Test Parent',
    center: center._id,
    students: students.map((s) => s._id),
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    ...overrides
  };
  const parent = await Parent.create(parentData);
  return parent;
};

// Generate parent JWT token
const generateParentToken = (parent) => {
  return jwt.sign(
    { id: parent._id, kind: 'parent' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Generate admin JWT token
const generateAdminToken = (admin) => {
  return jwt.sign(
    { id: admin._id, role: admin.role, kind: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Get auth header for admin
const getAdminAuthHeader = (token) => {
  return { Authorization: `Bearer ${token}` };
};

// Get auth header for student
const getStudentAuthHeader = (sessionToken) => {
  return { 'x-session-token': sessionToken };
};

module.exports = {
  createTestAdmin,
  createTestParent,
  createTestCenter,
  createTestStudent,
  createTestSession,
  createTestActivity,
  createTestBlockedSite,
  generateAdminToken,
  generateParentToken,
  getAdminAuthHeader,
  getStudentAuthHeader
};
