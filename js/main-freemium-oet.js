// SpellRightPro — Freemium OET (fixed)
document.addEventListener('DOMContentLoaded', () => {
  const trainerArea   = document.getElementById('trainer-area');
  const stickyInput   = document.getElementById('sticky-input');
  const summaryArea   = document.getElementById('summary-area');
  const addCustomBtn  = document.getElementById('add-custom-btn');
  const fileInput     = document.getElementById('file-input');
  const customInput   = document.getElementById('custom-words');
  const startBtn      = document.getElementById('start-btn');
  const modeSelect    = document.getElementById('mode-select');
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

  // ---------- Mode / Accent ----------
  let sessionMode = 'practice';
  modeSelect?.addEventListener('change', () => (sessionMode = modeSelect.value));
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
    console.warn('window.oetWords not found. Ensure /js/oet_word_list.js is included before this file.');
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
      const parsed = txt.split(/\r?\n|,|;|\t| /).map(w => w.trim()).filter(Boolean);
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
    let typed = (customInput?.value || '').trim();
    if (typed) {
      // If user forgot to press "Add Custom", accept textarea on Start
      const parsed = typed.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
      customWords = mergeUnique(customWords, parsed);
      customInput.value = '';
      markCustom();
    }

    let sessionWords = mergeUnique(baseOET.slice(), customWords);
    if (!sessionWords.length) {
      alert('No words available. Check that oet_word_list.js loaded, or add custom words.');
      return;
    }
    if (sessionMode === 'test') sessionWords = shuffle(sessionWords).slice(0, 24);

    words = sessionWords; i=0; score=0; answers=[];
    trainerArea?.classList.remove('hidden');
    stickyInput?.classList.remove('hidden');
    summaryArea?.classList.add('hidden');
    startBtn && (startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session', startBtn.classList.add('stop'));
    sessionActive = true;
    renderQ();
  }

  function renderQ() {
    if (i >= words.length) return endSession();
    const w = (words[i] || '').trim();

    trainerArea.innerHTML = `
      <div class="word-playback" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button id="hear" class="btn-secondary" title="Hear again"><i class="fas fa-volume-up"></i></button>
        <span class="indicator">Word ${i + 1}/${words.length}</span>
      </div>
      <div id="marking" class="feedback" aria-live="polite"></div>
    `;

    stickyInput.innerHTML = `
      <div class="answer-row">
        <input id="answer" type="text" placeholder="Type the spelling..." autocomplete="off"/>
        <button id="submit" class="btn-primary"><i class="fas fa-check"></i> Submit</button>
        <button id="skip" class="btn-secondary"><i class="fas fa-forward"></i> Skip</button>
      </div>
    `;

    document.getElementById('hear')?.addEventListener('click', () => speak(w));
    document.getElementById('submit')?.addEventListener('click', submit);
    document.getElementById('skip')?.addEventListener('click', () => { i++; renderQ(); });
    const answer = document.getElementById('answer');
    answer?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); submit(); }});
    setTimeout(()=>answer?.focus(), 50);

    speak(w);
    stickyInput.scrollIntoView({behavior:'smooth', block:'end'});
  }

  function submit() {
    const input = (document.getElementById('answer')?.value || '').trim();
    const w = (words[i] || '').trim();
    const ok = input.toLowerCase() === w.toLowerCase();
    answers.push({ w, input, ok });
    score += ok ? 1 : 0;

    const mark = document.getElementById('marking');
    if (mark) {
      mark.textContent = ok ? `✅ ${w}` : `❌ ${input} → ${w}`;
      mark.style.color = ok ? '#16a34a' : '#ef4444';
      mark.scrollIntoView({behavior:'smooth', block:'nearest'});
    }

    i++;
    renderQ();
  }

  function endSession() {
    sessionActive = false;
    startBtn && (startBtn.innerHTML = '<i class="fas fa-play"></i> Start', startBtn.classList.remove('stop'));
    stickyInput?.classList.add('hidden');
    summaryArea?.classList.remove('hidden');

    const correct = answers.filter(a => a.ok).length;
    summaryArea.innerHTML = `
      <div class="summary-card">
        <h3>Session Complete</h3>
        <p>Score: <strong>${correct}</strong> / ${answers.length}</p>
      </div>
    `;
    trainerArea.innerHTML = '';
  }

  // ---------- Utils ----------
  function mergeUnique(a, b){ const s = new Set([...(a||[]), ...(b||[])]); return Array.from(s); }
  function shuffle(ar){ const a = ar.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
});
