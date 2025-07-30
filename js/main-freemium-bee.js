// main-freemium-bee.js — Enhanced version with fixes and improvements

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
  usedCustomListToday = savedDate === todayKey;

  let accent = "en-US";
  let recognition;
  let isSessionActive = false;
  let currentWord = "";

  const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;
  const MIN_WORD_LENGTH = 2;
  const WORD_REGEX = /^[a-zA-Z'-]+$/;

  const DEFAULT_BEE_WORDS = [
    "accommodate", "belligerent", "conscientious", "disastrous", 
    "embarrass", "foreign", "guarantee", "harass", 
    "interrupt", "jealous", "knowledge", "liaison",
    "millennium", "necessary", "occasionally", "possession",
    "questionnaire", "rhythm", "separate", "tomorrow",
    "unforeseen", "vacuum", "withhold", "yacht"
  ];

  // Check for saved session
  const savedSession = localStorage.getItem('spellingBeeSession');
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      if (confirm('Would you like to resume your previous session?')) {
        words = session.words;
        currentIndex = session.currentIndex;
        score = session.score;
        userAttempts = session.userAttempts;
        startSession();
      }
    } catch (e) {
      console.error('Error loading saved session:', e);
      localStorage.removeItem('spellingBeeSession');
    }
  } else {
    loadDefaultList();
  }

  setupEventListeners();
  initDarkMode();

  function loadDefaultList() {
    words = [...DEFAULT_BEE_WORDS];
    isUsingCustomList = false;
    updateStartBtnState();
  }

  function updateStartBtnState() {
    startBtn.disabled = !(words && words.length);
    startBtn.setAttribute('aria-disabled', startBtn.disabled);
  }

  function setupEventListeners() {
    // Accent picker
    accentPicker.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        accentPicker.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        e.target.classList.add('active');
        e.target.setAttribute('aria-pressed', 'true');
        accent = e.target.dataset.accent;
      }
    });

    // Main controls
    addCustomBtn.addEventListener('click', addCustomWords);
    fileInput.addEventListener('change', handleFileUpload);
    startBtn.addEventListener('click', toggleSession);

    // Event delegation for dynamic buttons
    document.addEventListener('click', (e) => {
      if (!isSessionActive) return;
      
      if (e.target.closest('#prev-btn')) prevWord();
      if (e.target.closest('#next-btn')) nextWord();
      if (e.target.closest('#repeat-btn')) speakWord(currentWord);
      if (e.target.closest('#flag-btn')) toggleFlagWord(currentWord);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!isSessionActive) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) prevWord();
          break;
        case 'ArrowRight':
          nextWord();
          break;
        case ' ':
          e.preventDefault();
          speakWord(currentWord);
          break;
      }
    });
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

    // Save session state
    localStorage.setItem('spellingBeeSession', JSON.stringify({
      words,
      currentIndex: 0,
      score: 0,
      userAttempts: []
    }));

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
    startBtn.setAttribute('aria-label', 'End session');
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
      <div id="spelling-visual" aria-live="polite"></div>
      <div id="auto-recording-info">
        <i class="fas fa-info-circle"></i> Speak the spelling after the word is pronounced
      </div>
      <div class="button-group">
        <button id="prev-btn" class="btn-secondary" ${currentIndex === 0 ? 'disabled' : ''} aria-label="Previous word">
          <i class="fas fa-arrow-left"></i> Previous
        </button>
        <button id="repeat-btn" class="btn-secondary" aria-label="Repeat word">
          <i class="fas fa-redo"></i> Repeat Word
        </button>
        <button id="next-btn" class="btn-secondary" aria-label="Next word">
          <i class="fas fa-arrow-right"></i> Skip
        </button>
        <button id="flag-btn" class="btn-icon ${flaggedWords.includes(currentWord) ? 'active' : ''}" aria-label="${flaggedWords.includes(currentWord) ? 'Unflag word' : 'Flag word'}">
          <i class="fas fa-star"></i> Flag
        </button>
      </div>
      <div id="mic-feedback" class="feedback" aria-live="assertive"></div>
    `;
    updateFlagButton();
  }

  function speakWord(word) {
    if (!window.speechSynthesis) {
      showAlert("Text-to-speech not supported in your browser.", 'error');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.8;

    utterance.onerror = (event) => {
      showAlert("Error pronouncing word. Please check your audio settings.", 'error');
      console.error('SpeechSynthesis error:', event);
      // Proceed with recognition even if TTS fails
      if (isSessionActive) {
        setTimeout(() => startVoiceRecognition(), 1000);
      }
    };

    utterance.onend = () => {
      if (isSessionActive) {
        // Add slight delay before recognition starts
        setTimeout(() => startVoiceRecognition(), 500);
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

    try {
      recognition.start();
    } catch (error) {
      showAlert("Error starting voice recognition. Please try again.", 'error');
      console.error('Recognition start error:', error);
      setTimeout(() => isSessionActive && startVoiceRecognition(), 1000);
    }
  }

  function findBestMatch(results) {
    for (let i = 0; i < results.length; i++) {
      const transcript = results[i].transcript.trim().toLowerCase();
      const cleaned = transcript.replace(/[^a-z]/g, '');
      if (cleaned.length >= MIN_WORD_LENGTH) return cleaned;
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
      
      // Update session state
      const session = JSON.parse(localStorage.getItem('spellingBeeSession')) || {};
      session.score = score;
      session.userAttempts = userAttempts;
      session.currentIndex = currentIndex + 1;
      localStorage.setItem('spellingBeeSession', JSON.stringify(session));

      setTimeout(() => {
        currentIndex++;
        playCurrentWord();
      }, 1500);
    } else {
      feedback.textContent = "✗ Incorrect. Try again!";
      feedback.className = "feedback incorrect";
      setTimeout(() => isSessionActive && startVoiceRecognition(), 1200);
    }
  }

  function updateSpellingVisual(letters = []) {
    spellingVisual.innerHTML = currentWord.split('').map((letter, i) => {
      const letterData = letters[i] || {};
      const letterClass = letterData.correct ? 'correct' : (letterData.letter ? 'incorrect' : '');
      return `<div class="letter-tile ${letterClass}" aria-label="${letterData.letter || ''}">${letterData.letter || ''}</div>`;
    }).join('');
  }

  function nextWord() {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      
      // Update session state
      const session = JSON.parse(localStorage.getItem('spellingBeeSession')) || {};
      session.currentIndex = currentIndex;
      localStorage.setItem('spellingBeeSession', JSON.stringify(session));
      
      playCurrentWord();
    } else {
      endSession();
    }
  }

  function prevWord() {
    if (currentIndex > 0) {
      currentIndex--;
      
      // Update session state
      const session = JSON.parse(localStorage.getItem('spellingBeeSession')) || {};
      session.currentIndex = currentIndex;
      localStorage.setItem('spellingBeeSession', JSON.stringify(session));
      
      playCurrentWord();
    }
  }

  function endSession() {
    isSessionActive = false;
    if (recognition) recognition.stop();
    
    // Clear saved session
    localStorage.removeItem('spellingBeeSession');
    
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
        <button id="restart-btn" class="btn-primary" aria-label="Restart session">
          <i class="fas fa-redo"></i> Restart Session
        </button>
        <button id="new-list-btn" class="btn-secondary" aria-label="Change word list">
          <i class="fas fa-sync-alt"></i> Change Word List
        </button>
        ${flaggedWords.length ? `
        <button id="practice-flagged-btn" class="btn-secondary" aria-label="Practice flagged words">
          <i class="fas fa-star"></i> Practice Flagged Words (${flaggedWords.length})
        </button>` : ''}
      </div>
    `;
    
    beeArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    startBtn.setAttribute('aria-label', 'Start session');
    customInput.disabled = false;
    fileInput.disabled = false;
    addCustomBtn.disabled = false;
    updateStartBtnState();
    
    // Add event listeners for summary buttons
    document.getElementById('restart-btn')?.addEventListener('click', startSession);
    document.getElementById('new-list-btn')?.addEventListener('click', resetWordList);
    document.getElementById('practice-flagged-btn')?.addEventListener('click', practiceFlaggedWords);
  }

  function practiceFlaggedWords() {
    if (flaggedWords.length === 0) {
      showAlert("You haven't flagged any words yet!", 'warning');
      return;
    }
    words = [...flaggedWords];
    isUsingCustomList = true;
    startSession();
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
      showAlert("Processing file...", 'info');
      const text = await readFileAsText(file);
      processWordList(text);
      showAlert(`Loaded ${words.length} words from file!`, 'success');
      usedCustomListToday = true;
      isUsingCustomList = true;
      localStorage.setItem('customListDate', todayKey);
      updateStartBtnState();
      startSession();
    } catch (error) {
      showAlert(error.message || "Error processing file. Please try a text file with valid words.", 'error');
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
    
    try {
      processWordList(input);
      showAlert(`Added ${words.length} words!`, 'success');
      usedCustomListToday = true;
      isUsingCustomList = true;
      localStorage.setItem('customListDate', todayKey);
      updateStartBtnState();
      startSession();
    } catch (error) {
      showAlert(error.message || "Error processing words. Please check your input.", 'error');
    }
  }

  function processWordList(text) {
    const rawWords = text.split(WORD_SEPARATORS)
      .map(w => w.trim())
      .filter(w => {
        if (!w.match(WORD_REGEX)) {
          console.warn(`Skipping invalid word: ${w}`);
          return false;
        }
        if (w.length < MIN_WORD_LENGTH) {
          console.warn(`Skipping too short word: ${w}`);
          return false;
        }
        return true;
      });
    
    if (rawWords.length === 0) {
      throw new Error("No valid words found. Words must contain only letters (a-z) and be at least 2 characters long.");
    }
    
    words = [...new Set(rawWords)]; // Remove duplicates
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error("File too large. Max 2MB allowed."));
        return;
      }
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsText(file);
    });
  }

  function showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.setAttribute('role', 'alert');
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
      const isFlagged = flaggedWords.includes(currentWord);
      flagBtn.classList.toggle('active', isFlagged);
      flagBtn.setAttribute('aria-label', isFlagged ? 'Unflag word' : 'Flag word');
      flagBtn.setAttribute('aria-pressed', isFlagged);
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
      const isDarkMode = document.body.classList.contains('dark-mode');
      icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
      icon.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }
});
