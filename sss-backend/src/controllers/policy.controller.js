const { Policy, Center, Student } = require('../models');
const { handleError } = require('../utils/error');

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function normalizeAllowedDays(days) {
  if (!Array.isArray(days)) return [];
  return days
    .map((day) => {
      if (typeof day === 'number') {
        return DAY_NAMES[day] || null;
      }
      if (typeof day === 'string') {
        const normalized = day.toLowerCase();
        return DAY_NAMES.includes(normalized) ? normalized : null;
      }
      return null;
    })
    .filter(Boolean);
}

function validatePolicyRules(policyType, rules) {
  if (!rules || typeof rules !== 'object') {
    return 'Rules object is required';
  }

  if (policyType === 'blocklist') {
    const hasBlockedDomains = Array.isArray(rules.blockedDomains) && rules.blockedDomains.length > 0;
    const hasBlockedPatterns = Array.isArray(rules.blockedPatterns) && rules.blockedPatterns.length > 0;
    const hasBlockedCategories = Array.isArray(rules.blockedCategories) && rules.blockedCategories.length > 0;
    if (!hasBlockedDomains && !hasBlockedPatterns && !hasBlockedCategories) {
      return 'Blocklist policy must include blockedDomains, blockedPatterns, or blockedCategories';
    }
  }

  if (policyType === 'allowlist') {
    const hasAllowedDomains = Array.isArray(rules.allowedDomains) && rules.allowedDomains.length > 0;
    if (!hasAllowedDomains) {
      return 'Allowlist policy must include allowedDomains';
    }
  }

  if (policyType === 'time_restriction') {
    const hasAllowedHours = !!rules.allowedHours || (Array.isArray(rules.timeWindows) && rules.timeWindows.length > 0);
    const hasAllowedDays = Array.isArray(rules.allowedDays) && rules.allowedDays.length > 0;
    const hasSessionLimit = !!rules.maxSessionMinutes;
    if (!hasAllowedHours && !hasAllowedDays && !hasSessionLimit) {
      return 'Time restriction policy must include allowedHours, allowedDays, or maxSessionMinutes';
    }
  }

  return null;
}

async function validateScopeInput({ scope, center, student }, admin) {
  if (!['global', 'center', 'student'].includes(scope)) {
    return { error: 'Invalid scope' };
  }

  if (scope === 'global') {
    if (admin.role !== 'super_admin') {
      return { error: 'Only super admin can create global policies' };
    }
    return { centerId: undefined, studentId: undefined };
  }

  if (scope === 'center') {
    const centerId = admin.role !== 'super_admin' && admin.center ? admin.center : center;
    if (!centerId) {
      return { error: 'Center is required for center-scoped policy' };
    }

    const centerExists = await Center.findById(centerId);
    if (!centerExists) {
      return { error: 'Center not found' };
    }

    return { centerId, studentId: undefined };
  }

  if (scope === 'student') {
    if (!student) {
      return { error: 'Student is required for student-scoped policy' };
    }

    const studentRecord = await Student.findById(student).select('center');
    if (!studentRecord) {
      return { error: 'Student not found' };
    }

    if (admin.role !== 'super_admin' && admin.center && studentRecord.center?.toString() !== admin.center.toString()) {
      return { error: 'Not authorized for this student' };
    }

    return { centerId: studentRecord.center, studentId: studentRecord._id };
  }

  return { error: 'Invalid scope' };
}

async function validatePriority(policyId, scope, centerId, studentId, priority) {
  if (priority === undefined || priority === null) return null;
  const existing = await Policy.findOne({
    _id: { $ne: policyId },
    scope,
    center: centerId,
    student: studentId,
    priority
  });

  if (existing) {
    return 'Priority is already used for this scope';
  }

  return null;
}

const listPolicies = async (req, res) => {
  try {
    const { scope, policyType, isActive, center, student, search } = req.query;
    const baseFilter = {};

    if (scope) baseFilter.scope = scope;
    if (policyType) baseFilter.policyType = policyType;
    if (isActive !== undefined) baseFilter.isActive = isActive === 'true';
    if (center) baseFilter.center = center;
    if (student) baseFilter.student = student;

    const filters = [baseFilter];

    if (search) {
      filters.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (center && center !== req.admin.center.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this center' });
      }

      if (student) {
        const studentRecord = await Student.findById(student).select('center');
        if (!studentRecord || studentRecord.center?.toString() !== req.admin.center.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized for this student' });
        }
      }

      const studentIds = await Student.find({ center: req.admin.center }).select('_id');
      filters.push({
        $or: [
          { scope: 'global' },
          { scope: 'center', center: req.admin.center },
          { scope: 'student', student: { $in: studentIds.map((s) => s._id) } }
        ]
      });
    }

    const queryFilter = filters.length > 1 ? { $and: filters } : baseFilter;

    const policies = await Policy.find(queryFilter)
      .populate('center', 'name code')
      .populate('student', 'name studentId')
      .sort({ priority: -1, createdAt: -1 });

    res.status(200).json({ success: true, data: policies });
  } catch (error) {
    handleError(res, error, 'Failed to list policies');
  }
};

const getPolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id)
      .populate('center', 'name code')
      .populate('student', 'name studentId');

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (policy.scope === 'center' && policy.center?.toString() !== req.admin.center.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this policy' });
      }
      if (policy.scope === 'student') {
        const studentRecord = await Student.findById(policy.student).select('center');
        if (!studentRecord || studentRecord.center?.toString() !== req.admin.center.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized for this policy' });
        }
      }
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    handleError(res, error, 'Failed to fetch policy');
  }
};

const createPolicy = async (req, res) => {
  try {
    const { name, description, policyType, scope, center, student, rules, priority, isActive } = req.body;

    const scopeResult = await validateScopeInput({ scope, center, student }, req.admin);
    if (scopeResult.error) {
      return res.status(400).json({ success: false, message: scopeResult.error });
    }

    const rulesError = validatePolicyRules(policyType, rules);
    if (rulesError) {
      return res.status(400).json({ success: false, message: rulesError });
    }

    const priorityValue = priority !== undefined ? Number(priority) : 0;
    if (Number.isNaN(priorityValue)) {
      return res.status(400).json({ success: false, message: 'Priority must be a number' });
    }

    const priorityError = await validatePriority(null, scope, scopeResult.centerId, scopeResult.studentId, priorityValue);
    if (priorityError) {
      return res.status(400).json({ success: false, message: priorityError });
    }

    const normalizedRules = {
      ...rules
    };

    if (policyType === 'time_restriction' && rules?.allowedDays) {
      normalizedRules.allowedDays = normalizeAllowedDays(rules.allowedDays);
    }

    const policy = await Policy.create({
      name,
      description,
      policyType,
      scope,
      center: scopeResult.centerId,
      student: scopeResult.studentId,
      rules: normalizedRules,
      priority: priorityValue,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.admin._id
    });

    await policy.populate('center', 'name code');
    await policy.populate('student', 'name studentId');

    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    handleError(res, error, 'Failed to create policy');
  }
};

const updatePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    const updatedScope = req.body.scope || policy.scope;
    const updatedPolicyType = req.body.policyType || policy.policyType;

    const scopeResult = await validateScopeInput(
      {
        scope: updatedScope,
        center: req.body.center || policy.center,
        student: req.body.student || policy.student
      },
      req.admin
    );

    if (scopeResult.error) {
      return res.status(400).json({ success: false, message: scopeResult.error });
    }

    if (req.body.rules) {
      const rulesError = validatePolicyRules(updatedPolicyType, req.body.rules);
      if (rulesError) {
        return res.status(400).json({ success: false, message: rulesError });
      }
    }

    const priorityValue = req.body.priority !== undefined ? Number(req.body.priority) : policy.priority;
    if (Number.isNaN(priorityValue)) {
      return res.status(400).json({ success: false, message: 'Priority must be a number' });
    }

    const priorityError = await validatePriority(policy._id, updatedScope, scopeResult.centerId, scopeResult.studentId, priorityValue);
    if (priorityError) {
      return res.status(400).json({ success: false, message: priorityError });
    }

    if (req.body.name) policy.name = req.body.name;
    if (req.body.description !== undefined) policy.description = req.body.description;
    if (req.body.policyType) policy.policyType = req.body.policyType;
    policy.scope = updatedScope;
    policy.center = scopeResult.centerId;
    policy.student = scopeResult.studentId;
    if (req.body.rules) {
      const normalizedRules = { ...req.body.rules };
      if (updatedPolicyType === 'time_restriction' && req.body.rules?.allowedDays) {
        normalizedRules.allowedDays = normalizeAllowedDays(req.body.rules.allowedDays);
      }
      policy.rules = normalizedRules;
    }
    policy.priority = priorityValue;
    if (req.body.isActive !== undefined) policy.isActive = req.body.isActive;

    await policy.save();
    await policy.populate('center', 'name code');
    await policy.populate('student', 'name studentId');

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    handleError(res, error, 'Failed to update policy');
  }
};

const deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }
    res.status(200).json({ success: true, message: 'Policy deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete policy');
  }
};

const togglePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    policy.isActive = !policy.isActive;
    await policy.save();

    await policy.populate('center', 'name code');
    await policy.populate('student', 'name studentId');

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    handleError(res, error, 'Failed to toggle policy');
  }
};

module.exports = {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  togglePolicy
};
