// Freemium School — sample + one custom list/day, 10 words/day cap, lifetime stats, visual tiles
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const startBtn = document.getElementById('start-btn');
  const startBtnDup = document.getElementById('start-btn-dup');
  const replayBtn = document.getElementById('replay-btn');
  const backspaceBtn = document.getElementById('backspace-btn');
  const practice = document.getElementById('practice-area');
  const promptEl = document.getElementById('prompt');
  const tiles = document.getElementById('word-tiles');
  const feedback = document.getElementById('feedback');
  const summary = document.getElementById('summary-area');

  const customBox = document.getElementById('custom-words');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const fileInput = document.getElementById('file-input');

  const lifeCorrectEl = document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('life-attempts');

  // Accent & TTS
  let accent = 'en-US';
  const picker = document.querySelector('.accent-picker');
  let synth = window.speechSynthesis;

  function speak(text){
    try {
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      (synth || window.speechSynthesis).speak(u);
    } catch(e){}
  }

  picker?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accent = btn.getAttribute('data-accent') || 'en-US';
    picker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // Daily cap
  const CAP = 10;
  const modeKey = 'School'; // use unique key per mode
  function todayKey(){ const d=new Date(); return `srp_daily_${modeKey}_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function getUsed(){ return parseInt(localStorage.getItem(todayKey())||'0',10); }
  function setUsed(n){ localStorage.setItem(todayKey(), String(n)); }

  // Lifetime
  function loadLife(){
    const c = parseInt(localStorage.getItem('school_life_correct')||'0',10);
    const a = parseInt(localStorage.getItem('school_life_attempts')||'0',10);
    lifeCorrectEl.textContent = c;
    lifeAttemptsEl.textContent = a;
    return {c,a};
  }
  function saveLife(c,a){
    localStorage.setItem('school_life_correct', String(c));
    localStorage.setItem('school_life_attempts', String(a));
    lifeCorrectEl.textContent = c;
    lifeAttemptsEl.textContent = a;
  }
  let {c:lifeCorrect, a:lifeAttempts} = loadLife();

  // Sample words
  let sampleWords = [];
  (async ()=>{
    try {
      const res = await fetch('school.json',{cache:'no-cache'});
      const data = await res.json();
      sampleWords = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
    } catch(e) {
      console.warn('Failed to load school.json', e);
    }
  })();

  // Custom list — allow once per day
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function canAddCustom(){ return localStorage.getItem('school_custom_date') !== todayISO(); }
  function markCustom(){ localStorage.setItem('school_custom_date', todayISO()); }

  let customWords = [];
  addCustomBtn?.addEventListener('click', ()=>{
    if (!canAddCustom()){ alert('Freemium allows one custom list per day.'); return; }
    const raw = (customBox.value||'').trim();
    if (!raw){ alert('Enter some words first.'); return; }
    const parsed = raw.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    customBox.value = '';
    markCustom();
    alert(`Added ${parsed.length} custom words.`);
  });

  fileInput?.addEventListener('change', (e)=>{
    if (!canAddCustom()){ alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f=e.target.files?.[0]; if (!f) return;
    const r=new FileReader();
    r.onload = ()=>{
      const parsed = String(r.result||'').split(/\r?\n|,|;|\t/).map(w=>w.trim()).filter(Boolean);
      customWords = mergeUnique(customWords, parsed);
      markCustom();
      alert(`Uploaded ${parsed.length} custom words.`);
    };
    r.readAsText(f);
  });

  // Session state
  let words=[], idx=0, typed='', running=false, currentWord='';

  function capList(list){
    const used = getUsed();
    if (used >= CAP){ alert(`Freemium limit reached: ${CAP} words today.`); return []; }
    const remain = CAP - used;
    return list.length > remain ? list.slice(0, remain) : list;
  }

  function startSession(){
    const merged = mergeUnique(sampleWords.slice(), customWords);
    const capped = capList(merged);
    if (!capped.length) return;

    words = capped; idx=0; typed=''; running=true;
    summary.classList.add('hidden');
    practice.classList.remove('hidden');
    renderWord();
  }

  function renderWord(){
    if (idx >= words.length){ return finish(); }
    currentWord = words[idx];
    typed = '';

    // make tiles
    tiles.innerHTML = Array.from({length: currentWord.length}).map(()=>`<div class="letter-tile">&nbsp;</div>`).join('');
    updateTiles();
    feedback.textContent = '';
    promptEl.textContent = `Word ${idx+1} — listen and type, then press Enter`;
    speak(currentWord);

    // key handling
    document.onkeydown = (e)=>{
      if (!running) return;
      if (e.key === 'Enter'){
        evaluate();
        return;
      }
      if (e.key === 'Backspace'){
        typed = typed.slice(0,-1);
        updateTiles(); return;
      }
      if (/^[a-zA-Z]$/.test(e.key)){
        if (typed.length < currentWord.length){
          typed += e.key;
          updateTiles();
        }
        return;
      }
      if (e.key === ' '){ // replay
        e.preventDefault(); speak(currentWord);
      }
    };
  }

  function updateTiles(){
    const children = tiles.children;
    for (let i=0;i<children.length;i++){
      children[i].textContent = typed[i] ? typed[i].toUpperCase() : ' ';
    }
  }

  function evaluate(){
    lifeAttempts++;
    const norm = (s)=> (s||'').trim().toLowerCase();
    if (norm(typed) === norm(currentWord)){
      lifeCorrect++;
      feedback.textContent = '✅ Correct';
    } else {
      feedback.textContent = `❌ "${typed}"  →  ${currentWord}`;
    }
    saveLife(lifeCorrect, lifeAttempts);

    setUsed(getUsed()+1);
    idx++;
    setTimeout(renderWord, 350);
  }

  function finish(){
    running=false; document.onkeydown=null;
    const correct = []; const incorrect=[];
    for (let k=0;k<idx;k++){
      // we didn't store each attempt string here (lightweight). For detailed list, you can extend to collect attempts[] like Bee.
    }
    const total = idx;
    const pct = total ? Math.round((lifeCorrect/(lifeAttempts||1))*100) : 0;

    summary.innerHTML = `
      <div class="summary-header">
        <h2>Session Summary</h2>
        <div class="score-display">${idx}/${words.length}</div>
      </div>
      <div class="results-grid">
        <div class="results-card">
          <h3>Tip</h3>
          <p>Press <strong>space</strong> to replay the word. Use <strong>Backspace</strong> to edit before pressing <strong>Enter</strong>.</p>
        </div>
        <div class="results-card">
          <h3>Progress</h3>
          <p>Lifetime accuracy: <strong>${pct}%</strong></p>
        </div>
      </div>
    `;
    practice.classList.add('hidden');
    summary.classList.remove('hidden');
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  function mergeUnique(base, add){
    const seen=new Set(base.map(w=>w.toLowerCase()));
    const out=base.slice();
    add.forEach(w=>{const k=w.toLowerCase(); if(!seen.has(k)){seen.add(k); out.push(w);}});
    return out;
  }

  // Buttons
  startBtn?.addEventListener('click', startSession);
  startBtnDup?.addEventListener('click', startSession);
  replayBtn?.addEventListener('click', ()=> currentWord && speak(currentWord));
  backspaceBtn?.addEventListener('click', ()=> {
    if (!running) return;
    typed = typed.slice(0,-1);
    updateTiles();
  });
});
