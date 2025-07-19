// ========== INITIALIZATION ==========
let firebaseInitialized = false;

export function initializeFirebase() {
  if (!firebaseInitialized && !firebase.apps.length) {
    firebase.initializeApp({
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    });
    firebaseInitialized = true;
  }
  return firebase;
}

// ========== THEME TOGGLE ==========
export function initThemeToggle() {
  const toggleBtn = document.getElementById('modeToggle');
  const icon = document.getElementById('modeIcon');
  
  if (!toggleBtn || !icon) return;

  const applyDarkMode = (darkMode) => {
    document.body.classList.toggle('dark-mode', darkMode);
    icon.className = darkMode ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('darkMode', darkMode ? 'on' : 'off');
  };

  toggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    applyDarkMode(!isDark);
  });

  // Initialize from localStorage or preference
  const savedMode = localStorage.getItem('darkMode') === 'on';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyDarkMode(savedMode || (!localStorage.getItem('darkMode') && prefersDark));
}

// ========== NAVIGATION ==========
export function initializeNavigation() {
  // Home button
  document.getElementById('homeBtn')?.addEventListener('click', () => {
    window.location.href = '/index.html';
  });
  
  // Premium button
  document.getElementById('premiumBtn')?.addEventListener('click', () => {
    window.location.href = '/premium.html';
  });
}

// ========== SPEECH FUNCTIONS ==========
export function speak(text, lang = 'en-US') {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
    utterance.onend = resolve;
  });
}

// ========== UTILITIES ==========
export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Initialize when imported
initializeNavigation();
