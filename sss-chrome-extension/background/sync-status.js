// Sync Status Manager - Tracks online/offline and sync state

class SyncStatusManager {
  constructor() {
    this.status = {
      isOnline: navigator.onLine,
      lastSyncTime: null,
      syncInProgress: false,
      pendingActivityCount: 0,
      offlineQueueCount: 0,
      lastError: null,
      blocklistVersion: null
    };

    this.listeners = new Set();
    this.init();
  }

  async init() {
    // Load persisted status
    const { syncStatus } = await chrome.storage.local.get('syncStatus');
    if (syncStatus) {
      this.status = { ...this.status, ...syncStatus };
    }

    // Update online status
    this.status.isOnline = navigator.onLine;

    // Set up online/offline listeners
    self.addEventListener('online', () => this.handleOnline());
    self.addEventListener('offline', () => this.handleOffline());

    // Update counts
    await this.updateCounts();
  }

  handleOnline() {
    this.status.isOnline = true;
    this.status.lastError = null;
    this.notify();
  }

  handleOffline() {
    this.status.isOnline = false;
    this.notify();
  }

  async updateCounts() {
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    this.status.offlineQueueCount = offlineQueue.length;
    await this.persist();
    this.notify();
  }

  setSyncInProgress(inProgress) {
    this.status.syncInProgress = inProgress;
    this.notify();
  }

  setLastSyncTime(time = Date.now()) {
    this.status.lastSyncTime = time;
    this.persist();
    this.notify();
  }

  setBlocklistVersion(version) {
    this.status.blocklistVersion = version;
    this.persist();
    this.notify();
  }

  setError(error) {
    this.status.lastError = {
      message: error.message || error,
      timestamp: Date.now()
    };
    this.persist();
    this.notify();
  }

  clearError() {
    this.status.lastError = null;
    this.notify();
  }

  setPendingActivityCount(count) {
    this.status.pendingActivityCount = count;
    this.notify();
  }

  getStatus() {
    return {
      ...this.status,
      isOnline: navigator.onLine // Always get current online status
    };
  }

  async persist() {
    await chrome.storage.local.set({
      syncStatus: {
        lastSyncTime: this.status.lastSyncTime,
        blocklistVersion: this.status.blocklistVersion,
        offlineQueueCount: this.status.offlineQueueCount
      }
    });
  }

  // Subscribe to status changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const status = this.getStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (e) {
        console.error('Status listener error:', e);
      }
    });
  }

  // Format status for display
  getDisplayStatus() {
    const status = this.getStatus();

    if (!status.isOnline) {
      return {
        state: 'offline',
        text: 'Offline',
        color: 'warning',
        icon: 'cloud-off'
      };
    }

    if (status.syncInProgress) {
      return {
        state: 'syncing',
        text: 'Syncing...',
        color: 'info',
        icon: 'refresh'
      };
    }

    if (status.offlineQueueCount > 0) {
      return {
        state: 'pending',
        text: `${status.offlineQueueCount} pending`,
        color: 'warning',
        icon: 'clock'
      };
    }

    if (status.lastError) {
      return {
        state: 'error',
        text: 'Sync error',
        color: 'error',
        icon: 'alert-circle',
        error: status.lastError.message
      };
    }

    return {
      state: 'synced',
      text: 'Connected',
      color: 'success',
      icon: 'check-circle'
    };
  }
}

// Singleton instance
const syncStatus = new SyncStatusManager();
export default syncStatus;
