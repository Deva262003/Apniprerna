const express = require('express');
const router = express.Router();
const { BlockedSite, Policy, AdminCommand } = require('../models');
const { buildCommandPayload } = require('../websocket/commands');
const { protectStudent } = require('../middleware/auth');

// All routes require student session authentication
router.use(protectStudent);

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

function buildTimeRestrictions(policy) {
  if (!policy?.rules) return null;

  const rules = policy.rules;
  const allowedDays = normalizeAllowedDays(rules.allowedDays || []);
  const timeWindows = [];

  if (rules.allowedHours?.start && rules.allowedHours?.end) {
    timeWindows.push({
      start: rules.allowedHours.start,
      end: rules.allowedHours.end
    });
  }

  if (Array.isArray(rules.timeWindows)) {
    rules.timeWindows.forEach((window) => {
      if (window?.start && window?.end) {
        timeWindows.push({ start: window.start, end: window.end });
      }
    });
  }

  return {
    enabled: true,
    policyId: policy._id,
    policyName: policy.name,
    allowedDays,
    timeWindows,
    maxSessionMinutes: rules.maxSessionMinutes,
    timezone: rules.timezone
  };
}

function normalizeDomainValue(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const withoutScheme = raw.replace(/^[a-z]+:\/\//i, '');
  const withoutPath = withoutScheme.split('/')[0];
  const withoutQuery = withoutPath.split('?')[0];
  return withoutQuery.replace(/^www\./i, '').toLowerCase();
}

function createRuleCondition(pattern, patternType = 'domain') {
  if (!pattern || typeof pattern !== 'string') {
    return {
      resourceTypes: ['main_frame', 'sub_frame']
    };
  }

  const trimmedPattern = pattern.trim();
  const baseCondition = {
    resourceTypes: ['main_frame', 'sub_frame']
  };

  if (patternType === 'regex') {
    return {
      ...baseCondition,
      regexFilter: trimmedPattern
    };
  }

  if (patternType === 'domain') {
    const normalizedDomain = normalizeDomainValue(trimmedPattern);
    if (!normalizedDomain) {
      return {
        ...baseCondition,
        urlFilter: trimmedPattern.replace(/^\|\|/, '')
      };
    }
    return {
      ...baseCondition,
      urlFilter: `||${normalizedDomain}`
    };
  }

  return {
    ...baseCondition,
    urlFilter: trimmedPattern
  };
}

// @route   GET /api/v1/extension/blocklist
// @desc    Get blocklist rules for the logged-in student
// @access  Protected (Session Token)
router.get('/blocklist', async (req, res) => {
  try {
    const studentId = req.student._id;
    const centerId = req.student.center._id || req.student.center;

    // Get all applicable blocked sites
    const blockedSites = await BlockedSite.find({
      isActive: true,
      $or: [
        { scope: 'global' },
        { scope: 'center', scopeId: centerId },
        { scope: 'student', scopeId: studentId }
      ]
    }).select('pattern patternType category scope');

    // Get all applicable policies
    const policies = await Policy.find({
      isActive: true,
      policyType: { $in: ['blocklist', 'allowlist', 'time_restriction'] },
      $or: [
        { scope: 'global' },
        { scope: 'center', center: centerId },
        { scope: 'student', student: studentId }
      ]
    }).sort({ priority: -1 });

    // Build blocklist rules for Chrome declarativeNetRequest format
    const rules = [];
    let ruleId = 1;
    const blockedDomains = new Set();
    const allowlistDomains = new Set();
    const categories = new Set();
    let allowOnlyListed = false;

    // Add individual blocked sites
    blockedSites.forEach(site => {
      const scopePriority = site.scope === 'student' ? 3 : site.scope === 'center' ? 2 : 1;
      const priority = 50 + scopePriority;

      if (site.patternType === 'domain') {
        const normalizedDomain = normalizeDomainValue(site.pattern);
        if (normalizedDomain) {
          blockedDomains.add(normalizedDomain);
        }
      }

      if (site.category) {
        categories.add(site.category);
      }

      rules.push({
        id: ruleId++,
        priority,
        action: { type: 'block' },
        condition: createRuleCondition(site.pattern, site.patternType),
        category: site.category
      });
    });

    // Add rules from policies
    const timePolicies = [];

    policies.forEach(policy => {
      const scopePriority = policy.scope === 'student' ? 3 : policy.scope === 'center' ? 2 : 1;
      const blockPriority = 50 + scopePriority;
      const allowPriority = 100 + scopePriority;

      if (policy.policyType === 'time_restriction') {
        timePolicies.push(policy);
        return;
      }

      if (policy.policyType === 'blocklist') {
        if (policy.rules.blockedDomains) {
          policy.rules.blockedDomains.forEach(domain => {
            const normalizedDomain = normalizeDomainValue(domain);
            if (normalizedDomain) {
              blockedDomains.add(normalizedDomain);
            }
            rules.push({
              id: ruleId++,
              priority: blockPriority,
              action: { type: 'block' },
              condition: createRuleCondition(domain, 'domain')
            });
          });
        }

        if (policy.rules.blockedPatterns) {
          policy.rules.blockedPatterns.forEach(pattern => {
            rules.push({
              id: ruleId++,
              priority: blockPriority,
              action: { type: 'block' },
              condition: createRuleCondition(pattern, 'regex')
            });
          });
        }

        if (policy.rules.blockedCategories) {
          policy.rules.blockedCategories.forEach(category => categories.add(category));
        }
      }

      if (policy.policyType === 'allowlist') {
        if (policy.rules.allowedDomains) {
          policy.rules.allowedDomains.forEach(domain => {
            const normalizedDomain = normalizeDomainValue(domain);
            if (normalizedDomain) {
              allowlistDomains.add(normalizedDomain);
            }
            rules.push({
              id: ruleId++,
              priority: allowPriority,
              action: { type: 'allow' },
              condition: createRuleCondition(domain, 'domain')
            });
          });
        }

        if (policy.rules.allowOnlyListed) {
          allowOnlyListed = true;
        }
      }
    });

    if (allowOnlyListed && allowlistDomains.size > 0) {
      rules.push({
        id: ruleId++,
        priority: 1,
        action: { type: 'block' },
        condition: {
          regexFilter: '^https?://.+',
          resourceTypes: ['main_frame', 'sub_frame']
        }
      });
    }

    const timeRestrictionPolicy = timePolicies[0];
    const timeRestrictions = timeRestrictionPolicy ? buildTimeRestrictions(timeRestrictionPolicy) : { enabled: false };

    // Generate version hash for cache invalidation
    const version = Date.now().toString(36);

    res.status(200).json({
      success: true,
      data: {
        version,
        rules,
        blockedDomains: Array.from(blockedDomains),
        allowlistDomains: Array.from(allowlistDomains),
        allowOnlyListed,
        timeRestrictions,
        categories: Array.from(categories)
      }
    });
  } catch (error) {
    console.error('Get blocklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/extension/time-restrictions
// @desc    Get time restriction policies for the logged-in student
// @access  Protected (Session Token)
router.get('/time-restrictions', async (req, res) => {
  try {
    const studentId = req.student._id;
    const centerId = req.student.center._id || req.student.center;

    const policies = await Policy.find({
      isActive: true,
      policyType: 'time_restriction',
      $or: [
        { scope: 'global' },
        { scope: 'center', center: centerId },
        { scope: 'student', student: studentId }
      ]
    }).sort({ priority: -1 });

    const timeRestrictions = policies.length > 0 ? buildTimeRestrictions(policies[0]) : { enabled: false };

    res.status(200).json({
      success: true,
      data: timeRestrictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/extension/heartbeat
// @desc    Receive heartbeat from extension
// @access  Protected (Session Token)
router.post('/heartbeat', async (req, res) => {
  try {
    const {
      deviceId,
      extensionVersion,
      browserVersion,
      currentUrl,
      isActive,
      acknowledgedCommandIds
    } = req.body;

    // Update session with device info if needed
    if (deviceId && !req.session.deviceId) {
      req.session.deviceId = deviceId;
      await req.session.save();
    }

    // Store heartbeat in memory/Redis for real-time monitoring
    const io = req.app.get('io');
    if (io && isActive) {
      const centerId = req.student.center._id || req.student.center;
      io.to(`center:${centerId}`).emit('student_heartbeat', {
        studentId: req.student._id,
        studentName: req.student.name,
        studentCode: req.student.studentId,
        currentUrl,
        lastSeen: new Date()
      });
    }

    if (Array.isArray(acknowledgedCommandIds) && acknowledgedCommandIds.length > 0) {
      await AdminCommand.updateMany(
        { _id: { $in: acknowledgedCommandIds }, student: req.student._id },
        { status: 'acknowledged', acknowledgedAt: new Date() }
      );
    }

    const pendingCommands = await AdminCommand.find({
      student: req.student._id,
      status: { $in: ['pending', 'sent'] }
    })
      .sort({ createdAt: 1 })
      .limit(10);

    const commands = pendingCommands.map(buildCommandPayload);

    const pendingIds = pendingCommands.filter(command => command.status === 'pending').map(command => command._id);
    if (pendingIds.length > 0) {
      await AdminCommand.updateMany(
        { _id: { $in: pendingIds } },
        {
          status: 'sent',
          deliveredAt: new Date(),
          lastAttemptAt: new Date(),
          $inc: { attempts: 1 }
        }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        commands,
        serverTime: new Date()
      }
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/extension/check-url
// @desc    Check if a URL should be blocked (real-time check)
// @access  Protected (Session Token)
router.post('/check-url', async (req, res) => {
  try {
    const { url, domain } = req.body;
    const studentId = req.student._id;
    const centerId = req.student.center._id || req.student.center;

    // Check if domain is in blocklist
    // Use $and to combine scope filtering with pattern matching
    const blocked = await BlockedSite.findOne({
      isActive: true,
      $and: [
        {
          $or: [
            { scope: 'global' },
            { scope: 'center', scopeId: centerId },
            { scope: 'student', scopeId: studentId }
          ]
        },
        {
          $or: [
            { pattern: domain, patternType: 'domain' },
            { pattern: { $regex: domain, $options: 'i' }, patternType: 'regex' }
          ]
        }
      ]
    });

    if (blocked) {
      return res.status(200).json({
        success: true,
        data: {
          blocked: true,
          reason: blocked.category || 'Blocked by policy',
          category: blocked.category
        }
      });
    }

    const policies = await Policy.find({
      isActive: true,
      policyType: { $in: ['blocklist', 'allowlist'] },
      $or: [
        { scope: 'global' },
        { scope: 'center', center: centerId },
        { scope: 'student', student: studentId }
      ]
    }).sort({ priority: -1 });

    const allowlistDomains = new Set();
    const blockedDomains = new Set();
    const blockedPatterns = [];
    let allowOnlyListed = false;

    policies.forEach(policy => {
      if (policy.policyType === 'allowlist') {
        (policy.rules.allowedDomains || []).forEach(domainName => allowlistDomains.add(domainName));
        if (policy.rules.allowOnlyListed) {
          allowOnlyListed = true;
        }
      }

      if (policy.policyType === 'blocklist') {
        (policy.rules.blockedDomains || []).forEach(domainName => blockedDomains.add(domainName));
        (policy.rules.blockedPatterns || []).forEach(pattern => blockedPatterns.push(pattern));
      }
    });

    const normalizedDomain = domain?.replace(/^www\./, '');
    const allowedDomainMatch = Array.from(allowlistDomains).some((allowed) => {
      const cleanAllowed = allowed.replace(/^www\./, '');
      return normalizedDomain === cleanAllowed || normalizedDomain?.endsWith(`.${cleanAllowed}`);
    });

    if (allowOnlyListed && allowlistDomains.size > 0 && !allowedDomainMatch) {
      return res.status(200).json({
        success: true,
        data: {
          blocked: true,
          reason: 'Not in allowlist',
          category: 'allowlist'
        }
      });
    }

    if (normalizedDomain && blockedDomains.size > 0) {
      const blockedMatch = Array.from(blockedDomains).some((blockedDomain) => {
        const cleanBlocked = blockedDomain.replace(/^www\./, '');
        return normalizedDomain === cleanBlocked || normalizedDomain.endsWith(`.${cleanBlocked}`);
      });
      if (blockedMatch) {
        return res.status(200).json({
          success: true,
          data: {
            blocked: true,
            reason: 'Blocked by policy',
            category: 'blocklist'
          }
        });
      }
    }

    if (blockedPatterns.length > 0 && url) {
      const matchedPattern = blockedPatterns.find((pattern) => {
        const regexPattern = pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*');
        const regex = new RegExp(regexPattern, 'i');
        return regex.test(url);
      });

      if (matchedPattern) {
        return res.status(200).json({
          success: true,
          data: {
            blocked: true,
            reason: 'Blocked by policy',
            category: 'blocklist'
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        blocked: false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
