// ==================== SpellRightPro Freemium OET ====================
document.addEventListener('DOMContentLoaded', () => {
  const trainerArea   = document.getElementById('trainer-area');
  const practiceArea  = document.getElementById('practice-area');
  const summaryArea   = document.getElementById('summary-area');
  const startBtn      = document.getElementById('start-btn');
  const accentPicker  = document.querySelector('.accent-picker');
  const feedbackBox   = document.getElementById('feedback');

  const prevBtn   = document.getElementById('prev-btn');
  const nextBtn   = document.getElementById('next-btn');
  const repeatBtn = document.getElementById('repeat-btn');

  const lifeCorrect = document.getElementById('life-correct');
  const lifeAttempts = document.getElementById('life-attempts');

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
  accentPicker?.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      accent = e.target.dataset.accent;
      accentPicker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
    }
  });

  // ---------- Daily cap (10) ----------
  const FREEMIUM_MAX = 10;
  function dayKey() {
    const d = new Date();
    return `srp_daily_words_OET_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function usedToday()     { return parseInt(localStorage.getItem(dayKey()) || '0', 10); }
  function setUsedToday(n) { localStorage.setItem(dayKey(), String(n)); }
  function capForToday(list) {
    const used = usedToday();
    if (used >= FREEMIUM_MAX) {
      alert(`Freemium limit reached: ${FREEMIUM_MAX} words today.`);
      return [];
    }
    const remain = FREEMIUM_MAX - used;
    return list.length > remain ? list.slice(0, remain) : list;
  }

  // ---------- Base OET words (from oet_word_list.js) ----------
  let baseOET = [];
  if (Array.isArray(window.oetWords)) {
    baseOET = window.oetWords.filter(Boolean);
  } else {
    console.warn('window.oetWords not found in oet_word_list.js');
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.title = 'OET word list not loaded (check that /js/oet_word_list.js is included before this script).';
    }
    alert('Error: OET word list not loaded. Please check that /js/oet_word_list.js is included before main-freemium-oet.js in your HTML.');
  }

  // ---------- Session ----------
  let words = [], i = 0, score = 0, answers = [];

  startBtn?.addEventListener('click', startSession);

  function startSession() {
    const merged = baseOET.slice();
    let sessionWords = merged;
    if (sessionMode === 'test') sessionWords = shuffle(sessionWords).slice(0, 24);
    sessionWords = capForToday(sessionWords);
    if (!sessionWords.length) return;

    words = sessionWords; i = 0; score = 0; answers = [];
    trainerArea?.classList.remove('hidden');
    practiceArea?.classList.remove('hidden');
    summaryArea?.classList.add('hidden');
    feedbackBox.textContent = '';
    if (startBtn) startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
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
    if (submitBtn) {
      submitBtn.onclick = submit;
    }

    speak(w);
    feedbackBox.textContent = ''; // clear old feedback
  }

  function submit() {
    const input = (document.getElementById('answer')?.value || '').trim();
    const w = (words[i] || '').trim();
    let correct = false;
    if (input.toLowerCase() === w.toLowerCase()) {
      score++;
      correct = true;
      feedbackBox.textContent = `✅ Correct: ${w}`;
    } else {
      feedbackBox.textContent = `❌ Incorrect. Correct spelling: ${w}`;
    }
    answers[i] = input;

    // update lifetime stats
    const attempts = parseInt(lifeAttempts.textContent) + 1;
    lifeAttempts.textContent = attempts;
    if (correct) {
      const corr = parseInt(lifeCorrect.textContent) + 1;
      lifeCorrect.textContent = corr;
    }

    i++;
    setTimeout(renderQ, 600); // small delay so user sees feedback
  }

  function endSession() {
    setUsedToday(usedToday() + words.length);
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
            ${words.filter((w, idx) => (answers[idx] || '').toLowerCase() === w.toLowerCase()).map((w) => `<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
        <div class="results-card">
          <h3>Needs Practice</h3>
          <div class="word-list">
            ${wrong.map((w) => `<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
      </div>`;
    trainerArea.classList.add('hidden');
    practiceArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    if (startBtn) startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // ---------- Nav controls ----------
  prevBtn?.addEventListener('click', () => {
    if (i > 0) {
      i--;
      renderQ();
    }
  });
  nextBtn?.addEventListener('click', () => {
    i++;
    renderQ();
  });
  repeatBtn?.addEventListener('click', () => {
    if (i < words.length) speak(words[i]);
  });

  // ---------- utils ----------
  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
});
