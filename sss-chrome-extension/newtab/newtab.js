// Clock
function updateClock() {
  const now = new Date();
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');

  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Initialize clock
updateClock();
setInterval(updateClock, 1000);

// Search functionality
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) {
        if (query.includes('.') && !query.includes(' ')) {
          window.location.href = query.startsWith('http') ? query : 'https://' + query;
        } else {
          window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(query);
        }
      }
    }
  });
}

// Session time counter
let sessionStart = null;

function updateSessionTime() {
  if (sessionStart) {
    const duration = Date.now() - sessionStart;
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const sessionTimeEl = document.getElementById('session-time');
    if (sessionTimeEl) {
      sessionTimeEl.textContent = `${hours}h ${minutes}m`;
    }
  }
}

const loginForm = document.getElementById('newtab-login-form');
const loginButton = document.getElementById('newtab-login-btn');
const errorBox = document.getElementById('newtab-error');
const studentIdInput = document.getElementById('newtab-student-id');
const pinInput = document.getElementById('newtab-pin');
const togglePinBtn = document.querySelector('.toggle-visibility');

if (studentIdInput) {
  studentIdInput.addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 8);
  });
}

if (pinInput) {
  pinInput.addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
  });
}

if (togglePinBtn && pinInput) {
  togglePinBtn.addEventListener('click', () => {
    const isMasked = pinInput.type === 'password';
    pinInput.type = isMasked ? 'text' : 'password';
    togglePinBtn.classList.toggle('showing', isMasked);
    togglePinBtn.setAttribute('aria-label', isMasked ? 'Hide PIN' : 'Show PIN');
    togglePinBtn.setAttribute('title', isMasked ? 'Hide PIN' : 'Show PIN');
  });
}

function showLoginError(message) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.add('show');
}

function clearLoginError() {
  if (!errorBox) return;
  errorBox.textContent = '';
  errorBox.classList.remove('show');
}

function setLoginLoading(isLoading) {
  if (!loginButton) return;
  loginButton.disabled = isLoading;
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  clearLoginError();

  const studentId = studentIdInput?.value.trim() || '';
  const pin = pinInput?.value.trim() || '';

  if (!/^[0-9]{6,8}$/.test(studentId)) {
    showLoginError('Student ID must be 6-8 digits.');
    return;
  }

  if (!/^[0-9]{4}$/.test(pin)) {
    showLoginError('PIN must be 4 digits.');
    return;
  }

  setLoginLoading(true);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LOGIN',
      payload: { studentId, pin }
    });

    if (response?.success) {
      if (studentIdInput) studentIdInput.value = '';
      if (pinInput) pinInput.value = '';
      await checkAuth();
    } else {
      let message = response?.error || 'Login failed. Please try again.';
      if (response?.rateLimited) {
        message = response.error || message;
      } else if (response?.attemptsRemaining !== undefined && response.attemptsRemaining <= 3) {
        message += ` (${response.attemptsRemaining} attempts remaining)`;
      }
      showLoginError(message);
    }
  } catch (error) {
    showLoginError('Connection error. Please try again.');
  } finally {
    setLoginLoading(false);
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', handleLoginSubmit);
}

// Auth state check
async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });

    const lockedView = document.getElementById('locked-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (response && response.isAuthenticated) {
      window.location.replace('https://www.google.com');
      return;
    }

    if (lockedView) lockedView.classList.add('active');
    if (dashboardView) dashboardView.classList.add('hidden');
  } catch (error) {
    const lockedView = document.getElementById('locked-view');
    const dashboardView = document.getElementById('dashboard-view');
    if (lockedView) lockedView.classList.add('active');
    if (dashboardView) dashboardView.classList.add('hidden');
  }
}

// Initial auth check
checkAuth();

// Listen for auth changes
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'AUTH_STATE_CHANGED') {
    checkAuth();
  }
});
