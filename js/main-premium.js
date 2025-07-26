// Main Premium App
let currentUser = null;
let examType = "OET";
let accent = "en-US";
let words = [];
let currentIndex = 0;
let sessionMode = "practice";
let score = 0;
let flaggedWords = [];
let userAnswers = [];
let userAttempts = [];

const authArea = document.getElementById('auth-area');
const premiumApp = document.getElementById('premium-app');
const examUI = document.getElementById('exam-ui');
const trainerArea = document.getElementById('trainer-area');
const summaryArea = document.getElementById('summary-area');
const appTitle = document.getElementById('app-title');

const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;

// Dark mode toggle
const darkToggle = document.getElementById('dark-mode-toggle');
darkToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  updateDarkModeIcon();
});
if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
updateDarkModeIcon();
function updateDarkModeIcon() {
  const icon = darkToggle?.querySelector('i');
  if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
}

// Firebase Auth
auth.onAuthStateChanged(user => {
  currentUser = user;
  renderAuth();
});

function renderAuth() {
  if (currentUser) {
    authArea.innerHTML = `
      <div style="text-align:right;">
        <span>Welcome, ${currentUser.email}</span>
        <button id="logout-btn" class="btn btn-secondary btn-sm">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    `;
    document.getElementById('logout-btn').onclick = () => auth.signOut();
    premiumApp.classList.remove('hidden');
    renderExamUI();
  } else {
    authArea.innerHTML = `
      <div class="auth-form">
        <input id="email" type="email" placeholder="Email" class="form-control">
        <input id="password" type="password" placeholder="Password" class="form-control">
        <button id="login-btn" class="btn btn-primary">
          <i class="fas fa-sign-in-alt"></i> Login
        </button>
        <button id="signup-btn" class="btn btn-outline">
          <i class="fas fa-user-plus"></i> Sign up
        </button>
      </div>
    `;
    document.getElementById('login-btn').onclick = () => {
      auth.signInWithEmailAndPassword(
        document.getElementById('email').value,
        document.getElementById('password').value
      ).catch(e => showAlert(e.message, 'error'));
    };
    document.getElementById('signup-btn').onclick = () => {
      auth.createUserWithEmailAndPassword(
        document.getElementById('email').value,
        document.getElementById('password').value
      ).catch(e => showAlert(e.message, 'error'));
    };
    premiumApp.classList.add('hidden');
  }
}

// Auto-next logic for Bee and Custom Modes
function checkAutoAdvance(attempt, correctWord, callback) {
  const micFeedback = document.getElementById('mic-feedback');
  if (!attempt) {
    micFeedback.textContent = "Couldn't detect your spelling. Try again.";
    micFeedback.className = "feedback incorrect";
    return;
  }

  userAttempts[currentIndex] = attempt;
  const isCorrect = attempt === correctWord.toLowerCase();
  updateSpellingVisual(correctWord, attempt);

  if (isCorrect) {
    micFeedback.textContent = "✓ Correct!";
    micFeedback.className = "feedback correct";
    score++;
  } else {
    micFeedback.textContent = `✗ Incorrect. You spelled: ${attempt}`;
    micFeedback.className = "feedback incorrect";
  }

  setTimeout(() => {
    currentIndex++;
    if (currentIndex < words.length) callback();
    else showBeeSummary();
  }, 1800);
}

function updateSpellingVisual(correct, attempt) {
  const spellingVisual = document.getElementById('spelling-visual');
  spellingVisual.innerHTML = correct.split('').map((letter, i) => {
    const match = attempt[i] || '';
    const cls = match.toLowerCase() === letter.toLowerCase() ? 'correct' : 'incorrect';
    return `<div class="letter-tile ${cls}">${match}</div>`;
  }).join('');
}

// Reuse showAlert as-is
function showAlert(message, type = 'error') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 500);
  }, 3000);
}
