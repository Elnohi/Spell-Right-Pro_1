// main-freemium-bee.js — Robust Auto-Advance Version with Debug Logging

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

  // Add notice right by input area
  const notice = document.createElement('div');
  notice.style.color = "#777";
  notice.style.fontSize = "0.98em";
  notice.style.marginTop = "4px";
  notice.textContent = "You can only use one custom list per day.";
  customInput.parentElement.appendChild(notice);

  // Initialize
  loadDefaultList();
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

    addCustomBtn.addEventListener('click', addCustomWords);
    fileInput.addEventListener('change', handleFileUpload);
    startBtn.addEventListener('click', toggleSession);

    document.addEventListener('click', (e) => {
      if (!isSessionActive) return;
      if (e.target.closest('#prev-btn')) prevWord();
      if (e.target.closest('#next-btn')) nextWord();
      if (e.target.closest('#repeat-btn')) speakWord(currentWord);
      if (e.target.closest('#flag-btn')) toggleFlagWord(currentWord);
    });

    document.addEventListener('keydown', (e) => {
      if (!isSessionActive) return;
      if (e.key === 'ArrowLeft' && currentIndex > 0) prevWord();
      if (e.key === 'ArrowRight') nextWord();
      if (e.key === ' ') {
        e.preventDefault();
        speakWord(currentWord);
      }
    });
  }

  function toggleSession() {
    if (isSessionActive) {
      endSession();
    } else {
      if (!words.length) {
        showAlert("No word list loaded. Please add words or upload a list.", 'error');
        return;
      }
      startSession();
    }
  }

  function startSession() {
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
    customInput.disabled = true;
    fileInput.disabled = true;
    addCustomBtn.disabled = true;
  }

  function playCurrentWord() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }
    // Ensure any previous recognition is stopped
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    currentWord = words[currentIndex];
    renderWordInterface();
    speakWord(currentWord);
  }

  function renderWordInterface() {
    if (!beeArea) { console.error('beeArea missing!'); return; }
    beeArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div id="spelling-visual" aria-live="polite"></div>
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
      <div id="mic-feedback" class="feedback" aria-live="assertive"></div>
    `;
    updateFlagButton();
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
    utterance.onerror = () => {
      showAlert("Error pronouncing word. Please check your audio settings.", 'error');
      setTimeout(() => startVoiceRecognition(), 300);
    };
    utterance.onend = () => {
      if (recognition) recognition.stop();
      setTimeout(() => startVoiceRecognition(), 200);
    };
    speechSynthesis.speak(utterance);
  }

  function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showAlert("Speech recognition not supported in this browser.", 'error');
      return;
    }
    if (!micStatus) { console.error('micStatus missing!'); return; }
    micStatus.classList.remove('hidden');
    updateSpellingVisual();

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onresult = (event) => {
      const results = event.results[0];
      const bestMatch = Array.from(results)
        .map(result => result.transcript.trim().toLowerCase().replace(/[^a-z]/g, ''))
        .find(transcript => transcript.length >= MIN_WORD_LENGTH) || '';
      processSpellingAttempt(bestMatch);
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        showAlert(`Recognition error: ${event.error}`, 'error');
      }
      setTimeout(() => isSessionActive && startVoiceRecognition(), 400);
    };
    recognition.start();
  }

  function processSpellingAttempt(attempt) {
    const feedback = document.getElementById('mic-feedback');
    if (!feedback) return;

    if (!attempt) {
      feedback.textContent = "Didn't catch that, try again!";
      feedback.className = "feedback incorrect";
      setTimeout(() => isSessionActive && startVoiceRecognition(), 500);
      return;
    }

    // Defensive: userAttempts always has correct length
    userAttempts[currentIndex] = attempt;
    const isCorrect = attempt === currentWord.toLowerCase();

    const spellingVisualEl = document.getElementById('spelling-visual');
    if (typeof updateSpellingVisual === "function" && spellingVisualEl) {
      updateSpellingVisual(
        currentWord.split('').map((letter, i) => ({
          letter: attempt[i] || '',
          correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
        }))
      );
    } else if (spellingVisualEl) {
      // Fallback: just show attempt
      spellingVisualEl.innerHTML = attempt.split('').map(l => `<span>${l}</span>`).join('');
    }

    if (isCorrect) {
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
      score++;
    } else {
      feedback.textContent = `✗ Incorrect. Correct: ${currentWord}`;
      feedback.className = "feedback incorrect";
    }

    if (recognition) {
      recognition.stop();
      recognition = null;
    }

    // Auto-advance to next word after 700ms
    setTimeout(() => {
      currentIndex++;
      console.log('Advancing to word', currentIndex, 'of', words.length);
      if (currentIndex < words.length) {
        playCurrentWord();
      } else {
        endSession();
      }
    }, 700);
  }

  // Provide global for fallback spelling visuals
  function updateSpellingVisual(letters = []) {
    const spellingVisualEl = document.getElementById('spelling-visual');
    if (!spellingVisualEl) return;
    spellingVisualEl.innerHTML = currentWord.split('').map((letter, i) => {
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
    if (!summaryArea) { console.error('summaryArea missing!'); return; }
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
    document.getElementById('restart-btn')?.addEventListener('click', startSession);
    document.getElementById('new-list-btn')?.addEventListener('click', resetWordList);
  }

  function resetWordList() {
    loadDefaultList();
    isUsingCustomList = false;
    customInput.value = '';
    fileInput.value = '';
    summaryArea.classList.add('hidden');
  }

  async function handleFileUpload(e) {
    if (usedCustomListToday) {
      showAlert("You can only use one custom/uploaded list per day.", "warning");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      processWordList(text);
      usedCustomListToday = true;
      isUsingCustomList = true;
      localStorage.setItem('customListDate', todayKey);
      startSession();
    } catch (error) {
      showAlert("Error processing file. Please try a text file with one word per line.", 'error');
    }
  }

  function addCustomWords() {
    if (usedCustomListToday) {
      showAlert("You can only use one custom list per day.", "warning");
      return;
    }
    const input = customInput.value.trim();
    if (!input) {
      showAlert("Please enter words first!", 'error');
      return;
    }
    processWordList(input);
    usedCustomListToday = true;
    isUsingCustomList = true;
    localStorage.setItem('customListDate', todayKey);
    startSession();
  }

  function processWordList(text) {
    words = [...new Set(text.split(WORD_SEPARATORS)
      .map(w => w.trim())
      .filter(w => w.match(WORD_REGEX) && w.length >= MIN_WORD_LENGTH))];
    if (!words.length) {
      throw new Error("No valid words found");
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error("File too large (max 2MB)"));
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
    setTimeout(() => alert.remove(), 3000);
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
