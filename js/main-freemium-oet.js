// ==================== SpellRightPro Freemium OET (Practice/Test + End Session) ====================
document.addEventListener('DOMContentLoaded', () => {
  const practiceArea   = document.getElementById('practice-area');
  const summaryArea    = document.getElementById('summary-area');
  const startBtn       = document.getElementById('start-btn');
  const practiceBtn    = document.getElementById('practice-mode-btn');
  const testBtn        = document.getElementById('test-mode-btn');
  const accentPicker   = document.querySelector('.accent-picker');
  const feedbackBox    = document.getElementById('feedback');

  const prevBtn        = document.getElementById('prev-btn');
  const nextBtn        = document.getElementById('next-btn');
  const repeatBtn      = document.getElementById('repeat-btn');

  const lifeCorrectEl  = document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('life-attempts');

  const addCustomBtn   = document.getElementById('add-custom-btn');
  const fileInput      = document.getElementById('file-input');
  const customInput    = document.getElementById('custom-words');

  // ---------- Config ----------
  const ENABLE_WORD_LIMIT   = false;
  const FREEMIUM_MAX        = 10;

  // ---------- Lifetime stats ----------
  function loadLife() {
    const c = parseInt(localStorage.getItem('oet_life_correct')  || '0', 10);
    const a = parseInt(localStorage.getItem('oet_life_attempts') || '0', 10);
    lifeCorrectEl.textContent  = c;
    lifeAttemptsEl.textContent = a;
    return { c, a };
  }
  function saveLife(c, a) {
    localStorage.setItem('oet_life_correct',  String(c));
    localStorage.setItem('oet_life_attempts', String(a));
    lifeCorrectEl.textContent  = c;
    lifeAttemptsEl.textContent = a;
  }
  let { c: lifeCorrect, a: lifeAttempts } = loadLife();

  // ---------- TTS ----------
  let accent = 'en-US';
  const synth = window.speechSynthesis;
  function speak(w) {
    try {
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(w);
      u.lang = accent;
      synth.speak(u);
    } catch (e) {}
  }
  accentPicker?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accentPicker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    accent = btn.getAttribute('data-accent') || 'en-US';
  });

  // ---------- Word limit ----------
  function capForToday(list) {
    if (!ENABLE_WORD_LIMIT) return list;
    const used = parseInt(localStorage.getItem('srp_daily_words_OET')||'0',10);
    if (used >= FREEMIUM_MAX) {
      alert(`Freemium limit reached: ${FREEMIUM_MAX} words today.`);
      return [];
    }
    return list;
  }

  // ---------- Base words ----------
  let baseOET = [];
  if (Array.isArray(window.oetWords)) {
    baseOET = window.oetWords.filter(Boolean);
  } else {
    alert('OET word list not loaded. Make sure js/oet_word_list.js is included before this script.');
  }

  // ---------- Custom words ----------
  let customWords = [];
  function mergeUnique(base, add) {
    const seen = new Set(base.map((w) => w.toLowerCase()));
    const out = base.slice();
    add.forEach((w) => {
      const k = w.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(w); }
    });
    return out;
  }
  function parseWords(text) {
    return text.split(/\r?\n|,|;|\t|\s+/).map(w=>w.trim()).filter(Boolean);
  }

  addCustomBtn?.addEventListener('click', () => {
    const raw = (customInput?.value || '').trim();
    if (!raw) { alert('Enter some words first.'); return; }
    const parsed = parseWords(raw);
    customWords = mergeUnique(customWords, parsed);
    customInput.value = '';
    alert(`Added ${parsed.length} custom words.`);
  });
  fileInput?.addEventListener('change', (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const parsed = parseWords(r.result);
      customWords = mergeUnique(customWords, parsed);
      alert(`Uploaded ${parsed.length} words.`);
    };
    r.readAsText(f);
  });

  // ---------- Session ----------
  let words = [], i = 0, score = 0, answers = [], sessionMode = 'practice', sessionActive = false;

  practiceBtn?.addEventListener('click', ()=> sessionMode='practice');
  testBtn?.addEventListener('click', ()=> sessionMode='test');

  startBtn?.addEventListener('click', () => {
    if (sessionActive) {
      endSession();
    } else {
      startSession();
    }
  });

  function startSession() {
    let sessionWords = mergeUnique(baseOET.slice(), customWords);
    if (sessionMode === 'test') {
      sessionWords = shuffle(sessionWords).slice(0, 24);
    }
    sessionWords = capForToday(sessionWords);
    if (!sessionWords.length) { alert('No words available.'); return; }

    words = sessionWords; i=0; score=0; answers=[];
    practiceArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    feedbackBox.textContent = '';
    sessionActive = true;
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    renderQ();
  }

  function renderQ() {
    if (i >= words.length) return endSession();
    const w = words[i];
    const answerInput = document.getElementById('answer');
    const submitBtn   = document.getElementById('submit');
    if (answerInput) {
      answerInput.value = '';
      answerInput.focus();
      answerInput.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    }
    if (submitBtn) submitBtn.onclick = submit;
    speak(w);
    feedbackBox.textContent = '';
  }

  function submit() {
    const input = (document.getElementById('answer')?.value || '').trim();
    const w = (words[i] || '').trim();
    let correct = false;
    if (input.toLowerCase() === w.toLowerCase()) {
      score++; correct = true;
      feedbackBox.textContent = `✅ Correct: ${w}`;
    } else {
      feedbackBox.textContent = `❌ Incorrect. Correct spelling: ${w}`;
    }
    answers[i] = input;
    lifeAttempts++; if (correct) lifeCorrect++;
    saveLife(lifeCorrect, lifeAttempts);
    i++;
    setTimeout(renderQ, 600);
  }

  function endSession() {
    sessionActive = false;
    const wrong   = words.filter((w, idx)=> (answers[idx]||'').toLowerCase() !== w.toLowerCase());
    const percent = words.length ? Math.round((score/words.length)*100) : 0;
    summaryArea.innerHTML = `
      <div class="summary-header"><h2>Session Results</h2>
      <div class="score-display">${score}/${words.length} (${percent}%)</div></div>
      <div class="results-grid">
        <div class="results-card"><h3>Correct</h3><div class="word-list">
          ${words.filter((w,idx)=>(answers[idx]||'').toLowerCase()===w.toLowerCase()).map(w=>`<div class="word-item">${w}</div>`).join('')}
        </div></div>
        <div class="results-card"><h3>Needs Practice</h3><div class="word-list">
          ${wrong.map(w=>`<div class="word-item">${w}</div>`).join('')}
        </div></div>
      </div>`;
    practiceArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // ---------- Navigation ----------
  prevBtn?.addEventListener('click', ()=>{ if (i>0){ i--; renderQ(); } });
  nextBtn?.addEventListener('click', ()=>{ i++; renderQ(); });
  repeatBtn?.addEventListener('click', ()=>{ if (i<words.length) speak(words[i]); });

  // ---------- Helpers ----------
  function shuffle(a) {
    const arr=a.slice();
    for (let j=arr.length-1;j>0;j--) {
      const k=Math.floor(Math.random()*(j+1));
      [arr[j],arr[k]]=[arr[k],arr[j]];
    }
    return arr;
  }
});
