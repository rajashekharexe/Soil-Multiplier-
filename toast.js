// toast.js — Beautiful toast notification system for KAD Multiplier
// Usage: import { showToast } from './toast.js';
//        showToast('Your message here', 'success');  // types: success, error, warning, info

const TOAST_STYLES = `
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  pointer-events: all;
  min-width: 300px;
  max-width: 420px;
  padding: 14px 20px;
  border-radius: 12px;
  color: #fff;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  backdrop-filter: blur(12px);
  transform: translateX(120%);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast.show {
  transform: translateX(0);
  opacity: 1;
}
.toast.hide {
  transform: translateX(120%);
  opacity: 0;
}
.toast-error {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border-left: 4px solid #fca5a5;
}
.toast-success {
  background: linear-gradient(135deg, #059669, #047857);
  border-left: 4px solid #6ee7b7;
}
.toast-warning {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-left: 4px solid #fcd34d;
}
.toast-info {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-left: 4px solid #93c5fd;
}
.toast-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  line-height: 1;
}
.toast-message {
  flex: 1;
  line-height: 1.4;
}
.toast-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0 0 0 8px;
  transition: color 0.2s;
  line-height: 1;
}
.toast-close:hover {
  color: #fff;
}
@media (max-width: 480px) {
  .toast-container {
    left: 10px;
    right: 10px;
    top: 10px;
  }
  .toast {
    min-width: auto;
    font-size: 0.85rem;
    padding: 12px 16px;
  }
}
`;

let container = null;
let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = TOAST_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

function getContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

const ICONS = {
  error: '✕',
  success: '✓',
  warning: '⚠',
  info: 'ℹ'
};

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - Auto-dismiss in ms (default 4000, set 0 to disable)
 */
export function showToast(message, type = 'info', duration = 4000) {
  injectStyles();
  const c = getContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.textContent = ICONS[type] || ICONS.info;
  
  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  });
  
  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  toast.appendChild(closeBtn);
  c.appendChild(toast);

  // Trigger the entrance animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
      }
    }, duration);
  }
}
