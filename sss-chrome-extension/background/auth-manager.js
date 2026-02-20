import ApiClient from './api-client.js';

class AuthManager {
  constructor() {
    this.deviceId = null;
  }

  async init() {
    await this.ensureDeviceId();

    // Check for existing session
    await this.validateSession();
  }

  generateDeviceId() {
    return 'dev_' + crypto.randomUUID();
  }

  async ensureDeviceId() {
    if (this.deviceId) {
      return this.deviceId;
    }

    const { deviceId } = await chrome.storage.local.get('deviceId');
    if (deviceId) {
      this.deviceId = deviceId;
      return deviceId;
    }

    const newDeviceId = this.generateDeviceId();
    this.deviceId = newDeviceId;
    await chrome.storage.local.set({ deviceId: newDeviceId });
    return newDeviceId;
  }

  async login(studentId, pin) {
    try {
      await this.ensureDeviceId();
      const response = await ApiClient.login(studentId, pin, this.deviceId);

      if (response.success) {
        const { sessionToken, expiresAt, student } = response.data;
        const sessionStartTime = Date.now();

        // Store session data (local storage persists across browser restarts)
        await chrome.storage.local.set({
          sessionToken,
          expiresAt,
          sessionStartTime
        });

        // Store in session storage (faster access, but cleared on browser close)
        await chrome.storage.session.set({
          isAuthenticated: true,
          studentId: student.id,
          studentCode: student.studentId,
          studentName: student.name,
          centerName: student.center?.name || student.center?.code || 'Learning Center',
          centerId: student.center?._id,
          sessionStart: sessionStartTime
        });

        // Notify all tabs
        await this.notifyTabsOfAuth(true);

        return { success: true, student };
      }

      return { success: false, error: response.message };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      await ApiClient.logout();
    } catch (error) {
    }

    // Clear all session data
    await chrome.storage.session.clear();
    await chrome.storage.session.set({ isAuthenticated: false });
    await chrome.storage.local.remove(['sessionToken', 'expiresAt', 'sessionStartTime']);

    // Notify all tabs
    await this.notifyTabsOfAuth(false);
  }

  async validateSession() {
    const { sessionToken, expiresAt, sessionStartTime } = await chrome.storage.local.get(['sessionToken', 'expiresAt', 'sessionStartTime']);

    if (!sessionToken) {
      await chrome.storage.session.set({ isAuthenticated: false });
      return false;
    }

    // Check if token expired locally
    if (expiresAt && new Date(expiresAt) < new Date()) {
      await this.logout();
      return false;
    }

    try {
      const response = await ApiClient.validateSession();

      if (response.success && response.data.valid) {
        // Restore sessionStart from local storage or set a new one
        const sessionStart = sessionStartTime || Date.now();

        // Save sessionStart to local storage for persistence
        if (!sessionStartTime) {
          await chrome.storage.local.set({ sessionStartTime: sessionStart });
        }

        await chrome.storage.session.set({
          isAuthenticated: true,
          studentId: response.data.student.id,
          studentCode: response.data.student.studentId,
          studentName: response.data.student.name,
          centerName: response.data.student.center?.name || response.data.student.center?.code || 'Learning Center',
          centerId: response.data.student.center?._id,
          sessionStart: sessionStart
        });
        return true;
      }
    } catch (error) {
      if (error.message === 'SESSION_EXPIRED') {
        await this.logout();
      }
    }

    await chrome.storage.session.set({ isAuthenticated: false });
    return false;
  }

  async getAuthState() {
    // Get from session storage (fast)
    const session = await chrome.storage.session.get([
      'isAuthenticated',
      'studentName',
      'studentCode',
      'centerName',
      'sessionStart'
    ]);

    // If session storage is missing data but we have a valid token, restore from local storage
    if (session.isAuthenticated && !session.sessionStart) {
      const { sessionStartTime } = await chrome.storage.local.get('sessionStartTime');
      if (sessionStartTime) {
        session.sessionStart = sessionStartTime;
        // Also restore to session storage
        await chrome.storage.session.set({ sessionStart: sessionStartTime });
      }
    }

    // Get stats from local storage
    const { sitesVisitedToday = 0, blockedCountToday = 0 } = await chrome.storage.local.get([
      'sitesVisitedToday',
      'blockedCountToday'
    ]);

    return {
      ...session,
      sitesVisited: sitesVisitedToday,
      blockedCount: blockedCountToday
    };
  }

  async notifyTabsOfAuth(isAuthenticated) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'AUTH_STATE_CHANGED',
          isAuthenticated
        });
      } catch (e) {
        // Tab might not have content script loaded
      }
    }
  }
}

export default AuthManager;
