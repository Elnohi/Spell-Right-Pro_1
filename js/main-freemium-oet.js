// ==================== SpellRightPro Freemium OET ====================
document.addEventListener('DOMContentLoaded', () => {
  const trainerArea = document.getElementById('trainer-area');
  const summaryArea = document.getElementById('summary-area');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const fileInput = document.getElementById('file-input');
  const customInput = document.getElementById('custom-words');
  const startBtn = document.getElementById('start-btn');
  const practiceBtn = document.getElementById('practice-mode-btn');
  const testBtn = document.getElementById('test-mode-btn');
  const modeSwitchBtn = document.getElementById('mode-switch-btn');
  const accentPicker = document.querySelector('.accent-picker');

  // TTS
  let accent = 'en-US';
  let synth = window.speechSynthesis;
  function speak(w){
    try {
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(w);
      u.lang = accent;
      (synth||window.speechSynthesis).speak(u);
    } catch(e){}
  }

  // Mode
  let sessionMode = 'practice';
  practiceBtn?.addEventListener('click', ()=> sessionMode='practice');
  testBtn?.addEventListener('click', ()=> sessionMode='test');
  modeSwitchBtn?.addEventListener('click', ()=> sessionMode = sessionMode==='practice' ? 'test' : 'practice');
  accentPicker?.addEventListener('click', (e)=>{
    if(e.target.tagName==='BUTTON'){
      accent=e.target.dataset.accent;
      accentPicker.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
    }
  });

  // Daily cap (10)
  const FREEMIUM_MAX = 10;
  function dayKey(){
    const d = new Date();
    return `srp_daily_words_OET_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function usedToday(){ return parseInt(localStorage.getItem(dayKey())||'0',10); }
  function setUsedToday(n){ localStorage.setItem(dayKey(), String(n)); }
  function capForToday(list){
    const used = usedToday();
    if (used >= FREEMIUM_MAX){
      alert(`Freemium limit reached: ${FREEMIUM_MAX} words today.`);
      return [];
    }
    const remain = FREEMIUM_MAX - used;
    return list.length > remain ? list.slice(0, remain) : list;
  }

  // Base OET words via oet.json
  let baseOET = [];
  (async ()=>{
    try{
      const res = await fetch('/data/word-lists/oet.json', {cache: 'no-cache'});
      const data = await res.json();
      baseOET = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
    }catch(e){ console.warn('Could not load oet.json', e); }
  })();

  // Custom once/day
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function canAddCustom(){ return localStorage.getItem('oet_customListDate') !== todayStr(); }
  function markCustom(){ localStorage.setItem('oet_customListDate', todayStr()); }

  let customWords = [];
  addCustomBtn?.addEventListener('click', ()=>{
    if (!canAddCustom()){ alert('Freemium allows one custom list per day.'); return; }
    const raw = (customInput.value||'').trim();
    if (!raw){ alert('Enter some words first.'); return; }
    const parsed = raw.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    customInput.value = '';
    markCustom();
    alert(`Added ${parsed.length} custom words.`);
  });
  fileInput?.addEventListener('change', (e)=>{
    if (!canAddCustom()){ alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      const txt = r.result||'';
      const parsed = txt.split(/\r?\n|,|;|\t/).map(w=>w.trim()).filter(Boolean);
      customWords = mergeUnique(customWords, parsed);
      markCustom();
      alert(`Uploaded ${parsed.length} custom words.`);
    };
    r.readAsText(f);
  });

  // Session
  let words=[], i=0, score=0, answers=[];
  startBtn?.addEventListener('click', startSession);

  function startSession(){
    const base = baseOET.slice();
    const merged = mergeUnique(base, customWords);
    let sessionWords = merged;
    if (sessionMode==='test') sessionWords = shuffle(sessionWords).slice(0,24);
    sessionWords = capForToday(sessionWords);
    if (!sessionWords.length) return;
    words=sessionWords; i=0; score=0; answers=[];
    trainerArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    renderQ();
  }

  function renderQ(){
    if (i>=words.length) return endSession();
    const w = words[i];
    trainerArea.innerHTML = `
      <div class="word-playback"><button id="hear" class="btn-icon" title="Hear again"><i class="fas fa-volume-up"></i></button>
        <span class="indicator">Word ${i+1}/${words.length}</span></div>
      <div class="answer-row">
        <input id="answer" type="text" placeholder="Type the spelling..." autocomplete="off"/>
        <button id="submit" class="btn-primary"><i class="fas fa-check"></i> Submit</button>
        <button id="skip" class="btn-secondary"><i class="fas fa-forward"></i> Skip</button>
      </div>`;
    document.getElementById('hear')?.addEventListener('click', ()=>speak(w));
    document.getElementById('submit')?.addEventListener('click', submit);
    document.getElementById('skip')?.addEventListener('click', ()=>{ answers.push(''); i++; renderQ(); });
    const input = document.getElementById('answer'); input?.focus();
    input?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') submit(); });
    speak(w);
  }

  function submit(){
    const input = (document.getElementById('answer')?.value||'').trim();
    const w = (words[i]||'').trim();
    if (input.toLowerCase() === w.toLowerCase()) score++;
    answers.push(input);
    i++;
    renderQ();
  }

  function endSession(){
    setUsedToday(usedToday() + words.length);
    const wrong = words.filter((w,idx)=> (answers[idx]||'').toLowerCase() !== w.toLowerCase());
    const percent = words.length ? Math.round(score/words.length*100) : 0;
    summaryArea.innerHTML = `
      <div class="summary-header"><h2>Session Results</h2><div class="score-display">${score}/${words.length} (${percent}%)</div></div>
      <div class="results-grid">
        <div class="results-card"><h3>Correct</h3><div class="word-list">
          ${words.filter((w,idx)=> (answers[idx]||'').toLowerCase()===w.toLowerCase()).map(w=>`<div class="word-item">${w}</div>`).join('')}
        </div></div>
        <div class="results-card"><h3>Needs Practice</h3><div class="word-list">
          ${wrong.map(w=>`<div class="word-item">${w}</div>`).join('')}
        </div></div>
      </div>`;
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // utils
  function mergeUnique(base, add){
    const seen = new Set(base.map(w=>w.toLowerCase()));
    const out = base.slice();
    add.forEach(w=>{
      const k = w.toLowerCase();
      if(!seen.has(k)){ seen.add(k); out.push(w); }
    });
    return out;
  }
  function shuffle(a){
    const arr=a.slice();
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }
});
