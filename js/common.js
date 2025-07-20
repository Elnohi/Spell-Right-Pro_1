// Accent selection with flags
document.getElementById('accentSelect')?.addEventListener('change', function() {
  const flagImg = document.getElementById('accentFlag');
  const flags = {
    'en-US': 'us.png',
    'en-GB': 'gb.png',
    'en-AU': 'au.png',
    'en-CA': 'ca.png'
  };
  if (flagImg) flagImg.src = `assets/flags/${flags[this.value]}`;
});

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

// Flagging system
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords')) || [];

export function toggleFlagWord(currentWord) {
  if (!currentWord) return;
  
  const flagBtn = document.getElementById('flagWordBtn');
  const wordIndex = flaggedWords.indexOf(currentWord);
  
  if (wordIndex === -1) {
    flaggedWords.push(currentWord);
    if (flagBtn) {
      flagBtn.classList.add('active');
      flagBtn.innerHTML = '<i class="fas fa-flag"></i> Flagged';
    }
    document.querySelector('.current-word')?.classList.add('flagged-word');
  } else {
    flaggedWords.splice(wordIndex, 1);
    if (flagBtn) {
      flagBtn.classList.remove('active');
      flagBtn.innerHTML = '<i class="far fa-flag"></i> Flag Word';
    }
    document.querySelector('.current-word')?.classList.remove('flagged-word');
  }
  
  localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
}

export function initFlagButton(currentWord) {
  const flagBtn = document.getElementById('flagWordBtn');
  if (!flagBtn || !currentWord) return;
  
  flagBtn.onclick = () => toggleFlagWord(currentWord);
  
  if (flaggedWords.includes(currentWord)) {
    flagBtn.classList.add('active');
    flagBtn.innerHTML = '<i class="fas fa-flag"></i> Flagged';
    document.querySelector('.current-word')?.classList.add('flagged-word');
  } else {
    flagBtn.classList.remove('active');
    flagBtn.innerHTML = '<i class="far fa-flag"></i> Flag Word';
    document.querySelector('.current-word')?.classList.remove('flagged-word');
  }
}

export function showFlaggedWords() {
  const flagged = JSON.parse(localStorage.getItem('flaggedWords')) || [];
  const scoreDisplay = document.getElementById('scoreDisplay');
  
  if (flagged.length > 0 && scoreDisplay && !document.querySelector('.flagged-section')) {
    const flaggedSection = document.createElement('div');
    flaggedSection.className = 'flagged-section';
    flaggedSection.innerHTML = `
      <h3><i class="fas fa-flag"></i> Flagged Words for Review</h3>
      <ul class="flagged-words-list">
        ${flagged.map(word => `<li>${word}</li>`).join('')}
      </ul>
      <button id="practiceFlaggedBtn" class="btn btn-warning">
        <i class="fas fa-redo"></i> Practice Flagged Words
      </button>
    `;
    scoreDisplay.appendChild(flaggedSection);
  }
}

export function clearFlaggedWords() {
  flaggedWords = [];
  localStorage.removeItem('flaggedWords');
  const flagBtn = document.getElementById('flagWordBtn');
  if (flagBtn) {
    flagBtn.classList.remove('active');
    flagBtn.innerHTML = '<i class="far fa-flag"></i> Flag Word';
  }
  document.querySelector('.flagged-section')?.remove();
}

// Theme Toggle
export function initThemeToggle() {
  const toggleBtn = document.getElementById('modeToggle');
  const icon = document.getElementById('modeIcon');
  
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

// Navigation Controls
export function setupNavigation() {
  document.getElementById('homeBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.getElementById('premiumBtn')?.addEventListener('click', () => {
    window.location.href = 'premium.html';
  });
}

// Initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  setupNavigation();
});
