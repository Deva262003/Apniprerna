// Time Restrictions Manager - Time-based access controls

class TimeRestrictionsManager {
  constructor() {
    this.restrictions = null;
    this.checkInterval = null;
  }

  async init() {
    await this.loadRestrictions();
    this.startPeriodicCheck();
  }

  async loadRestrictions() {
    // Load from local storage (synced from server)
    const { timeRestrictions } = await chrome.storage.local.get('timeRestrictions');
    this.restrictions = timeRestrictions || null;

  }

  async syncFromServer(restrictions) {
    this.restrictions = restrictions;
    await chrome.storage.local.set({ timeRestrictions: restrictions });
  }

  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkCurrentTime();
    }, 60000);

    // Initial check
    this.checkCurrentTime();
  }

  async checkCurrentTime() {
    const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
    if (!isAuthenticated) return;

    const accessStatus = await this.isAccessAllowed();

    if (!accessStatus.allowed) {
      // Notify about restricted access
      await chrome.storage.session.set({
        timeRestricted: true,
        timeRestrictionMessage: accessStatus.message
      });

      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'TIME_RESTRICTION',
            allowed: false,
            message: accessStatus.message
          });
        } catch (e) {
          // Tab might not have content script
        }
      }
    } else {
      await chrome.storage.session.set({
        timeRestricted: false,
        timeRestrictionMessage: null
      });

      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'TIME_RESTRICTION',
            allowed: true
          });
        } catch (e) {
          // Tab might not have content script
        }
      }
    }
  }

  async isAccessAllowed() {
    if (!this.restrictions || !this.restrictions.enabled) {
      return { allowed: true };
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    // Check if today is an allowed day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[currentDay];

    if (this.restrictions.allowedDays && !this.restrictions.allowedDays.includes(today)) {
      return {
        allowed: false,
        reason: 'day_restricted',
        message: `Browsing is not allowed on ${today.charAt(0).toUpperCase() + today.slice(1)}s.`
      };
    }

    // Check time windows
    if (this.restrictions.timeWindows && this.restrictions.timeWindows.length > 0) {
      const isWithinWindow = this.restrictions.timeWindows.some(window => {
        const startMinutes = this.parseTime(window.start);
        const endMinutes = this.parseTime(window.end);

        // Handle overnight windows (e.g., 22:00 - 06:00)
        if (startMinutes > endMinutes) {
          return currentTime >= startMinutes || currentTime <= endMinutes;
        }

        return currentTime >= startMinutes && currentTime <= endMinutes;
      });

      if (!isWithinWindow) {
        const windowsStr = this.restrictions.timeWindows
          .map(w => `${w.start} - ${w.end}`)
          .join(', ');

        return {
          allowed: false,
          reason: 'time_restricted',
          message: `Browsing is only allowed during: ${windowsStr}`
        };
      }
    }

    // Check max session duration
    if (this.restrictions.maxSessionMinutes) {
      const { sessionStartTime } = await chrome.storage.local.get('sessionStartTime');
      if (sessionStartTime) {
        const sessionDuration = (Date.now() - sessionStartTime) / 60000; // minutes
        if (sessionDuration > this.restrictions.maxSessionMinutes) {
          return {
            allowed: false,
            reason: 'session_limit',
            message: `Maximum session time of ${this.restrictions.maxSessionMinutes} minutes reached.`
          };
        }
      }
    }

    return { allowed: true };
  }

  parseTime(timeStr) {
    // Parse "HH:MM" format to minutes since midnight
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  async getStatus() {
    const accessStatus = await this.isAccessAllowed();

    return {
      hasRestrictions: this.restrictions?.enabled || false,
      isAllowed: accessStatus.allowed,
      message: accessStatus.message || null,
      restrictions: this.restrictions
    };
  }

  async setRestrictions(restrictions) {
    await this.syncFromServer(restrictions);
    await this.checkCurrentTime();
  }

  async clearRestrictions() {
    this.restrictions = null;
    await chrome.storage.local.remove('timeRestrictions');
    await chrome.storage.session.set({
      timeRestricted: false,
      timeRestrictionMessage: null
    });
  }
}

export default TimeRestrictionsManager;
