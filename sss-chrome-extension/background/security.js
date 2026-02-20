// Security Manager - Encryption and Rate Limiting
import { ConfigManager } from './config.js';

class SecurityManager {
  // Simple encryption using SubtleCrypto with device-specific key
  static async getEncryptionKey() {
    const { encryptionKey } = await chrome.storage.local.get('encryptionKey');

    if (encryptionKey) {
      return await crypto.subtle.importKey(
        'raw',
        new Uint8Array(encryptionKey),
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Export and store
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    await chrome.storage.local.set({
      encryptionKey: Array.from(new Uint8Array(exportedKey))
    });

    return key;
  }

  static async encrypt(data) {
    try {
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(JSON.stringify(data));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }

  static async decrypt(encryptedObj) {
    try {
      if (!encryptedObj || !encryptedObj.iv || !encryptedObj.data) {
        return null;
      }

      const key = await this.getEncryptionKey();
      const iv = new Uint8Array(encryptedObj.iv);
      const data = new Uint8Array(encryptedObj.data);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Rate limiting for login attempts
  static async checkLoginRateLimit() {
    const { loginAttempts = [] } = await chrome.storage.local.get('loginAttempts');
    const maxAttempts = await ConfigManager.get('maxLoginAttempts');
    const lockoutMinutes = await ConfigManager.get('loginLockoutMinutes');

    const now = Date.now();
    const lockoutMs = lockoutMinutes * 60 * 1000;

    // Filter to recent attempts within lockout window
    const recentAttempts = loginAttempts.filter(
      timestamp => now - timestamp < lockoutMs
    );

    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const unlockTime = oldestAttempt + lockoutMs;
      const remainingMs = unlockTime - now;
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      return {
        allowed: false,
        remainingMinutes,
        message: `Too many login attempts. Try again in ${remainingMinutes} minute(s).`
      };
    }

    return { allowed: true, remainingAttempts: maxAttempts - recentAttempts.length };
  }

  static async recordLoginAttempt(success = false) {
    if (success) {
      // Clear attempts on successful login
      await chrome.storage.local.remove('loginAttempts');
      return;
    }

    const { loginAttempts = [] } = await chrome.storage.local.get('loginAttempts');
    const maxAttempts = await ConfigManager.get('maxLoginAttempts');
    const lockoutMinutes = await ConfigManager.get('loginLockoutMinutes');
    const lockoutMs = lockoutMinutes * 60 * 1000;
    const now = Date.now();

    // Keep only recent attempts and add new one
    const recentAttempts = loginAttempts.filter(
      timestamp => now - timestamp < lockoutMs
    );
    recentAttempts.push(now);

    await chrome.storage.local.set({ loginAttempts: recentAttempts });

    return {
      attemptsRemaining: Math.max(0, maxAttempts - recentAttempts.length)
    };
  }

  // Secure session storage
  static async storeSecureSession(sessionData) {
    const encrypted = await this.encrypt(sessionData);
    if (encrypted) {
      await chrome.storage.local.set({ secureSession: encrypted });
      return true;
    }
    return false;
  }

  static async getSecureSession() {
    const { secureSession } = await chrome.storage.local.get('secureSession');
    if (!secureSession) return null;
    return await this.decrypt(secureSession);
  }

  static async clearSecureSession() {
    await chrome.storage.local.remove(['secureSession', 'loginAttempts']);
  }
}

export default SecurityManager;
