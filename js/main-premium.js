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

// Enhanced word splitting pattern
const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;

// Initialize dark mode toggle
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  updateDarkModeIcon();
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

auth.onAuthStateChanged(user => {
  currentUser = user;
  renderAuth();
});

// Main App UI
function renderExamUI() {
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
  
  document.getElementById('exam-type').value = examType;
  document.getElementById('accent-select').value = accent;
  updateFlag();

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
    document.getElementById('practice-mode-btn').classList.add("selected");
    document.getElementById('test-mode-btn').classList.remove("selected");
  };
  
  document.getElementById('test-mode-btn').onclick = () => {
    sessionMode = "test";
    document.getElementById('test-mode-btn').classList.add("selected");
    document.getElementById('practice-mode-btn').classList.remove("selected");
  };
  
  document.getElementById('start-btn').onclick = () => {
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

function updateFlag() {
  const flagSVGs = {
    "en-US": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#b22234" width="60" height="40"/><g fill="#fff"><rect y="4" width="60" height="4"/><rect y="12" width="60" height="4"/><rect y="20" width="60" height="4"/><rect y="28" width="60" height="4"/><rect y="36" width="60" height="4"/></g><rect width="24" height="16" fill="#3c3b6e"/><g fill="#fff"><g id="s18"><g id="s9"><polygon points="2.5,2.1 3.0,3.5 4.3,3.5 3.2,4.3 3.7,5.7 2.5,4.8 1.3,5.7 1.8,4.3 0.7,3.5 2.0,3.5"/></g><use href="#s9" x="6"/><use href="#s9" x="12"/><use href="#s9" x="18"/><use href="#s9" y="4"/><use href="#s9" x="6" y="4"/><use href="#s9" x="12" y="4"/><use href="#s9" x="18" y="4"/><use href="#s9" y="8"/><use href="#s9" x="6" y="8"/><use href="#s9" x="12" y="8"/><use href="#s9" x="18" y="8"/><use href="#s9" y="12"/><use href="#s9" x="6" y="12"/><use href="#s9" x="12" y="12"/><use href="#s9" x="18" y="12"/></g><use href="#s18" y="2"/></g></svg>`,
    "en-GB": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><path stroke="#fff" stroke-width="6" d="M0,0 L60,40 M60,0 L0,40"/><path stroke="#cf142b" stroke-width="4" d="M0,0 L60,40 M60,0 L0,40"/><rect x="25" width="10" height="40" fill="#fff"/><rect y="15" width="60" height="10" fill="#fff"/><rect x="27" width="6" height="40" fill="#cf142b"/><rect y="17" width="60" height="6" fill="#cf142b"/></svg>`,
    "en-AU": `<svg width="24" height="16" viewBox="0 0 60 40"><rect width="60" height="40" fill="#012169"/><path d="M7,0 L23,0 L37,16 L60,16 L60,6 L40,6 L25,0 L60,0 L60,0 L60,40 L0,40 L0,0 L7,0 Z" fill="#FFFFFF"/><path d="M0,16 L25,16 L10,0 L0,0 L0,16 Z" fill="#FFFFFF"/><path d="M60,24 L35,24 L50,40 L60,40 L60,24 Z" fill="#FFFFFF"/><path d="M0,24 L20,24 L0,40 L0,24 Z" fill="#FFFFFF"/><path d="M25,0 L35,0 L60,30 L60,40 L50,40 L25,10 L25,0 Z" fill="#C8102E"/><path d="M0,16 L10,16 L0,6 L0,16 Z" fill="#C8102E"/><path d="M60,24 L50,24 L60,34 L60,24 Z" fill="#C8102E"/><path d="M0,0 L60,0 L25,35 L25,40 L0,40 L0,0 Z" fill="#C8102E"/><circle cx="30" cy="20" r="10" fill="#012169"/><circle cx="30" cy="20" r="8" fill="#FFFFFF"/><path d="M30,12 L33,20 L30,28 L27,20 Z" fill="#012169"/><path d="M30,12 L37,16 L23,16 Z" fill="#012169"/><path d="M30,28 L37,24 L23,24 Z" fill="#012169"/><path d="M23,16 L27,20 L23,24 Z" fill="#012169"/><path d="M37,16 L33,20 L37,24 Z" fill="#012169"/></svg>`
  };
  document.getElementById('flag-svg').innerHTML = flagSVGs[accent] || "";
}

// Custom Words Input
function renderCustomInput() {
  document.getElementById('custom-upload-area').innerHTML = `
    <textarea id="custom-words" class="form-control" rows="4" 
      placeholder="Enter words (separated by commas, spaces, or new lines)"></textarea>
    <button id="add-custom-btn" class="btn btn-info" style="margin-top: 10px;">
      <i class="fas fa-plus-circle"></i> Use These Words
    </button>
  `;
  
  document.getElementById('add-custom-btn').onclick = () => {
    const input = document.getElementById('custom-words').value.trim();
    if (!input) {
      showAlert("Please enter some words first!", 'error');
      return;
    }
    
    try {
      processWordList(input);
      showAlert(`Added ${words.length} words!`, 'success');
      appTitle.textContent = "Custom Spelling Practice";
      startCustomPractice();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };
}

// OET Spelling Practice
function startOET() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";

  // In test mode, select random 24 words
  if (sessionMode === "test") {
    const shuffled = [...window.oetWords].sort(() => 0.5 - Math.random());
    words = shuffled.slice(0, 24);
  } else {
    words = window.oetWords.slice();
  }

  appTitle.textContent = `OET Spelling ${sessionMode === "test" ? "Test" : "Practice"}`;
  showOETWord();
  speakCurrentWord();
}

function showOETWord() {
  if (currentIndex >= words.length) {
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
  document.getElementById('prev-btn').onclick = prevOETWord;
  document.getElementById('next-btn').onclick = nextOETWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

  // Handle Enter key and auto-check
  userInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      checkOETAnswer(word);
    }
  };

  // Auto-check when word is fully typed
  userInput.oninput = (e) => {
    if (e.target.value.toLowerCase() === word.toLowerCase()) {
      checkOETAnswer(word);
    }
  };
}

function speakCurrentWord() {
  speakWord(words[currentIndex]);
}

function checkOETAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const feedback = document.getElementById('feedback');
  
  if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    score++;
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
    
    // Auto-proceed after short delay
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showOETWord();
        speakCurrentWord();
      
  setTimeout(() => {}, 1200);
} else {
showSummary();
      
  setTimeout(() => {}, 1800);
}
    }, 1000);
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }
}

function nextOETWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showOETWord();
    speakCurrentWord();
  } else {
    showSummary();
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
  if (idx === -1) {
    flaggedWords.push(word);
  } else {
    flaggedWords.splice(idx, 1);
  }
  showOETWord();
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
  showBeeWord();
  speakCurrentBeeWord();
}

function showBeeWord() {
  if (currentIndex >= words.length) {
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

  // Auto-start listening after short delay
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
  
  // Update visual feedback
  updateSpellingVisual(
    correctWord.split('').map((letter, i) => ({
      letter: attempt[i] || '',
      correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
    }))
  );
  
  if (attempt === correctWord.toLowerCase()) {
    micFeedback.textContent = "✓ Correct!";
    micFeedback.className = "feedback correct";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
    score++;
    
    // Auto-proceed to next word
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showBeeWord();
        speakCurrentBeeWord();
      } else {
        showBeeSummary();
      }
    }, 1500);
  } else {
    micFeedback.textContent = `✗ Incorrect. You spelled: ${attempt}. Correct: ${correctWord}`;
    micFeedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }
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
  if (idx === -1) {
    flaggedWords.push(word);
  } else {
    flaggedWords.splice(idx, 1);
  }
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
  showCustomWord();
  speakCurrentWord();
}

function showCustomWord() {
  if (currentIndex >= words.length) {
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

  // Handle Enter key and auto-check
  userInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      checkCustomAnswer(word);
    }
  };

  // Auto-check when word is fully typed
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
  
  if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    score++;
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
    
    // Auto-proceed after short delay
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showCustomWord();
        speakCurrentWord();
      
  setTimeout(() => {}, 1200);
} else {
showSummary();
      
  setTimeout(() => {}, 1800);
}
    }, 1000);
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }
}

function nextCustomWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showCustomWord();
    speakCurrentWord();
  } else {
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
function processWordList(text) {
  words = [...new Set(text.split(WORD_SEPARATORS))]
    .map(w => w.trim())
    .filter(w => w && w.length > 1);
  
  if (words.length === 0) {
    throw new Error("No valid words found in the input");
  }
  
  return words;
}

function speakWord(word) {
  if (!window.speechSynthesis) {
    showAlert("Text-to-speech not supported in your browser", 'error');
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
