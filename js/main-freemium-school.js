// ==================== SpellRightPro — School Freemium ====================
document.addEventListener('DOMContentLoaded', () => {
  const startBtn       = document.getElementById('start-btn');
  const startBtnDup    = document.getElementById('start-btn-dup');
  const replayBtn      = document.getElementById('replay-btn');
  const backspaceBtn   = document.getElementById('backspace-btn');
  const practice       = document.getElementById('practice-area');
  const promptEl       = document.getElementById('prompt');
  const tiles          = document.getElementById('word-tiles');
  const feedback       = document.getElementById('feedback');
  const summary        = document.getElementById('summary-area');

  const customBox      = document.getElementById('custom-words');
  const addCustomBtn   = document.getElementById('add-custom-btn');
  const fileInput      = document.getElementById('file-input');

  const lifeCorrectEl  = document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('life-attempts');

  // ---------- Speech ----------
  let accent = 'en-US';
  const picker = document.querySelector('.accent-picker');
  const synth = window.speechSynthesis;

  function speak(text) {
    try {
      if (!text) return;
      synth.cancel(); // prevent overlap
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      synth.speak(u);
    } catch (e) {}
  }

  picker?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accent = btn.getAttribute('data-accent') || 'en-US';
    picker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // ---------- State ----------
  const CAP = 10;
  let words = [], idx = 0, typed = '', running = false, currentWord = '';
  let lifeCorrect = parseInt(localStorage.getItem('school_life_correct') || '0', 10);
  let lifeAttempts = parseInt(localStorage.getItem('school_life_attempts') || '0', 10);

  function saveLife() {
    localStorage.setItem('school_life_correct', lifeCorrect);
    localStorage.setItem('school_life_attempts', lifeAttempts);
    lifeCorrectEl.textContent = lifeCorrect;
    lifeAttemptsEl.textContent = lifeAttempts;
  }
  saveLife();

  // ---------- Load Words ----------
  let sampleWords = [];
  (async () => {
    try {
      const res = await fetch('/data/word-lists/school.json', { cache: 'no-cache' });
      const data = await res.json();
      sampleWords = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
    } catch (e) { console.warn('Failed to load school.json', e); }
  })();

  // ---------- Custom Words ----------
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function canAddCustom() { return localStorage.getItem('school_custom_date') !== todayISO(); }
  function markCustom() { localStorage.setItem('school_custom_date', todayISO()); }

  let customWords = [];
  addCustomBtn?.addEventListener('click', () => {
    if (!canAddCustom()) { alert('One custom list per day.'); return; }
    const raw = (customBox.value || '').trim();
    if (!raw) return;
    const parsed = raw.split(/[\s,;]+/).map(w => w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    customBox.value = '';
    markCustom();
    alert(`Added ${parsed.length} custom words.`);
  });

  fileInput?.addEventListener('change', e => {
    if (!canAddCustom()) { alert('One custom list per day.'); e.target.value=''; return; }
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

  // ---------- Session ----------
  function startSession() {
    const merged = mergeUnique(sampleWords.slice(), customWords);
    if (!merged.length) return;
    words = merged.slice(0, CAP);
    idx = 0; running = true;
    summary.classList.add('hidden');
    practice.classList.remove('hidden');
    renderWord();
  }

  function renderWord() {
    if (idx >= words.length) return finish();
    currentWord = words[idx]; typed = '';

    tiles.innerHTML = Array.from({ length: currentWord.length })
      .map(() => `<div class="letter-tile">&nbsp;</div>`).join('');
    updateTiles();
    feedback.textContent = '';
    promptEl.textContent = `Word ${idx+1}/${words.length}: Listen and type.`;

    // speak only once, after small delay
    setTimeout(() => speak(currentWord), 300);

    document.onkeydown = (e) => {
      if (!running) return;
      if (e.key === 'Enter') { evaluate(); return; }
      if (e.key === 'Backspace') { typed = typed.slice(0,-1); updateTiles(); return; }
      if (/^[a-zA-Z]$/.test(e.key)) {
        if (typed.length < currentWord.length) { typed += e.key; updateTiles(); }
      }
      if (e.key === ' ') { e.preventDefault(); speak(currentWord); }
    };
  }

  function updateTiles() {
    Array.from(tiles.children).forEach((ch, i) => {
      ch.textContent = typed[i] ? typed[i].toUpperCase() : ' ';
    });
  }

  function evaluate() {
    lifeAttempts++;
    if (typed.toLowerCase() === currentWord.toLowerCase()) {
      lifeCorrect++;
      feedback.textContent = '✅ Correct';
    } else {
      feedback.textContent = `❌ "${typed}" → ${currentWord}`;
    }
    saveLife();
    idx++;
    setTimeout(renderWord, 500);
  }

  function finish() {
    running = false; document.onkeydown = null;
    const percent = lifeAttempts ? Math.round((lifeCorrect/lifeAttempts)*100) : 0;
    summary.innerHTML = `
      <div class="summary-header">
        <h2>Session Summary</h2>
        <div class="score-display">${lifeCorrect}/${lifeAttempts} (${percent}%)</div>
      </div>
      <p>Great work! Press Start again for another session.</p>
    `;
    practice.classList.add('hidden');
    summary.classList.remove('hidden');
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  function mergeUnique(base, add) {
    const seen = new Set(base.map(w => w.toLowerCase()));
    const out = base.slice();
    add.forEach(w => {
      const k = w.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(w); }
    });
    return out;
  }

  // ---------- Buttons ----------
  startBtn?.addEventListener('click', startSession);
  startBtnDup?.addEventListener('click', startSession);
  replayBtn?.addEventListener('click', () => currentWord && speak(currentWord));
  backspaceBtn?.addEventListener('click', () => { if (running) { typed = typed.slice(0,-1); updateTiles(); } });
});
