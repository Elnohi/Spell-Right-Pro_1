// main-freemium-oet.js - Optimized Complete Implementation
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
  const modeSwitchBtn = document.getElementById('mode-switch-btn');

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
  let isSessionActive = false;

  // Initialize
  loadSavedSession();
  setupEventListeners();
  initDarkMode();

  // Event Listeners
  function setupEventListeners() {
    // Mode Selection
    practiceBtn.addEventListener('click', () => setMode("practice"));
    testBtn.addEventListener('click', () => setMode("test"));

    // Accent Selection
    accentPicker.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        accentPicker.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        accent = e.target.dataset.accent;
      }
    });

    // Word Source Controls
    addCustomBtn.addEventListener('click', addCustomWords);
    fileInput.addEventListener('change', handleFileUpload);
    startBtn.addEventListener('click', toggleSession);
    
    // Mode switching
    if (modeSwitchBtn) {
      modeSwitchBtn.addEventListener('click', switchWordSource);
    }
  }

  // Core Session Functions
  function toggleSession() {
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  }

  function startSession() {
    if (words.length === 0 && !usedCustomListToday) {
      words = window.oetWords.slice();
    }

    if (sessionMode === "test") {
      words = shuffleArray([...words]).slice(0, 24);
    }

    currentIndex = 0;
    score = 0;
    userAnswers = [];
    isSessionActive = true;

    updateUIForActiveSession();
    playCurrentWord();
  }

  function updateUIForActiveSession() {
    trainerArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    customInput.disabled = true;
    fileInput.disabled = true;
    addCustomBtn.disabled = true;
  }

  function playCurrentWord() {
    clearTimeout(autoPlayTimeout);
    
    if (currentIndex >= words.length) {
      endSession();
      return;
    }

    const word = words[currentIndex];
    renderWordInterface(word);
    speakWord(word);
  }

  function renderWordInterface(word) {
    trainerArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      
      <div class="input-group">
        <input type="text" id="user-input" class="form-control" 
               placeholder="Type what you hear..." autofocus
               value="${userAnswers[currentIndex] || ''}">
      </div>
      
      <div class="button-group">
        <button id="prev-btn" class="btn-secondary" ${currentIndex === 0 ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i> Previous
        </button>
        <button id="repeat-btn" class="btn-secondary">
          <i class="fas fa-redo"></i> Repeat
        </button>
        <button id="next-btn" class="btn-secondary">
          <i class="fas fa-arrow-right"></i> Next
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
    document.getElementById('prev-btn').addEventListener('click', prevWord);
    document.getElementById('next-btn').addEventListener('click', nextWord);
    document.getElementById('repeat-btn').addEventListener('click', () => speakWord(word));
    document.getElementById('check-btn').addEventListener('click', () => checkAnswer(word));
    document.getElementById('flag-btn').addEventListener('click', () => toggleFlagWord(word));
    
    const inputField = document.getElementById('user-input');
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkAnswer(word);
    });
    inputField.focus();
  }

  function speakWord(word) {
    if (!speechSynthesis) {
      showAlert("Text-to-speech not supported in your browser.", 'error');
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.9;
    utterance.volume = 1;
    utterance.onerror = (e) => console.error("Speech error:", e);
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

    // Auto-advance after shorter delay (1.5 seconds)
    clearTimeout(autoPlayTimeout);
    autoPlayTimeout = setTimeout(nextWord, 1500);
  }

  function nextWord() {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      playCurrentWord();
    } else {
      endSession();
    }
  }

  function prevWord() {
    if (currentIndex > 0) {
      currentIndex--;
      playCurrentWord();
    }
  }

  function endSession() {
    isSessionActive = false;
    clearTimeout(autoPlayTimeout);
    
    // Calculate results
    const percent = Math.round((score / words.length) * 100);
    const wrongWords = words.filter((w, i) => 
      (userAnswers[i] || "").toLowerCase() !== w.toLowerCase()
    );

    // Render summary
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
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
      
      <div class="summary-actions">
        <button id="restart-btn" class="btn-primary">
          <i class="fas fa-redo"></i> Restart Session
        </button>
        <button id="new-list-btn" class="btn-secondary">
          <i class="fas fa-sync-alt"></i> Change Word List
        </button>
      </div>
    `;

    // Update UI
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    customInput.disabled = false;
    fileInput.disabled = false;
    addCustomBtn.disabled = false;
    
    // Set up summary event listeners
    document.getElementById('restart-btn').addEventListener('click', startSession);
    document.getElementById('new-list-btn').addEventListener('click', resetWordList);
  }

  // Word List Management
  function resetWordList() {
    words = [];
    usedCustomListToday = false;
    customInput.value = '';
    fileInput.value = '';
    summaryArea.classList.add('hidden');
    showAlert("Word list cleared. Add new words or use default OET list.", 'info');
  }

  function switchWordSource() {
    if (isSessionActive) {
      if (confirm("Changing word source will end current session. Continue?")) {
        endSession();
        resetWordList();
      }
    } else {
      resetWordList();
    }
  }

  function setMode(mode) {
    sessionMode = mode;
    practiceBtn.classList.toggle('active', mode === "practice");
    testBtn.classList.toggle('active', mode === "test");
    
    if (isSessionActive) {
      if (confirm("Switching modes will restart your session. Continue?")) {
        startSession();
      }
    }
  }

  // File Handling
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      processWordList(text);
      showAlert(`Loaded ${words.length} words from file!`, 'success');
    } catch (error) {
      showAlert("Error processing file. Please try a text file.", 'error');
      console.error(error);
    }
  }

  function addCustomWords() {
    const input = customInput.value.trim();
    if (!input) {
      showAlert("Please enter or paste words first!", 'error');
      return;
    }

    processWordList(input);
    showAlert(`Added ${words.length} words!`, 'success');
  }

  function processWordList(text) {
    words = [...new Set(text.split(/[\s,;]+/))]
      .map(w => w.trim())
      .filter(w => w && w.length > 1);
    
    if (words.length === 0) {
      throw new Error("No valid words found");
    }
    
    usedCustomListToday = true;
  }

  // Helper Functions
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
      const { words: savedWords, flags } = JSON.parse(savedSession);
      words = savedWords;
      flaggedWords = flags;
      usedCustomListToday = true;
    }
  }

  function initDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        updateDarkModeIcon();
      });
      
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

  function toggleFlagWord(word) {
    const index = flaggedWords.indexOf(word);
    if (index === -1) {
      flaggedWords.push(word);
    } else {
      flaggedWords.splice(index, 1);
    }
    localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
    updateFlagButton();
  }

  function updateFlagButton() {
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
      const word = words[currentIndex];
      flagBtn.classList.toggle('active', flaggedWords.includes(word));
    }
  }
});
