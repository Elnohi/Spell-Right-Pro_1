// ==================== SpellRightPro — Freemium Bee (FULL) ====================
document.addEventListener('DOMContentLoaded', () => {
  // ------- Elements -------
  const beeArea        = document.getElementById('bee-area')       || document.getElementById('practice-area');
  const visual         = document.getElementById('spelling-visual')|| document.getElementById('word-tiles');
  const summaryArea    = document.getElementById('summary-area');
  const startBtn       = document.getElementById('start-btn')      || document.getElementById('start-btn-dup');
  const accentPicker   = document.querySelector('.accent-picker');
  const fileInput      = document.getElementById('file-input');
  const addCustomBtn   = document.getElementById('add-custom-btn');
  const customInput    = document.getElementById('custom-words');
  const feedback       = document.getElementById('feedback')       || document.getElementById('bee-feedback');

  // Lifetime counters (if present)
  const lifeCorrectEl  = document.getElementById('correct-count')  || document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('attempt-count')  || document.getElementById('life-attempts');

  // ------- Firebase analytics (non-fatal if missing) -------
  function track(event, data){ try{ firebase?.analytics?.().logEvent?.(event, data||{});}catch(_e){} }

  // ------- TTS / Accent -------
  let accent = 'en-US';
  let synth  = window.speechSynthesis;

  function setAccent(a){
    accent = a || 'en-US';
  }
  function speak(text){
    try{
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      (synth || window.speechSynthesis).speak(u);
    }catch(_e){}
  }
  accentPicker?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    setAccent(btn.getAttribute('data-accent'));
    accentPicker.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if (recognition) recognition.lang = accent;
  });

  // ------- Speech Recognition -------
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = (event.results[0][0].transcript || '').trim();
      // simulate typing outcome
      attempts[idx] = transcript;
      lifeAttempts++;
      if (transcript.toLowerCase() === (currentWord||'').toLowerCase()) {
        lifeCorrect++;
        if (feedback) feedback.textContent = '✅ Correct';
      } else {
        if (feedback) feedback.textContent = `❌ "${transcript}" (correct: ${currentWord})`;
      }
      saveLife(lifeCorrect, lifeAttempts);
      idx++;
      setTimeout(renderWord, 350);
    };
    recognition.onerror = () => { /* ignore and let user type */ };
    recognition.onend = () => { /* noop */ };
  }

  // ------- Daily cap -------
  const CAP = 10;
  function todayKey(){
    const d = new Date();
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
    return `bee_cap_${y}-${m}-${da}`;
  }
  function usedToday(){ return parseInt(localStorage.getItem(todayKey())||'0',10); }
  function setUsedToday(n){ localStorage.setItem(todayKey(), String(n)); }
  function applyCap(list){
    const used = usedToday();
    if (used >= CAP){
      alert(`Freemium limit reached: ${CAP} words today.`);
      return [];
    }
    const remain = CAP - used;
    return list.length > remain ? list.slice(0, remain) : list;
  }

  // ------- Lifetime stats -------
  function loadLife(){
    const c = parseInt(localStorage.getItem('bee_life_correct')  || '0', 10);
    const a = parseInt(localStorage.getItem('bee_life_attempts') || '0', 10);
    if (lifeCorrectEl)  lifeCorrectEl.textContent  = c;
    if (lifeAttemptsEl) lifeAttemptsEl.textContent = a;
    return {c,a};
  }
  function saveLife(c,a){
    localStorage.setItem('bee_life_correct',  String(c));
    localStorage.setItem('bee_life_attempts', String(a));
    if (lifeCorrectEl)  lifeCorrectEl.textContent  = c;
    if (lifeAttemptsEl) lifeAttemptsEl.textContent = a;
  }
  let {c:lifeCorrect, a:lifeAttempts} = loadLife();

  // ------- Sample list -------
  let sampleWords = [];
  (async ()=>{
    try{
      const res = await (async()=>{try{return await fetch('/data/word-lists/spelling-bee.json', {cache: 'no-cache'});}catch(e){return await fetch('spelling-bee.json',{cache:'no-cache'});} })();
      const data = await res.json();
      sampleWords = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
    }catch(_e){
      console.warn('Could not load spelling-bee.json');
      sampleWords = [];
    }
  })();

  // ------- Custom input (one list per day) -------
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function canAddCustom(){ return localStorage.getItem('bee_custom_date') !== todayISO(); }
  function markCustom(){ localStorage.setItem('bee_custom_date', todayISO()); }

  let customWords = [];
  addCustomBtn?.addEventListener('click', ()=>{
    if (!canAddCustom()){ alert('Freemium allows one custom list per day.'); return; }
    const txt = (customInput?.value||'').trim();
    if (!txt){ alert('Enter some words first.'); return; }
    const parsed = txt.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    if (customInput) customInput.value = '';
    markCustom();
    alert(`Added ${parsed.length} words.`);
  });

  fileInput?.addEventListener('change', (e)=>{
    if (!canAddCustom()){ alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      const text   = String(r.result||'');
      const parsed = text.split(/\r?\n|,|;|\t/).map(w=>w.trim()).filter(Boolean);
      customWords  = mergeUnique(customWords, parsed);
      markCustom();
      alert(`Uploaded ${parsed.length} custom words.`);
    };
    r.readAsText(f);
  });

  // ------- State -------
  let words = [];
  let idx   = 0;
  let typed = '';
  let running = false;
  let currentWord = '';
  let attempts = [];

  function startSession(){
    // Merge sample + custom; cap by daily limit
    const merged = mergeUnique(sampleWords.slice(), customWords);
    const capped = applyCap(merged);
    if (!capped.length) return;

    words   = capped;
    idx     = 0;
    typed   = '';
    running = true;

    // Show practice area, hide summary
    beeArea?.classList.remove('hidden');
    summaryArea?.classList.add('hidden');

    // Change button (if needed)
    if (startBtn) startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';

    // First word
    renderWord();
    track('freemium_bee_start', {count: words.length});
  }

  function endSession(){
    running = false;
    document.onkeydown = null;

    // Mark daily usage
    setUsedToday( usedToday() + words.length );

    // Compute summary
    const correct = [];
    const incorrect = [];
    for (let k=0;k<attempts.length;k++){
      const a = (attempts[k]||'').toLowerCase();
      const w = (words[k]||'').toLowerCase();
      if (a === w) correct.push(words[k]); else incorrect.push({attempt: attempts[k]||'', word: words[k]});
    }
    const pct = words.length ? Math.round(correct.length/words.length*100) : 0;

    // Render summary
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${correct.length}/${words.length} (${pct}%)</div>
      </div>
      <div class="results-grid">
        <div class="results-card">
          <h3>Correct</h3>
          <div class="word-list">
            ${correct.map(w=>`<span class="word-item">${w}</span>`).join('')}
          </div>
        </div>
        <div class="results-card">
          <h3>Needs Practice</h3>
          <div class="word-list">
            ${incorrect.map(x=>`<span class="word-item" title="You: ${x.attempt}">${x.word}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    beeArea?.classList.add('hidden');
    summaryArea?.classList.remove('hidden');
    if (startBtn) startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    try{ window.injectBeeSummaryAd?.(); }catch(_e){}
    track('freemium_bee_end', {total: words.length, correct: correct.length});
  }

  function renderWord(){
    if (idx >= words.length) return endSession();

    currentWord = words[idx];
    typed = '';
    attempts[idx] = '';

    // Render tiles
    visual.innerHTML = Array.from({length: currentWord.length})
      .map(()=>`<div class="letter-tile">&nbsp;</div>`).join('');
    updateTiles();

    // Clear feedback
    if (feedback) feedback.textContent = '';

    // Speak word
    speak(currentWord);
    if (recognition) { try{ recognition.abort(); }catch(_e){} try{ recognition.start(); }catch(_e){} }

    // Key handling
    document.onkeydown = (e)=>{
      if (!running) return;

      const key = e.key;

      if (key === 'Enter'){
        // evaluate
        lifeAttempts++;
        if ((typed||'').trim().toLowerCase() === currentWord.toLowerCase()){
          lifeCorrect++;
          attempts[idx] = typed;
          if (feedback) feedback.textContent = '✅ Correct';
        } else {
          attempts[idx] = typed;
          if (feedback) feedback.textContent = `❌ "${typed}" (correct: ${currentWord})`;
        }
        saveLife(lifeCorrect, lifeAttempts);

        idx++;
        setTimeout(renderWord, 350);
        return;
      }

      if (key === 'Backspace'){
        typed = typed.slice(0,-1);
        updateTiles();
        return;
      }

      if (/^[a-zA-Z]$/.test(key)){
        if (typed.length < currentWord.length){
          typed += key;
          updateTiles();
        }
        return;
      }

      if (key === ' '){
        e.preventDefault();
        speak(currentWord);
        return;
      }
    };
  }

  function updateTiles(){
    const tiles = visual.children;
    for (let t=0; t<tiles.length; t++){
      tiles[t].textContent = typed[t] ? typed[t].toUpperCase() : ' ';
    }
  }

  // ------- Utilities -------
  function mergeUnique(base, add){
    const seen = new Set(base.map(w=>(w||'').toLowerCase()));
    const out = base.slice();
    add.forEach(w=>{
      const k = (w||'').toLowerCase();
      if (k && !seen.has(k)){ seen.add(k); out.push(w); }
    });
    return out;
  }

  // ------- Events -------
  startBtn?.addEventListener('click', ()=>{
    if (!running){ startSession(); }
    else { endSession(); }
  });

  // Nav buttons (if present in HTML)
  const prevBtn = document.getElementById('bee-prev');
  const repeatBtn = document.getElementById('bee-repeat');
  const nextBtn = document.getElementById('bee-next');
  prevBtn?.addEventListener('click', ()=>{ if (running && idx>0){ idx--; renderWord(); } });
  repeatBtn?.addEventListener('click', ()=>{ if (running && currentWord){ speak(currentWord); if (recognition){ try{ recognition.abort(); recognition.start(); }catch(_e){} } } });
  nextBtn?.addEventListener('click', ()=>{ if (running){ if (idx < words.length-1){ idx++; renderWord(); } else { endSession(); } } });

  // Attempt to set a default accent based on OS/browser pref
  try {
    const navLang = (navigator.language || 'en-US');
    if (/^en-GB/i.test(navLang)) setAccent('en-GB');
    else if (/^en-AU/i.test(navLang)) setAccent('en-AU');
    else setAccent('en-US');
  } catch(_e){}
});
