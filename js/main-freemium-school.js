// ==================== SpellRightPro — Freemium School ====================
document.addEventListener('DOMContentLoaded', () => {
  // UI
  const startBtn   = document.getElementById('start-btn');
  const replayBtn  = document.getElementById('replay-btn');
  const backBtn    = document.getElementById('backspace-btn');
  const practice   = document.getElementById('practice-area');
  const promptEl   = document.getElementById('prompt');
  const tiles      = document.getElementById('word-tiles');
  const feedback   = document.getElementById('feedback');
  const summary    = document.getElementById('summary-area');

  const customBox  = document.getElementById('custom-words');
  const addBtn     = document.getElementById('add-custom-btn');
  const fileInput  = document.getElementById('file-input');
  const uploadBtn  = document.getElementById('upload-btn');

  const lifeCorrectEl  = document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('life-attempts');

  // TTS
  let accent = 'en-US';
  const synth = window.speechSynthesis;
  function speak(word) {
    if (!word) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = accent;
      synth.speak(u);
    } catch (e) {}
  }
  document.querySelector('.accent-picker')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accent = btn.dataset.accent || 'en-US';
    document.querySelectorAll('.accent-picker button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // Lifetime stats
  function loadStats() {
    return {
      correct:  parseInt(localStorage.getItem('school_life_correct')   || '0', 10),
      attempts: parseInt(localStorage.getItem('school_life_attempts') || '0', 10)
    };
  }
  function saveStats(c, a) {
    localStorage.setItem('school_life_correct', c);
    localStorage.setItem('school_life_attempts', a);
    lifeCorrectEl.textContent  = c;
    lifeAttemptsEl.textContent = a;
  }
  let { correct: lifeCorrect, attempts: lifeAttempts } = loadStats();
  saveStats(lifeCorrect, lifeAttempts);

  // Freemium daily cap (keep ON here; adjust if you want to disable temporarily)
  const CAP_ENABLED = true;
  const CAP = 10;
  function dayKey() {
    const d = new Date();
    return `srp_daily_School_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function usedToday()     { return parseInt(localStorage.getItem(dayKey()) || '0', 10); }
  function setUsedToday(n) { localStorage.setItem(dayKey(), String(n)); }

  // Base words (from JSON). If you prefer JS array, replace this block like OET.
  let baseWords = [];
  (async () => {
    try {
      const res = await fetch('/data/word-lists/school.json', { cache: 'no-cache' });
      const data = await res.json();
      baseWords = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
    } catch (e) {
      console.warn('Failed to load /data/word-lists/school.json', e);
      baseWords = [];
    }
  })();

  // Custom words (one list/day rule)
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function canAddCustom(){ return localStorage.getItem('school_custom_date') !== todayISO(); }
  function markCustom(){ localStorage.setItem('school_custom_date', todayISO()); }

  let customWords = [];
  addBtn?.addEventListener('click', () => {
    if (!canAddCustom()) { alert('Freemium allows one custom list per day.'); return; }
    const raw = (customBox.value || '').trim();
    if (!raw) { alert('Enter some words first.'); return; }
    const parsed = raw.split(/[\s,;]+/).map(w => w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    customBox.value = '';
    markCustom();
    alert(`Added ${parsed.length} custom words.`);
  });

  // Hidden file input trigger from visible Upload button
  uploadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    if (!canAddCustom()) { alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const parsed = String(r.result || '').split(/\r?\n|,|;|\t/).map(w => w.trim()).filter(Boolean);
      customWords = mergeUnique(customWords, parsed);
      markCustom();
      alert(`Uploaded ${parsed.length} custom words.`);
    };
    r.readAsText(f);
  });

  // Session state
  let words = [];        // current session word list
  let idx = 0;           // pointer
  let typed = '';        // current user input buffer
  let running = false;   // session flag
  let sessionCorrect = 0, sessionAttempts = 0;
  let attempts = [];     // per-session attempts for summary

  // Controls
  startBtn?.addEventListener('click', startSession);
  replayBtn?.addEventListener('click', () => speak(words[idx]));
  backBtn?.addEventListener('click', () => { if (!running) return; typed = typed.slice(0,-1); updateTiles(); });

  function capList(list) {
    if (!CAP_ENABLED) return list;
    const used = usedToday();
    if (used >= CAP) { alert(`Freemium limit reached: ${CAP} words today.`); return []; }
    const remain = CAP - used;
    return list.length > remain ? list.slice(0, remain) : list;
  }

  function startSession() {
    // Merge base + custom; keep unique words
    const merged = mergeUnique(baseWords.slice(), customWords);
    const sessionWords = capList(merged);
    if (!sessionWords.length) return;

    words = sessionWords;
    idx = 0; typed=''; running = true;
    sessionCorrect = 0; sessionAttempts = 0; attempts = [];

    summary.classList.add('hidden');
    practice.classList.remove('hidden');
    renderWord();
  }

  function renderWord() {
    if (idx >= words.length) return endSession();
    const w = words[idx];
    typed = ''; // IMPORTANT: reset typed so we don't repeat previous entry

    // Build tiles
    tiles.innerHTML = Array.from({ length: w.length })
      .map(() => `<div class="letter-tile">&nbsp;</div>`).join('');
    updateTiles();

    feedback.textContent = '';
    promptEl.textContent = `Word ${idx+1} of ${words.length} — listen and type, then press Enter`;
    speak(w);

    // Key handling
    document.onkeydown = (e) => {
      if (!running) return;
      if (e.key === 'Enter') { evaluate(); return; }
      if (e.key === 'Backspace') { typed = typed.slice(0,-1); updateTiles(); return; }
      if (/^[a-zA-Z]$/.test(e.key)) {
        if (typed.length < w.length) {
          typed += e.key;
          updateTiles();
        }
        return;
      }
      if (e.key === ' ') { e.preventDefault(); speak(w); }
    };
  }

  function updateTiles() {
    const els = tiles.children;
    for (let i=0;i<els.length;i++) {
      els[i].textContent = typed[i] ? typed[i].toUpperCase() : ' ';
    }
  }

  function evaluate() {
    const w = (words[idx] || '').trim();
    const guess = (typed || '').trim();
    sessionAttempts++;
    lifeAttempts++;
    const correct = guess.toLowerCase() === w.toLowerCase();
    if (correct) {
      sessionCorrect++;
      lifeCorrect++;
      feedback.textContent = `✅ Correct: ${w}`;
    } else {
      feedback.innerHTML = `❌ You wrote “${escapeHtml(guess)}”, correct was <b>${escapeHtml(w)}</b>`;
    }
    attempts.push({ word: w, guess, correct });

    saveStats(lifeCorrect, lifeAttempts);

    // Important: advance to next word, clear typed so we don't repeat
    idx++;
    typed = '';
    setTimeout(renderWord, 700);
  }

  function endSession() {
    running = false;
    document.onkeydown = null;

    if (CAP_ENABLED) setUsedToday(usedToday() + words.length);

    const percent = sessionAttempts ? Math.round(sessionCorrect/sessionAttempts*100) : 0;
    const correct = attempts.filter(a => a.correct).map(a => a.word);
    const wrong   = attempts.filter(a => !a.correct).map(a => a.word);

    summary.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${sessionCorrect}/${sessionAttempts} (${percent}%)</div>
      </div>
      <div class="results-grid">
        <div class="results-card">
          <h3>Correct</h3>
          <div class="word-list">
            ${correct.map(w => `<span class="word-item">${escapeHtml(w)}</span>`).join('') || '<em>None</em>'}
          </div>
        </div>
        <div class="results-card">
          <h3>Needs Practice</h3>
          <div class="word-list">
            ${wrong.map(w => `<span class="word-item">${escapeHtml(w)}</span>`).join('') || '<em>None</em>'}
          </div>
        </div>
      </div>
    `;
    practice.classList.add('hidden');
    summary.classList.remove('hidden');
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // Utils
  function mergeUnique(base, add) {
    const seen = new Set(base.map(w => (w||'').toLowerCase()));
    const out = base.slice();
    add.forEach(w => {
      const k = (w||'').toLowerCase();
      if (k && !seen.has(k)) { seen.add(k); out.push(w); }
    });
    return out;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
});
