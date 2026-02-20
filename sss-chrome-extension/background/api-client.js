// API Client for SSS Backend
import { ConfigManager } from './config.js';

class ApiClient {
  static async getBaseUrl() {
    return await ConfigManager.getApiBaseUrl();
  }

  static async request(endpoint, options = {}) {
    const API_BASE = await this.getBaseUrl();
    const { sessionToken } = await chrome.storage.local.get('sessionToken');

    const headers = {
      'Content-Type': 'application/json',
      ...(sessionToken && { 'X-Session-Token': sessionToken }),
      ...options.headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, trigger re-auth
          await chrome.storage.session.set({ isAuthenticated: false });
          throw new Error('SESSION_EXPIRED');
        }
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          errorMessage = errorData.message || errorData.errors?.[0]?.msg || errorMessage;
        } catch (e) {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (!navigator.onLine) {
        throw new Error('OFFLINE');
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('CONNECTION_FAILED');
      }
      throw error;
    }
  }

  static async login(studentId, pin, deviceId) {
    return this.request('/auth/student/login', {
      method: 'POST',
      body: JSON.stringify({ studentId, pin, deviceId })
    });
  }

  static async validateSession() {
    return this.request('/auth/student/session');
  }

  static async logout() {
    return this.request('/auth/student/logout', {
      method: 'POST'
    });
  }

  static async submitActivity(entries) {
    return this.request('/activity/batch', {
      method: 'POST',
      body: JSON.stringify({ entries })
    });
  }

  static async getBlocklist() {
    return this.request('/extension/blocklist');
  }

  static async sendHeartbeat(data) {
    return this.request('/extension/heartbeat', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async checkUrl(url, domain) {
    return this.request('/extension/check-url', {
      method: 'POST',
      body: JSON.stringify({ url, domain })
    });
  }

  static async getActivityHistory(limit = 50) {
    return this.request(`/activity/history?limit=${limit}`);
  }

  static async getTimeRestrictions() {
    return this.request('/extension/time-restrictions');
  }
}

export default ApiClient;
