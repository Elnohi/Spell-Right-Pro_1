// common.js - Shared Core v2.4 (Full Feature Set)

// ======================
// Firebase Services
// ======================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

let firebaseApp;
let auth;
let db;
let analytics;

try {
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    analytics = firebase.analytics();
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

// ======================
// DOM Utilities
// ======================
const getElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element #${id} not found`);
  return el;
};

const showAlert = (message, type = 'error', duration = 3000) => {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <span>${message}</span>
    <button class="close-btn">&times;</button>
  `;
  document.body.appendChild(alert);
  
  alert.querySelector('.close-btn').addEventListener('click', () => {
    alert.remove();
  });
  
  if (duration > 0) {
    setTimeout(() => alert.remove(), duration);
  }
};

// ======================
// Flagging System (Full Implementation)
// ======================
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords')) || [];

function toggleFlagWord(word, options = {}) {
  if (!word) return;
  
  const index = flaggedWords.indexOf(word);
  const shouldUpdateUI = options.updateUI !== false;
  
  if (index === -1) {
    flaggedWords.push(word);
  } else {
    flaggedWords.splice(index, 1);
  }
  
  localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
  
  // UI Updates (skip when called from spelling-bee)
  if (shouldUpdateUI) {
    const flagBtn = getElement('flagWordBtn');
    if (flagBtn) {
      flagBtn.classList.toggle('active', flaggedWords.includes(word));
      flagBtn.innerHTML = flaggedWords.includes(word)
        ? '<i class="fas fa-flag"></i> Flagged'
        : '<i class="far fa-flag"></i> Flag';
    }
    
    document.querySelectorAll('.word-flag').forEach(el => {
      if (el.dataset.word === word) {
        el.classList.toggle('active', flaggedWords.includes(word));
      }
    });
  }
}

function showFlaggedWords(containerId = 'flagged-container') {
  const container = getElement(containerId);
  if (!container || flaggedWords.length === 0) return;
  
  container.innerHTML = `
    <div class="flagged-section">
      <h3><i class="fas fa-flag"></i> Flagged Words</h3>
      <ul class="flagged-list">
        ${flaggedWords.map(word => `
          <li data-word="${word}">
            ${word}
            <button class="unflag-btn" data-word="${word}">
              <i class="fas fa-times"></i>
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
  
  container.querySelectorAll('.unflag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      toggleFlagWord(e.target.dataset.word);
      e.target.closest('li').remove();
    });
  });
}

// ======================
// Theme Management (Full)
// ======================
function initThemeToggle() {
  const toggleBtn = getElement('theme-toggle');
  const icon = getElement('theme-icon');
  
  if (!toggleBtn || !icon) return;
  
  const applyTheme = (isDark) => {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('darkMode', isDark);
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    
    // Dispatch event for other modules
    document.dispatchEvent(
      new CustomEvent('themeChange', { detail: { isDark } })
    );
  };
  
  toggleBtn.addEventListener('click', () => {
    applyTheme(!document.body.classList.contains('dark-mode'));
  });
  
  // Initialize
  applyTheme(localStorage.getItem('darkMode') === 'true');
}

// ======================
// Spelling Extensions (New)
// ======================
const spelling = {
  speak: (text, lang = 'en-US', rate = 0.8, callbacks = {}) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    
    if (callbacks.onStart) utterance.onstart = callbacks.onStart;
    if (callbacks.onEnd) utterance.onend = callbacks.onEnd;
    if (callbacks.onError) utterance.onerror = callbacks.onError;
    
    speechSynthesis.speak(utterance);
    return utterance;
  },
  
  cancelSpeech: () => {
    speechSynthesis.cancel();
  },
  
  initRecognition: (lang = 'en-US', callbacks = {}) => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    
    if (callbacks.onResult) recognition.onresult = callbacks.onResult;
    if (callbacks.onError) recognition.onerror = callbacks.onError;
    if (callbacks.onEnd) recognition.onend = callbacks.onEnd;
    
    return recognition;
  }
};

// ======================
// Navigation & Analytics
// ======================
function trackEvent(name, params = {}) {
  try {
    if (analytics) {
      analytics.logEvent(name, params);
    }
    console.debug('[Analytics]', name, params);
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

function setupNavigation() {
  document.querySelectorAll('[data-navigate]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      trackEvent('navigation', { page: link.dataset.navigate });
      window.location.href = link.href;
    });
  });
}

// Initialize core features
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  setupNavigation();
});

// At the very end of common.js:
window.toggleFlagWord = toggleFlagWord;
window.showFlaggedWords = showFlaggedWords;
window.initThemeToggle = initThemeToggle;
window.spelling = spelling;
