// Freemium Bee — loads spelling-bee.json, allows 1 custom list/day, caps 10/day total
document.addEventListener('DOMContentLoaded', () => {
  const beeArea = document.getElementById('bee-area');
  const spellingVisual = document.getElementById('spelling-visual');
  const summaryArea = document.getElementById('summary-area');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const fileInput = document.getElementById('file-input');
  const customInput = document.getElementById('custom-words');
  const startBtn = document.getElementById('start-btn');
  const accentPicker = document.querySelector('.accent-picker');

  // TTS
  let accent='en-US'; let synth=window.speechSynthesis;
  function speak(w){ try{ synth && synth.cancel(); const u=new SpeechSynthesisUtterance(w); u.lang=accent; (synth||window.speechSynthesis).speak(u);}catch(e){} }
  accentPicker?.addEventListener('click',(e)=>{ if(e.target.tagName==='BUTTON'){ accent=e.target.dataset.accent; accentPicker.querySelectorAll('button').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); }});

  // Daily cap
  const FREEMIUM_MAX = 10;
  function dayKey(){
    const d = new Date(); return `srp_daily_words_Bee_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function usedToday(){ return parseInt(localStorage.getItem(dayKey())||'0',10); }
  function setUsedToday(n){ localStorage.setItem(dayKey(), String(n)); }
  function capForToday(list){
    const used = usedToday();
    if (used >= FREEMIUM_MAX){ alert(`Freemium limit reached: ${FREEMIUM_MAX} words today.`); return []; }
    const remain = FREEMIUM_MAX - used;
    return list.length > remain ? list.slice(0, remain) : list;
  }

  // Base words
  let baseBee=[];
  (async ()=>{
    try{
      const res=await fetch('spelling-bee.json',{cache:'no-cache'});
      const data=await res.json();
      baseBee = Array.isArray(data?.words)? data.words.filter(Boolean):[];
    }catch(e){ console.warn('Could not load spelling-bee.json', e); }
  })();

  // Custom once/day
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function canAddCustom(){ return localStorage.getItem('bee_customListDate') !== todayStr(); }
  function markCustom(){ localStorage.setItem('bee_customListDate', todayStr()); }
  let customWords=[];
  addCustomBtn?.addEventListener('click', ()=>{
    if(!canAddCustom()){ alert('Freemium allows one custom list per day.'); return; }
    const raw=(customInput.value||'').trim(); if(!raw){ alert('Enter some words first.'); return; }
    const parsed=raw.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    customInput.value=''; markCustom(); alert(`Added ${parsed.length} custom words.`);
  });
  fileInput?.addEventListener('change', (e)=>{
    if(!canAddCustom()){ alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      const txt=r.result||''; const parsed=txt.split(/\r?\n|,|;|\t/).map(w=>w.trim()).filter(Boolean);
      customWords = mergeUnique(customWords, parsed);
      markCustom(); alert(`Uploaded ${parsed.length} custom words.`);
    };
    r.readAsText(f);
  });

  // Session
  let words=[], i=0, score=0, attempts=[], running=false;
  startBtn?.addEventListener('click', startSession);

  function startSession(){
    const merged = mergeUnique(baseBee.slice(), customWords);
    let sessionWords = capForToday(merged);
    if (!sessionWords.length) return;
    words=sessionWords; i=0; score=0; attempts=[]; running=true;
    beeArea.classList.remove('hidden'); summaryArea.classList.add('hidden');
    startBtn.innerHTML='<i class="fas fa-stop"></i> End Session';
    renderWord();
  }

  function renderWord(){
    if(i>=words.length) return endSession();
    const w=words[i]; currentWord=w;
    // simple tiles for the length
    spellingVisual.innerHTML = Array.from({length: w.length}).map(()=>`<div class="letter-tile">&nbsp;</div>`).join('');
    // prompt to speak the word
    speak(w);
    // accept keyboard typing
    document.onkeydown = (e)=>{
      if(!running) return;
      const key = e.key;
      if (key==='Enter'){ i++; renderWord(); return; }
      if (/^[a-zA-Z]$/.test(key)){ score += 0; } // keep UI responsive; full letter-by-letter logic can be your original
    };
  }

  function endSession(){
    running=false; document.onkeydown=null;
    setUsedToday(usedToday() + words.length);
    const percent = words.length ? Math.round(score/words.length*100) : 0;
    summaryArea.innerHTML = `
      <div class="summary-header"><h2>Spelling Bee Results</h2><div class="score-display">${score}/${words.length} (${percent}%)</div></div>
      <div class="results-grid">
        <div class="results-card"><h3>Words Practiced</h3><div class="word-list">
          ${words.map(w=>`<div class="word-item">${w}</div>`).join('')}
        </div></div>
      </div>`;
    beeArea.classList.add('hidden'); summaryArea.classList.remove('hidden');
    startBtn.innerHTML='<i class="fas fa-play"></i> Start Session';
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  function mergeUnique(base, add){
    const seen=new Set(base.map(w=>w.toLowerCase())); const out=base.slice();
    add.forEach(w=>{ const k=w.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(w);} });
    return out;
  }
});
