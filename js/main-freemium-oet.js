// main-freemium-oet.js — polished freemium OET (typed input)

document.addEventListener('DOMContentLoaded', () => {
  /* ================== Elements ================== */
  const accentPicker  = document.querySelector('.accent-picker');
  const practiceBtn   = document.getElementById('practice-mode-btn');
  const testBtn       = document.getElementById('test-mode-btn');
  const customInput   = document.getElementById('custom-words');
  const fileInput     = document.getElementById('file-input');
  const addCustomBtn  = document.getElementById('add-custom-btn');
  const startBtn      = document.getElementById('start-btn');
  const trainerArea   = document.getElementById('trainer-area');
  const summaryArea   = document.getElementById('summary-area');
  const darkModeToggle= document.getElementById('dark-mode-toggle');

  /* ================== State ================== */
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let sessionMode = 'practice'; // 'practice' | 'test'
  let userAnswers = [];
  let isSessionActive = false;
  let accent = 'en-US';
  let speechSynthesisObj = window.speechSynthesis || null;

  // Flagging shared across sessions (localStorage)
  let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords') || '[]');

  // One custom list per day
  const todayKey = new Date().toISOString().split('T')[0];
  let usedCustomListToday = (localStorage.getItem('oet_customListDate') === todayKey);

  // Built-in list
  const oetWords = Array.isArray(window.oetWords) ? window.oetWords.slice() : [
    // minimal fallback
    "Atrial fibrillation","Holter monitor","Sleep apnoea","Eczema","Dyspepsia","Varicose veins"
  ];

  /* ================== Helpers ================== */
  const alertSafe = (msg, type='error', ms=3000) => {
    if (typeof window.showAlert === 'function') window.showAlert(msg, type, ms);
    else { console[type === 'error' ? 'error' : 'log'](msg); alert(msg); }
  };

  const updateStartBtnLabel = () => {
    startBtn.innerHTML = isSessionActive
      ? '<i class="fas fa-stop"></i> End Session'
      : '<i class="fas fa-play"></i> Start Session';
  };

  function shuffleArray(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function parseWordList(text) {
    // Preserve phrases; split on newlines, semicolons, commas, or pipes — NOT spaces
    return [...new Set(
      String(text || '')
        .replace(/\r/g, '')
        .split(/[\n,;|]+/)
        .map(w => w.trim())
        .filter(w => w && w.length > 1)
    )];
  }

  function toggleFlagWord(word) {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
    // Update button (if present)
    const btn = document.getElementById('flagWordBtn');
    if (btn) {
      const active = flaggedWords.includes(word);
      btn.classList.toggle('active', active);
      btn.innerHTML = active
        ? '<i class="fas fa-flag"></i> Flagged'
        : '<i class="far fa-flag"></i> Flag';
    }
  }

  // NEW: detect if the user is typing in a field, so we don't hijack Space/Arrows.
  function isTypingField(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable === true;
  }

  /* ================== Init ================== */
  setupEventListeners();
  initDarkMode();
  updateStartBtnLabel();

  // Default notice for one custom list/day
  if (customInput) {
    const notice = document.createElement('div');
    notice.style.color = "#777";
    notice.style.fontSize = "0.98em";
    notice.style.marginTop = "4px";
    notice.textContent = "You can only use one custom list per day in the freemium version. Upgrade to premium for unlimited lists.";
    customInput.parentElement.appendChild(notice);
  }

  /* ================== Events ================== */
  function setupEventListeners() {
    // Mode
    practiceBtn?.addEventListener('click', () => {
      sessionMode = 'practice';
      practiceBtn.classList.add('active');
      testBtn?.classList.remove('active');
    });
    testBtn?.addEventListener('click', () => {
      sessionMode = 'test';
      testBtn.classList.add('active');
      practiceBtn?.classList.remove('active');
    });

    // Accent picker
    accentPicker?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      accentPicker.querySelectorAll('button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      accent = btn.dataset.accent || 'en-US';
    });

    // Custom list via textarea
    addCustomBtn?.addEventListener('click', () => {
      if (usedCustomListToday) {
        alertSafe("You've already used a custom list today in the freemium version. Try again tomorrow, or upgrade to premium.");
        return;
      }
      const input = (customInput?.value || '').trim();
      const list = parseWordList(input);
      if (!list.length) {
        alertSafe("Please paste some words (each on a new line, or use commas/semicolons).");
        return;
      }
      words = list.slice();
      usedCustomListToday = true;
      localStorage.setItem('oet_customListDate', todayKey);
      alertSafe(`Loaded ${words.length} custom words for today.`, 'success', 2000);
      updateStartBtnLabel();
    });

    // Custom list via file
    fileInput?.addEventListener('change', (e) => {
      if (usedCustomListToday) {
        fileInput.value = '';
        alertSafe("You've already used a custom list today in the freemium version. Try again tomorrow, or upgrade to premium.");
        return;
      }
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const list = parseWordList(String(evt.target.result || ''));
        if (!list.length) {
          alertSafe("That file didn't contain any words I could read.");
          return;
        }
        words = list.slice();
        usedCustomListToday = true;
        localStorage.setItem('oet_customListDate', todayKey);
        alertSafe(`Loaded ${words.length} custom words for today.`, 'success', 2000);
        updateStartBtnLabel();
      };
      reader.readAsText(file);
    });

    // Start / End session
    startBtn?.addEventListener('click', () => {
      if (isSessionActive) {
        endSession();
      } else {
        startSession();
      }
    });

    // Keyboard shortcuts during session — ONLY when not typing in a field.
    document.addEventListener('keydown', (e) => {
      if (!isSessionActive) return;

      // If the event originated inside an input/textarea/contentEditable, don't hijack keys.
      if (isTypingField(e.target)) return;

      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';

      if (isSpace) {
        e.preventDefault();
        const w = words[currentIndex];
        w && speakWord(w, () => {
          const input = document.getElementById('user-input');
          if (input) { input.focus(); input.select(); }
        });
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        prevWord();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextWord();
      }
    });

    // Dark mode
    darkModeToggle?.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('oet_darkMode', document.body.classList.contains('dark-mode'));
      const icon = darkModeToggle.querySelector('i');
      if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
    });
  }

  /* ================== Dark Mode Init ================== */
  function initDarkMode() {
    const stored = localStorage.getItem('oet_darkMode') === 'true';
    document.body.classList.toggle('dark-mode', stored);
    const icon = darkModeToggle?.querySelector('i');
    if (icon) icon.className = stored ? 'fas fa-sun' : 'fas fa-moon';
  }

  /* ================== Session Flow ================== */
  function startSession() {
    // Always allow built-in OET list if nothing loaded
    if (words.length === 0) {
      words = Array.isArray(oetWords) ? [...oetWords] : [];
    }
    if (words.length === 0) {
      alertSafe("No word list loaded. Please add words or include the built-in OET list.");
      return;
    }

    if (sessionMode === 'test') {
      words = shuffleArray([...words]).slice(0, 24);
    }

    currentIndex = 0;
    score = 0;
    userAnswers = [];
    isSessionActive = true;

    trainerArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');

    updateStartBtnLabel();
    playCurrentWord();
  }

  function playCurrentWord() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }
    const word = words[currentIndex];
    renderWordInterface(word);

    // Speak then auto-focus input
    speakWord(word, () => {
      const input = document.getElementById('user-input');
      if (input) { input.focus(); input.select(); }
    });
  }

  function renderWordInterface(word) {
    trainerArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div class="word-audio-feedback" style="display:flex;align-items:center;gap:.5rem;margin:.5rem 0;">
        <button id="repeat-btn" class="btn btn-secondary"><i class="fas fa-redo"></i> Repeat</button>
        <span id="word-status"></span>
      </div>
      <div class="input-group">
        <input type="text" id="user-input" class="form-control" placeholder="Type what you hear..." autofocus
               value="${userAnswers[currentIndex] || ''}">
      </div>
      <div class="button-group" style="display:flex;gap:.5rem;margin-top:.5rem;">
        <button id="prev-btn" class="btn-secondary" ${currentIndex === 0 ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i> Previous
        </button>
        <button id="next-btn" class="btn-secondary"><i class="fas fa-arrow-right"></i> Next</button>
        <button id="check-btn" class="btn-primary"><i class="fas fa-check"></i> Check</button>
        <button id="flagWordBtn" class="btn-icon ${flaggedWords.includes(word) ? 'active' : ''}" title="Flag">
          <i class="${flaggedWords.includes(word) ? 'fas' : 'far'} fa-flag"></i>
        </button>
      </div>
      <div id="feedback" class="feedback" aria-live="assertive"></div>
    `;

    document.getElementById('repeat-btn')?.addEventListener('click', () => {
      speakWord(word, () => {
        const input = document.getElementById('user-input');
        if (input) { input.focus(); input.select(); }
      });
    });
    document.getElementById('prev-btn')?.addEventListener('click', prevWord);
    document.getElementById('next-btn')?.addEventListener('click', nextWord);
    document.getElementById('check-btn')?.addEventListener('click', () => checkAnswer(word));
    document.getElementById('flagWordBtn')?.addEventListener('click', () => toggleFlagWord(word));

    const inputField = document.getElementById('user-input');
    inputField?.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkAnswer(word); });
    inputField?.focus();
  }

  function speakWord(word, onEnd) {
    if (!speechSynthesisObj) {
      alertSafe("Text-to-speech not supported in your browser.");
      return;
    }
    speechSynthesisObj.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = accent;
    u.rate = 0.9;
    u.volume = 1;
    u.onerror = (e) => console.error("Speech error:", e);
    if (typeof onEnd === 'function') u.onend = onEnd;
    speechSynthesisObj.speak(u);
  }

  function checkAnswer(correctWord) {
    const inputField = document.getElementById('user-input');
    const userAnswer = (inputField?.value || '').trim();
    if (!userAnswer) {
      alertSafe("Please type the word first!");
      return;
    }

    userAnswers[currentIndex] = userAnswer;
    const feedback = document.getElementById('feedback');

    if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
      inputField?.classList.add('correct-answer');
      score++;
    } else {
      feedback.textContent = `✗ Incorrect. The correct spelling was: ${correctWord}`;
      feedback.className = "feedback incorrect";
      inputField?.classList.add('incorrect-answer');
    }

    setTimeout(nextWord, 1100);
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
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');

    // Build buckets
    const correctWords = words.filter((w, i) => (userAnswers[i] || '').toLowerCase() === String(w).toLowerCase());
    const wrongWords   = words.filter((w, i) => (userAnswers[i] || '').toLowerCase() !== String(w).toLowerCase());
    const flaggedInThisSession = words.filter(w => flaggedWords.includes(w));
    const percent = words.length ? Math.round((score / words.length) * 100) : 0;

    const list = (arr) => arr.length ? `<ul>${arr.map(w => `<li>${w}</li>`).join('')}</ul>` : '<em>None</em>';

    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${score}/${words.length} (${percent}%)</div>
      </div>

      <div class="results-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:10px;">
        <div class="results-card correct">
          <h3><i class="fas fa-check-circle"></i> Correct</h3>
          ${list(correctWords)}
        </div>
        <div class="results-card incorrect">
          <h3><i class="fas fa-times-circle"></i> Needs Practice</h3>
          ${list(wrongWords)}
        </div>
        <div class="results-card">
          <h3><i class="fas fa-star"></i> Flagged</h3>
          ${list(flaggedInThisSession)}
        </div>
      </div>

      <div class="summary-actions" style="margin-top:12px;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button id="review-wrong-btn" class="btn-primary" ${wrongWords.length ? '' : 'disabled'}>
          <i class="fas fa-undo"></i> Review Incorrect
        </button>
        <button id="review-flagged-btn" class="btn-secondary" ${flaggedInThisSession.length ? '' : 'disabled'}>
          <i class="fas fa-flag"></i> Review Flagged
        </button>
        <button id="restart-btn" class="btn-secondary"><i class="fas fa-sync-alt"></i> Restart Session</button>
        <button id="new-list-btn" class="btn-secondary"><i class="fas fa-list"></i> Change Word List</button>
      </div>
    `;

    // No-op hook for legacy manual ad slot (safe with Auto Ads)
    try { if (window.insertSummaryAd) window.insertSummaryAd(); } catch(_) {}

    document.getElementById('review-wrong-btn')?.addEventListener('click', () => {
      if (!wrongWords.length) return;
      startReviewWith(wrongWords);
    });

    document.getElementById('review-flagged-btn')?.addEventListener('click', () => {
      if (!flaggedInThisSession.length) return;
      startReviewWith(flaggedInThisSession);
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      currentIndex = 0; score = 0; userAnswers = [];
      isSessionActive = true;
      summaryArea.classList.add('hidden');
      trainerArea.classList.remove('hidden');
      updateStartBtnLabel();
      playCurrentWord();
    });

    document.getElementById('new-list-btn')?.addEventListener('click', () => {
      summaryArea.classList.add('hidden');
      trainerArea.classList.add('hidden');
      isSessionActive = false;
      updateStartBtnLabel();
    });

    updateStartBtnLabel();
  }

  function startReviewWith(list) {
    words = list.slice();
    currentIndex = 0; score = 0; userAnswers = [];
    isSessionActive = true;

    summaryArea.classList.add('hidden');
    trainerArea.classList.remove('hidden');
    updateStartBtnLabel();
    playCurrentWord();
  }
});
