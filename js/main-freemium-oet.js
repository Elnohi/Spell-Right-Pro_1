// DOM Elements
const accentPicker = document.querySelector('.accent-picker');
const practiceBtn = document.getElementById('practice-mode-btn');
const testBtn = document.getElementById('test-mode-btn');
const customInput = document.getElementById('custom-words');
const fileInput = document.getElementById('file-input');
const addCustomBtn = document.getElementById('add-custom-btn');
const startBtn = document.getElementById('start-btn');
const trainerArea = document.getElementById('trainer-area');
const summaryArea = document.getElementById('summary-area');

// State Variables
let words = [];
let currentIndex = 0;
let score = 0;
let sessionMode = "practice";
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords')) || [];
let userAnswers = [];
let usedCustomListToday = false;
let accent = "en-US";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSavedSession();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  // Mode Selection
  practiceBtn.addEventListener('click', () => {
    sessionMode = "practice";
    practiceBtn.classList.add('active');
    testBtn.classList.remove('active');
  });

  testBtn.addEventListener('click', () => {
    sessionMode = "test";
    testBtn.classList.add('active');
    practiceBtn.classList.remove('active');
  });

  // Accent Selection
  accentPicker.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      accentPicker.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      accent = e.target.dataset.accent;
    }
  });

  // Custom Words
  addCustomBtn.addEventListener('click', addCustomWords);
  fileInput.addEventListener('change', handleFileUpload);
  startBtn.addEventListener('click', startSession);
}

// Core Functions
function addCustomWords() {
  if (usedCustomListToday) {
    showAlert("You can only use one custom list per day in the freemium version.");
    return;
  }

  const input = customInput.value.trim();
  if (!input) {
    showAlert("Please enter or paste words first!");
    return;
  }

  words = [...new Set(input.split(/[\s,;]+/))]
    .map(w => w.trim())
    .filter(w => w);

  if (words.length === 0) {
    showAlert("No valid words found. Please check your input.");
    return;
  }

  usedCustomListToday = true;
  saveSessionState();
  showAlert(`Added ${words.length} words!`, 'success');
}

async function handleFileUpload(e) {
  if (usedCustomListToday) {
    showAlert("You can only use one custom list per day in the freemium version.");
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  // Validate file
  if (file.size > 1_000_000) {
    showAlert("File too large. Max 1MB allowed.");
    return;
  }

  if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
    showAlert("Only .txt files are supported.");
    return;
  }

  try {
    const text = await file.text();
    words = [...new Set(text.split(/[\s,;]+/))]
      .map(w => w.trim())
      .filter(w => w);

    if (words.length === 0) {
      showAlert("No valid words found in the file.");
      return;
    }

    usedCustomListToday = true;
    saveSessionState();
    showAlert(`Loaded ${words.length} words from file!`, 'success');
  } catch (error) {
    showAlert("Error reading file. Please try again.");
    console.error(error);
  }
}

function startSession() {
  if (!usedCustomListToday) {
    // Use default OET words if no custom list
    words = window.oetWords.slice();
  }

  if (words.length === 0) {
    showAlert("No words available. Please add words first.");
    return;
  }

  // Reset session
  currentIndex = 0;
  score = 0;
  userAnswers = [];
  
  // UI Updates
  trainerArea.classList.remove('hidden');
  summaryArea.classList.add('hidden');
  startBtn.disabled = true;
  
  showCurrentWord();
}

function showCurrentWord() {
  if (currentIndex >= words.length) {
    endSession();
    return;
  }

  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-display">${word}</div>
    
    <div class="button-group">
      <button id="speak-btn" class="btn-primary">
        <i class="fas fa-volume-up"></i> Speak
      </button>
    </div>
    
    <div class="input-group">
      <input type="text" id="user-input" class="form-control" 
             placeholder="Type the word..." autofocus>
    </div>
    
    <div class="button-group">
      <button id="check-btn" class="btn-primary">
        <i class="fas fa-check"></i> Check
      </button>
      <button id="next-btn" class="btn-secondary">
        <i class="fas fa-arrow-right"></i> Next
      </button>
      <button id="flag-btn" class="btn-icon ${flaggedWords.includes(word) ? 'active' : ''}">
        <i class="fas fa-star"></i>
      </button>
    </div>
    
    <div id="feedback" class="feedback"></div>
  `;

  // Set up event listeners for dynamic elements
  document.getElementById('speak-btn').addEventListener('click', () => speakWord(word));
  document.getElementById('check-btn').addEventListener('click', () => checkAnswer(word));
  document.getElementById('next-btn').addEventListener('click', nextWord);
  document.getElementById('flag-btn').addEventListener('click', () => toggleFlagWord(word));
  document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer(word);
  });
}

function speakWord(word) {
  if (!window.speechSynthesis) {
    showAlert("Text-to-speech not supported in your browser.", 'error');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent;
  utterance.rate = 0.9; // Slightly slower for clarity
  
  utterance.onerror = (e) => {
    console.error("Speech error:", e);
    showAlert("Error pronouncing word. Try another browser.", 'error');
  };
  
  window.speechSynthesis.cancel(); // Stop any current speech
  window.speechSynthesis.speak(utterance);
}

function checkAnswer(correctWord) {
  const userInput = document.getElementById('user-input').value.trim();
  if (!userInput) {
    showAlert("Please type the word first!", 'error');
    return;
  }

  userAnswers[currentIndex] = userInput;
  const feedback = document.getElementById('feedback');
  
  if (userInput.toLowerCase() === correctWord.toLowerCase()) {
    feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    score++;
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
  }

  if (sessionMode === "test") {
    setTimeout(nextWord, 1500);
  }
}

function nextWord() {
  currentIndex++;
  saveSessionState();
  showCurrentWord();
}

function toggleFlagWord(word) {
  const index = flaggedWords.indexOf(word);
  if (index === -1) {
    flaggedWords.push(word);
    showAlert("Word flagged for practice", 'success');
  } else {
    flaggedWords.splice(index, 1);
  }
  
  localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
  showCurrentWord(); // Refresh to update flag icon
}

function endSession() {
  const percent = Math.round((score / words.length) * 100);
  const wrongWords = words.filter((w, i) => 
    (userAnswers[i] || "").toLowerCase() !== w.toLowerCase()
  );

  summaryArea.innerHTML = `
    <h2>Session Complete!</h2>
    <div class="summary-grid">
      <div class="score-card">
        <h3>Your Score</h3>
        <div class="score-display">${score}/${words.length}</div>
        <div class="score-percent">${percent}%</div>
      </div>
      
      <div class="mistakes-card">
        <h3>Words to Review</h3>
        <ul class="word-list">
          ${wrongWords.map(w => `<li>${w}</li>`).join('')}
          ${wrongWords.length === 0 ? '<li>Perfect! No mistakes</li>' : ''}
        </ul>
      </div>
    </div>
    
    <button id="restart-btn" class="btn-primary">
      <i class="fas fa-redo"></i> Start New Session
    </button>
  `;

  trainerArea.classList.add('hidden');
  summaryArea.classList.remove('hidden');
  startBtn.disabled = false;
  
  document.getElementById('restart-btn').addEventListener('click', startSession);
}

// Helper Functions
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

function loadSavedSession() {
  const savedSession = localStorage.getItem('spellRightSession');
  if (savedSession) {
    const { words: savedWords, index, score: savedScore, flags } = JSON.parse(savedSession);
    if (confirm('Would you like to resume your previous session?')) {
      words = savedWords;
      currentIndex = index;
      score = savedScore;
      flaggedWords = flags;
      usedCustomListToday = true;
      startSession();
    }
  }
}

function saveSessionState() {
  const sessionData = {
    words,
    index: currentIndex,
    score,
    flags: flaggedWords
  };
  localStorage.setItem('spellRightSession', JSON.stringify(sessionData));
}

// Initialize dark mode toggle
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Check for saved dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
}
