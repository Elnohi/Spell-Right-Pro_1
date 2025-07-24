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
let usedCustomListToday = false;

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
        <option value="Upload">Upload Word List</option>
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
      words = window.oetWords.slice();
      usedCustomListToday = false;
      appTitle.textContent = "OET Spelling Practice";
      startOET();
    } else if (examType === "Bee") {
      words = [
        "accommodate", "belligerent", "conscientious", "disastrous", 
        "embarrass", "foreign", "guarantee", "harass", 
        "interrupt", "jealous", "knowledge", "liaison",
        "millennium", "necessary", "occasionally", "possession",
        "questionnaire", "rhythm", "separate", "tomorrow",
        "unforeseen", "vacuum", "withhold", "yacht"
      ];
      usedCustomListToday = false;
      appTitle.textContent = "Spelling Bee";
      startBee();
    } else if (examType === "Custom") {
      renderCustomInput();
    } else if (examType === "Upload") {
      renderUploadInput();
    }
  };
  
  if (examType === "Custom") renderCustomInput();
  if (examType === "Upload") renderUploadInput();
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
    <textarea id="custom-words" class="form-control" rows="4" placeholder="Enter or paste your words (separated by commas, spaces, or new lines)"></textarea>
    <button id="add-custom-btn" class="btn btn-info" style="margin-top: 10px;">
      <i class="fas fa-plus-circle"></i> Add Custom Words
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
      if (examType === "OET") {
        appTitle.textContent = "Custom OET Practice";
        startOET();
      } else {
        appTitle.textContent = "Custom Spelling Bee";
        startBee();
      }
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };
}

// File Upload
function renderUploadInput() {
  document.getElementById('custom-upload-area').innerHTML = `
    <div style="margin-bottom: 15px;">
      <label for="file-input" class="btn btn-outline" style="display: inline-block;">
        <i class="fas fa-file-upload"></i> Choose Word List File
      </label>
      <span id="file-name" style="margin-left: 10px;"></span>
      <input type="file" id="file-input" accept=".txt,.csv" style="display: none;">
    </div>
    <button id="upload-btn" class="btn btn-info" disabled>
      <i class="fas fa-cloud-upload-alt"></i> Upload & Start
    </button>
  `;
  
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const fileName = document.getElementById('file-name');
  
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    fileName.textContent = file.name;
    uploadBtn.disabled = false;
  };
  
  uploadBtn.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    
    try {
      const text = await readFileAsText(file);
      processWordList(text);
      showAlert(`Loaded ${words.length} words from file!`, 'success');
      if (examType === "OET") {
        appTitle.textContent = "Uploaded OET Practice";
        startOET();
      } else {
        appTitle.textContent = "Uploaded Spelling Bee";
        startBee();
      }
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
  showOETWord();
}

function showOETWord() {
  if (currentIndex >= words.length) {
    showSummary();
    return;
  }
  
  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    
    <button id="speak-btn" class="btn btn-primary">
      <i class="fas fa-volume-up"></i> Hear Word
    </button>
    
    <input type="text" id="user-input" class="form-control" style="margin-top: 15px;" 
           placeholder="Type what you heard..." autofocus>
    
    <div class="button-group">
      <button id="check-btn" class="btn btn-success">
        <i class="fas fa-check"></i> Check
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length-1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Next
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
    </div>
    
    <div id="feedback" class="feedback" style="margin-top: 15px;"></div>
  `;
  
  document.getElementById('speak-btn').onclick = () => speakWord(word);
  document.getElementById('check-btn').onclick = () => checkOETAnswer(word);
  document.getElementById('next-btn').onclick = nextOETWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);
  document.getElementById('user-input').focus();
}

function checkOETAnswer(correctWord) {
  const userInput = document.getElementById('user-input').value.trim();
  userAnswers[currentIndex] = userInput;
  const feedback = document.getElementById('feedback');
  
  if (userInput.toLowerCase() === correctWord.toLowerCase()) {
    feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    score++;
    
    if (sessionMode === "test") {
      setTimeout(nextOETWord, 1000);
    }
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
  }
}

function nextOETWord() {
  currentIndex++;
  showOETWord();
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
  showBeeWord();
}

function showBeeWord() {
  if (currentIndex >= words.length) {
    showBeeSummary();
    return;
  }
  
  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    
    <button id="speak-btn" class="btn btn-primary">
      <i class="fas fa-volume-up"></i> Hear Word
    </button>
    
    <div class="auto-recording-info">
      <i class="fas fa-info-circle"></i> Speak the spelling after the word is pronounced
    </div>
    
    <div id="spelling-visual" style="margin: 15px 0;"></div>
    
    <div class="button-group">
      <button id="spell-mic-btn" class="btn btn-warning">
        <i class="fas fa-microphone"></i> Spell with Mic
      </button>
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length-1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Skip
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
    </div>
    
    <div id="mic-feedback" class="feedback"></div>
  `;
  
  updateSpellingVisual();
  document.getElementById('speak-btn').onclick = () => speakWord(word);
  document.getElementById('spell-mic-btn').onclick = () => listenForSpelling(word);
  document.getElementById('prev-btn').onclick = prevBeeWord;
  document.getElementById('next-btn').onclick = nextBeeWord;
  document.getElementById('flag-btn').onclick = () => toggleBeeFlagWord(word);
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
    score++;
    setTimeout(nextBeeWord, 1500);
  } else {
    micFeedback.textContent = `✗ Incorrect. You spelled: ${attempt}. Correct: ${correctWord}`;
    micFeedback.className = "feedback incorrect";
  }
}

function updateSpellingVisual(letters = []) {
  const spellingVisual = document.getElementById('spelling-visual');
  spellingVisual.innerHTML = correctWord.split('').map((letter, i) => {
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
  } else {
    showBeeSummary();
  }
}

function prevBeeWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showBeeWord();
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
    if (examType === "OET") startOET();
    else startBee();
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
  
  usedCustomListToday = true;
  return words;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("File too large. Max 2MB allowed."));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
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
