// Configuration Manager
const DEFAULT_CONFIG = {
  apiBaseUrl: 'https://api.extension.apnipathshala.org/api/v1',
  heartbeatInterval: 2, // minutes
  blocklistSyncInterval: 15, // minutes
  activityFlushInterval: 1, // minutes
  maxLoginAttempts: 5,
  loginLockoutMinutes: 15
};

class ConfigManager {
  static async get(key) {
    const { extensionConfig = {} } = await chrome.storage.local.get('extensionConfig');
    return extensionConfig[key] ?? DEFAULT_CONFIG[key];
  }

  static async getAll() {
    const { extensionConfig = {} } = await chrome.storage.local.get('extensionConfig');
    return { ...DEFAULT_CONFIG, ...extensionConfig };
  }

  static async set(key, value) {
    const { extensionConfig = {} } = await chrome.storage.local.get('extensionConfig');
    extensionConfig[key] = value;
    await chrome.storage.local.set({ extensionConfig });
  }

  static async setMultiple(configObj) {
    const { extensionConfig = {} } = await chrome.storage.local.get('extensionConfig');
    Object.assign(extensionConfig, configObj);
    await chrome.storage.local.set({ extensionConfig });
  }

  static async getApiBaseUrl() {
    return await this.get('apiBaseUrl');
  }

  static async setApiBaseUrl(url) {
    // Validate URL format
    try {
      new URL(url);
      await this.set('apiBaseUrl', url.replace(/\/$/, '')); // Remove trailing slash
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Invalid URL format' };
    }
  }

  static async reset() {
    await chrome.storage.local.remove('extensionConfig');
    return DEFAULT_CONFIG;
  }
}

export { ConfigManager, DEFAULT_CONFIG };
