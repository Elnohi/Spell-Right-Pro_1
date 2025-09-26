// ==================== SpellRightPro Freemium OET ====================
document.addEventListener('DOMContentLoaded', () => {
  const trainerArea   = document.getElementById('trainer-area');
  const summaryArea   = document.getElementById('summary-area');
  const addCustomBtn  = document.getElementById('add-custom-btn');
  const fileInput     = document.getElementById('file-input');
  const customInput   = document.getElementById('custom-words');
  const startBtn      = document.getElementById('start-btn');
  const practiceBtn   = document.getElementById('practice-mode-btn');
  const testBtn       = document.getElementById('test-mode-btn');
  const modeSwitchBtn = document.getElementById('mode-switch-btn');
  const accentPicker  = document.querySelector('.accent-picker');

  // ---------- TTS ----------
  let accent = 'en-US';
  const synth = window.speechSynthesis;
  function speak(w) {
    try {
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(w);
      u.lang = accent;
      (synth || window.speechSynthesis).speak(u);
    } catch (e) {}
  }

  // ---------- Mode ----------
  let sessionMode = 'practice';
  practiceBtn?.addEventListener('click', () => (sessionMode = 'practice'));
  testBtn?.addEventListener('click',     () => (sessionMode = 'test'));
  modeSwitchBtn?.addEventListener('click', () => (sessionMode = sessionMode === 'practice' ? 'test' : 'practice'));
  accentPicker?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accentPicker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    accent = btn.getAttribute('data-accent') || 'en-US';
  });

  // ---------- Base OET words (from oet_word_list.js) ----------
  let baseOET = [];
  if (Array.isArray(window.oetWords)) {
    baseOET = window.oetWords.filter(Boolean);
  } else {
    console.warn('window.oetWords not found in /js/oet_word_list.js');
    alert('OET word list not loaded. Ensure /js/oet_word_list.js is included BEFORE this script.');
    startBtn?.setAttribute('disabled', 'true');
    startBtn && (startBtn.title = 'Word list not loaded');
  }

  // ---------- Custom once/day ----------
  function todayStr()     { return new Date().toISOString().slice(0, 10); }
  function canAddCustom() { return localStorage.getItem('oet_customListDate') !== todayStr(); }
  function markCustom()   { localStorage.setItem('oet_customListDate', todayStr()); }

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

  // ---------- Session ----------
  let words = [], i = 0, score = 0, answers = [], sessionActive = false;

  startBtn?.addEventListener('click', () => {
    if (sessionActive) endSession();
    else startSession();
  });

  function startSession() {
    if (!baseOET.length && !customWords.length) {
      alert('No words available. Check that oet_word_list.js loaded, or add custom words.');
      return;
    }
    let sessionWords = mergeUnique(baseOET.slice(), customWords);
    if (sessionMode === 'test') sessionWords = shuffle(sessionWords).slice(0, 24);
    if (!sessionWords.length) { alert('No words available.'); return; }

    words = sessionWords; i=0; score=0; answers=[];
    trainerArea?.classList.remove('hidden');
    summaryArea?.classList.add('hidden');
    startBtn && (startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session', startBtn.classList.add('stop'));
    sessionActive = true;
    renderQ();
  }

  function renderQ() {
    if (i >= words.length) return endSession();
    const w = (words[i] || '').trim();

    trainerArea.innerHTML = `
      <div class="word-playback">
        <button id="hear" class="btn-icon" title="Hear again"><i class="fas fa-volume-up"></i></button>
        <span class="indicator">Word ${i + 1}/${words.length}</span>
      </div>

      <div class="answer-row">
        <input id="answer" type="text" placeholder="Type the spelling..." autocomplete="off"/>
        <button id="submit" class="btn-primary"><i class="fas fa-check"></i> Submit</button>
        <button id="skip" class="btn-secondary"><i class="fas fa-forward"></i> Skip</button>
      </div>

      <div class="nav-controls" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button id="prev-btn" class="btn-secondary"><i class="fa fa-arrow-left"></i> Previous</button>
        <button id="repeat-btn" class="btn-secondary"><i class="fa fa-redo"></i> Repeat</button>
        <button id="next-btn" class="btn-secondary">Next <i class="fa fa-arrow-right"></i></button>
      </div>

      <div id="feedback" class="feedback" style="min-height:28px;margin-top:8px;font-weight:600"></div>
    `;

    // wire events
    document.getElementById('hear')?.addEventListener('click', () => speak(w));
    document.getElementById('submit')?.addEventListener('click', submit);
    document.getElementById('skip')?.addEventListener('click', () => { answers[i] = ''; i++; renderQ(); });

    document.getElementById('prev-btn')?.addEventListener('click', () => { if (i>0){ i--; renderQ(); } });
    document.getElementById('repeat-btn')?.addEventListener('click', () => speak(w));
    document.getElementById('next-btn')?.addEventListener('click', () => { if (i < words.length-1){ i++; renderQ(); } else { endSession(); } });

    const input = document.getElementById('answer');
    input?.focus();
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    speak(w);
  }

  function submit() {
    const input = (document.getElementById('answer')?.value || '').trim();
    const w = (words[i] || '').trim();
    if (input.toLowerCase() === w.toLowerCase()) {
      score++;
      const fb = document.getElementById('feedback'); if (fb) fb.textContent = `✅ Correct: ${w}`;
    } else {
      const fb = document.getElementById('feedback'); if (fb) fb.textContent = `❌ Incorrect. Correct spelling: ${w}`;
    }
    answers[i] = input;
    i++;
    setTimeout(renderQ, 500);
  }

  function endSession() {
    sessionActive = false;
    const wrong   = words.filter((w, idx) => (answers[idx] || '').toLowerCase() !== w.toLowerCase());
    const percent = words.length ? Math.round((score / words.length) * 100) : 0;

    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${score}/${words.length} (${percent}%)</div>
      </div>
      <div class="results-grid">
        <div class="results-card">
          <h3>Correct</h3>
          <div class="word-list">
            ${words.filter((w, idx) => (answers[idx] || '').toLowerCase() === w.toLowerCase()).map(w => `<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
        <div class="results-card">
          <h3>Needs Practice</h3>
          <div class="word-list">
            ${wrong.map(w => `<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
      </div>`;
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn && (startBtn.innerHTML = '<i class="fas fa-play"></i> Start', startBtn.classList.remove('stop'));
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // ---------- utils ----------
  function mergeUnique(base, add) {
    const seen = new Set(base.map(w => (w || '').toLowerCase()));
    const out = base.slice();
    add.forEach(w => {
      const k = (w || '').toLowerCase();
      if (k && !seen.has(k)) { seen.add(k); out.push(w); }
    });
    return out;
  }
  function shuffle(a) {
    const arr = a.slice();
    for (let j = arr.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
    return arr;
  }
});
