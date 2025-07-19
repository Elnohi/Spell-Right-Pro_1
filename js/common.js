// common.js - Shared utilities for SpellRightPro
import { firebaseConfig, examTypes, defaultWords, accentOptions } from './config.js';

// =====================
// Firebase Initialization
// =====================
let firebaseInitialized = false;

/**
 * Initialize Firebase app if not already initialized
 * @returns {firebase.app.App} Firebase app instance
 */
export function initializeFirebase() {
  if (!firebaseInitialized && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    firebaseInitialized = true;
    
    // Enable analytics if needed
    if (firebase.analytics) {
      firebase.analytics();
    }
  }
  return firebase;
}

// =====================
// Theme/Dark Mode
// =====================
/**
 * Initialize theme toggle functionality
 * @param {string} toggleBtnId - ID of theme toggle button
 * @param {string} iconId - ID of theme icon element
 */
export function initThemeToggle(toggleBtnId = "modeToggle", iconId = "modeIcon") {
  const modeToggle = document.getElementById(toggleBtnId);
  const modeIcon = document.getElementById(iconId);
  
  if (!modeToggle || !modeIcon) return;

  const applyDarkMode = (darkMode) => {
    document.body.classList.toggle("dark-mode", darkMode);
    modeIcon.classList.toggle("fa-moon", !darkMode);
    modeIcon.classList.toggle("fa-sun", darkMode);
    localStorage.setItem('darkMode', darkMode ? 'on' : 'off');
    
    // Update meta theme-color
    const themeColor = darkMode ? '#121212' : '#007bff';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
  };

  modeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-mode");
    applyDarkMode(!isDark);
    gaEvent('ui', 'toggle_theme', isDark ? 'light' : 'dark');
  });

  // Restore from storage or prefer-color-scheme
  const savedMode = localStorage.getItem('darkMode') === 'on';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyDarkMode(savedMode || (localStorage.getItem('darkMode') === null && prefersDark));
}

// =====================
// Authentication
// =====================
/**
 * Initialize Firebase auth state listener
 * @param {firebase.app.App} firebase - Firebase app instance
 * @param {string} loginStatusId - ID of login status element
 * @param {string} hiddenEmailId - ID of hidden email field
 * @returns {firebase.auth.Auth} Firebase auth instance
 */
export function initAuth(firebase, loginStatusId = "loginStatus", hiddenEmailId = "formHiddenEmail") {
  const auth = firebase.auth();
  
  auth.onAuthStateChanged(user => {
    const loginStatus = document.getElementById(loginStatusId);
    const hiddenEmail = document.getElementById(hiddenEmailId);
    
    if (user) {
      if (hiddenEmail) hiddenEmail.value = user.email;
      if (loginStatus) {
        loginStatus.innerText = `Logged in as ${user.email}`;
        loginStatus.className = "auth-status logged-in";
      }
      gaEvent('auth', 'login', user.email);
    } else {
      if (loginStatus) {
        loginStatus.innerText = "Not logged in";
        loginStatus.className = "auth-status not-logged";
      }
      if (hiddenEmail) hiddenEmail.value = "";
    }
  });
  
  return auth;
}

/**
 * Add auth event listeners to buttons
 * @param {firebase.auth.Auth} auth - Firebase auth instance
 * @param {string} loginId - ID of login button
 * @param {string} signupId - ID of signup button
 * @param {string} logoutId - ID of logout button
 * @param {string} emailInputId - ID of email input
 * @param {string} pwInputId - ID of password input
 */
export function addAuthListeners(auth, loginId, signupId, logoutId, emailInputId, pwInputId) {
  const loginBtn = document.getElementById(loginId);
  const signupBtn = document.getElementById(signupId);
  const logoutBtn = document.getElementById(logoutId);

  const handleAuth = async (authFunction, successMessage, eventCategory) => {
    const email = document.getElementById(emailInputId)?.value.trim();
    const pw = document.getElementById(pwInputId)?.value;
    
    if (!email || !pw) {
      showNotification("Email and password required", "error");
      return;
    }

    try {
      await authFunction(email, pw);
      showNotification(successMessage, "success");
      gaEvent('auth', eventCategory, 'success');
    } catch (e) {
      showNotification(e.message, "error");
      gaEvent('auth', eventCategory, 'error', e.code);
      console.error(e);
    }
  };

  if (loginBtn) {
    loginBtn.addEventListener("click", () => 
      handleAuth(
        auth.signInWithEmailAndPassword.bind(auth), 
        "Logged in successfully",
        "email_login"
      )
    );
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => 
      handleAuth(
        auth.createUserWithEmailAndPassword.bind(auth), 
        "Account created successfully",
        "email_signup"
      )
    );
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut();
      showNotification("Logged out", "info");
      gaEvent('auth', 'logout');
    });
  }
}

// =====================
// Notification System
// =====================
/**
 * Show a temporary notification banner
 * @param {string} msg - Message to display
 * @param {string} type - Notification type ('error', 'success', 'info')
 * @param {number} duration - Duration in ms (default: 3000)
 */
export function showNotification(msg, type = 'info', duration = 3000) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute("role", "alert");
  notification.setAttribute("aria-live", "assertive");
  notification.innerHTML = `
    <span class="notification-icon">
      ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
    </span>
    <span class="notification-message">${msg}</span>
  `;

  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add("show"), 10);
  
  const hideNotification = () => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  };
  
  const timeoutId = setTimeout(hideNotification, duration);
  
  // Allow click to dismiss
  notification.addEventListener('click', () => {
    clearTimeout(timeoutId);
    hideNotification();
  });
}

// =====================
// File Handling
// =====================
/**
 * Load words from a text file
 * @param {File} file - File object to read
 * @returns {Promise<string[]>} Array of words
 */
export async function loadWordsFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const words = e.target.result.split(/\r?\n/)
          .map(w => w.trim())
          .filter(w => w);
        gaEvent('file', 'load_success', file.name, words.length);
        resolve(words);
      } catch (error) {
        gaEvent('file', 'load_error', file.name);
        reject(new Error("Failed to parse file"));
      }
    };
    reader.onerror = () => {
      gaEvent('file', 'read_error', file.name);
      reject(new Error("Failed to read file"));
    };
    reader.readAsText(file);
  });
}

/**
 * Setup file upload handler
 * @param {string} inputId - ID of file input element
 * @param {function} callback - Callback with loaded words
 */
export function setupFileUpload(inputId, callback) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showNotification("Loading word list...", "info");
    
    try {
      const words = await loadWordsFromFile(file);
      callback(words);
      showNotification(`Loaded ${words.length} words from ${file.name}`, "success");
    } catch (error) {
      showNotification("Failed to load words", "error");
      console.error(error);
    }
  });
}

// =====================
// Speech Utilities
// =====================
/**
 * Speak text using speech synthesis
 * @param {string} text - Text to speak
 * @param {string} lang - Language code (default: 'en-US')
 * @param {number} rate - Speech rate (default: 0.9)
 * @returns {Promise<void>}
 */
export async function speak(text, lang = 'en-US', rate = 0.9) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.volume = 1;

    utterance.onend = () => {
      gaEvent('speech', 'synthesis_end', text);
      resolve();
    };
    utterance.onerror = (event) => {
      gaEvent('speech', 'synthesis_error', text);
      reject(new Error(`Speech error: ${event.error}`));
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    gaEvent('speech', 'synthesis_start', text);
  });
}

/**
 * Setup speech recognition
 * @param {string} lang - Language code
 * @param {function} onResult - Callback with recognition result
 * @param {function} onError - Error callback
 * @returns {SpeechRecognition}
 */
export function setupSpeechRecognition(lang, onResult, onError) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    throw new Error("Speech recognition not supported in this browser");
  }

  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    gaEvent('speech', 'recognition_success', transcript);
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    gaEvent('speech', 'recognition_error', event.error);
    onError(event.error);
  };

  recognition.onstart = () => {
    gaEvent('speech', 'recognition_start');
  };

  return recognition;
}

// =====================
// UI Components
// =====================
/**
 * Create a word box component
 * @param {string} word - Current word
 * @param {number} current - Current word index
 * @param {number} total - Total word count
 * @returns {HTMLDivElement}
 */
export function createWordBox(word, current, total) {
  const box = document.createElement('div');
  box.className = 'word-box';
  box.innerHTML = `
    <h3>Word ${current} of ${total}</h3>
    <div class="progress-container">
      <div class="progress-bar" style="width:${((current-1)/total)*100}%"></div>
    </div>
    <button class="btn btn-info" id="speakBtn" aria-label="Speak word">
      <i class="fas fa-volume-up"></i> Speak
    </button>
    <input type="text" id="userInput" 
           placeholder="Type what you heard..." 
           aria-label="Type the word you heard"
           autofocus>
    <button class="btn btn-success" id="checkBtn">Check</button>
    <div id="status" role="alert" aria-live="polite"></div>
  `;
  return box;
}

/**
 * Show score/results
 * @param {HTMLElement} container - Container element
 * @param {number} correctCount - Number correct
 * @param {number} total - Total words
 * @param {Array} incorrectWords - Incorrect words array
 */
export function showScore(container, correctCount, total, incorrectWords) {
  const percent = Math.round((correctCount / total) * 100);
  let scoreColor = "#28a745";
  if (percent < 50) scoreColor = "#dc3545";
  else if (percent < 75) scoreColor = "#ffc107";

  container.innerHTML = `
    <div class="word-box" aria-live="polite">
      <h2 style="color: ${scoreColor}">Test Complete</h2>
      <p>You scored <strong style="color: ${scoreColor}">${correctCount}</strong> 
         out of ${total} (<strong style="color: ${scoreColor}">${percent}%</strong>)</p>
      ${incorrectWords.length
        ? `<div class="incorrect-words">
             <h3>Incorrect Words</h3>
             <ul>${incorrectWords.map(w => 
               `<li><strong>${w.word}</strong> – You typed: <em>${w.typed || w.heard}</em></li>`
             ).join('')}</ul>
           </div>`
        : `<p class="perfect-score">🎉 No mistakes. Excellent work!</p>`
      }
      <button onclick="location.reload()" class="btn btn-info">
        <i class="fas fa-redo"></i> Start New Session
      </button>
    </div>
  `;
  
  gaEvent('test', 'completed', null, percent);
}

// =====================
// PWA Functionality
// =====================
let deferredPrompt;

/**
 * Initialize PWA features (install prompt, service worker)
 */
export function initializePWA() {
  // Install prompt handler
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    gaEvent('pwa', 'install_available');
    
    const installButton = document.getElementById('installButton');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => {
        installButton.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          gaEvent('pwa', choiceResult.outcome === 'accepted' ? 'install_accepted' : 'install_declined');
          deferredPrompt = null;
        });
      });
    }
  });

  // Track app installed event
  window.addEventListener('appinstalled', () => {
    gaEvent('pwa', 'installed');
  });

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
          gaEvent('pwa', 'sw_registered');
        })
        .catch(err => {
          console.log('ServiceWorker registration failed: ', err);
          gaEvent('pwa', 'sw_error');
        });
    });
  }
}

// =====================
// Analytics
// =====================
/**
 * Send Google Analytics event
 * @param {string} category - Event category
 * @param {string} action - Event action
 * @param {string} [label] - Event label
 * @param {number} [value] - Event value
 */
export function gaEvent(category, action, label = "", value = null) {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
  // For debugging:
  console.log(`GA Event: ${category} - ${action}`, label || '', value || '');
}

// Initialize PWA features when imported
initializePWA();
