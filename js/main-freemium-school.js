// ==================== SpellRightPro — School Freemium (final) ====================
document.addEventListener('DOMContentLoaded', () => {
  // Controls
  const startBtn        = document.getElementById('start-btn');
  const replayBtn       = document.getElementById('replay-btn');
  const clearBtn        = document.getElementById('clear-btn');

  // Main areas
  const practice        = document.getElementById('practice-area');
  const promptEl        = document.getElementById('prompt');
  const tiles           = document.getElementById('word-tiles');
  const feedback        = document.getElementById('feedback');
  const summary         = document.getElementById('summary-area');

  // Stats
  const lifeCorrectEl   = document.getElementById('life-correct');
  const lifeAttemptsEl  = document.getElementById('life-attempts');
  const lifeAccEl       = document.getElementById('life-accuracy');
  const currentIdxEl    = document.getElementById('current-word-index');
  const totalWordsEl    = document.getElementById('total-words');

  // Sticky typing row
  const typedInput      = document.getElementById('typed-input');
  const typedSubmit     = document.getElementById('typed-submit');
  const typedPreview    = document.getElementById('typed-preview');

  // Custom list
  const customBox       = document.getElementById('custom-words');
  const addCustomBtn    = document.getElementById('add-custom-btn');
  const schoolFileInput = document.getElementById('school-file-input'); // unique id

  // Accent
  const picker          = document.querySelector('.accent-picker');
  let accent = 'en-US';

  // Speech
  const synth = window.speechSynthesis;
  function speak(text) {
    try {
      if (!text) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      synth.speak(u);
    } catch {}
  }

  // Accent events — PURE buttons, no labels, so they never open file picker
  picker?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accent = btn.getAttribute('data-accent') || 'en-US';
    picker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // --------- Lifetime counters ---------
  let lifeCorrect  = parseInt(localStorage.getItem('school_life_correct') || '0', 10);
  let lifeAttempts = parseInt(localStorage.getItem('school_life_attempts') || '0', 10);
  function saveLife() {
    localStorage.setItem('school_life_correct', lifeCorrect);
    localStorage.setItem('school_life_attempts', lifeAttempts);
    lifeCorrectEl.textContent  = String(lifeCorrect);
    lifeAttemptsEl.textContent = String(lifeAttempts);
    const acc = lifeAttempts ? Math.round((lifeCorrect / lifeAttempts) * 100) : 0;
    lifeAccEl.textContent = `${acc}%`;
  }
  saveLife();

  // --------- Sample list (fallback) ---------
  let sampleWords = [];
  (async () => {
    try {
      const res = await fetch('/data/word-lists/school.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        sampleWords = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
      } else throw new Error(res.status);
    } catch {
      sampleWords = [
        'apple','banana','computer','dictionary','elephant',
        'friendly','garden','hospital','important','jungle',
        'kitchen','library','mountain','notebook','ocean',
        'pencil','question','rabbit','school','teacher'
      ];
    }
  })();

  // --------- Custom list (1/day on freemium) ---------
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function canAddCustom(){ return localStorage.getItem('school_custom_date') !== todayISO(); }
  function markCustom(){ localStorage.setItem('school_custom_date', todayISO()); }

  let customWords = [];
  try {
    const saved = localStorage.getItem('school_custom_words');
    if (saved) customWords = JSON.parse(saved);
  } catch {}

  function saveCustom() {
    try { localStorage.setItem('school_custom_words', JSON.stringify(customWords)); } catch {}
  }

  addCustomBtn?.addEventListener('click', () => {
    if (!canAddCustom()) { alert('Freemium: one custom list per day. Upgrade to Premium for unlimited.'); return; }
    const raw = (customBox?.value || '').trim();
    if (!raw) { alert('Enter some words first.'); return; }
    const parsed = raw.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
    const before = customWords.length;
    customWords = mergeUnique(customWords, parsed);
    const added = customWords.length - before;
    customBox.value = '';
    markCustom(); saveCustom();
    alert(`Added ${added} custom words.`);
  });

  schoolFileInput?.addEventListener('change', e => {
    if (!canAddCustom()) { alert('Freemium: one custom list per day.'); e.target.value=''; return; }
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const parsed = String(r.result||'').split(/\r?\n|,|;|\t/).map(w=>w.trim()).filter(Boolean);
      const before = customWords.length;
      customWords = mergeUnique(customWords, parsed);
      const added = customWords.length - before;
      markCustom(); saveCustom();
      alert(`Uploaded ${added} words.`);
    };
    r.readAsText(f);
  });

  // --------- Session state ---------
  const CAP = 10; // per session in freemium
  let words = [], idx = 0, running = false, currentWord = '';

  startBtn?.addEventListener('click', startSession);
  replayBtn?.addEventListener('click', ()=> speak(currentWord));
  clearBtn?.addEventListener('click', ()=> { typedInput.value=''; typedPreview.textContent=''; typedInput.focus(); });

  typedSubmit?.addEventListener('click', checkAnswer);
  typedInput?.addEventListener('input', () => { typedPreview.textContent = typedInput.value; });
  typedInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAnswer();
    if (e.key === ' ') { e.preventDefault(); speak(currentWord); } // space = replay
  });

  function startSession() {
    // Prefer custom; else fallback to sample
    const merged = customWords.length ? mergeUnique([], customWords) : mergeUnique(sampleWords.slice(), customWords);
    if (!merged.length) { alert('No words available. Add custom words first.'); return; }

    words = shuffleArray(merged).slice(0, CAP);
    idx = 0; running = true;
    currentWord = words[0];

    totalWordsEl.textContent = String(words.length);
    currentIdxEl.textContent = '1';
    practice.classList.remove('hidden');
    summary.classList.add('hidden');

    typedInput.value = ''; typedPreview.textContent = '';
    speak(currentWord);
    ensureVisible();
  }

  function ensureVisible(){
    typedInput.focus();
    feedback.scrollIntoView({behavior:'smooth', block:'center'});
  }

  function checkAnswer() {
    if (!running) return;
    const guess = (typedInput.value||'').trim();
    const ok = guess.toLowerCase() === currentWord.toLowerCase();

    lifeAttempts += 1; if (ok) lifeCorrect += 1; saveLife();

    feedback.innerHTML = ok
      ? `<span style="color:green">✅ Correct</span> — ${currentWord}`
      : `<span style="color:#b91c1c">❌ Incorrect</span> — ${currentWord} <small>(You: ${guess||'—'})</small>`;

    ensureVisible();

    // Advance
    idx += 1;
    if (idx >= words.length) return endSession();

    currentWord = words[idx];
    currentIdxEl.textContent = String(idx + 1);
    typedInput.value=''; typedPreview.textContent='';
    setTimeout(()=> speak(currentWord), 250);
  }

  function endSession() {
    running = false;
    practice.classList.add('hidden');
    summary.classList.remove('hidden');

    summary.innerHTML = `
      <div class="card">
        <h3 class="card-title">Session Complete</h3>
        <p>Nice work! Start another round or add more custom words.</p>
      </div>
    `;
    summary.scrollIntoView({behavior:'smooth', block:'center'});
  }

  // --------- Utils ---------
  function shuffleArray(a){ for(let n=a.length-1;n>0;n--){ const j=Math.floor(Math.random()*(n+1)); [a[n],a[j]]=[a[j],a[n]] } return a; }
  function mergeUnique(a,b){ const s=new Set([...(a||[]),...(b||[])]); return Array.from(s); }
});
