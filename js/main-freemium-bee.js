// ==================== SpellRightPro — Freemium Spelling Bee (Hands-Free) ====================
document.addEventListener('DOMContentLoaded', () => {
  // ---------- DOM ----------
  const beeArea         = document.getElementById('bee-area');
  const spellingVisual  = document.getElementById('spelling-visual');
  const feedbackBox     = document.getElementById('feedback');
  const summaryArea     = document.getElementById('summary-area');

  const addCustomBtn    = document.getElementById('add-custom-btn');
  const fileInput       = document.getElementById('file-input');
  const customInput     = document.getElementById('custom-words');
  const startBtn        = document.getElementById('start-btn');
  const accentPicker    = document.querySelector('.accent-picker');

  // Optional nav buttons (present in some layouts)
  const prevBtn         = document.getElementById('bee-prev');
  const repeatBtn       = document.getElementById('bee-repeat');
  const nextBtn         = document.getElementById('bee-next');

  // Optional mic indicator
  const micStatus       = document.getElementById('mic-status');

  // ---------- Config ----------
  // Toggle daily cap ON/OFF easily here:
  const FREEMIUM_LIMIT_ENABLED = false;     // << leave OFF as requested
  const FREEMIUM_MAX           = 10;        // cap when enabled

  // Hands-free timings (ms)
  const DELAY_BEFORE_LISTEN    = 2000;      // after TTS, wait before starting recognition
  const DELAY_AFTER_FEEDBACK   = 1800;      // pause to show feedback before next word
  const RECOGNITION_TIMEOUT    = 6000;      // max listen time for a word (best-effort)

  // ---------- TTS ----------
  let accent = 'en-US';
  const synth = window.speechSynthesis;
  function speak(text) {
    try {
      if (!text) return;
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      (synth || window.speechSynthesis).speak(u);
    } catch (e) { console.error('[TTS]', e); }
  }

  if (accentPicker) {
    accentPicker.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        accent = e.target.dataset.accent || 'en-US';
        accentPicker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      }
    });
  }

  // ---------- Speech Recognition ----------
  let recognition = null;
  let recognitionTimer = null;
  function makeRecognition() {
    // prefer webkit for wider support
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = (accent || 'en-US');
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    return rec;
  }
  function startRecognition(onResult, onError) {
    if (recognition) stopRecognition();
    recognition = makeRecognition();
    if (!recognition) {
      console.warn('SpeechRecognition not supported.');
      onError && onError(new Error('unsupported'));
      return;
    }
    try {
      recognition.onresult = (e) => {
        try { clearTimeout(recognitionTimer); } catch(_) {}
        const transcript = (e.results?.[0]?.[0]?.transcript || '').trim();
        stopRecognition();
        onResult && onResult(transcript);
      };
      recognition.onerror = (e) => {
        try { clearTimeout(recognitionTimer); } catch(_) {}
        stopRecognition();
        onError && onError(e);
      };
      recognition.onend = () => {
        try { clearTimeout(recognitionTimer); } catch(_) {}
        // onend fires even on success; we do nothing here because onresult/onerror handle flow.
      };

      recognition.start();
      // safety timeout (some browsers hang)
      recognitionTimer = setTimeout(() => {
        stopRecognition();
        onError && onError(new Error('timeout'));
      }, RECOGNITION_TIMEOUT);

      // UI: mic indicator
      if (micStatus) micStatus.classList.remove('hidden');
    } catch (e) {
      console.error('[Recognition start]', e);
      onError && onError(e);
    }
  }
  function stopRecognition() {
    try {
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try { recognition.stop(); } catch(_) {}
        try { recognition.abort(); } catch(_) {}
      }
    } catch(_) {}
    recognition = null;
    if (micStatus) micStatus.classList.add('hidden');
    try { clearTimeout(recognitionTimer); } catch(_) {}
    recognitionTimer = null;
  }

  // ---------- Daily Cap ----------
  function dayKey() {
    const d = new Date();
    return `srp_daily_words_Bee_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function usedToday()     { return parseInt(localStorage.getItem(dayKey()) || '0', 10); }
  function setUsedToday(n) { localStorage.setItem(dayKey(), String(n)); }
  function capForToday(list) {
    if (!FREEMIUM_LIMIT_ENABLED) return list;
    const used = usedToday();
    if (used >= FREEMIUM_MAX) {
      alert(`Freemium limit reached: ${FREEMIUM_MAX} words today.`);
      return [];
    }
    const remain = FREEMIUM_MAX - used;
    return list.length > remain ? list.slice(0, remain) : list;
    // note: we increment the counter at endSession() to count full batch consumed
  }

  // ---------- Load Base Words (JSON) ----------
  // Expected format: { "words": ["alpha", "beta", ...] }  OR simple array ["alpha",...]
  let baseBee = [];
  (async () => {
    try {
      const res = await fetch('spelling-bee.json', { cache: 'no-cache' });
      const data = await res.json();
      baseBee = Array.isArray(data?.words) ? data.words.filter(Boolean)
               : Array.isArray(data)       ? data.filter(Boolean)
               : [];
    } catch (e) {
      console.warn('Could not load spelling-bee.json', e);
    }
  })();

  // ---------- Custom words (one list/day policy stays; you can relax it if you want) ----------
  function todayStr()     { return new Date().toISOString().slice(0, 10); }
  function canAddCustom() { return localStorage.getItem('bee_customListDate') !== todayStr(); }
  function markCustom()   { localStorage.setItem('bee_customListDate', todayStr()); }

  let customWords = [];
  addCustomBtn?.addEventListener('click', () => {
    if (!canAddCustom()) { alert('Freemium allows one custom list per day.'); return; }
    const raw = (customInput?.value || '').trim();
    if (!raw) { alert('Enter some words first.'); return; }
    const parsed = raw.split(/[\s,;]+/).map(w => w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    if (customInput) customInput.value = '';
    markCustom();
    alert(`Added ${parsed.length} custom words.`);
  });

  fileInput?.addEventListener('change', (e) => {
    if (!canAddCustom()) { alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const txt = String(r.result || '');
      const parsed = txt.split(/\r?\n|,|;|\t/).map(w => w.trim()).filter(Boolean);
      customWords = mergeUnique(customWords, parsed);
      markCustom();
      alert(`Uploaded ${parsed.length} custom words.`);
    };
    r.readAsText(f);
  });

  // ---------- Session State ----------
  let words = [];
  let i = 0;
  let score = 0;
  let answers = [];
  let running = false;
  let autoNextTimer = null;

  startBtn?.addEventListener('click', () => {
    if (!running) {
      startSession();
    } else {
      // End manually
      endSession();
    }
  });

  function startSession() {
    const merged = mergeUnique(baseBee.slice(), customWords);
    let sessionWords = capForToday(merged);
    if (!sessionWords.length) return;

    words = sessionWords;
    i = 0;
    score = 0;
    answers = [];
    running = true;

    beeArea?.classList.remove('hidden');
    summaryArea?.classList.add('hidden');
    if (startBtn) startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';

    runCurrentWord();
  }

  function runCurrentWord() {
    clearTimers();
    stopRecognition();

    if (i >= words.length) return endSession();

    const w = words[i];

    // Render letter tiles (hidden/blank baseline)
    if (spellingVisual) {
      spellingVisual.innerHTML = Array.from({ length: w.length })
        .map(() => `<div class="letter-tile">&nbsp;</div>`)
        .join('');
    }
    if (feedbackBox) {
      feedbackBox.innerHTML = 'Listen carefully...';
    }

    // Step 1: Speak
    speak(w);

    // Step 2: wait before listening
    setTimeout(() => {
      // Step 3: Recognize
      startRecognition(
        (transcript) => { // onResult
          gradeAndShow(transcript, w);
          // Step 4: wait, then auto-next
          autoNextTimer = setTimeout(() => {
            i++;
            runCurrentWord();
          }, DELAY_AFTER_FEEDBACK);
        },
        (_err) => { // onError or timeout
          gradeAndShow('', w, /*noHeard=*/true);
          autoNextTimer = setTimeout(() => {
            i++;
            runCurrentWord();
          }, DELAY_AFTER_FEEDBACK);
        }
      );
    }, DELAY_BEFORE_LISTEN);
  }

  function gradeAndShow(transcript, correctWord, noHeard = false) {
    const said = (transcript || '').trim();
    const isCorrect = said.toLowerCase() === (correctWord || '').toLowerCase();

    if (!noHeard) {
      answers.push(said);
      if (isCorrect) score++;
    } else {
      answers.push('');
    }

    // Paint feedback
    if (feedbackBox) {
      if (noHeard) {
        feedbackBox.innerHTML = `⚠️ No response detected.<br>Correct: <b>${escapeHtml(correctWord)}</b>`;
      } else if (isCorrect) {
        feedbackBox.innerHTML = `✅ Correct: <b>${escapeHtml(correctWord)}</b>`;
      } else {
        feedbackBox.innerHTML = `❌ You said: “${escapeHtml(said)}”<br>Correct: <b>${escapeHtml(correctWord)}</b>`;
      }
    }

    // Color-code tiles as a soft hint
    if (spellingVisual) {
      const chars = (correctWord || '').split('');
      spellingVisual.innerHTML = chars.map((ch, idx) => {
        const ok = isCorrect ? 'correct' : 'incorrect';
        return `<div class="letter-tile ${ok}">${escapeHtml(ch)}</div>`;
      }).join('');
    }
  }

  function endSession() {
    running = false;
    clearTimers();
    stopRecognition();

    if (FREEMIUM_LIMIT_ENABLED) {
      setUsedToday(usedToday() + words.length);
    }

    const percent = words.length ? Math.round((score / words.length) * 100) : 0;

    if (summaryArea) {
      summaryArea.innerHTML = `
        <div class="summary-header">
          <h2>Spelling Bee Results</h2>
          <div class="score-display">${score}/${words.length} (${percent}%)</div>
        </div>
        <div class="results-grid">
          <div class="results-card">
            <h3>Words Practiced</h3>
            <div class="word-list">
              ${words.map(w => `<div class="word-item">${escapeHtml(w)}</div>`).join('')}
            </div>
          </div>
        </div>
      `;
      beeArea?.classList.add('hidden');
      summaryArea?.classList.remove('hidden');
    }

    if (startBtn) startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  function clearTimers() {
    try { clearTimeout(autoNextTimer); } catch(_) {}
    autoNextTimer = null;
  }

  // ---------- Optional manual navigation ----------
  prevBtn?.addEventListener('click', () => {
    if (!running) return;
    if (i > 0) { i--; runCurrentWord(); }
  });
  repeatBtn?.addEventListener('click', () => {
    if (!running) return;
    const w = words[i]; if (w) speak(w);
  });
  nextBtn?.addEventListener('click', () => {
    if (!running) return;
    if (i < words.length - 1) { i++; runCurrentWord(); }
    else { endSession(); }
  });

  // ---------- utils ----------
  function mergeUnique(base, add) {
    const seen = new Set(base.map(w => w.toLowerCase()));
    const out = base.slice();
    add.forEach(w => {
      const k = (w || '').toLowerCase();
      if (k && !seen.has(k)) { seen.add(k); out.push(w); }
    });
    return out;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]
    ));
  }
});
