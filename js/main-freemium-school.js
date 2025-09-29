// ==================== SpellRightPro — Freemium School ====================
document.addEventListener('DOMContentLoaded', () => {
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

  const lifeCorrectEl = document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('life-attempts');

  // TTS
  let accent = 'en-US';
  const synth = window.speechSynthesis;
  function speak(word) {
    if (!word) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = accent;
    synth.speak(u);
  }

  document.querySelector('.accent-picker')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accent = btn.dataset.accent;
    document.querySelectorAll('.accent-picker button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // Stats
  function loadStats() {
    return {
      correct: parseInt(localStorage.getItem('school_life_correct')||'0',10),
      attempts: parseInt(localStorage.getItem('school_life_attempts')||'0',10)
    };
  }
  function saveStats(c,a) {
    localStorage.setItem('school_life_correct', c);
    localStorage.setItem('school_life_attempts', a);
    lifeCorrectEl.textContent = c;
    lifeAttemptsEl.textContent = a;
  }
  let {correct:lifeCorrect, attempts:lifeAttempts} = loadStats();
  saveStats(lifeCorrect, lifeAttempts);

  // Words
  let baseWords = [];
  (async () => {
    try {
      const res = await fetch('data/school.json');
      const data = await res.json();
      baseWords = Array.isArray(data.words) ? data.words : [];
    } catch(e) { console.warn(e); }
  })();

  let customWords = [];
  addBtn?.addEventListener('click', () => {
    const raw = (customBox.value||'').trim();
    if (!raw) return;
    customWords = [...new Set([...customWords, ...raw.split(/\s+|,|;/)])];
    customBox.value = '';
  });

  fileInput?.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      customWords = [...new Set([...customWords, ...r.result.split(/\s+|,|;/)])];
    };
    r.readAsText(f);
  });

  // Session
  let words = [], idx = 0, typed = '', running = false, sessionCorrect = 0, sessionAttempts = 0;

  startBtn?.addEventListener('click', startSession);
  replayBtn?.addEventListener('click', () => speak(words[idx]));
  backBtn?.addEventListener('click', () => { typed = typed.slice(0,-1); updateTiles(); });

  function startSession() {
    words = [...new Set([...baseWords, ...customWords])];
    if (!words.length) return;
    idx = 0; typed=''; running=true; sessionCorrect=0; sessionAttempts=0;
    summary.classList.add('hidden');
    practice.classList.remove('hidden');
    renderWord();
  }

  function renderWord() {
    if (idx >= words.length) return endSession();
    const w = words[idx];
    typed = '';
    tiles.innerHTML = Array.from({length: w.length}, () => `<div class="letter-tile">&nbsp;</div>`).join('');
    updateTiles();
    promptEl.textContent = `Word ${idx+1} of ${words.length}`;
    feedback.textContent = '';
    speak(w);

    document.onkeydown = (e) => {
      if (!running) return;
      if (e.key === 'Enter') return evaluate();
      if (e.key === 'Backspace') { typed = typed.slice(0,-1); updateTiles(); return; }
      if (/^[a-zA-Z]$/.test(e.key) && typed.length < w.length) {
        typed += e.key; updateTiles();
      }
    };
  }

  function updateTiles() {
    Array.from(tiles.children).forEach((tile,i) => tile.textContent = typed[i] ? typed[i].toUpperCase() : ' ');
  }

  function evaluate() {
    const w = words[idx];
    sessionAttempts++;
    lifeAttempts++;
    if (typed.toLowerCase() === w.toLowerCase()) {
      sessionCorrect++;
      lifeCorrect++;
      feedback.textContent = `✅ Correct: ${w}`;
    } else {
      feedback.textContent = `❌ You wrote "${typed}", correct was ${w}`;
    }
    saveStats(lifeCorrect, lifeAttempts);
    idx++; typed='';
    setTimeout(renderWord, 700);
  }

  function endSession() {
    running=false; document.onkeydown=null;
    const percent = sessionAttempts ? Math.round(sessionCorrect/sessionAttempts*100) : 0;
    summary.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${sessionCorrect}/${sessionAttempts} (${percent}%)</div>
      </div>`;
    practice.classList.add('hidden');
    summary.classList.remove('hidden');
    if (window.insertSummaryAd) window.insertSummaryAd();
  }
});
