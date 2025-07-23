// main-freemium-oet.js - Complete Implementation
document.addEventListener('DOMContentLoaded', () => {
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
  let autoPlayTimeout;
  let speechSynthesis = window.speechSynthesis || null;

  // Initialize
  loadSavedSession();
  setupEventListeners();
  initDarkMode();

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
  function startSession() {
    // Use default OET words if no custom list
    if (!usedCustomListToday) {
      words = window.oetWords.slice();
    }

    // TEST MODE: Select 24 random words
    if (sessionMode === "test") {
      words = shuffleArray([...words]).slice(0, 24);
    }

    // Reset state
    currentIndex = 0;
    score = 0;
    userAnswers = [];
    clearTimeout(autoPlayTimeout);

    // UI Setup
    trainerArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.disabled = true;

    // Start auto-play
    playNextWord();
  }

  function playNextWord() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }

    const word = words[currentIndex];
    trainerArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      
      <div class="input-group">
        <input type="text" id="user-input" class="form-control" 
               placeholder="Type what you hear..." autofocus>
      </div>
      
      <div class="button-group">
        <button id="repeat-btn" class="btn-secondary">
          <i class="fas fa-redo"></i> Repeat
        </button>
        <button id="check-btn" class="btn-primary">
          <i class="fas fa-check"></i> Check
        </button>
        <button id="flag-btn" class="btn-icon ${flaggedWords.includes(word) ? 'active' : ''}">
          <i class="fas fa-star"></i> Flag
        </button>
      </div>
      
      <div id="feedback" class="feedback"></div>
    `;

    // Set up event listeners
    document.getElementById('repeat-btn').addEventListener('click', () => speakWord(word));
    document.getElementById('check-btn').addEventListener('click', () => checkAnswer(word));
    document.getElementById('flag-btn').addEventListener('click', () => toggleFlagWord(word));
    
    const inputField = document.getElementById('user-input');
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkAnswer(word);
    });

    // Auto-play the word
    speakWord(word);
  }

  function speakWord(word) {
    if (!speechSynthesis) {
      showAlert("Text-to-speech not supported in your browser.", 'error');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.volume = 1;

    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      showAlert("Error pronouncing word. Try another browser.", 'error');
    };

    speechSynthesis.speak(utterance);
  }

  function checkAnswer(correctWord) {
    const inputField = document.getElementById('user-input');
    const userAnswer = inputField.value.trim();
    
    if (!userAnswer) {
      showAlert("Please type the word first!", 'error');
      return;
    }

    userAnswers[currentIndex] = userAnswer;
    const feedback = document.getElementById('feedback');
    
    // Visual feedback
    if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
      score++;
      inputField.classList.add('correct-answer');
    } else {
      feedback.textContent = `✗ Incorrect. The correct spelling was: ${correctWord}`;
      feedback.className = "feedback incorrect";
      inputField.classList.add('incorrect-answer');
    }

    // Move to next word after delay
    currentIndex++;
    inputField.value = '';
    inputField.classList.remove('correct-answer', 'incorrect-answer');
    
    clearTimeout(autoPlayTimeout);
    autoPlayTimeout = setTimeout(() => playNextWord(), 2500); // 2.5s delay
  }

  function toggleFlagWord(word) {
    const index = flaggedWords.indexOf(word);
    if (index === -1) {
      flaggedWords.push(word);
      showAlert("Word flagged for practice", 'success');
    } else {
      flaggedWords.splice(index, 1);
      showAlert("Word unflagged", 'info');
    }
    
    localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
    updateFlagButton();
  }

  function updateFlagButton() {
    const word = words[currentIndex];
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
      flagBtn.classList.toggle('active', flaggedWords.includes(word));
    }
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

  // File Handling
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // File size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert("File too large. Max 2MB allowed.", 'error');
      return;
    }

    try {
      let text = await readFileAsText(file);
      
      // Process text content
      words = [...new Set(text.split(/[\s,;]+/))]
        .map(w => w.trim())
        .filter(w => w && w.length > 1); // Filter single letters

      if (words.length === 0) {
        showAlert("No valid words found in the file.", 'error');
        return;
      }

      usedCustomListToday = true;
      showAlert(`Loaded ${words.length} words from file!`, 'success');
    } catch (error) {
      showAlert("Error processing file. Please try a text file.", 'error');
      console.error(error);
    }
  }

  function addCustomWords() {
    if (usedCustomListToday) {
      showAlert("You can only use one custom list per day in the freemium version.", 'error');
      return;
    }

    const input = customInput.value.trim();
    if (!input) {
      showAlert("Please enter or paste words first!", 'error');
      return;
    }

    words = [...new Set(input.split(/[\s,;]+/))]
      .map(w => w.trim())
      .filter(w => w && w.length > 1);

    if (words.length === 0) {
      showAlert("No valid words found. Please check your input.", 'error');
      return;
    }

    usedCustomListToday = true;
    showAlert(`Added ${words.length} words!`, 'success');
  }

  // Helper Functions
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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

  function initDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        updateDarkModeIcon();
      });
      
      // Initialize from localStorage
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
      }
      updateDarkModeIcon();
    }
  }

  function updateDarkModeIcon() {
    const icon = document.querySelector('#dark-mode-toggle i');
    if (icon) {
      icon.className = document.body.classList.contains('dark-mode') 
        ? 'fas fa-sun' 
        : 'fas fa-moon';
    }
  }
});
