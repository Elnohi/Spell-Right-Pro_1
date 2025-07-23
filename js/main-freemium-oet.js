// DOM Elements and State Variables
const elements = {
  practiceBtn: document.getElementById('practice-mode-btn'),
  testBtn: document.getElementById('test-mode-btn'),
  customInput: document.getElementById('custom-words'),
  fileInput: document.getElementById('file-input'),
  addCustomBtn: document.getElementById('add-custom-btn'),
  startBtn: document.getElementById('start-btn'),
  trainerArea: document.getElementById('trainer-area'),
  summaryArea: document.getElementById('summary-area'),
  accentPicker: document.querySelector('.accent-picker')
};

let state = {
  words: [],
  currentIndex: 0,
  score: 0,
  sessionMode: "practice",
  flaggedWords: JSON.parse(localStorage.getItem('flaggedWords')) || [],
  userAnswers: [],
  usedCustomListToday: false,
  accent: "en-US",
  isAutoPlaying: false,
  autoPlayTimeout: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSavedSession();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  // Mode Selection
  elements.practiceBtn.addEventListener('click', () => {
    state.sessionMode = "practice";
    elements.practiceBtn.classList.add('active');
    elements.testBtn.classList.remove('active');
  });

  elements.testBtn.addEventListener('click', () => {
    state.sessionMode = "test";
    elements.testBtn.classList.add('active');
    elements.practiceBtn.classList.remove('active');
  });

  // Accent Selection
  elements.accentPicker.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      elements.accentPicker.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      state.accent = e.target.dataset.accent;
    }
  });

  // Custom Words
  elements.addCustomBtn.addEventListener('click', addCustomWords);
  elements.fileInput.addEventListener('change', handleFileUpload);
  elements.startBtn.addEventListener('click', startSession);
}

// Core Functions
async function addCustomWords() {
  if (state.usedCustomListToday) {
    showAlert("You can only use one custom list per day in the freemium version.");
    return;
  }

  const input = elements.customInput.value.trim();
  if (!input) {
    showAlert("Please enter or paste words first!");
    return;
  }

  state.words = [...new Set(input.split(/[\s,;]+/))]
    .map(w => w.trim())
    .filter(w => w);

  if (state.words.length === 0) {
    showAlert("No valid words found. Please check your input.");
    return;
  }

  state.usedCustomListToday = true;
  saveSessionState();
  showAlert(`Added ${state.words.length} words!`, 'success');
}

async function handleFileUpload(e) {
  if (state.usedCustomListToday) {
    showAlert("You can only use one custom list per day in the freemium version.");
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  try {
    let text = "";
    
    // Handle different file types
    if (file.type === "text/plain" || file.name.endsWith('.txt')) {
      text = await file.text();
    } else if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
      // PDF.js would be needed here for full PDF support
      showAlert("PDF content extraction requires premium version.", 'info');
      return;
    } else {
      // Try to read as text anyway (works for .docx, .rtf, etc. to some extent)
      text = await file.text();
    }

    state.words = [...new Set(text.split(/[\s,;]+/))]
      .map(w => w.trim())
      .filter(w => w);

    if (state.words.length === 0) {
      showAlert("No valid words found in the file.");
      return;
    }

    state.usedCustomListToday = true;
    saveSessionState();
    showAlert(`Loaded ${state.words.length} words from file!`, 'success');
  } catch (error) {
    showAlert("Error reading file. Please try a text file.", 'error');
    console.error(error);
  }
}

function startSession() {
  if (!state.usedCustomListToday) {
    // Use default OET words if no custom list
    state.words = window.oetWords.slice();
  }

  if (state.words.length === 0) {
    showAlert("No words available. Please add words first.");
    return;
  }

  // For test mode, select 24 random words
  if (state.sessionMode === "test") {
    state.words = getRandomWords(state.words, 24);
  }

  // Reset session state
  state.currentIndex = 0;
  state.score = 0;
  state.userAnswers = [];
  state.isAutoPlaying = true;

  // UI Updates
  elements.trainerArea.classList.remove('hidden');
  elements.summaryArea.classList.add('hidden');
  elements.startBtn.disabled = true;

  showCurrentWord();
  startAutoPlay();
}

function getRandomWords(wordList, count) {
  const shuffled = [...wordList].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, wordList.length));
}

function showCurrentWord() {
  if (state.currentIndex >= state.words.length) {
    endSession();
    return;
  }

  const word = state.words[state.currentIndex];
  elements.trainerArea.innerHTML = `
    <div class="word-progress">Word ${state.currentIndex + 1} of ${state.words.length}</div>
    <div class="word-display">${word}</div>
    
    <div class="input-group">
      <input type="text" id="user-input" class="form-control" 
             placeholder="Type the word..." autofocus>
    </div>
    
    <div class="button-group">
      <button id="check-btn" class="btn-primary">
        <i class="fas fa-check"></i> Check
      </button>
      <button id="speak-btn" class="btn-secondary">
        <i class="fas fa-volume-up"></i> Repeat
      </button>
      <button id="flag-btn" class="btn-icon ${state.flaggedWords.includes(word) ? 'active' : ''}">
        <i class="fas fa-star"></i>
      </button>
    </div>
    
    <div id="feedback" class="feedback"></div>
  `;

  // Set up event listeners
  document.getElementById('check-btn').addEventListener('click', () => checkAnswer(word));
  document.getElementById('speak-btn').addEventListener('click', () => speakWord(word));
  document.getElementById('flag-btn').addEventListener('click', () => toggleFlagWord(word));
  document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer(word);
  });

  // Focus input field
  document.getElementById('user-input').focus();
}

function startAutoPlay() {
  if (!state.isAutoPlaying) return;

  const word = state.words[state.currentIndex];
  speakWord(word);

  // Set timeout for automatic progression (8 seconds per word)
  state.autoPlayTimeout = setTimeout(() => {
    if (state.currentIndex < state.words.length) {
      const userInput = document.getElementById('user-input')?.value.trim() || "";
      if (userInput) {
        checkAnswer(word);
      } else {
        nextWord();
      }
    }
  }, 8000);
}

function speakWord(word) {
  if (!window.speechSynthesis) {
    showAlert("Text-to-speech not supported in your browser.", 'error');
    return;
  }

  // Cancel any ongoing speech and timeouts
  window.speechSynthesis.cancel();
  if (state.autoPlayTimeout) {
    clearTimeout(state.autoPlayTimeout);
  }

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = state.accent;
  utterance.rate = 0.9;
  
  utterance.onend = () => {
    if (state.isAutoPlaying) {
      // Reset timeout when speech ends
      state.autoPlayTimeout = setTimeout(() => {
        const userInput = document.getElementById('user-input')?.value.trim() || "";
        if (userInput) {
          checkAnswer(word);
        } else {
          nextWord();
        }
      }, 5000); // 5 seconds after speech ends
    }
  };
  
  utterance.onerror = (e) => {
    console.error("Speech error:", e);
    showAlert("Error pronouncing word. Try another browser.", 'error');
  };
  
  window.speechSynthesis.speak(utterance);
}

function checkAnswer(correctWord) {
  const userInput = document.getElementById('user-input').value.trim();
  if (!userInput) {
    showAlert("Please type the word first!", 'error');
    return;
  }

  state.userAnswers[state.currentIndex] = userInput;
  const feedback = document.getElementById('feedback');
  
  if (userInput.toLowerCase() === correctWord.toLowerCase()) {
    feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    state.score++;
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
  }

  // Clear any existing timeout
  if (state.autoPlayTimeout) {
    clearTimeout(state.autoPlayTimeout);
  }

  // Move to next word after delay
  setTimeout(() => {
    nextWord();
  }, state.sessionMode === "practice" ? 2000 : 1000);
}

function nextWord() {
  state.currentIndex++;
  saveSessionState();
  
  if (state.isAutoPlaying) {
    showCurrentWord();
    if (state.currentIndex < state.words.length) {
      startAutoPlay();
    }
  } else {
    showCurrentWord();
  }
}

function toggleFlagWord(word) {
  const index = state.flaggedWords.indexOf(word);
  if (index === -1) {
    state.flaggedWords.push(word);
    showAlert("Word flagged for practice", 'success');
  } else {
    state.flaggedWords.splice(index, 1);
  }
  
  localStorage.setItem('flaggedWords', JSON.stringify(state.flaggedWords));
  document.getElementById('flag-btn').classList.toggle('active', state.flaggedWords.includes(word));
}

function endSession() {
  state.isAutoPlaying = false;
  if (state.autoPlayTimeout) {
    clearTimeout(state.autoPlayTimeout);
  }

  const percent = Math.round((state.score / state.words.length) * 100);
  const wrongWords = state.words.filter((w, i) => 
    (state.userAnswers[i] || "").toLowerCase() !== w.toLowerCase()
  );

  elements.summaryArea.innerHTML = `
    <h2>Session Complete!</h2>
    <div class="summary-grid">
      <div class="score-card">
        <h3>Your Score</h3>
        <div class="score-display">${state.score}/${state.words.length}</div>
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

  elements.trainerArea.classList.add('hidden');
  elements.summaryArea.classList.remove('hidden');
  elements.startBtn.disabled = false;
  
  document.getElementById('restart-btn').addEventListener('click', () => {
    state.usedCustomListToday = false;
    startSession();
  });
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
      state.words = savedWords;
      state.currentIndex = index;
      state.score = savedScore;
      state.flaggedWords = flags;
      state.usedCustomListToday = true;
      startSession();
    }
  }
}

function saveSessionState() {
  const sessionData = {
    words: state.words,
    index: state.currentIndex,
    score: state.score,
    flags: state.flaggedWords
  };
  localStorage.setItem('spellRightSession', JSON.stringify(sessionData));
}

// Dark mode toggle
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Initialize dark mode
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
}
