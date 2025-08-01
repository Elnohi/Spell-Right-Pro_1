// main-premium.js — Full Version with Syntax Corrections

// ==================== ADVERTISEMENT INTEGRATION ====================
let adsLoaded = false;

function loadAdsIfNeeded() {
  if (!auth.currentUser && !adsLoaded) {
    (adsbygoogle = window.adsbygoogle || []).push({});
    adsLoaded = true;
  }
}

window.addEventListener('error', (e) => {
  if (e.message.includes('adsbygoogle')) {
    console.error('AdSense failed to load:', e.message);
    const adContainer = document.querySelector('.ad-container');
    if (adContainer) adContainer.style.display = 'none';
  }
});

// ==================== SPEECH SYNTHESIS ====================
let voicesReady = false;

function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    window.speechSynthesis.onvoiceschanged = null;
  }
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speakWord(word, rate = 1.0) {
  if (!voicesReady) {
    setTimeout(() => speakWord(word, rate), 300);
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = rate;
    utterance.lang = accent;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang === accent) ||
      voices.find(v => v.lang.startsWith(accent.split('-')[0]));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } else {
    console.error('Speech synthesis not supported');
    showAlert('Text-to-speech not supported in your browser', 'error');
  }
}

// ==================== GLOBAL STATE ====================
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
let wordStartTime;
const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);

// ==================== DOM REFERENCES ====================
const authArea = document.getElementById('auth-area');
const premiumApp = document.getElementById('premium-app');
const examUI = document.getElementById('exam-ui');
const trainerArea = document.getElementById('trainer-area');
const summaryArea = document.getElementById('summary-area');
const appTitle = document.getElementById('app-title');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// ==================== DARK MODE ====================
function updateDarkModeIcon() {
  const icon = document.querySelector('#dark-mode-toggle i');
  if (icon) {
    icon.className = document.body.classList.contains('dark-mode')
      ? 'fas fa-sun'
      : 'fas fa-moon';
  }
}

if (localStorage.getItem('darkMode') === 'true' || localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark-mode');
}

darkModeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  updateDarkModeIcon();
});

updateDarkModeIcon();

// ==================== ALERT SYSTEM ====================
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

// ==================== TRACKING HELPERS ====================
function trackEvent(name, data = {}) {
  if (typeof analytics !== "undefined") {
    try {
      analytics.logEvent(name, data);
    } catch (e) {
      console.warn("Analytics event failed", name, data);
    }
  }
  console.log(`[TRACK] ${name}`, data);
}

function trackError(error, context = {}) {
  trackEvent("error_occurred", {
    ...context,
    message: error.message,
    stack: error.stack || "no stack"
  });
}

// ==================== AUTH RENDERING ====================
function renderAuth() {
  if (auth.currentUser) {
    document.body.classList.add('logged-in');
    currentUser = auth.currentUser;
    authArea.innerHTML = `
      <div style="text-align:right;">
        <span>Welcome, ${currentUser.email}</span>
        <button id="logout-btn" class="btn btn-secondary btn-sm">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>`;
    document.getElementById('logout-btn').onclick = () => {
      trackEvent('user_logged_out', { session_id: sessionId });
      auth.signOut();
    };
    premiumApp.classList.remove('hidden');
    renderExamUI();
  } else {
    document.body.classList.remove('logged-in');
    currentUser = null;
    authArea.innerHTML = `
      <div class="auth-form">
        <input id="email" type="email" placeholder="Email" class="form-control">
        <input id="password" type="password" placeholder="Password" class="form-control">
        <button id="login-btn" class="btn btn-primary"><i class="fas fa-sign-in-alt"></i> Login</button>
        <button id="signup-btn" class="btn btn-outline"><i class="fas fa-user-plus"></i> Sign up</button>
      </div>`;
    document.getElementById('login-btn').onclick = loginHandler;
    document.getElementById('signup-btn').onclick = signupHandler;
    premiumApp.classList.add('hidden');
    loadAdsIfNeeded();
  }
}

function loginHandler() {
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => trackEvent('login_successful', { session_id: sessionId }))
    .catch(e => {
      showAlert(e.message);
      trackError(e, { context: 'login' });
    });
}

function signupHandler() {
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => trackEvent('signup_successful', { session_id: sessionId }))
    .catch(e => {
      showAlert(e.message);
      trackError(e, { context: 'signup' });
    });
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  renderAuth();
  if (!user) loadAdsIfNeeded();
});

// ==================== EXAM UI ====================
function renderExamUI() {
  let uploadAreaHTML = `
    <textarea id="custom-words" class="form-control" rows="3"
      placeholder="Enter words (comma/newline separated), or leave blank to use default list."></textarea>
    <input type="file" id="word-file" accept=".txt,.csv" class="form-control" style="margin-top: 5px;">
    <button id="add-custom-btn" class="btn btn-info" style="margin-top: 7px;">
      <i class="fas fa-plus-circle"></i> Use This List
    </button>
    <div id="upload-info" class="upload-info" style="margin-top:6px;font-size:0.95em;color:var(--gray);"></div>
  `;

  examUI.innerHTML = `
    <div class="mode-selector">
      <button id="practice-mode-btn" class="mode-btn ${sessionMode === 'practice' ? 'selected' : ''}">
        <i class="fas fa-graduation-cap"></i> Practice Mode
      </button>
      <button id="test-mode-btn" class="mode-btn ${sessionMode === 'test' ? 'selected' : ''}">
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
    <div id="custom-upload-area">${uploadAreaHTML}</div>
    <button id="start-btn" class="btn btn-primary" style="margin-top: 15px;">
      <i class="fas fa-play"></i> Start Session
    </button>`;

  document.getElementById('exam-type').value = examType;
  document.getElementById('accent-select').value = accent;

  document.getElementById('exam-type').onchange = e => {
    examType = e.target.value;
    renderExamUI();
  };

  document.getElementById('accent-select').onchange = e => {
    accent = e.target.value;
    updateFlag();
  };

  document.getElementById('practice-mode-btn').onclick = () => {
    sessionMode = "practice";
    renderExamUI();
  };

  document.getElementById('test-mode-btn').onclick = () => {
    sessionMode = "test";
    renderExamUI();
  };
  // =========== Custom List Logic (ALL MODES) ===========
  customWordList = [];
  useCustomList = false;

  // File upload support
  document.getElementById('word-file').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        const text = evt.target.result;
        customWordList = processWordList(text);
        useCustomList = true;
        document.getElementById('upload-info').textContent = `Loaded ${customWordList.length} words from file.`;
      };
      reader.readAsText(file);
    }
  });

  // Textarea support
  document.getElementById('add-custom-btn').onclick = () => {
    const input = document.getElementById('custom-words').value.trim();
    if (input.length) {
      customWordList = processWordList(input);
      useCustomList = true;
      document.getElementById('upload-info').textContent = `Added ${customWordList.length} words from textarea.`;
    } else if (customWordList.length) {
      document.getElementById('upload-info').textContent = `Using ${customWordList.length} words loaded from file.`;
      useCustomList = true;
    } else {
      useCustomList = false; // fallback to default
      document.getElementById('upload-info').textContent = `Using default list.`;
    }
  };

  // Start session (uses custom list if present)
  document.getElementById('start-btn').onclick = () => {
    summaryArea.innerHTML = "";
    if (examType === "OET") {
      startOET();
    } else if (examType === "Bee") {
      startBee();
    } else if (examType === "Custom") {
      if (customWordList.length) {
        words = customWordList.slice();
      }
      appTitle.textContent = "Custom Spelling Practice";
      startCustomPractice();
    }
  };

  updateFlag();
}

function updateFlag() {
  const flagSVGs = {
    "en-US": `<svg width="24" height="16" viewBox="0 0 60 40"><!-- US flag SVG --></svg>`,
    "en-GB": `<svg width="24" height="16" viewBox="0 0 60 40"><!-- UK flag SVG --></svg>`,
    "en-AU": `<svg width="24" height="16" viewBox="0 0 60 40"><!-- AU flag SVG --></svg>`
  };
  document.getElementById('flag-svg').innerHTML = flagSVGs[accent] || "";
}

function renderCustomInput() {
  document.getElementById('custom-upload-area').innerHTML = `
    <textarea id="custom-words" class="form-control" rows="4"
      placeholder="Enter words (separated by commas, spaces, or new lines)"></textarea>
    <button id="add-custom-btn" class="btn btn-info" style="margin-top: 10px;">
      <i class="fas fa-plus-circle"></i> Use These Words
    </button>`;

  document.getElementById('add-custom-btn').onclick = () => {
    const input = document.getElementById('custom-words').value.trim();
    if (!input) {
      showAlert("Please enter some words first!", 'error');
      return;
    }

    try {
      processWordList(input);
      trackEvent('custom_words_processed', { session_id: sessionId, word_count: words.length });
      showAlert(`Added ${words.length} words!`, 'success');
      appTitle.textContent = "Custom Spelling Practice";
      startCustomPractice();
    } catch (error) {
      trackError(error, { context: 'custom_words_input' });
      showAlert(error.message, 'error');
    }
  };
}

// Utility for processing word lists
function processWordList(text) {
  return [...new Set(
    text.replace(/\r/g, '')
      .split(/[\n,;|\/\-–—\t]+/)
      .map(w => w.trim())
      .filter(w => w && w.length > 1)
  )];
}

// ==================== OET PRACTICE (FIXED AUTO-ADVANCE) ====================
function startOET() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  sessionStartTime = Date.now();

  if (useCustomList && customWordList.length) {
    words = customWordList.slice();
    appTitle.textContent = "OET (Custom List)";
  } else {
    words = sessionMode === "test"
      ? [...window.oetWords].sort(() => 0.5 - Math.random()).slice(0, 24)
      : window.oetWords.slice();
    appTitle.textContent = "OET Spelling Practice";
  }

  retryCount = 0;
  trackEvent('session_started', {
    session_id: sessionId,
    exam_type: 'OET',
    mode: sessionMode,
    word_count: words.length,
    used_custom: useCustomList
  });

  showOETWord();
  setTimeout(() => speakCurrentWord(), 300);
}

function showOETWord() {
  if (currentIndex >= words.length) {
    trackEvent('session_completed', {
      session_id: sessionId,
      score: score,
      total_words: words.length,
      accuracy: Math.round((score / words.length) * 100),
      flagged_words: flaggedWords.length
    });
    showSummary();
    return;
  }

  wordStartTime = Date.now();
  const word = words[currentIndex];

  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    <div class="input-wrapper">
      <input type="text" id="user-input" class="form-control ${userAnswers[currentIndex] ?
    (userAnswers[currentIndex].toLowerCase() === word.toLowerCase() ? 'correct-input' : 'incorrect-input') : ''}"
        placeholder="Type what you heard..." autofocus>
    </div>
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length - 1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Next
      </button>
    </div>
    <div id="feedback" class="feedback"></div>`;

  const input = document.getElementById('user-input');
  document.getElementById('repeat-btn').onclick = speakCurrentWord;
  document.getElementById('prev-btn').onclick = prevOETWord;
  document.getElementById('next-btn').onclick = nextOETWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

  input.focus();
  input.select();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // prevent accidental form submission
      checkOETAnswer(word);
    }
  });
}

function speakCurrentWord() {
  const statusElement = document.getElementById('word-status');
  if (statusElement) {
    statusElement.innerHTML = '<i class="fas fa-volume-up speech-loading"></i>';
  }

  speakWord(words[currentIndex]);

  setTimeout(() => {
    if (statusElement) {
      statusElement.innerHTML = '';
    }
  }, 500);
}

function checkOETAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();

  if (isCorrect) {
    score++;
    showFeedback("✓ Correct!", "correct");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i>';
    userInput.classList.add('correct-input');
    userInput.classList.remove('incorrect-input');
  } else {
    showFeedback(`✗ Incorrect. Correct: ${correctWord}`, "incorrect");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
    userInput.classList.add('incorrect-input');
    userInput.classList.remove('correct-input');
  }

  // Auto-advance after delay (regardless of correct/incorrect)
  setTimeout(() => {
    trainerArea.classList.add('word-transition');
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showOETWord();
        speakCurrentWord();
      } else {
        showSummary();
      }
    }, 300);
  }, 1200);
}

function nextOETWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showOETWord();
    speakCurrentWord();
  }
}

function prevOETWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showOETWord();
    speakCurrentWord();
  }
}

function toggleFlagWord(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  showOETWord();
}

// ==================== CUSTOM PRACTICE (FIXED AUTO-ADVANCE) ====================
function startCustomPractice() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  sessionStartTime = Date.now();

  trackEvent('session_started', {
    session_id: sessionId,
    exam_type: 'Custom',
    mode: sessionMode,
    word_count: words.length
  });

  showCustomWord();
  setTimeout(() => speakCurrentWord(), 300);
}

function showCustomWord() {
  if (currentIndex >= words.length) {
    showSummary();
    return;
  }

  wordStartTime = Date.now();
  const word = words[currentIndex];

  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    <div class="input-wrapper">
      <input type="text" id="user-input" class="form-control ${userAnswers[currentIndex] ? 
        (userAnswers[currentIndex].toLowerCase() === word.toLowerCase() ? 'correct-input' : 'incorrect-input') : ''}" 
        placeholder="Type what you heard..." autofocus
        value="${userAnswers[currentIndex] || ''}">
      <span id="real-time-feedback" class="real-time-feedback"></span>
    </div>
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
    <div id="feedback" class="feedback"></div>`;

  const input = document.getElementById('user-input');
  const feedback = document.getElementById('real-time-feedback');

  // --- Live feedback on typing ---
  input.addEventListener('input', (e) => {
    const currentInput = e.target.value.toLowerCase();
    const correctWord = word.toLowerCase();

    if (currentInput === correctWord) {
      feedback.innerHTML = '<i class="fas fa-check correct-feedback"></i>';
    } else if (correctWord.startsWith(currentInput)) {
      feedback.innerHTML = '<i class="fas fa-thumbs-up correct-feedback"></i>';
    } else {
      feedback.innerHTML = '<i class="fas fa-times incorrect-feedback"></i>';
    }
  });

  // --- Enter key triggers checkCustomAnswer with retry ---
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkCustomAnswer(word);
    }
  });

  document.getElementById('repeat-btn').onclick = speakCurrentWord;
  document.getElementById('prev-btn').onclick = prevCustomWord;
  document.getElementById('next-btn').onclick = nextCustomWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

  input.focus();
  input.select();
}

function checkCustomAnswer(correctWord) {
  const input = document.getElementById('user-input');
  const userAnswer = input.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();

  if (isCorrect) {
    score++;
    showFeedback("✓ Correct!", "correct");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i>';
    input.classList.add('correct-input');
    input.classList.remove('incorrect-input');
  } else {
    showFeedback(`✗ Incorrect. Correct: ${correctWord}`, "incorrect");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
    input.classList.add('incorrect-input');
    input.classList.remove('correct-input');
  }

  // Auto-advance after delay (regardless of correct/incorrect)
  setTimeout(() => {
    trainerArea.classList.add('word-transition');
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showCustomWord();
        speakCurrentWord();
      } else {
        showSummary();
      }
    }, 300);
  }, 1200);
}

function nextCustomWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showCustomWord();
    speakCurrentWord();
  }
}

function prevCustomWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showCustomWord();
    speakCurrentWord();
  }
}

// ==================== SPELLING BEE ====================
function startBee() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAttempts = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  sessionStartTime = Date.now();

  if (useCustomList && customWordList.length) {
    words = customWordList.slice();
    appTitle.textContent = "Spelling Bee (Custom List)";
  } else {
    words = [
      "accommodate", "belligerent", "conscientious", "disastrous",
      "embarrass", "foreign", "guarantee", "harass",
      "interrupt", "jealous", "knowledge", "liaison",
      "millennium", "necessary", "occasionally", "possession",
      "questionnaire", "rhythm", "separate", "tomorrow",
      "unforeseen", "vacuum", "withhold", "yacht"
    ];
    appTitle.textContent = "Spelling Bee";
  }

  retryCount = 0;
  trackEvent('session_started', {
    session_id: sessionId,
    exam_type: 'Bee',
    mode: sessionMode,
    word_count: words.length,
    used_custom: useCustomList
  });

  showBeeWord();
  speakCurrentBeeWord();
}

function showBeeWord() {
  if (currentIndex >= words.length) {
    storeSessionData('Bee');  // Log session in Firebase
    showBeeSummary();         // Show results/summary
    return;
  }

  wordStartTime = Date.now();
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
    <div id="mic-feedback" class="feedback"></div>`;

  document.getElementById('repeat-btn').onclick = () => speakCurrentBeeWord();
  document.getElementById('prev-btn').onclick = prevBeeWord;
  document.getElementById('next-btn').onclick = nextBeeWord;
  document.getElementById('flag-btn').onclick = () => toggleBeeFlagWord(word);

  setTimeout(() => {
    listenForSpelling(word);
  }, 500);
}

function speakCurrentBeeWord() {
  const statusElement = document.getElementById('word-status');
  if (statusElement) {
    statusElement.innerHTML = '<i class="fas fa-volume-up speech-loading"></i>';
  }

  speakWord(words[currentIndex]);

  setTimeout(() => {
    if (statusElement) {
      statusElement.innerHTML = '';
    }
  }, 500);
}

function listenForSpelling(correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  micFeedback.textContent = "Listening... Please spell the word.";
  micFeedback.className = "feedback";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micFeedback.textContent = "Speech recognition not supported.";
    micFeedback.className = "feedback incorrect";
    return;
  }

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
    trackError(new Error(event.error), { context: 'speech_recognition', session_id: sessionId });
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

// When a spelling attempt is processed, always check for last word and call summary
function processSpellingAttempt(attempt, correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  if (!attempt) {
    micFeedback.textContent = "Couldn't detect your spelling. Try again.";
    micFeedback.className = "feedback incorrect";
    return;
  }

  userAttempts[currentIndex] = attempt;
  const isCorrect = attempt === correctWord.toLowerCase();

  updateSpellingVisual(
    correctWord.split('').map((letter, i) => ({
      letter: attempt[i] || '',
      correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
    }))
  );

  if (isCorrect) {
    score++;
    micFeedback.textContent = "✓ Correct!";
    micFeedback.className = "feedback correct";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
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
      storeSessionData('Bee');
      showBeeSummary();
    }
  }, 1200);
}

function updateSpellingVisual(letters = []) {
  const spellingVisual = document.getElementById('spelling-visual');
  const word = words[currentIndex];
  spellingVisual.innerHTML = word.split('').map((letter, i) => {
    const letterData = letters[i] || {};
    const letterClass = letterData.correct ? 'correct' : (letterData.letter ? 'incorrect' : '');
    return `<div class="letter-tile ${letterClass}">${letterData.letter || ''}</div>`;
  }).join('');
}

function nextBeeWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showBeeWord();
    speakCurrentBeeWord();
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
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  showBeeWord();
}

// ==================== SUMMARY DISPLAY ====================
function showSummary() {
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);
  const accuracy = Math.round((score / words.length) * 100);

  const summaryHTML = `
    <div class="summary-card">
      <h3>Session Summary</h3>
      <p><strong>Mode:</strong> ${examType.toUpperCase()}</p>
      <p><strong>Words Attempted:</strong> ${words.length}</p>
      <p><strong>Score:</strong> ${score}</p>
      <p><strong>Accuracy:</strong> ${accuracy}%</p>
      <p><strong>Duration:</strong> ${duration} seconds</p>
      ${flaggedWords.length > 0 ?
      `<div class="flagged-section">
          <h4>Flagged Words (${flaggedWords.length}):</h4>
          <ul>${flaggedWords.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>` : '<p>No flagged words.</p>'}
      <button class="btn btn-primary" onclick="restartSession()">Restart</button>
    </div>
  `;

  summaryArea.innerHTML = summaryHTML;
  trainerArea.innerHTML = '';
  examUI.innerHTML = '';
}

function showBeeSummary() {
  const percent = Math.round((score / words.length) * 100);
  const wrongWords = words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase());

  summaryArea.innerHTML = `
    <div class="card-header"><h3>Spelling Bee Results</h3>
    <div class="score-display">${score}/${words.length} (${percent}%)</div></div>
    <div class="results-grid">
      <div class="results-card correct">
        <h3><i class="fas fa-check-circle"></i> Correct</h3>
        <div class="score-number">${score}</div>
        <div class="word-list">${words.filter((w, i) => (userAttempts[i] || "").toLowerCase() === w.toLowerCase()).map(w => `<div class="word-item">${w}</div>`).join('')}</div>
      </div>
      <div class="results-card incorrect">
        <h3><i class="fas fa-times-circle"></i> Needs Practice</h3>
        <div class="score-number">${wrongWords.length}</div>
        <div class="word-list">${wrongWords.map(w => `<div class="word-item">${w}</div>`).join('')}</div>
      </div>
    </div>
    <div class="summary-actions">
      <button id="restart-btn" class="btn btn-primary"><i class="fas fa-redo"></i> Restart Bee</button>
      <button id="new-list-btn" class="btn btn-secondary"><i class="fas fa-sync-alt"></i> New List</button>
    </div>`;

  document.getElementById('restart-btn').onclick = () => startBee();
  document.getElementById('new-list-btn').onclick = () => {
    summaryArea.innerHTML = "";
    renderExamUI();
  };
}

function showFeedback(message, type = 'correct') {
  const feedback = document.getElementById('feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}

// You may need to add your restartSession and any additional helpers here.

// ==================== RETRY LOGIC SUPPORT ====================
let retryCount = 0;
const MAX_ATTEMPTS = 2; // one retry

function resetRetry() {
  retryCount = 0;
}

// ==================== OET PRACTICE (WITH RETRY, MARKING, AND AUTO-ADVANCE) ====================
function checkOETAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();

  if (isCorrect) {
    score++;
    showFeedback("✓ Correct!", "correct");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i>';
    userInput.classList.add('correct-input');
    userInput.classList.remove('incorrect-input');
    retryCount = 0;
    setTimeout(() => {
      trainerArea.classList.add('word-transition');
      setTimeout(() => {
        if (currentIndex < words.length - 1) {
          currentIndex++;
          showOETWord();
          speakCurrentWord();
        } else {
          storeSessionData('OET'); // store summary
          showSummary();
        }
      }, 300);
    }, 900);
  } else {
    retryCount++;
    if (retryCount < MAX_ATTEMPTS) {
      showFeedback("✗ Incorrect. Try again!", "incorrect");
      document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
      userInput.classList.add('incorrect-input');
      userInput.classList.remove('correct-input');
      setTimeout(() => {
        userInput.value = "";
        userInput.focus();
        userInput.select();
      }, 400);
    } else {
      showFeedback(`✗ Incorrect. Correct: ${correctWord}`, "incorrect");
      document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
      userInput.classList.add('incorrect-input');
      userInput.classList.remove('correct-input');
      retryCount = 0;
      setTimeout(() => {
        trainerArea.classList.add('word-transition');
        setTimeout(() => {
          if (currentIndex < words.length - 1) {
            currentIndex++;
            showOETWord();
            speakCurrentWord();
          } else {
            storeSessionData('OET');
            showSummary();
          }
        }, 300);
      }, 1100);
    }
  }
}

// ==================== CUSTOM PRACTICE (WITH RETRY, MARKING, AND AUTO-ADVANCE) ====================
function checkCustomAnswer(correctWord) {
  const input = document.getElementById('user-input');
  const userAnswer = input.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();

  if (isCorrect) {
    score++;
    showFeedback("✓ Correct!", "correct");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i>';
    input.classList.add('correct-input');
    input.classList.remove('incorrect-input');
    retryCount = 0;
    setTimeout(() => {
      trainerArea.classList.add('word-transition');
      setTimeout(() => {
        if (currentIndex < words.length - 1) {
          currentIndex++;
          showCustomWord();
          speakCurrentWord();
        } else {
          storeSessionData('Custom');
          showSummary();
        }
      }, 300);
    }, 900);
  } else {
    retryCount++;
    if (retryCount < MAX_ATTEMPTS) {
      showFeedback("✗ Incorrect. Try again!", "incorrect");
      document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
      input.classList.add('incorrect-input');
      input.classList.remove('correct-input');
      setTimeout(() => {
        input.value = "";
        input.focus();
        input.select();
      }, 400);
    } else {
      showFeedback(`✗ Incorrect. Correct: ${correctWord}`, "incorrect");
      document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
      input.classList.add('incorrect-input');
      input.classList.remove('correct-input');
      retryCount = 0;
      setTimeout(() => {
        trainerArea.classList.add('word-transition');
        setTimeout(() => {
          if (currentIndex < words.length - 1) {
            currentIndex++;
            showCustomWord();
            speakCurrentWord();
          } else {
            storeSessionData('Custom');
            showSummary();
          }
        }, 300);
      }, 1100);
    }
  }
}

// ==================== BEE PRACTICE (WITH FIREBASE LOGGING) ====================
function processSpellingAttempt(attempt, correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  if (!attempt) {
    micFeedback.textContent = "Couldn't detect your spelling. Try again.";
    micFeedback.className = "feedback incorrect";
    return;
  }

  userAttempts[currentIndex] = attempt;
  const isCorrect = attempt === correctWord.toLowerCase();

  updateSpellingVisual(
    correctWord.split('').map((letter, i) => ({
      letter: attempt[i] || '',
      correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
    }))
  );

  if (isCorrect) {
    score++;
    micFeedback.textContent = "✓ Correct!";
    micFeedback.className = "feedback correct";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
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
      storeSessionData('Bee');
      showBeeSummary();
    }
  }, 1200);
}

// ==================== FIREBASE SESSION LOGGING ====================
function storeSessionData(mode) {
  if (!window.firebase || !firebase.auth().currentUser) return;
  const userId = firebase.auth().currentUser.uid;
  const sessionData = {
    sessionId,
    mode,
    score,
    totalWords: words.length,
    accuracy: Math.round((score / words.length) * 100),
    flaggedWords: [...flaggedWords],
    timestamp: new Date().toISOString(),
    duration: Math.round((Date.now() - sessionStartTime) / 1000)
  };

  // Save to Firestore (prefer) or Realtime DB if needed
  if (firebase.firestore) {
    firebase.firestore().collection("users").doc(userId)
      .collection("sessions").add(sessionData)
      .catch(e => console.warn("Firestore logging failed", e));
  } else if (firebase.database) {
    firebase.database().ref(`users/${userId}/sessions`).push(sessionData)
      .catch(e => console.warn("RealtimeDB logging failed", e));
  }
}

// ==================== SUMMARY BUTTON HANDLER ====================
function restartSession() {
  renderExamUI();
  summaryArea.innerHTML = "";
  trainerArea.innerHTML = "";
}
