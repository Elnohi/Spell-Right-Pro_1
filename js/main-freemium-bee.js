document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const accentPicker = document.querySelector('.accent-picker');
  const customInput = document.getElementById('custom-words');
  const fileInput = document.getElementById('file-input');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const startBtn = document.getElementById('start-btn');
  const beeArea = document.getElementById('bee-area');
  const spellingVisual = document.getElementById('spelling-visual');
  const summaryArea = document.getElementById('summary-area');
  const micStatus = document.getElementById('mic-status');

  // State Variables
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords')) || [];
  let userAttempts = [];
  let usedCustomListToday = false;
  const todayKey = new Date().toISOString().split('T')[0];
  const savedDate = localStorage.getItem('customListDate');
  if (savedDate === todayKey) {
    usedCustomListToday = true;
  } else {
    localStorage.setItem('customListDate', todayKey);
    usedCustomListToday = false;
  }

  let accent = "en-US";
  let recognition;
  let isSessionActive = false;
  let currentWord = "";

  function customListAllowedToday() {
  const today = new Date().toISOString().slice(0, 10); // e.g., "2025-07-29"
  return localStorage.getItem('customListDate') !== today;
}
function setCustomListUsedToday() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem('customListDate', today);
}

  // Enhanced word splitting pattern - accepts multiple separators
  const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;

  // Initialize
  setupEventListeners();
  initDarkMode();

  // Event Listeners
  function setupEventListeners() {
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
    if (!usedCustomListToday) {
      // Default words for Spelling Bee
      words = [
        "accommodate", "belligerent", "conscientious", "disastrous", 
        "embarrass", "foreign", "guarantee", "harass", 
        "interrupt", "jealous", "knowledge", "liaison",
        "millennium", "necessary", "occasionally", "possession",
        "questionnaire", "rhythm", "separate", "tomorrow",
        "unforeseen", "vacuum", "withhold", "yacht"
      ];
    }

    currentIndex = 0;
    score = 0;
    userAttempts = [];
    isSessionActive = true;

    updateUIForActiveSession();
    playCurrentWord();
  }

  function updateUIForActiveSession() {
    beeArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    customInput.disabled = true;
    fileInput.disabled = true;
    addCustomBtn.disabled = true;
  }

  function playCurrentWord() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }

    currentWord = words[currentIndex];
    renderWordInterface();
    speakWord(currentWord);
  }

  function renderWordInterface() {
    spellingVisual.innerHTML = '';
    beeArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      
      <div id="spelling-visual"></div>
      
      <div id="auto-recording-info">
        <i class="fas fa-info-circle"></i> Speak the spelling after the word is pronounced
      </div>
      
      <div class="button-group">
        <button id="prev-btn" class="btn-secondary" ${currentIndex === 0 ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i> Previous
        </button>
        <button id="repeat-btn" class="btn-secondary">
          <i class="fas fa-redo"></i> Repeat Word
        </button>
        <button id="next-btn" class="btn-secondary">
          <i class="fas fa-arrow-right"></i> Skip
        </button>
        <button id="flag-btn" class="btn-icon ${flaggedWords.includes(currentWord) ? 'active' : ''}>
          <i class="fas fa-star"></i> Flag
        </button>
      </div>
      
      <div id="mic-feedback" class="feedback"></div>
    `;

    // Set up event listeners
    document.getElementById('prev-btn').addEventListener('click', prevWord);
    document.getElementById('next-btn').addEventListener('click', nextWord);
    document.getElementById('repeat-btn').addEventListener('click', () => speakWord(currentWord));
    document.getElementById('flag-btn').addEventListener('click', () => toggleFlagWord(currentWord));
  }

  function speakWord(word) {
    if (!window.speechSynthesis) {
      showAlert("Text-to-speech not supported in your browser.", 'error');
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.8;
    
    // Start voice recognition automatically after speech ends
    utterance.onend = () => {
      if (isSessionActive) {
        startVoiceRecognition();
      }
    };
    
    speechSynthesis.speak(utterance);
  }

  function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showAlert("Speech recognition not supported in this browser.", 'error');
      return;
    }

    micStatus.classList.remove('hidden');
    updateSpellingVisual();

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5; // Get more alternatives for better accuracy
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const results = event.results[0];
      const bestMatch = findBestMatch(results);
      processSpellingAttempt(bestMatch);
    };

    recognition.onerror = (event) => {
      micStatus.classList.add('hidden');
      if (event.error !== 'no-speech') { // Don't show alert for silent responses
        showAlert(`Recognition error: ${event.error}`, 'error');
      }
      setTimeout(() => isSessionActive && startVoiceRecognition(), 1000);
    };

    recognition.onend = () => {
      micStatus.classList.add('hidden');
    };

    recognition.start();
  }

  // Find the best match among recognition alternatives
  function findBestMatch(results) {
    for (let i = 0; i < results.length; i++) {
      const transcript = results[i].transcript.trim().toLowerCase();
      const cleaned = transcript.replace(/[^a-z]/g, '');
      if (cleaned.length > 0) return cleaned;
    }
    return '';
  }

  function processSpellingAttempt(attempt) {
    if (!attempt) {
      // No valid attempt detected, try again
      setTimeout(() => isSessionActive && startVoiceRecognition(), 800);
      return;
    }

    userAttempts[currentIndex] = attempt;
    const isCorrect = attempt === currentWord.toLowerCase();
    const feedback = document.getElementById('mic-feedback');

    // Update visual feedback
    updateSpellingVisual(
      currentWord.split('').map((letter, i) => ({
        letter: attempt[i] || '',
        correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
      }))
    );

    if (isCorrect) {
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
      score++;
      setTimeout(nextWord, 1500);
    } else {
      feedback.textContent = "✗ Incorrect. Try again!";
      feedback.className = "feedback incorrect";
    }
  }

  // Enhanced visual feedback with correct/incorrect letters
  function updateSpellingVisual(letters = []) {
    spellingVisual.innerHTML = currentWord.split('').map((letter, i) => {
      const letterData = letters[i] || {};
      const letterClass = letterData.correct ? 'correct' : 
                        (letterData.letter ? 'incorrect' : '');
      return `<div class="letter-tile ${letterClass}">${letterData.letter || ''}</div>`;
    }).join('');
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
    if (recognition) recognition.stop();

    // Calculate results
    const percent = Math.round((score / words.length) * 100);
    const wrongWords = words.filter((w, i) => 
      (userAttempts[i] || "").toLowerCase() !== w.toLowerCase()
    );

    // Render summary
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Spelling Bee Results</h2>
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
    beeArea.classList.add('hidden');
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
    showAlert("Word list cleared. Add new words or use default list.", 'info');
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
    if (usedCustomListToday) {
      showAlert("You can only use one custom list per day in the freemium version. Upgrade to premium for unlimited lists.", "warning");
      return;
    }
    const input = customInput.value.trim();
    if (!input) {
      showAlert("Please enter or paste words first!", 'error');
      return;
    }

    processWordList(input);
    showAlert(`Added ${words.length} words!`, 'success');
  }

  // Enhanced word list processing
  function processWordList(text) {
    words = [...new Set(text.split(WORD_SEPARATORS))]
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
      flagBtn.classList.toggle('active', flaggedWords.includes(currentWord));
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
});
