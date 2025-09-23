// Freemium School Mode — default school.json + merge custom; lifetime stats; 10/day cap
document.addEventListener('DOMContentLoaded', () => {
  const trainerArea = document.getElementById('trainer-area');
  const summaryArea = document.getElementById('summary-area');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const fileInput = document.getElementById('file-input');
  const customInput = document.getElementById('custom-words');
  const startBtn = document.getElementById('start-btn');
  const accentButtons = [document.getElementById('accent-us'), document.getElementById('accent-gb'), document.getElementById('accent-au')];

  const lifetimeAttemptsEl = document.getElementById('lifetime-attempts');
  const lifetimeCorrectEl  = document.getElementById('lifetime-correct');

  // ---- Lifetime stats helpers ----
  function getLS(k, def=0){ try{ return parseInt(localStorage.getItem(k)||def,10);}catch{ return def; } }
  function setLS(k, v){ try{ localStorage.setItem(k, String(v)); }catch{} }
  function incLS(k, by){ setLS(k, getLS(k,0)+by); }
  function refreshLifetime(){
    lifetimeAttemptsEl.textContent = getLS('srp_school_attempts', 0);
    lifetimeCorrectEl.textContent  = getLS('srp_school_correct', 0);
  }
  refreshLifetime();

  // ---- Daily cap (10 words) ----
  const FREEMIUM_MAX = 10;
  function dayKey(){
    const d = new Date();
    return `srp_daily_words_School_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function usedToday(){ return getLS(dayKey(), 0); }
  function setUsedToday(n){ setLS(dayKey(), n); }
  function capForToday(list){
    const used = usedToday();
    if (used >= FREEMIUM_MAX) { alert(`Freemium limit reached: ${FREEMIUM_MAX} words today. Come back tomorrow or upgrade to Premium.`); return []; }
    const remain = FREEMIUM_MAX - used;
    return list.length > remain ? list.slice(0, remain) : list;
  }

  // ---- Accent / TTS ----
  let accent = 'en-US';
  let synth = window.speechSynthesis;
  function speak(word){
    try{
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = accent;
      (synth||window.speechSynthesis).speak(u);
    }catch(e){}
  }
  accentButtons.forEach(btn=>{
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      accentButtons.forEach(b=>b && b.classList.remove('primary'));
      btn.classList.add('primary');
      accent = btn.dataset.accent || 'en-US';
    });
  });

  // ---- Word sources ----
  let baseSchoolWords = [];
  let customWords = [];
  (async ()=>{
    try{
      const res = await fetch('school.json', {cache:'no-cache'});
      const data = await res.json();
      baseSchoolWords = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
    }catch(e){ console.warn('Could not load school.json', e); }
  })();

  // ---- Session state ----
  let words = [];
  let i = 0;
  let correct = 0;
  let attempts = 0;
  let answers = [];
  let sessionActive = false;

  // ---- UI helpers ----
  function showTrainer(){
    summaryArea.classList.add('hidden');
    trainerArea.classList.remove('hidden');
    renderQuestion();
  }
  function showSummary(){
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
  }
  function renderQuestion(){
    if (i >= words.length) return endSession();
    const w = words[i];
    trainerArea.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
        <button class="btn-icon" id="hear"><i class="fa fa-volume-up"></i></button>
        <div>Word ${i+1}/${words.length}</div>
      </div>
      <div class="big-input">
        <label for="answer" style="font-weight:600;margin-right:6px">Type here:</label>
        <input id="answer" type="text" placeholder="Type the spelling and press Enter" autocomplete="off"/>
        <button class="btn primary" id="submit"><i class="fa fa-check"></i></button>
        <button class="btn" id="skip"><i class="fa fa-forward"></i></button>
      </div>
      <div class="flag-row"><button class="btn" id="flag"><i class="fa fa-flag"></i> Flag</button></div>
    `;
    document.getElementById('hear')?.addEventListener('click', ()=>speak(w));
    document.getElementById('submit')?.addEventListener('click', submit);
    document.getElementById('skip')?.addEventListener('click', ()=>{ answers.push(''); i++; renderQuestion(); });
    const input = document.getElementById('answer');
    input?.focus();
    input?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') submit(); });
    speak(w);
  }

  function submit(){
    const input = (document.getElementById('answer')?.value||'').trim();
    const w = (words[i]||'').trim();
    attempts++;
    if (input.toLowerCase() === w.toLowerCase()) correct++;
    answers.push(input);
    i++;
    renderQuestion();
  }

  function endSession(){
    sessionActive = false;
    // lifetime update
    incLS('srp_school_attempts', attempts);
    incLS('srp_school_correct',  correct);
    refreshLifetime();

    setUsedToday(usedToday() + words.length);

    const percent = words.length ? Math.round(correct/words.length*100) : 0;
    const wrong = words.filter((w, idx)=> (answers[idx]||'').toLowerCase() !== w.toLowerCase());
    summaryArea.innerHTML = `
      <div class="card">
        <h2>Session Results</h2>
        <div style="font-weight:700;margin:.25rem 0">${correct}/${words.length} (${percent}%)</div>
        <div class="results-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem">
          <div class="results-card" style="border:1px solid #e6e8eb;border-radius:10px;padding:.75rem">
            <h3>Correct</h3>
            <div>${words.filter((w,idx)=> (answers[idx]||'').toLowerCase()===w.toLowerCase()).map(w=>`<span class="word-item" style="display:inline-block;margin:2px;padding:.25rem .5rem;background:#eef2f7;border-radius:6px">${w}</span>`).join('')}</div>
          </div>
          <div class="results-card" style="border:1px solid #e6e8eb;border-radius:10px;padding:.75rem">
            <h3>Needs Practice</h3>
            <div>${wrong.map(w=>`<span class="word-item" style="display:inline-block;margin:2px;padding:.25rem .5rem;background:#fff3cd;border:1px solid #ffe69c;border-radius:6px">${w}</span>`).join('')}</div>
          </div>
        </div>
        <div style="margin-top:.75rem;display:flex;gap:.5rem">
          <button id="restart" class="btn primary"><i class="fa fa-redo"></i> Restart</button>
          <button id="newlist" class="btn"><i class="fa fa-sync"></i> New List</button>
        </div>
      </div>
    `;
    showSummary();
    document.getElementById('restart')?.addEventListener('click', startSession);
    document.getElementById('newlist')?.addEventListener('click', ()=>{ words=[]; i=0; attempts=0; correct=0; answers=[]; summaryArea.classList.add('hidden'); });
    // Summary Ad (if present across site)
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // ---- Build list and start ----
  function startSession(){
    // Always start from sample school.json, then merge custom if present
    const base = baseSchoolWords.slice();
    const merged = mergeUnique(base, customWords);
    let sessionWords = capForToday(merged);
    if (!sessionWords.length) { alert('No words available for today.'); return; }
    words = sessionWords;
    i=0; attempts=0; correct=0; answers=[];
    sessionActive = true;
    showTrainer();
  }

  // ---- Custom handling (still “one list per day”) ----
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function canAddCustomToday(){
    const last = localStorage.getItem('school_custom_date');
    return last !== todayStr();
  }
  function markCustomUsed(){ localStorage.setItem('school_custom_date', todayStr()); }

  addCustomBtn?.addEventListener('click', ()=>{
    if (!canAddCustomToday()) { alert('Freemium allows one custom list per day.'); return; }
    const raw = (customInput.value||'').trim();
    if (!raw) { alert('Enter some words first.'); return; }
    const parsed = raw.split(/[\s,;]+/).map(w=>w.trim()).filter(Boolean);
    customWords = mergeUnique(customWords, parsed);
    markCustomUsed();
    customInput.value = '';
    alert(`Added ${parsed.length} custom words. These will be merged with the sample list.`);
  });

  fileInput?.addEventListener('change', (e)=>{
    if (!canAddCustomToday()) { alert('Freemium allows one custom list per day.'); e.target.value=''; return; }
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const text = reader.result || '';
      const parsed = text.split(/\r?\n|,|;|\t/).map(w=>w.trim()).filter(Boolean);
      customWords = mergeUnique(customWords, parsed);
      markCustomUsed();
      alert(`Uploaded ${parsed.length} custom words. They will be merged with the sample list.`);
    };
    reader.readAsText(f);
  });

  startBtn?.addEventListener('click', startSession);

  // ---- Utils ----
  function mergeUnique(base, add){
    const seen = new Set(base.map(w=>w.toLowerCase()));
    const out = base.slice();
    add.forEach(w=>{ const k = w.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(w); }});
    return out;
  }
});
