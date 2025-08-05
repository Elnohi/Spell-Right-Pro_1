// common.js - Shared Core Functionality v2.3

// ======================
// Firebase Initialization
// ======================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let firebaseApp;
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebaseApp = firebase.initializeApp(firebaseConfig);
}

// ======================
// DOM Utilities
// ======================
const getElement = (id) => document.getElementById(id) || console.warn(`Element #${id} not found`);

// ======================
// Flagging System (Legacy)
// ======================
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords')) || [];

export function toggleFlagWord(word, options = {}) {
  const index = flaggedWords.indexOf(word);
  
  if (index === -1) {
    flaggedWords.push(word);
  } else {
    flaggedWords.splice(index, 1);
  }
  
  localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
  
  // Legacy UI update (unchanged for OET)
  if (!options.forSpelling) {
    const flagBtn = getElement('flagWordBtn');
    if (flagBtn) {
      flagBtn.classList.toggle('active', flaggedWords.includes(word));
      flagBtn.innerHTML = flaggedWords.includes(word) 
        ? '<i class="fas fa-flag"></i> Flagged' 
        : '<i class="far fa-flag"></i> Flag Word';
    }
  }
}

// ======================
// Theme Management
// ======================
export function initThemeToggle() {
  const toggleBtn = getElement('modeToggle');
  const icon = getElement('modeIcon');
  
  if (!toggleBtn || !icon) return;

  const applyDarkMode = (isDark) => {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('darkMode', isDark ? 'on' : 'off');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  };

  toggleBtn.addEventListener('click', () => {
    applyDarkMode(!document.body.classList.contains('dark-mode'));
  });

  applyDarkMode(localStorage.getItem('darkMode') === 'on');
}

// ======================
// Spelling Bee Extensions
// ======================
export const _spelling = {
  speak: (text, lang = 'en-US', rate = 0.8) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    speechSynthesis.speak(utterance);
    return utterance;
  },
  
  cancelSpeech: () => speechSynthesis.cancel(),
  
  initRecognition: (lang = 'en-US') => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = lang;
    return recognition;
  }
};

// ======================
// Initialization
// ======================
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
});
