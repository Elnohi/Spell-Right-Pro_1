// Initialize Firebase
export function initializeFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    });
  }
  return firebase;
}

// Theme Toggle
export function initThemeToggle() {
  const toggleBtn = document.getElementById('modeToggle');
  const icon = document.getElementById('modeIcon');
  
  const applyDarkMode = (isDark) => {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('darkMode', isDark ? 'on' : 'off');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  };

  toggleBtn?.addEventListener('click', () => {
    applyDarkMode(!document.body.classList.contains('dark-mode'));
  });

  // Initialize from storage
  applyDarkMode(localStorage.getItem('darkMode') === 'on');
}

// Navigation Controls
export function setupNavigation() {
  // Home button
  document.getElementById('homeBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Premium button
  document.getElementById('premiumBtn')?.addEventListener('click', () => {
    window.location.href = 'premium.html';
  });

  // Ensure all links work
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.href.includes(window.location.hostname)) {
        e.preventDefault();
        window.location.href = link.href;
      }
    });
  });
}

// Initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  setupNavigation();
});
