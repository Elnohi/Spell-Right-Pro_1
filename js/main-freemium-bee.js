// main-freemium-bee.js — Freemium Spelling Bee (voice-only), polished

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Elements ---------- */
  const accentPicker   = document.querySelector('.accent-picker');
  const customInput    = document.getElementById('custom-words');
  const fileInput      = document.getElementById('file-input');
  const addCustomBtn   = document.getElementById('add-custom-btn');
  const startBtn       = document.getElementById('start-btn');
  const beeArea        = document.getElementById('bee-area');
  const summaryArea    = document.getElementById('summary-area');
  const micStatus      = document.getElementById('mic-status');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  /* ---------- State ---------- */
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let userAnswers = [];
  let isSessionActive = false;

  let flaggedWords = JSON.parse(localStorage.getItem('bee_flaggedWords') || '[]');
  let usedCustomListToday = false;
  let isUsingCustomList = false;

  let currentWord = '';
  let recognition = null;
  let speech = window.speechSynthesis || null;
  let accent = 'en-US';
  let autoAdvanceTimer = null;

  const todayKey = new Date().toISOString().split('T')[0];
  usedCustomListToday = localStorage.getItem('bee_customListDate') === todayKey;

  const DEFAULT_BEE_WORDS = [
    "accommodate","belligerent","conscientious","disastrous","embarrass",
    "foreign","guarantee","harass","interrupt","jealous","knowledge","liaison",
    "millennium","necessary","occasionally","possession","questionnaire","rhythm",
    "separate","tomorrow","unforeseen","vacuum","withhold","yacht"
  ];

  /* ---------- Helpers ---------- */
  const showAlert = (m,t='error',ms=3000) => {
    if (typeof window.showAlert === 'function') window.showAlert(m,t,ms);
    else console[t==='error'?'error':'log'](m);
  };
  function isTypingField(el){ if(!el) return false; const tag=(el.tagName||'').toLowerCase(); return tag==='input'||tag==='textarea'||el.isContentEditable===true; }

  function parseWordList(text) {
    // keep phrases; split on newlines/commas/semicolons/pipes
    return [...new Set(
      String(text || '')
        .replace(/\r/g,'')
        .split(/[\n,;|]+/)
        .map(w => w.trim())
        .filter(w => w && w.length > 1)
    )];
  }

  function updateStartBtnState() {
    startBtn.disabled = !words.length && !DEFAULT_BEE_WORDS.length;
  }

  function toggleFlagWord(word) {
    if (!word) return;
    const i = flaggedWords.indexOf(word);
    if (i === -1) flaggedWords.push(word); else flaggedWords.splice(i,1);
    localStorage.setItem('bee_flaggedWords', JSON.stringify(flaggedWords));
    updateFlagButton();
  }

  function updateFlagButton() {
    const btn = document.getElementById('flag-btn');
    if (!btn) return;
    btn.classList.toggle('active', flaggedWords.includes(currentWord));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i=a.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  /* ---------- Init ---------- */
  addOneListNotice();
  loadDefaultList();
  setupEvents();
  initDarkMode();

  function addOneListNotice() {
    if (!customInput) return;
    const n = document.createElement('div');
    n.style.color="#777"; n.style.fontSize="0.95em"; n.style.marginTop="4px";
    n.textContent = "Freemium: only one custom list per day. Upgrade to premium for unlimited lists.";
    customInput.parentElement.appendChild(n);
  }

  function loadDefaultList() {
    words = [...DEFAULT_BEE_WORDS];
    isUsingCustomList = false;
    updateStartBtnState();
    renderSummary(true);
  }

  /* ---------- Events ---------- */
  function setupEvents() {
    accentPicker?.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      accentPicker.querySelectorAll('button').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      accent = btn.dataset.accent || 'en-US';
    });

    addCustomBtn?.addEventListener('click', () => {
      if (usedCustomListToday) { showAlert("You've already used a custom list today. Try again tomorrow or upgrade.", 'error'); return; }
      const txt = (customInput?.value || '').trim();
      const list = parseWordList(txt);
      if (!list.length) { showAlert("Please paste some words first."); return; }
      words = list.slice(); isUsingCustomList = true;
      usedCustomListToday = true; localStorage.setItem('bee_customListDate', todayKey);
      showAlert(`Loaded ${words.length} custom words for today.`, 'success', 1800);
      updateStartBtnState();
      renderSummary(true);
    });

    fileInput?.addEventListener('change', (e) => {
      if (usedCustomListToday) { fileInput.value=''; showAlert("Custom list already used today.", 'error'); return; }
      const f = e.target.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (evt) => {
        const list = parseWordList(String(evt.target.result || ''));
        if (!list.length) { showAlert("Couldn’t read any words from that file."); return; }
        words = list.slice(); isUsingCustomList = true;
        usedCustomListToday = true; localStorage.setItem('bee_customListDate', todayKey);
        showAlert(`Loaded ${words.length} custom words for today.`, 'success', 1800);
        updateStartBtnState(); renderSummary(true);
      };
      r.readAsText(f);
    });

    startBtn?.addEventListener('click', () => {
      if (isSessionActive) endSession();
      else startSession();
    });

    // Keyboard shortcuts — only when not typing anywhere
    document.addEventListener('keydown', (e) => {
      if (!isSessionActive) return;
      if (isTypingField(e.target)) return;

      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        speakWord(currentWord, () => setTimeout(() => startRecognition(currentWord), 150));
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) { e.preventDefault(); prevWord(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextWord(); }
    });

    // Dark mode
    darkModeToggle?.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('bee_darkMode', document.body.classList.contains('dark-mode'));
      const icon = darkModeToggle.querySelector('i');
      if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
    });
  }

  function initDarkMode() {
    const saved = localStorage.getItem('bee_darkMode') === 'true';
    document.body.classList.toggle('dark-mode', saved);
    const icon = darkModeToggle?.querySelector('i');
    if (icon) icon.className = saved ? 'fas fa-sun' : 'fas fa-moon';
  }

  /* ---------- Session Flow ---------- */
  function startSession() {
    if (!words.length) words = DEFAULT_BEE_WORDS.slice();
    words = shuffle(words);
    currentIndex = 0; score = 0; userAnswers = []; isSessionActive = true;
    beeArea.classList.remove('hidden'); summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    playCurrentWord();
  }

  function endSession() {
    isSessionActive = false;
    clearTimeout(autoAdvanceTimer); stopRecognition();
    beeArea.classList.add('hidden'); renderSummary();
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
  }

  function playCurrentWord() {
    if (currentIndex >= words.length) { endSession(); return; }
    currentWord = words[currentIndex];
    renderBeeUI();
    speakWord(currentWord, () => setTimeout(() => startRecognition(currentWord), 150));
  }

  function renderBeeUI() {
    beeArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div id="spelling-visual" aria-live="polite"></div>
      <div id="auto-recording-info" style="margin:.25rem 0;color:var(--gray);font-size:.95em;">
        <i class="fas fa-info-circle"></i> After the word is spoken, spell it aloud (e.g., "b e e").
      </div>
      <div class="button-group" style="display:flex;gap:.5rem;margin-top:.5rem;">
        <button id="prev-btn" class="btn-secondary" ${currentIndex===0?'disabled':''}><i class="fas fa-arrow-left"></i> Previous</button>
        <button id="repeat-btn" class="btn-secondary"><i class="fas fa-redo"></i> Repeat</button>
        <button id="next-btn" class="btn-secondary"><i class="fas fa-arrow-right"></i> Skip</button>
        <button id="flag-btn" class="btn-icon ${flaggedWords.includes(currentWord) ? 'active' : ''}" title="Flag"><i class="fas fa-star"></i></button>
      </div>
      <div id="mic-feedback" class="feedback" aria-live="assertive"></div>
    `;
    document.getElementById('prev-btn')?.addEventListener('click', prevWord);
    document.getElementById('repeat-btn')?.addEventListener('click', () => {
      stopRecognition(); speakWord(currentWord, () => setTimeout(() => startRecognition(currentWord), 150));
    });
    document.getElementById('next-btn')?.addEventListener('click', nextWord);
    document.getElementById('flag-btn')?.addEventListener('click', () => { toggleFlagWord(currentWord); });
    updateFlagButton();
    updateSpellingVisual("");
  }

  function prevWord(){ if (currentIndex>0){ currentIndex--; playCurrentWord(); } }
  function nextWord(){ currentIndex++; playCurrentWord(); }

  /* ---------- TTS ---------- */
  function speakWord(word, onEnd) {
    if (!speech) { showAlert('Text-to-speech not supported in this browser.'); return; }
    speech.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = accent; u.rate = 0.9; u.volume = 1;
    if (typeof onEnd === 'function') u.onend = onEnd;
    speech.speak(u);
  }

  /* ---------- Speech Recognition ---------- */
  function startRecognition(targetWord) {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setMicFeedback("Speech recognition not supported in this browser.", 'error'); return;
    }
    stopRecognition(); // cleanup
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    let gotResult = false;

    recognition.onresult = (ev) => {
      gotResult = true;
      const best = ev.results?.[0]?.[0]?.transcript || '';
      handleResult(best, targetWord);
    };
    recognition.onerror = (e) => {
      setMicFeedback(`Mic error: ${e.error}`, 'error');
      scheduleAutoAdvance();
    };
    recognition.onend = () => {
      if (!gotResult) {
        setMicFeedback("No speech detected. Press Repeat or try again.", 'error');
        scheduleAutoAdvance();
      }
    };

    try {
      recognition.start();
      micStatus && micStatus.classList.remove('hidden');
      setMicFeedback("Listening…", 'info');
      updateSpellingVisual("● ● ●");
    } catch (e) {
      console.warn('recognition.start failed', e);
      scheduleAutoAdvance();
    }
  }

  function stopRecognition() {
    clearTimeout(autoAdvanceTimer);
    if (recognition) {
      try { recognition.onresult = recognition.onerror = recognition.onend = null; recognition.abort(); } catch(_) {}
      recognition = null;
    }
  }

  function scheduleAutoAdvance(ms=1300) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      currentIndex++;
      if (currentIndex >= words.length) endSession(); else playCurrentWord();
    }, ms);
  }

  function handleResult(transcript, target) {
    const normalized = normalizeSpelling(transcript);
    userAnswers[currentIndex] = normalized;

    if (normalized === target.toLowerCase()) {
      setMicFeedback("✓ Correct!", 'success'); score++;
    } else {
      setMicFeedback(`✗ Incorrect. You said: "${normalized}" – Correct: ${target}`, 'error');
    }
    scheduleAutoAdvance();
  }

  function normalizeSpelling(s) {
    if (!s) return '';
    let t = String(s).toLowerCase().trim();

    // strip punctuation, numbers, filler words
    t = t.replace(/[^a-z\s]/g,' ').replace(/\b(hyphen|dash|space|comma|period|dot)\b/g,' ');
    t = t.replace(/\s+/g,' ').trim();

    // If multiple tokens, try the "first-letter" strategy, else remove spaces
    const tokens = t.split(' ');
    if (tokens.length > 1) {
      const letters = tokens.map(x => x[0]).join('');
      if (letters.length > 1) return letters;
    }
    return t.replace(/\s/g,'');
  }

  function setMicFeedback(msg, kind='info') {
    const el = document.getElementById('mic-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = `feedback ${kind==='success'?'correct':(kind==='error'?'incorrect':'')}`;
  }
  function updateSpellingVisual(text){ const el=document.getElementById('spelling-visual'); if(el) el.textContent=text; }

  /* ---------- Summary ---------- */
  function renderSummary(initial=false) {
    summaryArea.classList.remove('hidden');
    if (initial) {
      summaryArea.innerHTML = `
        <div class="flagged-tip" style="color:var(--gray);font-size:.95em;margin-bottom:.5rem;">
          Tip: Press <kbd>Space</kbd> to repeat the word. Use the ⭐ button to flag difficult words.
        </div>`;
      return;
    }

    const correctWords = words.filter((w,i) => (userAnswers[i]||'').toLowerCase() === w.toLowerCase());
    const wrongWords   = words.filter((w,i) => (userAnswers[i]||'').toLowerCase() !== w.toLowerCase());
    const flaggedThis  = words.filter(w => flaggedWords.includes(w));
    const percent = words.length ? Math.round((score/words.length)*100) : 0;

    const list = arr => arr.length ? `<ul>${arr.map(w=>`<li>${w}</li>`).join('')}</ul>` : '<em>None</em>';

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
          ${list(flaggedThis)}
        </div>
      </div>
      <div class="summary-actions" style="margin-top:12px;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button id="review-wrong-btn" class="btn-primary" ${wrongWords.length?'':'disabled'}>
          <i class="fas fa-undo"></i> Review Incorrect
        </button>
        <button id="review-flagged-btn" class="btn-secondary" ${flaggedThis.length?'':'disabled'}>
          <i class="fas fa-flag"></i> Review Flagged
        </button>
        <button id="restart-btn" class="btn-secondary"><i class="fas fa-sync-alt"></i> Restart</button>
      </div>
    `;

    try { if (window.insertSummaryAd) window.insertSummaryAd(); } catch(_) {}

    document.getElementById('review-wrong-btn')?.addEventListener('click', () => {
      if (!wrongWords.length) return;
      words = wrongWords.slice(); restart();
    });
    document.getElementById('review-flagged-btn')?.addEventListener('click', () => {
      if (!flaggedThis.length) return;
      words = flaggedThis.slice(); restart();
    });
    document.getElementById('restart-btn')?.addEventListener('click', () => {
      words = (isUsingCustomList ? words : DEFAULT_BEE_WORDS).slice();
      restart();
    });

    function restart(){
      currentIndex=0; score=0; userAnswers=[];
      summaryArea.classList.add('hidden');
      isSessionActive=true; beeArea.classList.remove('hidden');
      startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
      playCurrentWord();
    }
  }
});
