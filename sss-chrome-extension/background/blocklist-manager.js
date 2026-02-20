// Blocklist Manager - Fetches and applies blocking rules
import ApiClient from './api-client.js';

class BlocklistManager {
  constructor() {
    this.currentVersion = null;
    this.isInitialized = false;
  }

  async init() {
    // Load current version from storage
    const { blocklistVersion } = await chrome.storage.local.get('blocklistVersion');
    this.currentVersion = blocklistVersion;
    this.isInitialized = true;
  }

  async syncBlocklist() {
    const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
    if (!isAuthenticated) {
      return { success: false, reason: 'not_authenticated' };
    }

    try {
      const response = await ApiClient.getBlocklist();

      if (!response.success) {
        throw new Error('Failed to fetch blocklist');
      }

      const {
        version,
        rules,
        blockedDomains = [],
        allowlistDomains = [],
        allowOnlyListed = false,
        timeRestrictions
      } = response.data;

      // Check if we need to update
      if (version === this.currentVersion) {
        return { success: true, updated: false };
      }

      // Apply the rules
      await this.applyRules(rules);

      // Store the data
      await chrome.storage.local.set({
        blocklistVersion: version,
        blocklistRules: rules,
        blockedDomains,
        allowlistDomains,
        allowOnlyListed,
        timeRestrictions: timeRestrictions || null
      });

      this.currentVersion = version;

      return { success: true, updated: true, rulesCount: rules.length, timeRestrictions };
    } catch (error) {
      console.error('Blocklist sync failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async applyRules(rules) {
    try {
      // Get existing dynamic rules
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingRuleIds = existingRules.map(r => r.id);

      // Remove all existing dynamic rules
      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds
        });
      }

      // Format rules for Chrome declarativeNetRequest API
      const formattedRules = rules
        .map((rule, index) => {
          const condition = this.sanitizeCondition(rule.condition || {});
          if (!condition) return null;

          return {
            id: index + 1,
            priority: rule.priority || 1,
            action: { type: rule.action?.type || 'block' },
            condition
          };
        })
        .filter(Boolean);

      // Add new rules (Chrome has a limit of 5000 dynamic rules)
      if (formattedRules.length > 0) {
        // Split into chunks if needed (max 5000 rules)
        const maxRules = Math.min(formattedRules.length, 5000);
        const rulesToAdd = formattedRules.slice(0, maxRules);

        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: rulesToAdd
        });

      }

      return true;
    } catch (error) {
      console.error('Failed to apply blocking rules:', error);
      throw error;
    }
  }

  sanitizeCondition(condition) {
    const resourceTypes = Array.isArray(condition.resourceTypes) && condition.resourceTypes.length > 0
      ? condition.resourceTypes
      : ['main_frame', 'sub_frame'];

    const urlFilter = typeof condition.urlFilter === 'string' ? condition.urlFilter.trim() : '';
    const regexFilter = typeof condition.regexFilter === 'string' ? condition.regexFilter.trim() : '';

    const sanitized = { resourceTypes };

    if (regexFilter) {
      sanitized.regexFilter = regexFilter;
      return sanitized;
    }

    if (urlFilter && urlFilter !== '*') {
      sanitized.urlFilter = urlFilter;
      return sanitized;
    }

    if (urlFilter === '*') {
      sanitized.regexFilter = '^https?://.+';
      return sanitized;
    }

    return null;
  }

  normalizeDomain(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    const withoutScheme = raw.replace(/^[a-z]+:\/\//i, '');
    const withoutPath = withoutScheme.split('/')[0];
    const withoutQuery = withoutPath.split('?')[0];
    return withoutQuery.replace(/^www\./, '');
  }

  async clearRules() {
    try {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingRuleIds = existingRules.map(r => r.id);

      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds
        });
      }

      await chrome.storage.local.remove([
        'blocklistVersion',
        'blocklistRules',
        'blockedDomains',
        'allowlistDomains',
        'allowOnlyListed',
        'timeRestrictions'
      ]);
      this.currentVersion = null;

      return true;
    } catch (error) {
      console.error('Failed to clear blocking rules:', error);
      return false;
    }
  }

  async isUrlBlocked(url) {
    try {
      const urlObj = new URL(url);
      const domain = this.normalizeDomain(urlObj.hostname);

      const {
        blockedDomains,
        allowlistDomains,
        allowOnlyListed,
        blocklistRules
      } = await chrome.storage.local.get([
        'blockedDomains',
        'allowlistDomains',
        'allowOnlyListed',
        'blocklistRules'
      ]);

      const allowlist = allowlistDomains || [];
      if (allowOnlyListed && allowlist.length > 0) {
        const isAllowed = allowlist.some((allowedDomain) => {
          const cleanAllowed = allowedDomain.replace(/^www\./, '');
          return domain === cleanAllowed || domain.endsWith('.' + cleanAllowed);
        });
        if (!isAllowed) {
          return { blocked: true, domain, category: 'Allowlist only' };
        }
      }

      // Check against blockedDomains list
      if (blockedDomains && blockedDomains.length > 0) {
        for (const blockedDomain of blockedDomains) {
            const cleanBlockedDomain = this.normalizeDomain(blockedDomain);
            if (domain === cleanBlockedDomain || domain.endsWith('.' + cleanBlockedDomain)) {
            // Try to find category from rules
            let category = 'Restricted';
            if (blocklistRules) {
              const rule = blocklistRules.find(r =>
                r.condition?.urlFilter?.includes(cleanBlockedDomain)
              );
              if (rule?.category) {
                category = rule.category;
              }
            }
            return { blocked: true, domain: blockedDomain, category };
          }
        }
      }

      // Also check against rules directly (for pattern matches)
      if (blocklistRules && blocklistRules.length > 0) {
        for (const rule of blocklistRules) {
          const pattern = rule.condition?.urlFilter;
          if (pattern) {
            // Simple domain check for ||domain patterns
            if (pattern.startsWith('||')) {
               const ruleDomain = this.normalizeDomain(pattern.slice(2));
               if (domain === ruleDomain || domain.endsWith('.' + ruleDomain)) {
                return { blocked: true, domain: ruleDomain, category: rule.category || 'Restricted' };
              }
            }
          }
        }
      }

      return { blocked: false };
    } catch (error) {
      console.error('isUrlBlocked error:', error);
      return { blocked: false, error: error.message };
    }
  }

  async getRulesCount() {
    try {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      return rules.length;
    } catch (error) {
      return 0;
    }
  }

  async getBlockedDomains() {
    const { blockedDomains } = await chrome.storage.local.get('blockedDomains');
    return blockedDomains || [];
  }
}

export default BlocklistManager;
