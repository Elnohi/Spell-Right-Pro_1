// main-freemium-bee.js — Ready-to-Use, Default List is Unlimited, Custom List Once Per Day

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

  if (!accentPicker || !customInput || !fileInput || !addCustomBtn || !startBtn || !beeArea || !spellingVisual || !summaryArea || !micStatus) {
    alert("Some required page elements are missing. Please check your HTML file.");
    return;
  }

  // State Variables
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords')) || [];
  let userAttempts = [];
  let usedCustomListToday = false;
  let isUsingCustomList = false;

  const todayKey = new Date().toISOString().split('T')[0];
  const savedDate = localStorage.getItem('customListDate');
  if (savedDate === todayKey) {
    usedCustomListToday = true;
  } else {
    usedCustomListToday = false;
    localStorage.setItem('customListDate', todayKey); // Reset every new day
  }

  let accent = "en-US";
  let recognition;
  let isSessionActive = false;
  let currentWord = "";

  const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;

  const DEFAULT_BEE_WORDS = [
    "accommodate", "belligerent", "conscientious", "disastrous", 
    "embarrass", "foreign", "guarantee", "harass", 
    "interrupt", "jealous", "knowledge", "liaison",
    "millennium", "necessary", "occasionally", "possession",
    "questionnaire", "rhythm", "separate", "tomorrow",
    "unforeseen", "vacuum", "withhold", "yacht"
  ];

  setupEventListeners();
  initDarkMode();
  loadDefaultList();

  function loadDefaultList() {
    words = [...DEFAULT_BEE_WORDS];
    isUsingCustomList = false;
    updateStartBtnState();
  }

  function updateStartBtnState() {
    startBtn.disabled = !(words && words.length);
  }

  function setupEventListeners() {
    accentPicker.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        accentPicker.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        accent = e.target.dataset.accent;
      }
    });

    addCustomBtn.addEventListener('click', addCustomWords);
    fileInput.addEventListener('change', handleFileUpload);
    startBtn.addEventListener('click', toggleSession);
  }

  function toggleSession() {
    if (isSessionActive) {
      endSession();
    } else {
      if (!words || !words.length) {
        showAlert("No word list loaded. Please add words or upload a list.", 'error');
        return;
      }
      startSession();
    }
  }

  function startSession() {
    if (!words || !words.length) {
      showAlert("No words to practice. Please add a list.", "error");
      return;
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
    startBtn.disabled = false;
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
        <button id="flag-btn" class="btn-icon ${flaggedWords.includes(currentWord) ? 'active' : ''}">
          <i class="fas fa-star"></i> Flag
        </button>
      </div>
      <div id="mic-feedback" class="feedback"></div>
    `;
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const flagBtn = document.getElementById('flag-btn');
    if (prevBtn) prevBtn.addEventListener('click', prevWord);
    if (nextBtn) nextBtn.addEventListener('click', nextWord);
    if (repeatBtn) repeatBtn.addEventListener('click', () => speakWord(currentWord));
    if (flagBtn) flagBtn.addEventListener('click', () => toggleFlagWord(currentWord));
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

  // Only start voice recognition after the word is spoken
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
  recognition.maxAlternatives = 5;

  recognition.onresult = (event) => {
    const results = event.results[0];
    const bestMatch = findBestMatch(results);
    processSpellingAttempt(bestMatch);
  };

  recognition.onerror = (event) => {
    micStatus.classList.add('hidden');
    if (event.error !== 'no-speech') {
      showAlert(`Recognition error: ${event.error}`, 'error');
    }
    setTimeout(() => isSessionActive && startVoiceRecognition(), 1000);
  };

  recognition.onend = () => {
    micStatus.classList.add('hidden');
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

  function processSpellingAttempt(attempt) {
  if (!attempt) {
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
    setTimeout(() => {
      currentIndex++;
      playCurrentWord();
    }, 1500);
  } else {
    feedback.textContent = "✗ Incorrect. Try again!";
    feedback.className = "feedback incorrect";
    // Optionally retry automatically or let user try again
    setTimeout(() => isSessionActive && startVoiceRecognition(), 1200);
  }
}

  function updateSpellingVisual(letters = []) {
    spellingVisual.innerHTML = currentWord.split('').map((letter, i) => {
      const letterData = letters[i] || {};
      const letterClass = letterData.correct ? 'correct' : (letterData.letter ? 'incorrect' : '');
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
    const percent = Math.round((score / words.length) * 100);
    const wrongWords = words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase());
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
    beeArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    customInput.disabled = false;
    fileInput.disabled = false;
    addCustomBtn.disabled = false;
    updateStartBtnState();
    const restartBtn = document.getElementById('restart-btn');
    const newListBtn = document.getElementById('new-list-btn');
    if (restartBtn) restartBtn.addEventListener('click', startSession);
    if (newListBtn) newListBtn.addEventListener('click', resetWordList);
  }

  function resetWordList() {
    loadDefaultList();
    isUsingCustomList = false;
    customInput.value = '';
    fileInput.value = '';
    summaryArea.classList.add('hidden');
    showAlert("Word list cleared. Add new words or use default list.", 'info');
  }

  async function handleFileUpload(e) {
    if (usedCustomListToday) {
      showAlert("You can only use one custom/uploaded list per day. Upgrade to premium for unlimited lists.", "warning");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      processWordList(text);
      showAlert(`Loaded ${words.length} words from file!`, 'success');
      usedCustomListToday = true;
      isUsingCustomList = true;
      localStorage.setItem('customListDate', todayKey);
      updateStartBtnState();
      startSession();
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
    usedCustomListToday = true;
    isUsingCustomList = true;
    localStorage.setItem('customListDate', todayKey);
    updateStartBtnState();
    startSession();
  }

  function processWordList(text) {
    words = [...new Set(text.split(WORD_SEPARATORS))]
      .map(w => w.trim())
      .filter(w => w && w.length > 1);
    if (words.length === 0) {
      throw new Error("No valid words found");
    }
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
