// Content script - Lock overlay with inline login
// Light theme with warm teal accents

const overlayStyles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

#sss-lock-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: #ffffff !important;

  z-index: 2147483647 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
  overflow: hidden !important;
}

/* Warm gradient mesh */
#sss-lock-overlay .sss-bg-mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(26, 120, 252, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(249, 138, 29, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(26, 120, 252, 0.05) 0%, transparent 60%);

  pointer-events: none;
}

/* Dot pattern */
#sss-lock-overlay .sss-bg-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(26, 120, 252, 0.12) 1px, transparent 1px);

  background-size: 24px 24px;
  pointer-events: none;
}

#sss-lock-overlay .sss-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 0 24px;
  animation: sss-fade-up 0.5s ease-out;
}

@keyframes sss-fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
#sss-lock-overlay .sss-header {
  text-align: center;
  margin-bottom: 32px;
}

#sss-lock-overlay .sss-logo {
  width: 72px;
  height: 72px;
  background: linear-gradient(145deg, #1a78fc 0%, #1565d8 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 12px 40px rgba(26, 120, 252, 0.25);
}


#sss-lock-overlay .sss-logo svg {
  width: 36px;
  height: 36px;
  color: white;
}

#sss-lock-overlay .sss-brand {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}

#sss-lock-overlay .sss-tagline {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}


/* Login Card */
#sss-lock-overlay .sss-card {
  background: #ffffff;
  border: 1px solid rgba(26, 120, 252, 0.15);
  border-radius: 24px;
  padding: 32px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.02),
    0 12px 40px rgba(0, 0, 0, 0.06);
}


#sss-lock-overlay .sss-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}

#sss-lock-overlay .sss-card-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: linear-gradient(180deg, #1a78fc, #1565d8);
  border-radius: 2px;
}


/* Form reset */
#sss-lock-overlay input,
#sss-lock-overlay button {
  all: unset !important;
  box-sizing: border-box !important;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
}

/* Form */
#sss-lock-overlay .sss-input-group {
  margin-bottom: 20px;
}

#sss-lock-overlay .sss-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

#sss-lock-overlay .sss-input-wrap {
  position: relative;
}

#sss-lock-overlay .sss-input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #9ca3af;
  pointer-events: none;
  transition: color 0.2s;
}

#sss-lock-overlay .sss-input {
  display: block !important;
  width: 100% !important;
  padding-top: 16px !important;
  padding-right: 48px !important;
  padding-bottom: 16px !important;
  padding-left: 48px !important;
  background: #f9fafb !important;
  border: 2px solid #e5e7eb !important;
  border-radius: 14px !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  color: #1f2937 !important;
  transition: all 0.2s !important;
  outline: none !important;
  box-sizing: border-box !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}

#sss-lock-overlay .sss-toggle-visibility {
  all: unset !important;
  position: absolute !important;
  right: 12px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 32px !important;
  height: 32px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  color: #9ca3af !important;
}

#sss-lock-overlay .sss-toggle-visibility svg {
  width: 18px !important;
  height: 18px !important;
  pointer-events: none !important;
}

#sss-lock-overlay .sss-toggle-visibility:hover {
  color: #1f2937 !important;
}

#sss-lock-overlay .sss-toggle-visibility:focus-visible {
  outline: 2px solid rgba(26, 120, 252, 0.4) !important;
  border-radius: 8px !important;
}


#sss-lock-overlay .sss-toggle-visibility .icon-hide {
  display: none !important;
}

#sss-lock-overlay .sss-toggle-visibility.showing .icon-show {
  display: none !important;
}

#sss-lock-overlay .sss-toggle-visibility.showing .icon-hide {
  display: block !important;
}

#sss-lock-overlay .sss-input::placeholder {
  color: #9ca3af !important;
  font-weight: 400 !important;
  opacity: 1 !important;
}

#sss-lock-overlay .sss-input:focus {
  border-color: #1a78fc !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(26, 120, 252, 0.12) !important;
}

#sss-lock-overlay .sss-input:focus + .sss-input-icon {
  color: #1a78fc;
}


/* Error */
#sss-lock-overlay .sss-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
  display: none;
  align-items: center;
  gap: 12px;
  animation: sss-shake 0.4s ease;
}

#sss-lock-overlay .sss-error.show {
  display: flex;
}

@keyframes sss-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

#sss-lock-overlay .sss-error svg {
  width: 18px;
  height: 18px;
  color: #ef4444;
  flex-shrink: 0;
}

#sss-lock-overlay .sss-error span {
  font-size: 14px;
  font-weight: 500;
  color: #dc2626;
}

/* Button */
#sss-lock-overlay .sss-btn {
  width: 100% !important;
  padding: 16px 24px !important;
  background: linear-gradient(145deg, #1a78fc 0%, #1565d8 100%) !important;
  border: none !important;
  border-radius: 14px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: white !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  transition: all 0.2s !important;
  box-shadow: 0 4px 16px rgba(26, 120, 252, 0.3) !important;
}

#sss-lock-overlay .sss-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(26, 120, 252, 0.35);
}


#sss-lock-overlay .sss-btn:active {
  transform: translateY(0);
}

#sss-lock-overlay .sss-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

#sss-lock-overlay .sss-btn svg {
  width: 18px;
  height: 18px;
}

#sss-lock-overlay .sss-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: sss-spin 0.6s linear infinite;
}

@keyframes sss-spin {
  to { transform: rotate(360deg); }
}

/* Footer */
#sss-lock-overlay .sss-footer {
  text-align: center;
  margin-top: 28px;
}

#sss-lock-overlay .sss-footer span {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

/* Branding */
.sss-hidden {

  display: none !important;
}

/* Blocked Site Overlay */
#sss-blocked-overlay,
#sss-time-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: #ffffff !important;

  z-index: 2147483647 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
  overflow: hidden !important;
}

/* Background effects for blocked overlay */
#sss-blocked-overlay::before,
#sss-time-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(249, 138, 29, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(26, 120, 252, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

#sss-blocked-overlay::after,
#sss-time-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(26, 120, 252, 0.1) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}


#sss-blocked-overlay .sss-blocked-container,
#sss-time-overlay .sss-blocked-container {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 480px;
  padding: 40px;
  animation: sss-fade-up 0.5s ease-out;
}

#sss-blocked-overlay .sss-blocked-icon,
#sss-time-overlay .sss-blocked-icon {
  width: 88px;
  height: 88px;
  background: linear-gradient(145deg, #b91c1c 0%, #ef4444 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 0 12px 40px rgba(185, 28, 28, 0.28);
}


#sss-blocked-overlay .sss-blocked-icon svg,
#sss-time-overlay .sss-blocked-icon svg {
  width: 44px;
  height: 44px;
  color: white;
}

#sss-blocked-overlay .sss-blocked-title,
#sss-time-overlay .sss-blocked-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}


#sss-blocked-overlay .sss-blocked-message,
#sss-time-overlay .sss-blocked-message {
  font-size: 15px;
  color: #6b7280;
  margin-bottom: 28px;
  line-height: 1.6;
}

#sss-blocked-overlay .sss-blocked-domain,
#sss-time-overlay .sss-blocked-domain {
  display: inline-block;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 20px;
  font-family: 'Monaco', 'Consolas', monospace;
}

#sss-blocked-overlay .sss-blocked-category,
#sss-time-overlay .sss-blocked-category {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(249, 138, 29, 0.12);
  border: 1px solid rgba(249, 138, 29, 0.35);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #b66307;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 32px;
}


#sss-blocked-overlay .sss-back-btn,
#sss-time-overlay .sss-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(145deg, #1a78fc 0%, #1565d8 100%);
  border: none;
  border-radius: 12px;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(26, 120, 252, 0.3);
}

#sss-blocked-overlay .sss-back-btn:hover,
#sss-time-overlay .sss-back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(26, 120, 252, 0.35);
}


#sss-blocked-overlay .sss-back-btn svg,
#sss-time-overlay .sss-back-btn svg {
  width: 18px;
  height: 18px;
}

#sss-blocked-overlay .sss-blocked-footer,
#sss-time-overlay .sss-blocked-footer {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #d1d5db;
  font-weight: 500;
}
`;

let isLoggingIn = false;

(async function() {
  if (window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'chrome:' ||
      window.location.protocol === 'about:') {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
    if (!response.isAuthenticated) {
      injectLockOverlay();
    } else {
      if (response.timeRestricted) {
        injectTimeRestrictionOverlay(response.timeRestrictionMessage);
      } else {
        // User is authenticated, check if site is blocked
        await checkIfBlocked();
      }
    }
  } catch (error) {
    injectLockOverlay();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_STATE_CHANGED') {
      if (message.isAuthenticated) {
        removeOverlay();
        removeTimeRestrictionOverlay();
        // Check if site is blocked after login
        checkIfBlocked();
      } else {
        removeBlockedOverlay();
        removeTimeRestrictionOverlay();
        injectLockOverlay();
      }
    }
    if (message.type === 'TIME_RESTRICTION') {
      if (message.allowed) {
        removeTimeRestrictionOverlay();
        checkIfBlocked();
      } else {
        removeBlockedOverlay();
        injectTimeRestrictionOverlay(message.message);
      }
    }
  });
})();

async function checkIfBlocked() {
  try {
    const domain = window.location.hostname;
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_IF_BLOCKED',
      domain: domain,
      url: window.location.href
    });

    if (response && response.blocked) {
      injectBlockedOverlay(domain, response.category || 'Restricted');
    }
  } catch (error) {
  }
}

function injectStyles() {
  if (document.getElementById('sss-lock-styles')) return;
  const style = document.createElement('style');
  style.id = 'sss-lock-styles';
  style.textContent = overlayStyles;
  (document.head || document.documentElement).appendChild(style);
}

function setOverlayContent(target, markup) {
  try {
    target.innerHTML = markup;
    return;
  } catch (error) {
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${markup}</div>`, 'text/html');
  const wrapper = parsed.body.firstElementChild;
  if (!wrapper) return;

  Array.from(wrapper.childNodes).forEach((node) => {
    target.appendChild(document.importNode(node, true));
  });
}

function injectLockOverlay() {
  if (document.getElementById('sss-lock-overlay')) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.id = 'sss-lock-overlay';

  const markup = `
    <div class="sss-bg-mesh"></div>
    <div class="sss-bg-dots"></div>

    <div class="sss-container">
      <div class="sss-header">
        <div class="sss-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <h1 class="sss-brand">Apni Pathshala</h1>
        <p class="sss-tagline">Student Safety System</p>
      </div>

      <div class="sss-card">
        <div class="sss-card-title">Student Login</div>

        <form id="sss-login-form">
          <div class="sss-input-group">
            <label class="sss-label">Student ID</label>
            <div class="sss-input-wrap">
              <input type="text" id="sss-student-id" class="sss-input" placeholder="Enter 6-8 digit ID" inputmode="numeric" maxlength="8" autocomplete="off" required>
              <svg class="sss-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>

          <div class="sss-input-group">
            <label class="sss-label">PIN Code</label>
            <div class="sss-input-wrap">
              <input type="password" id="sss-pin" class="sss-input" placeholder="Enter 4-digit PIN" inputmode="numeric" maxlength="4" autocomplete="off" required>
              <svg class="sss-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <button class="sss-toggle-visibility" type="button" aria-label="Show PIN" title="Show PIN">
                <svg class="icon-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg class="icon-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.11-6.73"/>
                  <path d="M1 1l22 22"/>
                  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-3.19 4.56"/>
                  <path d="M9.9 9.9a3 3 0 0 0 4.24 4.24"/>
                  <path d="M14.12 14.12 9.88 9.88"/>
                </svg>
              </button>
            </div>
          </div>

          <div id="sss-error" class="sss-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span></span>
          </div>

          <button type="submit" id="sss-login-btn" class="sss-btn">
            <span class="sss-btn-text">Sign In</span>
            <svg class="sss-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            <div class="sss-spinner sss-hidden"></div>
          </button>
        </form>
      </div>

      <div class="sss-footer">
        <span>Protected browsing for learning centers</span>
      </div>
    </div>


  `;

  setOverlayContent(overlay, markup);

  document.documentElement.style.overflow = 'hidden';
  if (document.body) {
    document.body.prepend(overlay);
  } else {
    document.documentElement.appendChild(overlay);
  }
  setupLoginForm();
}

function setupLoginForm() {
  const form = document.getElementById('sss-login-form');
  const studentIdInput = document.getElementById('sss-student-id');
  const pinInput = document.getElementById('sss-pin');
  if (!form) return;

  studentIdInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
  });

  pinInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
  });

  const togglePinBtn = document.querySelector('.sss-toggle-visibility');
  if (togglePinBtn) {
    togglePinBtn.addEventListener('click', () => {
      const isMasked = pinInput.type === 'password';
      pinInput.type = isMasked ? 'text' : 'password';
      togglePinBtn.classList.toggle('showing', isMasked);
      togglePinBtn.setAttribute('aria-label', isMasked ? 'Hide PIN' : 'Show PIN');
      togglePinBtn.setAttribute('title', isMasked ? 'Hide PIN' : 'Show PIN');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;

    const studentId = studentIdInput.value;
    const pin = pinInput.value;

    if (!/^\d{6,8}$/.test(studentId)) {
      showError('Student ID must be 6-8 digits');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      showError('PIN must be 4 digits');
      return;
    }

    setLoading(true);
    hideError();

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LOGIN',
        payload: { studentId, pin }
      });

  if (!response.success) {
    showError(response.error || 'Invalid credentials');
    setLoading(false);
  } else {
    pinInput.type = 'password';
    if (togglePinBtn) {
      togglePinBtn.classList.remove('showing');
      togglePinBtn.setAttribute('aria-label', 'Show PIN');
      togglePinBtn.setAttribute('title', 'Show PIN');
    }
  }

    } catch (error) {
      showError('Connection error. Please try again.');
      setLoading(false);
    }
  });
}

function showError(message) {
  const errorEl = document.getElementById('sss-error');
  if (errorEl) {
    errorEl.querySelector('span').textContent = message;
    errorEl.classList.add('show');
  }
}

function hideError() {
  const errorEl = document.getElementById('sss-error');
  if (errorEl) errorEl.classList.remove('show');
}

function setLoading(loading) {
  isLoggingIn = loading;
  const btn = document.getElementById('sss-login-btn');
  if (!btn) return;

  btn.disabled = loading;
  const btnText = btn.querySelector('.sss-btn-text');
  const btnArrow = btn.querySelector('.sss-btn-arrow');
  const spinner = btn.querySelector('.sss-spinner');

  if (btnText) btnText.classList.toggle('sss-hidden', loading);
  if (btnArrow) btnArrow.classList.toggle('sss-hidden', loading);
  if (spinner) spinner.classList.toggle('sss-hidden', !loading);
}

function removeOverlay() {
  const overlay = document.getElementById('sss-lock-overlay');
  const styles = document.getElementById('sss-lock-styles');
  if (overlay) {
    overlay.remove();
    document.documentElement.style.overflow = '';
  }
  if (styles) styles.remove();
  isLoggingIn = false;
}

function injectBlockedOverlay(domain, category) {
  if (document.getElementById('sss-blocked-overlay')) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.id = 'sss-blocked-overlay';

  const markup = `
    <div class="sss-blocked-container">
      <div class="sss-blocked-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      </div>
      <h1 class="sss-blocked-title">Website Blocked</h1>
      <p class="sss-blocked-message">
        This website has been blocked by your learning center's safety policy.
        Please focus on your studies.
      </p>
      <div class="sss-blocked-domain">${escapeHtml(domain)}</div>
      <div class="sss-blocked-category">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        ${escapeHtml(category)}
      </div>
    </div>

  `;

  setOverlayContent(overlay, markup);

  document.documentElement.style.overflow = 'hidden';
  if (document.body) {
    document.body.prepend(overlay);
  } else {
    document.documentElement.appendChild(overlay);
  }

  // Log the blocked attempt
  chrome.runtime.sendMessage({
    type: 'LOG_BLOCKED_ATTEMPT',
    domain: domain,
    url: window.location.href,
    category: category
  }).catch(() => {});
}

function removeBlockedOverlay() {
  const overlay = document.getElementById('sss-blocked-overlay');
  if (overlay) {
    overlay.remove();
    document.documentElement.style.overflow = '';
  }
}

function injectTimeRestrictionOverlay(message) {
  if (document.getElementById('sss-time-overlay')) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.id = 'sss-time-overlay';

  const markup = `
    <div class="sss-blocked-container">
      <div class="sss-blocked-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <h1 class="sss-blocked-title">Browsing Paused</h1>
      <p class="sss-blocked-message">
        ${escapeHtml(message || 'Browsing is currently restricted by your learning center.')}
      </p>
      <div class="sss-blocked-category">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Time Restriction
      </div>
    </div>

  `;

  setOverlayContent(overlay, markup);

  document.documentElement.style.overflow = 'hidden';
  if (document.body) {
    document.body.prepend(overlay);
  } else {
    document.documentElement.appendChild(overlay);
  }
}

function removeTimeRestrictionOverlay() {
  const overlay = document.getElementById('sss-time-overlay');
  if (overlay) {
    overlay.remove();
    document.documentElement.style.overflow = '';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
