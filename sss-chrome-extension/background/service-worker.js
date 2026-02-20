import AuthManager from './auth-manager.js';
import UrlTracker from './url-tracker.js';
import ApiClient from './api-client.js';
import BlocklistManager from './blocklist-manager.js';
import SecurityManager from './security.js';
import syncStatus from './sync-status.js';
import TimeRestrictionsManager from './time-restrictions.js';
import { ConfigManager } from './config.js';
import socketClient from './socket-client.js';

// Initialize managers
const authManager = new AuthManager();
const urlTracker = new UrlTracker();
const blocklistManager = new BlocklistManager();
const timeRestrictions = new TimeRestrictionsManager();

const COMMAND_ACK_KEY = 'pendingCommandAcks';
let commandListenerAttached = false;

async function getPendingCommandAcks() {
  const { pendingCommandAcks = [] } = await chrome.storage.local.get(COMMAND_ACK_KEY);
  return new Set(pendingCommandAcks);
}

async function queueCommandAck(commandId) {
  if (!commandId) return;
  const pending = await getPendingCommandAcks();
  pending.add(commandId);
  await chrome.storage.local.set({ [COMMAND_ACK_KEY]: Array.from(pending) });
}

async function clearCommandAcks() {
  await chrome.storage.local.remove(COMMAND_ACK_KEY);
}

async function handleCommand(command) {
  if (!command?.type) return;

  switch (command.type) {
    case 'FORCE_LOGOUT':
      await authManager.logout();
      await SecurityManager.clearSecureSession();
      await timeRestrictions.clearRestrictions();
      await socketClient.disconnect();
      break;
    case 'SYNC_BLOCKLIST': {
      const syncResult = await blocklistManager.syncBlocklist();
      if (syncResult?.timeRestrictions) {
        await timeRestrictions.setRestrictions(syncResult.timeRestrictions);
      }
      break;
    }
    default:
  }

  const commandId = command.id || command._id;
  await queueCommandAck(commandId);
}

async function handleCommands(commands) {
  if (!Array.isArray(commands) || commands.length === 0) return;
  for (const command of commands) {
    await handleCommand(command);
  }
}

async function initSocketConnection() {
  const session = await chrome.storage.session.get([
    'isAuthenticated',
    'studentId',
    'studentName',
    'centerId'
  ]);

  if (!session.isAuthenticated) return;

  await socketClient.connect({
    studentId: session.studentId,
    studentName: session.studentName,
    centerId: session.centerId
  });

  if (!commandListenerAttached) {
    socketClient.onCommand((command) => {
      handleCommand(command);
    });
    commandListenerAttached = true;
  }
}

// Service Worker lifecycle
chrome.runtime.onInstalled.addListener(async () => {
  await authManager.init();
  await urlTracker.init();
  await blocklistManager.init();
  await timeRestrictions.init();

  // Set up alarms
  chrome.alarms.create('heartbeat', { periodInMinutes: 2 });
  chrome.alarms.create('sync-blocklist', { periodInMinutes: 15 });
  chrome.alarms.create('flush-activity', { periodInMinutes: 1 });
  chrome.alarms.create('check-time-restrictions', { periodInMinutes: 1 });

  // Sync blocklist on install if authenticated
  const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
  if (isAuthenticated) {
    const syncResult = await blocklistManager.syncBlocklist();
    if (syncResult?.timeRestrictions) {
      await timeRestrictions.setRestrictions(syncResult.timeRestrictions);
    }
    await initSocketConnection();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await authManager.logout();
  await SecurityManager.clearSecureSession();
  await timeRestrictions.clearRestrictions();
  await socketClient.disconnect();
  await clearCommandAcks();

  await authManager.init();
  await urlTracker.init();
  await blocklistManager.init();
  await timeRestrictions.init();

  // Sync blocklist on startup if authenticated
  const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
  if (isAuthenticated) {
    const syncResult = await blocklistManager.syncBlocklist();
    if (syncResult?.timeRestrictions) {
      await timeRestrictions.setRestrictions(syncResult.timeRestrictions);
    }
    await initSocketConnection();
  }
});

// Tab events for URL tracking
chrome.tabs.onActivated.addListener((activeInfo) => {
  urlTracker.handleTabActivated(activeInfo);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    urlTracker.handleUrlChange(tabId, changeInfo.url, tab);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  urlTracker.handleWindowFocusChange(windowId);
});

// Idle detection
chrome.idle.onStateChanged.addListener((state) => {
  urlTracker.handleIdleStateChange(state);
});

// Alarm handlers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case 'heartbeat':
      await sendHeartbeat();
      break;
    case 'sync-blocklist':
      syncStatus.setSyncInProgress(true);
      try {
        const syncResult = await blocklistManager.syncBlocklist();
        if (syncResult?.timeRestrictions) {
          await timeRestrictions.setRestrictions(syncResult.timeRestrictions);
        }
        syncStatus.setLastSyncTime();
        syncStatus.clearError();
      } catch (err) {
        syncStatus.setError(err);
      } finally {
        syncStatus.setSyncInProgress(false);
      }
      break;
    case 'flush-activity':
      await urlTracker.flushEntries();
      await syncStatus.updateCounts();
      break;
    case 'check-time-restrictions':
      await timeRestrictions.checkCurrentTime();
      break;
  }
});

// Heartbeat
async function sendHeartbeat() {
  const { isAuthenticated } = await chrome.storage.session.get('isAuthenticated');
  if (!isAuthenticated) return;

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pendingAcks = await getPendingCommandAcks();
    const response = await ApiClient.sendHeartbeat({
      extensionVersion: chrome.runtime.getManifest().version,
      currentUrl: activeTab?.url || null,
      isActive: true,
      acknowledgedCommandIds: Array.from(pendingAcks)
    });

    if (response?.data?.commands?.length) {
      await handleCommands(response.data.commands);
    }

    if (pendingAcks.size > 0) {
      await clearCommandAcks();
    }
  } catch (error) {
  }
}


// Message handling from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case 'LOGIN':
        // Check rate limit before attempting login
        const rateCheck = await SecurityManager.checkLoginRateLimit();
        if (!rateCheck.allowed) {
          sendResponse({
            success: false,
            error: rateCheck.message,
            rateLimited: true,
            remainingMinutes: rateCheck.remainingMinutes
          });
          return;
        }

        const loginResult = await authManager.login(
          message.payload.studentId,
          message.payload.pin
        );

        if (loginResult.success) {
          await SecurityManager.recordLoginAttempt(true);
          // Sync blocklist after successful login
          syncStatus.setSyncInProgress(true);
          try {
            const syncResult = await blocklistManager.syncBlocklist();
            syncStatus.setLastSyncTime();
            syncStatus.clearError();
            if (syncResult?.timeRestrictions) {
              await timeRestrictions.setRestrictions(syncResult.timeRestrictions);
            }
          } catch (err) {
            syncStatus.setError(err);
          } finally {
            syncStatus.setSyncInProgress(false);
          }

          await initSocketConnection();
        } else {
          const attemptResult = await SecurityManager.recordLoginAttempt(false);
          loginResult.attemptsRemaining = attemptResult.attemptsRemaining;
        }
        sendResponse(loginResult);
        break;

      case 'LOGOUT':
        await authManager.logout();
        await SecurityManager.clearSecureSession();
        await timeRestrictions.clearRestrictions();
        await socketClient.disconnect();
        await clearCommandAcks();
        sendResponse({ success: true });
        break;

      case 'GET_AUTH_STATE':
        const authState = await authManager.getAuthState();
        const timeStatus = await timeRestrictions.getStatus();
        sendResponse({
          ...authState,
          timeRestricted: !timeStatus.isAllowed,
          timeRestrictionMessage: timeStatus.message
        });
        break;

      case 'VALIDATE_SESSION':
        const valid = await authManager.validateSession();
        sendResponse({ valid });
        break;

      case 'OPEN_LOGIN_POPUP':
        sendResponse({ message: 'Click the extension icon to login' });
        break;

      case 'SYNC_BLOCKLIST':
        try {
          syncStatus.setSyncInProgress(true);
          const syncResult = await blocklistManager.syncBlocklist();
          syncStatus.setLastSyncTime();
          syncStatus.clearError();
          sendResponse(syncResult);
        } catch (err) {
          syncStatus.setError(err);
          sendResponse({ success: false, error: err.message });
        } finally {
          syncStatus.setSyncInProgress(false);
        }
        break;

      case 'GET_BLOCKLIST_STATUS':
        try {
          const rulesCount = await blocklistManager.getRulesCount();
          const blockedDomains = await blocklistManager.getBlockedDomains();
          sendResponse({
            success: true,
            rulesCount,
            blockedDomains,
            version: blocklistManager.currentVersion
          });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
        break;

      case 'CHECK_IF_BLOCKED':
        try {
          const result = await blocklistManager.isUrlBlocked(message.url || `https://${message.domain}`);
          sendResponse(result);
        } catch (err) {
          sendResponse({ blocked: false, error: err.message });
        }
        break;

      case 'LOG_BLOCKED_ATTEMPT':
        try {
          const { blockedCountToday = 0 } = await chrome.storage.local.get('blockedCountToday');
          await chrome.storage.local.set({ blockedCountToday: blockedCountToday + 1 });
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false });
        }
        break;

      case 'GET_SYNC_STATUS':
        sendResponse(syncStatus.getDisplayStatus());
        break;

      case 'GET_ACTIVITY_HISTORY':
        try {
          // Get local activity history (pending + recently submitted)
          const { activityHistory = [] } = await chrome.storage.local.get('activityHistory');
          const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');

          // Combine and sort by time
          const combined = [...activityHistory, ...offlineQueue]
            .sort((a, b) => new Date(b.visitTime) - new Date(a.visitTime))
            .slice(0, message.limit || 50);

          sendResponse({ success: true, data: combined });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
        break;

      case 'GET_CONFIG':
        const config = await ConfigManager.getAll();
        sendResponse({ success: true, data: config });
        break;

      case 'SET_CONFIG':
        if (message.key === 'apiBaseUrl') {
          const result = await ConfigManager.setApiBaseUrl(message.value);
          sendResponse(result);
        } else {
          await ConfigManager.set(message.key, message.value);
          sendResponse({ success: true });
        }
        break;

      case 'GET_TIME_RESTRICTIONS':
        sendResponse({
          success: true,
          data: await timeRestrictions.getStatus()
        });
        break;

      case 'CHECK_RATE_LIMIT':
        const limit = await SecurityManager.checkLoginRateLimit();
        sendResponse(limit);
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ error: error.message });
  }
}

// Network online/offline handling
self.addEventListener('online', () => {
  syncStatus.handleOnline();
  urlTracker.flushOfflineQueue();
  syncStatus.setSyncInProgress(true);
  blocklistManager.syncBlocklist()
    .then(async (syncResult) => {
      syncStatus.setLastSyncTime();
      syncStatus.clearError();
      if (syncResult?.timeRestrictions) {
        await timeRestrictions.setRestrictions(syncResult.timeRestrictions);
      }
    })
    .catch(err => {
      syncStatus.setError(err);
    })
    .finally(() => syncStatus.setSyncInProgress(false));
  initSocketConnection();
});

self.addEventListener('offline', () => {
  syncStatus.handleOffline();
  socketClient.disconnect();
});

