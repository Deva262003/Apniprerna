const { ActivityCategoryRule, ActivityCategory } = require('../models');

const ruleCache = {
  loadedAt: 0,
  ttlMs: 60 * 1000,
  rules: []
};

async function loadRules() {
  const now = Date.now();
  if (now - ruleCache.loadedAt < ruleCache.ttlMs && ruleCache.rules.length > 0) {
    return ruleCache.rules;
  }

  const rules = await ActivityCategoryRule.find({ isActive: true })
    .populate('category', 'name');

  ruleCache.rules = rules;
  ruleCache.loadedAt = now;
  return rules;
}

function normalizeDomain(domain) {
  if (!domain) return '';
  return domain.replace(/^www\./i, '').toLowerCase();
}

function matchRule(rule, url, domain) {
  const value = rule.pattern?.trim();
  if (!value) return false;

  if (rule.patternType === 'regex') {
    try {
      const regex = new RegExp(value, 'i');
      return regex.test(url) || regex.test(domain);
    } catch {
      return false;
    }
  }

  const target = rule.patternType === 'url' ? (url || '') : (domain || '');
  const normalizedTarget = normalizeDomain(target);
  const normalizedPattern = normalizeDomain(value);

  if (!normalizedPattern) return false;

  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2);
    return normalizedTarget === suffix || normalizedTarget.endsWith(`.${suffix}`);
  }

  return normalizedTarget === normalizedPattern;
}

async function getCategoryForActivity({ url, domain }) {
  const rules = await loadRules();
  const normalizedDomain = normalizeDomain(domain);
  const normalizedUrl = (url || '').toLowerCase();

  for (const rule of rules) {
    if (!rule?.category?.name) continue;
    if (!rule.isActive) continue;
    const matches = matchRule(rule, normalizedUrl, normalizedDomain);
    if (matches) {
      return rule.category.name;
    }
  }

  return null;
}

async function ensureDefaultCategory() {
  const existing = await ActivityCategory.findOne({ name: 'Uncategorized' });
  if (!existing) {
    await ActivityCategory.create({
      name: 'Uncategorized',
      description: 'Default category for uncategorized domains',
      color: 'slate',
      isActive: true
    });
  }
}

module.exports = {
  getCategoryForActivity,
  ensureDefaultCategory
};
