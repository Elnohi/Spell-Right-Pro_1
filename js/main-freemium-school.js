// Freemium School Mode — styled to your CSS; default school.json + merge custom; lifetime stats; 10/day
document.addEventListener('DOMContentLoaded', () => {
  const trainerArea = document.getElementById('trainer-area');
  const summaryArea = document.getElementById('summary-area');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const fileInput = document.getElementById('file-input');
  const customInput = document.getElementById('custom-words');
  const startBtn = document.getElementById('start-btn');

  // Accent
  let accent = 'en-US';
  ['accent-us','accent-gb','accent-au'].forEach(id => {
    const btn = document.getElementById(id);
    btn?.addEventListener('click', () => {
      document.querySelectorAll('.accent-picker button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      accent = btn.dataset.accent || 'en-US';
    });
  });

  // Lifetime stats
  const triesEl = document.getElementById('lifetime-attempts');
  const corrEl  = document.getElementById('lifetime-correct');
  const getN  = (k,d=0)=>{ try{return parseInt(localStorage.getItem(k)||d,10);}catch{return d;} };
  const setN  = (k,v)=>{ try{localStorage.setItem(k,String(v));}catch{} };
  const incN  = (k,by)=> setN(k, getN(k,0)+by);
  function refreshLifetime(){ triesEl.textContent=getN('srp_school_attempts',0); corrEl.textContent=getN('srp_school_correct',0); }
  refreshLifetime();

  // 10/day cap
  const MAX = 10;
  const dayKey = ()=> {
    const d=new Date(); return `srp_daily_words_School_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const usedToday  = ()=> getN(dayKey(),0);
  const setUsed    = n => setN(dayKey(), n);
  const capToday   = list => {
    const used = usedToday();
    if (used >= MAX) { alert(`Freemium limit reached: ${MAX} words today.`); return []; }
    const remain = MAX - used;
    return list.length > remain ? list.slice(0, remain) : list;
  };

  // TTS
  function speak(word){
    try{
      const s = window.speechSynthesis;
      s && s.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = accent;
      (s||window.speechSynthesis).speak(u);
    }catch(e){}
  }

  // Base sample list (always used)
  let sample = [];
  (async ()=>{
    try{
      const res = await fetch('school.json', {cache:'no-cache'});
      const data = await res.json();
      sample = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
    }catch(e){ console.warn('school.json load failed', e); }
  })();

  // Custom once per day (still merged with sample)
  const today = ()=> new Date().toISOString().slice(0,10);
  const canAddCustom = ()=> localStorage.getItem('school_custom_date') !== today();
  const markCustom   = ()=> localStorage.setItem('school_custom_date', today());
  let custom = [];

  addCustomBtn?.addEventListener('click', ()=>{
    if (!canAddCustom()) return alert('Freemium allows one custom list per day.');
    const raw = (customInput.value||'').trim();
    if (!raw) return alert('Enter some words first.');
    const parsed = raw.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
    custom = mergeUnique(custom, parsed);
    markCustom();
    customInput.value='';
    alert(`Added ${parsed.length} custom words. These will be merged with the sample list.`);
  });

  fileInput?.addEventListener('change', (e)=>{
    if (!canAddCustom()) { alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      const parsed = String(r.result||'').split(/\r?\n|,|;|\t/).map(w=>w.trim()).filter(Boolean);
      custom = mergeUnique(custom, parsed);
      markCustom();
      alert(`Uploaded ${parsed.length} custom words. They will be merged with the sample list.`);
    };
    r.readAsText(f);
  });

  // Session
  let words=[], i=0, correct=0, attempts=0, answers=[];
  startBtn?.addEventListener('click', startSession);

  function startSession(){
    // Always start from SAMPLE, then merge custom
    const base = sample.slice();
    const merged = mergeUnique(base, custom);
    words = capToday(merged);
    if (!words.length) return;
    i=0; correct=0; attempts=0; answers=[];
    summaryArea.classList.add('hidden');
    trainerArea.classList.remove('hidden');
    renderQ();
  }

  function renderQ(){
    if (i>=words.length) return endSession();
    const w = words[i];
    trainerArea.innerHTML = `
      <div class="word-progress">Word ${i+1}/${words.length}</div>
      <div class="input-group fade-in">
        <input id="answer" type="text" class="form-control" placeholder="Type the spelling and press Enter" autocomplete="off"/>
      </div>
      <div class="button-group">
        <button id="hear" class="btn-secondary"><i class="fa fa-volume-up"></i> Hear Word</button>
        <button id="submit" class="btn-primary"><i class="fa fa-check"></i> Submit</button>
        <button id="skip" class="btn-secondary"><i class="fa fa-forward"></i> Skip</button>
        <button id="flag" class="btn-secondary"><i class="fa fa-flag"></i> Flag</button>
      </div>
      <div id="feedback" class="feedback" aria-live="polite"></div>
    `;
    document.getElementById('answer')?.focus();
    document.getElementById('answer')?.addEventListener('keydown', e => { if (e.key==='Enter') submit(); });
    document.getElementById('submit')?.addEventListener('click', submit);
    document.getElementById('skip')?.addEventListener('click', ()=>{ answers.push(''); i++; renderQ(); });
    document.getElementById('hear')?.addEventListener('click', ()=> speak(w));
    document.getElementById('flag')?.addEventListener('click', ()=> alert(`Flagged: ${w}`));
    speak(w);
  }

  function submit(){
    const inputEl = document.getElementById('answer');
    const fb = document.getElementById('feedback');
    const input = (inputEl?.value||'').trim();
    const w = (words[i]||'').trim();
    attempts++;
    if (input.toLowerCase() === w.toLowerCase()) {
      correct++;
      inputEl?.classList.remove('incorrect-answer');
      inputEl?.classList.add('correct-answer');
      fb?.classList.remove('incorrect'); fb?.classList.add('correct'); if (fb) fb.textContent = 'Correct!';
      setTimeout(()=>{ i++; renderQ(); }, 400);
    } else {
      inputEl?.classList.remove('correct-answer');
      inputEl?.classList.add('incorrect-answer');
      fb?.classList.remove('correct'); fb?.classList.add('incorrect'); if (fb) fb.textContent = `Incorrect. Correct spelling: ${w}`;
      setTimeout(()=>{ i++; renderQ(); }, 700);
    }
  }

  function endSession(){
    // lifetime
    incN('srp_school_attempts', attempts);
    incN('srp_school_correct',  correct);
    refreshLifetime();

    setUsed(usedToday() + words.length);

    const pct = words.length ? Math.round(correct/words.length*100) : 0;
    const wrong = words.filter((w,idx)=> (answers[idx]||'').toLowerCase() !== w.toLowerCase());
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${correct}/${words.length}</div>
        <div class="score-percent">${pct}%</div>
      </div>
      <div class="results-grid">
        <div class="results-card correct">
          <h3><i class="fa fa-check-circle"></i> Correct</h3>
          <div class="score-number">${correct}</div>
          <div class="word-list">
            ${words.filter((w,idx)=> (answers[idx]||'').toLowerCase()===w.toLowerCase()).map(w=>`<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
        <div class="results-card incorrect">
          <h3><i class="fa fa-times-circle"></i> Needs Practice</h3>
          <div class="score-number">${wrong.length}</div>
          <div class="word-list">
            ${wrong.map(w=>`<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
      </div>
      <div class="summary-actions">
        <button id="restart" class="btn-secondary"><i class="fa fa-redo"></i> Restart</button>
        <button id="newlist" class="btn-secondary"><i class="fa fa-sync"></i> New List</button>
      </div>
    `;
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    document.getElementById('restart')?.addEventListener('click', startSession);
    document.getElementById('newlist')?.addEventListener('click', ()=>{ summaryArea.classList.add('hidden'); });
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // utils
  function mergeUnique(base, add){
    const seen = new Set(base.map(w=>w.toLowerCase()));
    const out = base.slice();
    add.forEach(w=>{ const k=w.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(w);} });
    return out;
  }
});
