// OET typing trainer with Practice (full), Exam (24 random), unlimited custom, summary
import { oetWords } from './oet_word_list.js'; // keep your existing list module

(function () {
  const el = (id)=>document.getElementById(id);
  const startPractice = el('start-practice-btn');
  const startExam = el('start-exam-btn');
  const area = el('oet-area');
  const wordVisual = el('word-visual');
  const input = el('user-input');
  const submit = el('submit-btn');
  const next = el('next-btn');
  const flag = el('flag-btn');
  const end = el('end-session-btn');
  const live = el('live-feedback');
  const results = el('results-area');

  const ta = el('custom-words'); const fileInput = el('file-input'); const applyBtn = el('apply-words'); const note = el('cw-note');

  let words = [];
  let idx=0, incorrect=[], flagged=[];

  function setWords(list){ words=list.slice(); idx=0; incorrect=[]; flagged=[]; results.classList.add('hidden'); area.classList.remove('hidden'); update(); input.value=''; input.focus(); }
  function update(){ wordVisual.textContent=`Word ${Math.min(idx+1,words.length)} of ${words.length}`; }

  function startPracticeMode(){ setWords(oetWords); }
  function startExamMode(){ setWords(oetWords.slice().sort(()=>0.5-Math.random()).slice(0,24)); }

  function check(){
    const expected = words[idx];
    const v = (input.value||'').trim().toLowerCase();
    if(!v) return;
    const ok = v===expected.toLowerCase();
    live.style.display='block';
    live.className=`feedback ${ok?'correct':'incorrect'}`;
    live.innerHTML = ok?`✅ Correct: <b>${expected}</b>`:`❌ ${v}<br>✔ <b>${expected}</b>`;
    if(!ok) incorrect.push(expected);
    idx++; input.value=''; if(idx>=words.length) return summary();
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
    document.getElementById('restart').addEventListener('click', startPracticeMode);

    // Optional: save progress if logged in
    try {
      const user = firebase?.auth?.().currentUser;
      if (user) {
        const db = firebase.firestore();
        db.collection('oet_sessions').add({
          uid: user.uid, ts: Date.now(), total: words.length, incorrect, flagged, score
        });
      }
    } catch {}
  }

  // Events
  startPractice.addEventListener('click', startPracticeMode);
  startExam.addEventListener('click', startExamMode);
  submit.addEventListener('click', check);
  input.addEventListener('keypress', e=>{ if(e.key==='Enter'){ e.preventDefault(); check(); }});
  next.addEventListener('click', ()=>{ incorrect.push(words[idx]); idx++; (idx>=words.length)?summary():(update(),input.focus());});
  flag.addEventListener('click', ()=>{ if(idx<words.length) flagged.push(words[idx]); flag.classList.add('active'); setTimeout(()=>flag.classList.remove('active'),600);});
  end.addEventListener('click', summary);

  // Custom words (unlimited)
  function parse(text){ return text.split(/[\n,]+| {2,}/g).map(s=>s.trim()).filter(Boolean).slice(0,1000); }
  applyBtn.addEventListener('click', ()=>{ const list=parse(ta.value); if(!list.length){ note.textContent='Paste or upload words first.'; return; } setWords(list); note.textContent=`Custom list applied with ${list.length} words.`;});
  fileInput.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; ta.value=await f.text(); });

  // default landing
  // (user must click a mode to start; nothing auto-runs here for accessibility)
})();
