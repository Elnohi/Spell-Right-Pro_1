// main-freemium-oet.js — OET Freemium Version, Restrict Custom List to One Per Day

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const accentPicker = document.querySelector('.accent-picker');
  const customInput = document.getElementById('custom-words');
  const fileInput = document.getElementById('file-input');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const startBtn = document.getElementById('start-btn');
  const oetArea = document.getElementById('oet-area');
  const summaryArea = document.getElementById('summary-area');

  // State Variables
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsOET')) || [];
  let userAnswers = [];
  let usedCustomListToday = false;
  let accent = "en-GB"; // Default to British

  const todayKey = new Date().toISOString().split('T')[0];
  const savedDate = localStorage.getItem('customListDateOET');
  if (savedDate === todayKey) {
    usedCustomListToday = true;
  } else {
    localStorage.setItem('customListDateOET', todayKey);
    usedCustomListToday = false;
  }

  // Enhanced word splitting pattern - accepts multiple separators
  const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;

  // Initialize
  setupEventListeners();
  initDarkMode();
  lockCustomControlsIfNeeded();

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

    addCustomBtn.addEventListener('click', addCustomWords);
    fileInput.addEventListener('change', handleFileUpload);
    startBtn.addEventListener('click', toggleSession);
  }

  // Lock controls and show message if custom list was used
  function lockCustomControlsIfNeeded() {
    if (usedCustomListToday) {
      customInput.disabled = true;
      fileInput.disabled = true;
      addCustomBtn.disabled = true;
      if (!document.getElementById('custom-limit-msg')) {
        const msg = document.createElement('div');
        msg.id = 'custom-limit-msg';
        msg.className = 'limit-msg';
        msg.innerHTML = 'You can only use or upload <b>one custom list per day</b> in the freemium version.<br>Upgrade to premium for unlimited lists.';
        customInput.parentElement.appendChild(msg);
      }
    }
  }

  // Mark today as used after successful add/upload
  function setCustomListUsedToday() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('customListDateOET', today);
    usedCustomListToday = true;
  }

  // Session Controls
  let isSessionActive = false;

  function toggleSession() {
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  }

  function startSession() {
    if (!usedCustomListToday || words.length === 0) {
      // Default OET word list
      words = [
        "patient", "surgery", "diagnosis", "treatment", "symptom",
        "prescription", "allergy", "infection", "recovery", "procedure",
        "blood", "pressure", "heart", "medical", "history",
        "consultation", "referral", "pain", "therapy", "doctor",
        "appointment", "vaccine", "chronic", "acute"
      ];
    }
    currentIndex = 0;
    score = 0;
    userAnswers = [];
    isSessionActive = true;
    updateUIForActiveSession();
    showCurrentWord();
  }

  function updateUIForActiveSession() {
    oetArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    customInput.disabled = true;
    fileInput.disabled = true;
    addCustomBtn.disabled = true;
  }

  function showCurrentWord() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }
    const word = words[currentIndex];
    oetArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div class="word-audio-feedback">
        <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
          <i class="fas fa-redo"></i>
        </button>
      </div>
      <div class="input-wrapper">
        <input type="text" id="user-input" class="form-control" placeholder="Type what you heard..." autofocus>
      </div>
      <div class="button-group">
        <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
          <i class="fas fa-arrow-left"></i> Previous
        </button>
        <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
          <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
          ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
        </button>
        <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length - 1 ? "disabled" : ""}>
          <i class="fas fa-arrow-right"></i> Next
        </button>
      </div>
      <div id="feedback" class="feedback"></div>
    `;

    document.getElementById('repeat-btn').onclick = () => speakWord(word);
    document.getElementById('prev-btn').onclick = prevWord;
    document.getElementById('next-btn').onclick = nextWord;
    document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

    const input = document.getElementById('user-input');
    input.focus();
    input.select();
    speakWord(word);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer(word);
      }
    });
  }

  function speakWord(word) {
    if (!window.speechSynthesis) {
      showAlert("Text-to-speech not supported in your browser.", 'error');
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }

  function checkAnswer(correctWord) {
    const userInput = document.getElementById('user-input');
    const userAnswer = userInput.value.trim();
    userAnswers[currentIndex] = userAnswer;
    const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();

    const feedback = document.getElementById('feedback');
    if (isCorrect) {
      score++;
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
    } else {
      feedback.textContent = `✗ Incorrect. Correct: ${correctWord}`;
      feedback.className = "feedback incorrect";
    }

    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showCurrentWord();
      } else {
        endSession();
      }
    }, 1200);
  }

  function nextWord() {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      showCurrentWord();
    }
  }

  function prevWord() {
    if (currentIndex > 0) {
      currentIndex--;
      showCurrentWord();
    }
  }

  function endSession() {
    isSessionActive = false;
    renderSummary();
    oetArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    lockCustomControlsIfNeeded();
  }

  function renderSummary() {
    const percent = Math.round((score / words.length) * 100);
    const wrongWords = words.filter((w, i) => (userAnswers[i] || "").toLowerCase() !== w.toLowerCase());
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>OET Results</h2>
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

    document.getElementById('restart-btn').addEventListener('click', startSession);
    document.getElementById('new-list-btn').addEventListener('click', resetWordList);
  }

  function resetWordList() {
    words = [];
    customInput.value = '';
    fileInput.value = '';
    summaryArea.classList.add('hidden');
    showAlert("Word list cleared. You can't add another custom list until tomorrow.", 'info');
    lockCustomControlsIfNeeded();
  }

  // File Handling
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      processWordList(text);
      setCustomListUsedToday();
      lockCustomControlsIfNeeded();
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
    setCustomListUsedToday();
    lockCustomControlsIfNeeded();
    showAlert(`Added ${words.length} words!`, 'success');
  }

  function processWordList(text) {
    words = [...new Set(text.split(WORD_SEPARATORS))]
      .map(w => w.trim())
      .filter(w => w && w.length > 1);

    if (words.length === 0) {
      throw new Error("No valid words found");
    }
    usedCustomListToday = true;
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
    localStorage.setItem('flaggedWordsOET', JSON.stringify(flaggedWords));
    updateFlagButton();
  }

  function updateFlagButton() {
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
      flagBtn.classList.toggle('active', flaggedWords.includes(words[currentIndex]));
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
