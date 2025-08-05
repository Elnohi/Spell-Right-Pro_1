// main-freemium-bee.js — Fully Fixed, Working Auto-Advance Freemium Spelling Bee

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const accentPicker = document.querySelector('.accent-picker');
  const customInput = document.getElementById('custom-words');
  const fileInput = document.getElementById('file-input');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const startBtn = document.getElementById('start-btn');
  const beeArea = document.getElementById('bee-area');
  const spellingVisual = document.getElementById('spelling-visual');
  const summaryArea = document.getElementById('summary-area');
  const micStatus = document.getElementById('mic-status');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  // State
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let flaggedWords = JSON.parse(localStorage.getItem('bee_flaggedWords') || '[]');
  let userAttempts = [];
  let usedCustomListToday = false;
  let isUsingCustomList = false;
  let isSessionActive = false;
  let currentWord = '';
  let recognition = null;
  let accent = 'en-US';

  // Day key for "one custom list per day"
  const todayKey = new Date().toISOString().split('T')[0];
  usedCustomListToday = localStorage.getItem('bee_customListDate') === todayKey;

  const DEFAULT_BEE_WORDS = [
    "accommodate", "belligerent", "conscientious", "disastrous",
    "embarrass", "foreign", "guarantee", "harass",
    "interrupt", "jealous", "knowledge", "liaison",
    "millennium", "necessary", "occasionally", "possession",
    "questionnaire", "rhythm", "separate", "tomorrow",
    "unforeseen", "vacuum", "withhold", "yacht"
  ];

  // Notice for 1 list/day
  if (customInput) {
    const notice = document.createElement('div');
    notice.style.color = "#777";
    notice.style.fontSize = "0.98em";
    notice.style.marginTop = "4px";
    notice.textContent = "You can only use one custom list per day.";
    customInput.parentElement.appendChild(notice);
  }

  // ---- Initialization ----
  loadDefaultList();
  setupEventListeners();
  initDarkMode();

  function loadDefaultList() {
    words = [...DEFAULT_BEE_WORDS];
    isUsingCustomList = false;
    updateStartBtnState();
    renderSummaryArea(true);
  }

  function updateStartBtnState() {
    startBtn.disabled = !words.length;
    startBtn.setAttribute('aria-disabled', startBtn.disabled ? 'true' : 'false');
  }

  function setupEventListeners() {
    if (accentPicker) {
      accentPicker.addEventListener('click', (e) => {
        if (e.target.closest('button')) {
          accentPicker.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
          });
          const btn = e.target.closest('button');
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          accent = btn.dataset.accent;
        }
      });
    }
    addCustomBtn.addEventListener('click', addCustomWords);
    fileInput.addEventListener('change', handleFileUpload);
    startBtn.addEventListener('click', toggleSession);

    // Word nav/buttons
    beeArea.addEventListener('click', (e) => {
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

    // Dark mode
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('bee_darkMode', document.body.classList.contains('dark-mode'));
        updateDarkModeIcon();
      });
      if (localStorage.getItem('bee_darkMode') === 'true') {
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

  // ---- Main Bee Flow ----
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
    beeArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    startBtn.setAttribute('aria-label', 'End session');
    customInput.disabled = true;
    fileInput.disabled = true;
    addCustomBtn.disabled = true;
    playCurrentWord();
  }

  function playCurrentWord() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }
    // Reset recognition
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    currentWord = words[currentIndex];
    renderWordInterface();
    speakWord(currentWord, () => {
      setTimeout(() => startVoiceRecognition(), 200); // very slight pause
    });
  }

  function renderWordInterface() {
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

  function speakWord(word, onEnd) {
    if (!window.speechSynthesis) {
      showAlert("Text-to-speech not supported in your browser.", 'error');
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.8;
    utterance.onerror = () => showAlert("Error pronouncing word.", 'error');
    utterance.onend = onEnd || null;
    speechSynthesis.speak(utterance);
  }

  function startVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showAlert("Speech recognition not supported in this browser.", 'error');
    return;
  }
  micStatus && micStatus.classList.remove('hidden');
  updateSpellingVisual();

  // Clean up previous recognition if any
  if (recognition) {
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.abort();
    recognition = null;
  }

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = accent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  let gotResult = false; // Track if onresult fired

  recognition.onresult = (event) => {
    gotResult = true;
    const results = event.results[0];
    const bestMatch = Array.from(results)
      .map(result => result.transcript.trim().toUpperCase())
      .find(transcript => transcript.length >= 1) || '';

    let attempt = bestMatch.replace(/[^A-Z ]/g, '');
    let letters = attempt.split(/\s+/).filter(Boolean);

    if (letters.length > 1 && letters.join('').length === currentWord.length) {
      attempt = letters.join('').toLowerCase();
    } else {
      attempt = bestMatch.trim().toLowerCase().replace(/[^a-z]/g, '');
    }
    processSpellingAttempt(attempt);
  };

  recognition.onerror = (event) => {
    gotResult = true; // treat error as handled
    if (event.error !== 'no-speech') {
      showAlert(`Recognition error: ${event.error}`, 'error');
    }
    // Immediately try again
    setTimeout(() => {
      if (isSessionActive) startVoiceRecognition();
    }, 400);
  };

  recognition.onend = () => {
    if (!gotResult && isSessionActive) {
      // No result and not manually stopped: auto-advance to next word
      const feedback = document.getElementById('mic-feedback');
      if (feedback) {
        feedback.textContent = "No response detected, skipping to next word...";
        feedback.className = "feedback incorrect";
      }
      setTimeout(() => {
        currentIndex++;
        if (currentIndex < words.length) {
          playCurrentWord();
        } else {
          endSession();
        }
      }, 700);
    }
  };

  recognition.start();
}

  function processSpellingAttempt(attempt) {
    const feedback = document.getElementById('mic-feedback');
    if (!feedback) return;

    userAttempts[currentIndex] = attempt || "";
    const isCorrect = attempt === currentWord.toLowerCase();

    updateSpellingVisual(
      currentWord.split('').map((letter, i) => ({
        letter: attempt?.[i] || '',
        correct: attempt?.[i]?.toLowerCase() === letter.toLowerCase()
      }))
    );

    if (isCorrect) {
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
      score++;
    } else {
      feedback.textContent = `✗ Incorrect. Correct: ${currentWord}`;
      feedback.className = "feedback incorrect";
    }

    if (recognition) recognition.stop();
    recognition = null;

    setTimeout(() => {
      currentIndex++;
      if (currentIndex < words.length) {
        playCurrentWord();
      } else {
        endSession();
      }
    }, 1000);
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
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Spelling Bee Results</h2>
        <div class="score-display">${score}/${words.length} (${Math.round(score/words.length*100)}%)</div>
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
          <div class="score-number">${words.length - score}</div>
          <div class="word-list">
            ${words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase())
              .map(w => `<div class="word-item">${w}</div>`).join('')}
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
    localStorage.setItem('bee_customListDate', todayKey);
    startSession();
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
      localStorage.setItem('bee_customListDate', todayKey);
      startSession();
    } catch (error) {
      showAlert("Error processing file. Please try a text file with one word per line.", 'error');
    }
  }

  function processWordList(text) {
    words = [...new Set(text.split(/[\s,;\/\-–—|]+/)
      .map(w => w.trim())
      .filter(w => w.match(/^[a-zA-Z'-]+$/) && w.length >= 2))];
    if (!words.length) {
      showAlert("No valid words found.", 'error');
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
    setTimeout(() => alert.remove(), 2200);
  }

  function toggleFlagWord(word) {
    const index = flaggedWords.indexOf(word);
    if (index === -1) {
      flaggedWords.push(word);
    } else {
      flaggedWords.splice(index, 1);
    }
    localStorage.setItem('bee_flaggedWords', JSON.stringify(flaggedWords));
    updateFlagButton();
  }

  function updateFlagButton() {
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
      flagBtn.classList.toggle('active', flaggedWords.includes(currentWord));
    }
  }

  function renderSummaryArea(loading = false) {
    if (loading) {
      summaryArea.innerHTML = "<div class='summary-header'>Spelling Bee Trainer Ready. Start a session!</div>";
      summaryArea.classList.remove('hidden');
      beeArea.classList.add('hidden');
      }
    }
});
