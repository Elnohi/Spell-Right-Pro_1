// Typing trainer with live marking + summary + custom words (1 list/day)
(function () {
  const el = (id)=>document.getElementById(id);
  const startBtn = el('start-btn');
  const area = el('school-area');
  const wordDisplay = el('word-display');
  const input = el('user-input');
  const submit = el('submit-btn');
  const next = el('next-btn');
  const flag = el('flag-btn');
  const end = el('end-session-btn');
  const live = el('live-feedback');
  const results = el('results-area');

  const ta = el('custom-words');
  const fileInput = el('file-input');
  const applyBtn = el('apply-words');
  const note = el('cw-note');

  const CW_KEY='school_cw_last';
  function canApply(){const t=localStorage.getItem(CW_KEY); if(!t) return true; return new Date(+t).toDateString()!==new Date().toDateString();}
  function markApplied(){localStorage.setItem(CW_KEY,Date.now().toString());}

  let defaultWords = ["education","library","teacher","student","exam","lesson","pencil","knowledge"];
  let words = defaultWords.slice();
  let idx=0, incorrect=[], flagged=[];

  function update(){ wordDisplay.textContent = `Word ${Math.min(idx+1,words.length)} of ${words.length}`; }

  function start() {
    idx=0; incorrect=[]; flagged=[];
    results.classList.add('hidden');
    area.classList.remove('hidden');
    update();
    input.value=''; input.focus();
  }

  function check() {
    const expected = words[idx];
    const v = (input.value||'').trim().toLowerCase();
    if (!v) return;
    const ok = v===expected.toLowerCase();

    live.style.display='block';
    live.className = `feedback ${ok?'correct':'incorrect'}`;
    live.innerHTML = ok ? `✅ Correct: <b>${expected}</b>` : `❌ ${v}<br>✔ <b>${expected}</b>`;

    if (!ok) incorrect.push(expected);
    idx++; input.value=''; if (idx>=words.length) return summary();
    update(); input.focus();
  }

  function summary(){
    area.classList.add('hidden');
    results.classList.remove('hidden');
    const score = Math.round(((words.length-incorrect.length)/Math.max(1,words.length))*100);
    results.innerHTML = `
      <div class="summary-header">
        <h2>Session Complete</h2>
        <div class="score-display">${score}</div>
        <div class="score-percent">${words.length-incorrect.length}/${words.length} correct</div>
      </div>
      <div class="results-grid">
        <div class="results-card correct">
          <h3><i class="fa fa-flag"></i> Flagged</h3>
          <ul class="word-list">${flagged.map(w=>`<li class="word-item">${w}</li>`).join('') || '<li class="word-item">– None –</li>'}</ul>
        </div>
        <div class="results-card incorrect">
          <h3><i class="fa fa-xmark"></i> Incorrect</h3>
          <ul class="word-list">${incorrect.map(w=>`<li class="word-item">${w}</li>`).join('') || '<li class="word-item">– None –</li>'}</ul>
        </div>
      </div>
      <div class="summary-actions">
        <button id="restart" class="btn-secondary"><i class="fa fa-redo"></i> Restart</button>
        <a class="btn-primary" href="/premium.html"><i class="fa fa-crown"></i> Go Premium</a>
      </div>`;
    document.getElementById('restart').addEventListener('click',start);
  }

  // events
  startBtn.addEventListener('click', start);
  submit.addEventListener('click', check);
  input.addEventListener('keypress', e=>{ if(e.key==='Enter'){e.preventDefault();check();}});
  next.addEventListener('click', ()=>{ incorrect.push(words[idx]); idx++; (idx>=words.length)?summary():(update(),input.focus()); });
  flag.addEventListener('click', ()=>{ if(idx<words.length) flagged.push(words[idx]); flag.classList.add('active'); setTimeout(()=>flag.classList.remove('active'),600);});
  end.addEventListener('click', summary);

  // custom words
  function parse(text){ return text.split(/[\n,]+| {2,}/g).map(s=>s.trim()).filter(Boolean).slice(0,300); }
  applyBtn.addEventListener('click', ()=>{
    if(!canApply()){ note.textContent='Limit reached: one list per day on School (freemium).'; return; }
    const list = parse(ta.value); if(!list.length){ note.textContent='Paste or upload words first.'; return; }
    words = list; markApplied(); note.textContent=`Custom list applied with ${words.length} words.`; 
  });
  fileInput.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; ta.value=await f.text(); });
})();
