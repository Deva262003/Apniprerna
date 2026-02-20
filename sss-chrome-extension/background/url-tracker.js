import ApiClient from './api-client.js';

class UrlTracker {
  constructor() {
    this.currentEntry = null;
    this.pendingEntries = [];
    this.BATCH_SIZE = 20;
    this.FLUSH_INTERVAL = 30000; // 30 seconds
    this.IDLE_THRESHOLD = 300; // 5 minutes in seconds
    this.isUserActive = true;
    this.flushTimer = null;
    this.visitedDomains = new Set();
  }

  async init() {
    // Set up idle detection
    chrome.idle.setDetectionInterval(this.IDLE_THRESHOLD);

    // Start periodic flush
    this.startFlushTimer();

    // Reset daily stats at midnight
    await this.checkAndResetDailyStats();

    // Load visited domains for today
    const { visitedDomainsToday = [] } = await chrome.storage.local.get('visitedDomainsToday');
    this.visitedDomains = new Set(visitedDomainsToday);

  }

  async checkAndResetDailyStats() {
    const { lastStatsReset } = await chrome.storage.local.get('lastStatsReset');
    const today = new Date().toDateString();

    if (lastStatsReset !== today) {
      // Reset daily stats
      await chrome.storage.local.set({
        sitesVisitedToday: 0,
        blockedCountToday: 0,
        visitedDomainsToday: [],
        lastStatsReset: today
      });
      this.visitedDomains = new Set();
    }
  }

  startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => this.flushEntries(), this.FLUSH_INTERVAL);
  }

  async handleTabActivated(activeInfo) {
    const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
    if (!isAuthenticated) return;

    // End previous entry
    await this.endCurrentEntry();

    // Start new entry
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url && !this.isInternalUrl(tab.url)) {
        await this.startNewEntry(tab);
      }
    } catch (error) {
    }
  }

  async handleUrlChange(tabId, url, tab) {
    const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
    if (!isAuthenticated) return;

    // Check if this is the active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.id === tabId && !this.isInternalUrl(url)) {
      await this.endCurrentEntry();
      await this.startNewEntry(tab);
    }
  }

  async handleWindowFocusChange(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus - pause tracking
      await this.pauseCurrentEntry();
    } else {
      // Browser gained focus - resume tracking
      await this.resumeCurrentEntry();
    }
  }

  handleIdleStateChange(state) {
    // state: 'active' | 'idle' | 'locked'
    if (state === 'active') {
      this.isUserActive = true;
      this.resumeCurrentEntry();
    } else {
      this.isUserActive = false;
      this.pauseCurrentEntry();
    }
  }

  async startNewEntry(tab) {
    const session = await chrome.storage.session.get(['isAuthenticated', 'studentId', 'centerId']);

    if (!session.isAuthenticated) return;

    try {
      const url = new URL(tab.url);
      const domain = url.hostname;

      this.currentEntry = {
        url: tab.url,
        domain: domain,
        title: tab.title || '',
        visitTime: new Date().toISOString(),
        startTime: Date.now(),
        activeTime: 0,
        idleTime: 0,
        pausedAt: null,
        wasBlocked: false,
        blockReason: null
      };

      // Track unique domains visited today
      if (!this.visitedDomains.has(domain)) {
        this.visitedDomains.add(domain);

        // Update storage
        const { sitesVisitedToday = 0 } = await chrome.storage.local.get('sitesVisitedToday');
        await chrome.storage.local.set({
          sitesVisitedToday: sitesVisitedToday + 1,
          visitedDomainsToday: Array.from(this.visitedDomains)
        });

      }

    } catch (error) {
      console.error('Error starting entry:', error);
    }
  }

  async endCurrentEntry() {
    if (!this.currentEntry) return;

    const endTime = Date.now();
    let activeTime = this.currentEntry.activeTime;
    let idleTime = this.currentEntry.idleTime || 0;

    // Add time since last pause (if not paused)
    if (!this.currentEntry.pausedAt) {
      activeTime += endTime - (this.currentEntry.resumedAt || this.currentEntry.startTime);
    }

    if (this.currentEntry.pausedAt && this.currentEntry.idleStart) {
      idleTime += endTime - this.currentEntry.idleStart;
    }

    const durationSeconds = Math.round(activeTime / 1000);
    const idleSeconds = Math.round(idleTime / 1000);

    // Only log if meaningful duration (> 2 seconds)
    if (durationSeconds > 2 || idleSeconds > 2) {
      const entry = {
        url: this.currentEntry.url,
        domain: this.currentEntry.domain,
        title: this.currentEntry.title,
        visitTime: this.currentEntry.visitTime,
        durationSeconds,
        idleSeconds,
        wasBlocked: this.currentEntry.wasBlocked,
        blockReason: this.currentEntry.blockReason
      };

      this.pendingEntries.push(entry);

      // Flush if batch is full
      if (this.pendingEntries.length >= this.BATCH_SIZE) {
        await this.flushEntries();
      }
    }

    this.currentEntry = null;
  }

  async pauseCurrentEntry() {
    if (this.currentEntry && !this.currentEntry.pausedAt) {
      const now = Date.now();
      this.currentEntry.activeTime += now - (this.currentEntry.resumedAt || this.currentEntry.startTime);
      this.currentEntry.pausedAt = now;
      this.currentEntry.idleStart = now;
    }
  }

  async resumeCurrentEntry() {
    if (this.currentEntry && this.currentEntry.pausedAt) {
      const now = Date.now();
      if (this.currentEntry.idleStart) {
        this.currentEntry.idleTime += now - this.currentEntry.idleStart;
      }
      this.currentEntry.resumedAt = now;
      this.currentEntry.pausedAt = null;
      this.currentEntry.idleStart = null;
    }
  }

  async flushEntries() {
    if (this.pendingEntries.length === 0) return;

    const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
    if (!isAuthenticated) {
      this.pendingEntries = [];
      return;
    }

    // Validate entries before sending
    const validatedEntries = this.pendingEntries.filter(entry => {
      const isValid = entry &&
        typeof entry.url === 'string' &&
        entry.url.length > 0 &&
        entry.visitTime;
      if (!isValid) {
        console.warn('Invalid entry filtered out:', entry);
      }
      return isValid;
    });

    if (validatedEntries.length === 0) {
      this.pendingEntries = [];
      return;
    }

    const entries = [...validatedEntries];
    this.pendingEntries = [];

    // Store in activity history for popup display
    await this.storeActivityHistory(entries);


    try {
      const response = await ApiClient.submitActivity(entries);
    } catch (error) {
      if (error.message === 'OFFLINE') {
        // Queue for later
        await this.queueForOffline(entries);
      } else if (error.message === 'SESSION_EXPIRED') {
        // Don't retry if session is expired
      } else {
        console.error('Failed to flush entries:', error.message);
        // Only retry a limited number of times
        const retryCount = entries[0]?._retryCount || 0;
        if (retryCount < 3) {
          entries.forEach(e => e._retryCount = retryCount + 1);
          this.pendingEntries = [...entries, ...this.pendingEntries];
        } else {
        }
      }
    }
  }

  async storeActivityHistory(entries) {
    try {
      const { activityHistory = [] } = await chrome.storage.local.get('activityHistory');

      // Add new entries at the beginning
      const updated = [...entries, ...activityHistory];

      // Keep only last 100 entries
      const trimmed = updated.slice(0, 100);

      await chrome.storage.local.set({ activityHistory: trimmed });
    } catch (error) {
      console.error('Failed to store activity history:', error);
    }
  }

  async queueForOffline(entries) {
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    await chrome.storage.local.set({
      offlineQueue: [...offlineQueue, ...entries]
    });
  }

  async flushOfflineQueue() {
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');

    if (offlineQueue.length === 0) return;

    try {
      await ApiClient.submitActivity(offlineQueue);
      await chrome.storage.local.remove('offlineQueue');
    } catch (error) {
      console.error('Failed to flush offline queue:', error);
    }
  }

  async logBlockedRequest(url, reason, category) {
    if (this.currentEntry && url.includes(this.currentEntry.domain)) {
      this.currentEntry.wasBlocked = true;
      this.currentEntry.blockReason = reason;
      this.currentEntry.blockCategory = category;
    }

    // Increment blocked count
    const { blockedCountToday = 0 } = await chrome.storage.local.get('blockedCountToday');
    await chrome.storage.local.set({
      blockedCountToday: blockedCountToday + 1
    });
  }

  isInternalUrl(url) {
    return url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:') ||
      url.startsWith('edge://') ||
      url.startsWith('file://');
  }
}

export default UrlTracker;
