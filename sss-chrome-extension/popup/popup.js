// Popup Controller
class PopupController {
  constructor() {
    this.loginForm = document.getElementById('login-form');
    this.loginView = document.getElementById('login-view');
    this.dashboardView = document.getElementById('dashboard-view');
    this.loginBtn = document.getElementById('login-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    this.errorMessage = document.getElementById('error-message');
    this.durationInterval = null;
    this.syncStatusInterval = null;
    this.notificationTimeout = null;

    this.init();
  }

  async init() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });

      if (response.isAuthenticated) {
        await this.showDashboard(response);
      } else {
        this.showLogin();
      }
    } catch (error) {
      this.showLogin();
    }

    this.bindEvents();
  }

  bindEvents() {
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.logoutBtn.addEventListener('click', () => this.handleLogout());

    // Auto-format inputs
    document.getElementById('student-id').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });

    const pinInput = document.getElementById('pin');
    pinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });

    const togglePinBtn = document.querySelector('.toggle-visibility');
    if (togglePinBtn) {
      togglePinBtn.addEventListener('click', () => {
        const isMasked = pinInput.type === 'password';
        pinInput.type = isMasked ? 'text' : 'password';
        togglePinBtn.classList.toggle('showing', isMasked);
        togglePinBtn.setAttribute('aria-label', isMasked ? 'Hide PIN' : 'Show PIN');
        togglePinBtn.setAttribute('title', isMasked ? 'Hide PIN' : 'Show PIN');
      });
    }

    // Sync button
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSync());
    }

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
  }

  async handleLogin(e) {
    e.preventDefault();

    const studentId = document.getElementById('student-id').value;
    const pin = document.getElementById('pin').value;

    // Validate input
    if (!/^\d{6,8}$/.test(studentId)) {
      this.showError('Student ID must be 6-8 digits');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      this.showError('PIN must be 4 digits');
      return;
    }

    this.setLoading(true);
    this.hideError();

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LOGIN',
        payload: { studentId, pin }
      });

      if (response.success) {
        const authState = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
        await this.showDashboard(authState);
        this.showNotification('Login successful', 'success');
      } else {
        let errorMsg = response.error || 'Login failed';

        // Show remaining attempts for rate limiting
        if (response.rateLimited) {
          errorMsg = response.error;
        } else if (response.attemptsRemaining !== undefined && response.attemptsRemaining <= 3) {
          errorMsg += ` (${response.attemptsRemaining} attempts remaining)`;
        }

        this.showError(errorMsg);
      }
    } catch (error) {
      this.showError('Connection error. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  async handleLogout() {
    try {
      await chrome.runtime.sendMessage({ type: 'LOGOUT' });
      this.showLogin();
      this.showNotification('Session ended', 'info');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async handleSync() {
    const syncBtn = document.getElementById('sync-btn');
    syncBtn.classList.add('syncing');
    syncBtn.disabled = true;

    try {
      const result = await chrome.runtime.sendMessage({ type: 'SYNC_BLOCKLIST' });
      if (result.success) {
        this.showNotification('Sync completed', 'success');
      } else {
        this.showNotification('Sync failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      this.showNotification('Sync failed', 'error');
    } finally {
      syncBtn.classList.remove('syncing');
      syncBtn.disabled = false;
      await this.updateSyncStatus();
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Load activity if switching to activity tab
    if (tabName === 'activity') {
      this.loadActivityHistory();
    }
  }

  showLogin() {
    this.loginView.classList.remove('hidden');
    this.dashboardView.classList.remove('active');

    // Clear form
    document.getElementById('student-id').value = '';
    const pinInput = document.getElementById('pin');
    pinInput.type = 'password';
    pinInput.value = '';
    const togglePinBtn = document.querySelector('.toggle-visibility');
    if (togglePinBtn) {
      togglePinBtn.classList.remove('showing');
      togglePinBtn.setAttribute('aria-label', 'Show PIN');
      togglePinBtn.setAttribute('title', 'Show PIN');
    }
    this.hideError();

    // Clear intervals
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
    if (this.syncStatusInterval) {
      clearInterval(this.syncStatusInterval);
    }
  }

  async showDashboard(authState) {
    this.loginView.classList.add('hidden');
    this.dashboardView.classList.add('active');

    const studentName = authState.studentName || 'Student';

    // Update display
    document.getElementById('student-name').textContent = studentName;
    document.getElementById('student-id-display').textContent = `ID: ${authState.studentCode || '---'}`;
    document.getElementById('center-name').textContent = authState.centerName || 'Unknown';

    // Update avatar initial
    document.getElementById('avatar-initial').textContent = studentName.charAt(0).toUpperCase();

    // Update stats
    document.getElementById('sites-visited').textContent = authState.sitesVisited || 0;
    document.getElementById('blocked-count').textContent = authState.blockedCount || 0;

    // Time restriction warning
    const timeWarning = document.getElementById('time-restriction-warning');
    const timeMessage = document.getElementById('time-restriction-message');
    if (authState.timeRestricted) {
      timeMessage.textContent = authState.timeRestrictionMessage || 'Access restricted during this time.';
      timeWarning.classList.add('show');
    } else {
      timeWarning.classList.remove('show');
    }

    if (authState.sessionStart) {
      const startTime = new Date(authState.sessionStart);
      document.getElementById('session-start').textContent = startTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Start duration counter
      this.startDurationCounter(authState.sessionStart);
    }

    // Start sync status updates
    await this.updateSyncStatus();
    this.syncStatusInterval = setInterval(() => this.updateSyncStatus(), 10000);
  }

  startDurationCounter(startTime) {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }

    const updateDuration = () => {
      const duration = Date.now() - startTime;
      const hours = Math.floor(duration / 3600000);
      const minutes = Math.floor((duration % 3600000) / 60000);
      document.getElementById('session-duration').textContent = `${hours}h ${minutes}m`;
    };

    updateDuration();
    this.durationInterval = setInterval(updateDuration, 60000);
  }

  async updateSyncStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_SYNC_STATUS' });
      const statusBadge = document.getElementById('status-badge');
      const statusDot = statusBadge.querySelector('.status-dot');
      const statusText = statusBadge.querySelector('span');

      // Remove all status classes
      statusBadge.classList.remove('offline', 'error', 'syncing');

      switch (status.state) {
        case 'offline':
          statusBadge.classList.add('offline');
          statusText.textContent = 'Offline';
          break;
        case 'syncing':
          statusBadge.classList.add('syncing');
          statusText.textContent = 'Syncing';
          break;
        case 'error':
          statusBadge.classList.add('error');
          statusText.textContent = 'Error';
          break;
        case 'pending':
          statusBadge.classList.add('offline');
          statusText.textContent = status.text;
          break;
        default:
          statusText.textContent = 'Connected';
      }
    } catch (error) {
    }
  }

  async loadActivityHistory() {
    const activityList = document.getElementById('activity-list');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_ACTIVITY_HISTORY',
        limit: 20
      });

      if (response.success && response.data && response.data.length > 0) {
        activityList.innerHTML = response.data.map(item => this.renderActivityItem(item)).join('');
      } else {
        activityList.innerHTML = `
          <div class="empty-activity">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <p>No activity recorded yet</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to load activity:', error);
      activityList.innerHTML = `
        <div class="empty-activity">
          <p>Failed to load activity</p>
        </div>
      `;
    }
  }

  renderActivityItem(item) {
    const time = new Date(item.visitTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    const duration = item.durationSeconds
      ? (item.durationSeconds >= 60
        ? `${Math.floor(item.durationSeconds / 60)}m`
        : `${item.durationSeconds}s`)
      : '';

    const isBlocked = item.wasBlocked;

    return `
      <div class="activity-item">
        <div class="activity-favicon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <div class="activity-details">
          <div class="activity-domain">${this.escapeHtml(item.domain || 'Unknown')}</div>
          <div class="activity-time">${time}</div>
        </div>
        ${duration ? `<div class="activity-duration ${isBlocked ? 'activity-blocked' : ''}">${isBlocked ? 'Blocked' : duration}</div>` : ''}
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    const errorSpan = this.errorMessage.querySelector('span');
    if (errorSpan) {
      errorSpan.textContent = message;
    }
    this.errorMessage.classList.add('show');
  }

  hideError() {
    this.errorMessage.classList.remove('show');
  }

  setLoading(loading) {
    this.loginBtn.disabled = loading;
    const btnText = this.loginBtn.querySelector('.btn-text');
    const btnArrow = this.loginBtn.querySelector('.btn-arrow');
    const spinner = this.loginBtn.querySelector('.spinner');

    if (btnText) btnText.classList.toggle('hidden', loading);
    if (btnArrow) btnArrow.classList.toggle('hidden', loading);
    if (spinner) spinner.classList.toggle('hidden', !loading);
  }

  showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const messageEl = toast.querySelector('.message');
    const iconEl = document.getElementById('notification-icon');

    // Update message
    messageEl.textContent = message;

    // Update type class
    toast.classList.remove('success', 'error', 'warning', 'info');
    toast.classList.add(type);

    // Update icon based on type
    const icons = {
      success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      error: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
    };
    iconEl.innerHTML = icons[type] || icons.info;

    // Show toast
    toast.classList.add('show');

    // Auto hide after 3 seconds
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.hideNotification();
    }, 3000);
  }

  hideNotification() {
    const toast = document.getElementById('notification-toast');
    toast.classList.remove('show');
  }
}

// Global function for close button
window.hideNotification = function() {
  document.getElementById('notification-toast').classList.remove('show');
};

// Initialize
new PopupController();
