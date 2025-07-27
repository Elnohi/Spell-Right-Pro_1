// Main Premium App - Complete Integrated Version
import { auth } from './firebase-config.js';
import { trackEvent, trackError } from './analytics.js';

// App State
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
let sessionStartTime;

// DOM Elements
const authArea = document.getElementById('auth-area');
const premiumApp = document.getElementById('premium-app');
const examUI = document.getElementById('exam-ui');
const trainerArea = document.getElementById('trainer-area');
const summaryArea = document.getElementById('summary-area');
const appTitle = document.getElementById('app-title');

// Constants
const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;

// Initialize dark mode toggle
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  updateDarkModeIcon();
  trackEvent('ui_preference_change', {
    preference: 'dark_mode',
    value: isDarkMode ? 'enabled' : 'disabled'
  });
});

function updateDarkModeIcon() {
  const icon = document.querySelector('#dark-mode-toggle i');
  if (icon) {
    icon.className = document.body.classList.contains('dark-mode') 
      ? 'fas fa-sun' 
      : 'fas fa-moon';
  }
}

// Check for saved dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
}
updateDarkModeIcon();

// Authentication
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
    document.getElementById('logout-btn').onclick = () => {
      trackEvent('user_logout');
      auth.signOut();
    };
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
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      trackEvent('auth_attempt', { type: 'login' });
      auth.signInWithEmailAndPassword(email, password)
  .then(() => trackEvent('login_success'))
  .catch(error => {
    trackError(error, { context: 'email_login' });
    showAlert(error.message);
        }); 
    }; 
    
    document.getElementById('signup-btn').onclick = () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      trackEvent('auth_attempt', { type: 'signup' });
      auth.createUserWithEmailAndPassword(email, password)
        .then(() => trackEvent('auth_success', { type: 'signup' }))
        .catch(e => {
          trackError(e, { context: 'signup' });
          showAlert(e.message, 'error');
        });
    };
    
    premiumApp.classList.add('hidden');
  }
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  renderAuth();
  
  if (user) {
    trackEvent('user_authenticated', {
      provider: user.providerData[0]?.providerId || 'email',
      email_anonymized: user.email ? user.email.substring(0, 3) + '...' : 'none',
      account_age_days: Math.floor((new Date() - new Date(user.metadata.creationTime)) / (1000 * 60 * 60 * 24)
    });
  }
});

// Main App UI
function renderExamUI() {
  trackEvent('screen_view', { screen_name: 'exam_selection' });
  
  examUI.innerHTML = `
    <div class="mode-selector">
      <button id="practice-mode-btn" class="mode-btn selected">
        <i class="fas fa-graduation-cap"></i> Practice Mode
      </button>
      <button id="test-mode-btn" class="mode-btn">
        <i class="fas fa-clipboard-check"></i> Test Mode
      </button>
    </div>
    
    <div class="input-group">
      <select id="exam-type" class="form-control">
        <option value="OET">OET Spelling</option>
        <option value="Bee">Spelling Bee</option>
        <option value="Custom">Custom Words</option>
      </select>
      
      <select id="accent-select" class="form-control" style="max-width: 150px;">
        <option value="en-US">American English</option>
        <option value="en-GB">British English</option>
        <option value="en-AU">Australian English</option>
      </select>
      <span id="flag-svg" style="display: inline-flex; align-items: center;"></span>
    </div>
    
    <div id="custom-upload-area"></div>
    
    <button id="start-btn" class="btn btn-primary" style="margin-top: 15px;">
      <i class="fas fa-play"></i> Start Session
    </button>
  `;
  
  // Initialize UI state
  document.getElementById('exam-type').value = examType;
  document.getElementById('accent-select').value = accent;
  updateFlag();

  // Event listeners
  document.getElementById('exam-type').onchange = e => {
    examType = e.target.value;
    trackEvent('exam_type_changed', { exam_type: examType });
    renderExamUI();
  };
  
  document.getElementById('accent-select').onchange = e => {
    accent = e.target.value;
    trackEvent('accent_changed', { accent });
    updateFlag();
  };
  
  document.getElementById('practice-mode-btn').onclick = () => {
    sessionMode = "practice";
    document.getElementById('practice-mode-btn').classList.add("selected");
    document.getElementById('test-mode-btn').classList.remove("selected");
    trackEvent('mode_changed', { mode: 'practice' });
  };
  
  document.getElementById('test-mode-btn').onclick = () => {
    sessionMode = "test";
    document.getElementById('test-mode-btn').classList.add("selected");
    document.getElementById('practice-mode-btn').classList.remove("selected");
    trackEvent('mode_changed', { mode: 'test' });
  };
  
  document.getElementById('start-btn').onclick = () => {
    trackEvent('session_started', { 
      exam_type: examType, 
      mode: sessionMode 
    });
    
    summaryArea.innerHTML = "";
    if (examType === "OET") {
      startOET();
    } else if (examType === "Bee") {
      startBee();
    } else if (examType === "Custom") {
      renderCustomInput();
    }
  };
  
  if (examType === "Custom") renderCustomInput();
}

// OET Practice Functions
function startOET() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  sessionStartTime = Date.now();
  trackEvent('session_start', {
    examType,
    mode: sessionMode,
    wordCount: words.length
  });
  words = sessionMode === "test" 
    ? [...window.oetWords].sort(() => 0.5 - Math.random()).slice(0, 24)
    : window.oetWords.slice();

  appTitle.textContent = `OET Spelling ${sessionMode === "test" ? "Test" : "Practice"}`;
  showOETWord();
  speakCurrentWord();
}

function showOETWord() {
  if (currentIndex >= words.length) {
    endSession();
    return;
  }
  
  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    
    <input type="text" id="user-input" class="form-control" 
           placeholder="Type what you heard..." autofocus>
    
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length-1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Next
      </button>
    </div>
    
    <div id="feedback" class="feedback"></div>
  `;

  // Setup event listeners
  document.getElementById('repeat-btn').onclick = speakCurrentWord;
  document.getElementById('prev-btn').onclick = prevOETWord;
  document.getElementById('next-btn').onclick = nextOETWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

  document.getElementById('user-input').onkeydown = e => {
    if (e.key === 'Enter') checkOETAnswer(word);
  };
}

function checkOETAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const isCorrect = userAnswer === correctWord;
  
    trackEvent('word_attempt', {
    word: correctWord,
    status: isCorrect ? 'correct' : 'incorrect',
    attempt: userAnswer,
    position: currentIndex,
    duration: Date.now() - wordStartTime
  });

  if (isCorrect) {
    score++;
    showFeedback("✓ Correct!", "correct");
    setTimeout(nextOETWord, 1500);
  } else {
    showFeedback(`✗ Incorrect. Correct: ${correctWord}`, "incorrect");
  }
}

// Spelling Bee
function startBee() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAttempts = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  
  words = [
    "accommodate", "belligerent", "conscientious", "disastrous", 
    "embarrass", "foreign", "guarantee", "harass", 
    "interrupt", "jealous", "knowledge", "liaison",
    "millennium", "necessary", "occasionally", "possession",
    "questionnaire", "rhythm", "separate", "tomorrow",
    "unforeseen", "vacuum", "withhold", "yacht"
  ];
  
  appTitle.textContent = "Spelling Bee";
  trackSessionStart(words.length);
  showBeeWord();
  speakCurrentBeeWord();
}

function showBeeWord() {
  if (currentIndex >= words.length) {
    trackSessionEnd();
    showBeeSummary();
    return;
  }
  
  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    
    <div class="auto-recording-info">
      <i class="fas fa-info-circle"></i> Speak the spelling after hearing the word
    </div>
    
    <div id="spelling-visual" style="margin: 15px 0;"></div>
    
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length-1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Skip
      </button>
    </div>
    
    <div id="mic-feedback" class="feedback"></div>
  `;
  
  document.getElementById('repeat-btn').onclick = () => speakCurrentBeeWord();
  document.getElementById('prev-btn').onclick = prevBeeWord;
  document.getElementById('next-btn').onclick = nextBeeWord;
  document.getElementById('flag-btn').onclick = () => toggleBeeFlagWord(word);

  setTimeout(() => {
    listenForSpelling(word);
  }, 500);
}

function speakCurrentBeeWord() {
  speakWord(words[currentIndex]);
}

function listenForSpelling(correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  micFeedback.textContent = "Listening... Please spell the word.";
  micFeedback.className = "feedback";
  
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    micFeedback.textContent = "Speech recognition not supported in this browser.";
    micFeedback.className = "feedback incorrect";
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = accent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;
  
  recognition.onresult = (event) => {
    const results = event.results[0];
    const bestMatch = findBestMatch(results);
    processSpellingAttempt(bestMatch, correctWord);
  };
  
  recognition.onerror = (event) => {
    micFeedback.textContent = `Error: ${event.error}`;
    micFeedback.className = "feedback incorrect";
  };
  
  recognition.start();
}

function findBestMatch(results) {
  for (let i = 0; i < results.length; i++) {
    const transcript = results[i].transcript.trim().toLowerCase();
    const cleaned = transcript.replace(/[^a-z]/g, '');
    if (cleaned.length > 0) return cleaned;
  }
  return '';
}

function processSpellingAttempt(attempt, correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  
  if (!attempt) {
    micFeedback.textContent = "Couldn't detect your spelling. Try again.";
    micFeedback.className = "feedback incorrect";
    return;
  }
  
  userAttempts[currentIndex] = attempt;
  
  const isCorrect = attempt === correctWord.toLowerCase();
  trackWordAttempt(correctWord, isCorrect, attempt);
  
  updateSpellingVisual(
    correctWord.split('').map((letter, i) => ({
      letter: attempt[i] || '',
      correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
    }))
  );
  
  if (isCorrect) {
    micFeedback.textContent = "✓ Correct!";
    micFeedback.className = "feedback correct";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
    score++;
  } else {
    micFeedback.textContent = `✗ Incorrect. You spelled: ${attempt}. Correct: ${correctWord}`;
    micFeedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }

  setTimeout(() => {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      showBeeWord();
      speakCurrentBeeWord();
    } else {
      trackSessionEnd();
      showBeeSummary();
    }
  }, 1500);
}

function updateSpellingVisual(letters = []) {
  const spellingVisual = document.getElementById('spelling-visual');
  const word = words[currentIndex];
  spellingVisual.innerHTML = word.split('').map((letter, i) => {
    const letterData = letters[i] || {};
    const letterClass = letterData.correct ? 'correct' : 
                      (letterData.letter ? 'incorrect' : '');
    return `<div class="letter-tile ${letterClass}">${letterData.letter || ''}</div>`;
  }).join('');
}

function nextBeeWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showBeeWord();
    speakCurrentBeeWord();
  } else {
    trackSessionEnd();
    showBeeSummary();
  }
}

function prevBeeWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showBeeWord();
    speakCurrentBeeWord();
  }
}

function toggleBeeFlagWord(word) {
  const idx = flaggedWords.indexOf(word);
  const isFlagged = idx === -1;
  
  if (isFlagged) {
    flaggedWords.push(word);
  } else {
    flaggedWords.splice(idx, 1);
  }
  
  trackFlagWord(word, isFlagged);
  showBeeWord();
}

// Custom Words Practice
function startCustomPractice() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  trackSessionStart(words.length);
  showCustomWord();
  speakCurrentWord();
}

function showCustomWord() {
  if (currentIndex >= words.length) {
    trackSessionEnd();
    showSummary();
    return;
  }
  
  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    
    <input type="text" id="user-input" class="form-control" style="margin-top: 15px;" 
           placeholder="Type what you heard..." autofocus>
    
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length-1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Next
      </button>
    </div>
    
    <div id="feedback" class="feedback" style="margin-top: 15px;"></div>
  `;
  
  const userInput = document.getElementById('user-input');
  userInput.focus();

  document.getElementById('repeat-btn').onclick = () => speakCurrentWord();
  document.getElementById('prev-btn').onclick = prevCustomWord;
  document.getElementById('next-btn').onclick = nextCustomWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

  userInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      checkCustomAnswer(word);
    }
  };

  userInput.oninput = (e) => {
    if (e.target.value.toLowerCase() === word.toLowerCase()) {
      checkCustomAnswer(word);
    }
  };
}

function checkCustomAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const feedback = document.getElementById('feedback');
  
  const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();
  trackWordAttempt(correctWord, isCorrect, userAnswer);
  
  if (isCorrect) {
    feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    score++;
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }

  setTimeout(() => {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      showCustomWord();
      speakCurrentWord();
    } else {
      trackSessionEnd();
      showSummary();
    }
  }, 1500);
}

function nextCustomWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showCustomWord();
    speakCurrentWord();
  } else {
    trackSessionEnd();
    showSummary();
  }
}

function prevCustomWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showCustomWord();
    speakCurrentWord();
  }
}

// Summary Functions
function showSummary() {
  const percent = Math.round((score / words.length) * 100);
  const wrongWords = words.filter((w, i) => 
    (userAnswers[i] || "").toLowerCase() !== w.toLowerCase()
  );
  
  summaryArea.innerHTML = `
    <div class="card-header">
      <h3>Session Results</h3>
      <div class="score-display">${score}/${words.length} (${percent}%)</div>
    </div>
    
    <div class="results-grid">
      <div class="results-card correct">
        <h3><i class="fas fa-check-circle"></i> Correct</h3>
        <div class="score-number">${score}</div>
        <div class="word-list">
          ${words.filter((w, i) => (userAnswers[i] || "").toLowerCase() === w.toLowerCase())
            .map(w => `<div class="word-item">${w}</div>`).join('')}
        </div>
      </div>
      
      <div class="results-card incorrect">
        <h3><i class="fas fa-times-circle"></i> Needs Practice</h3>
        <div class="score-number">${wrongWords.length}</div>
        <div class="word-list">
          ${wrongWords.map(w => `<div class="word-item">${w}</div>`).join('')}
        </div>
      </div>
    </div>
    
    ${flaggedWords.length > 0 ? `
      <div style="margin-top: 20px;">
        <h4><i class="fas fa-flag"></i> Flagged Words</h4>
        <div class="word-list">
          ${flaggedWords.map(w => `<div class="word-item">${w}</div>`).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="summary-actions">
      <button id="restart-btn" class="btn btn-primary">
        <i class="fas fa-redo"></i> Restart Session
      </button>
      <button id="new-list-btn" class="btn btn-secondary">
        <i class="fas fa-sync-alt"></i> New Word List
      </button>
    </div>
  `;
  
  document.getElementById('restart-btn').onclick = () => {
    if (examType === "OET" || examType === "Custom") {
      if (examType === "OET") startOET();
      else startCustomPractice();
    } else {
      startBee();
    }
  };
  
  document.getElementById('new-list-btn').onclick = () => {
    summaryArea.innerHTML = "";
    renderExamUI();
  };
}

function showBeeSummary() {
  const percent = Math.round((score / words.length) * 100);
  const wrongWords = words.filter((w, i) => 
    (userAttempts[i] || "").toLowerCase() !== w.toLowerCase()
  );
  
  summaryArea.innerHTML = `
    <div class="card-header">
      <h3>Spelling Bee Results</h3>
      <div class="score-display">${score}/${words.length} (${percent}%)</div>
    </div>
    
    <div class="results-grid">
      <div class="results-card correct">
        <h3><i class="fas fa-check-circle"></i> Correct</h3>
        <div class="score-number">${score}</div>
        <div class="word-list">
          ${words.filter((w, i) => (userAttempts[i] || "").toLowerCase() === w.toLowerCase())
            .map(w => `<div class="word-item">${w}</div>`).join('')}
        </div>
      </div>
      
      <div class="results-card incorrect">
        <h3><i class="fas fa-times-circle"></i> Needs Practice</h3>
        <div class="score-number">${wrongWords.length}</div>
        <div class="word-list">
          ${wrongWords.map(w => `<div class="word-item">${w}</div>`).join('')}
        </div>
      </div>
    </div>
    
    ${flaggedWords.length > 0 ? `
      <div style="margin-top: 20px;">
        <h4><i class="fas fa-flag"></i> Flagged Words</h4>
        <div class="word-list">
          ${flaggedWords.map(w => `<div class="word-item">${w}</div>`).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="summary-actions">
      <button id="restart-btn" class="btn btn-primary">
        <i class="fas fa-redo"></i> Restart Bee
      </button>
      <button id="new-list-btn" class="btn btn-secondary">
        <i class="fas fa-sync-alt"></i> New Word List
      </button>
    </div>
  `;
  
  document.getElementById('restart-btn').onclick = startBee;
  document.getElementById('new-list-btn').onclick = () => {
    summaryArea.innerHTML = "";
    renderExamUI();
  };
}

// Helper Functions
function showFeedback(message, type) {
  const feedback = document.getElementById('feedback');
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}

function speakWord(word) {
  if (!window.speechSynthesis) {
    showAlert("Text-to-speech not supported", 'error');
    return;
  }
  
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent;
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

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

function endSession() {
  const duration = Math.round((new Date() - sessionStartTime) / 1000);
  
  trackEvent('session_completed', {
    score: score,
    total: words.length,
    accuracy: Math.round((score / words.length) * 100),
    duration: duration,
    flagged_words: flaggedWords.length
  });
  
  showSummary();
}

// Initialize the app
if (document.readyState === 'complete') {
  renderAuth();
} else {
  window.addEventListener('load', renderAuth);
}
