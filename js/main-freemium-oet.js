// OET typing trainer: Practice (full), Exam (24 random), unlimited custom, live marking, summary
import { oetWords } from './oet_word_list.js';

(function () {
  const $=(id)=>document.getElementById(id);
  const startPractice=$('start-practice-btn'), startExam=$('start-exam-btn');
  const area=$('oet-area'), visual=$('word-visual'), input=$('user-input');
  const submit=$('submit-btn'), next=$('next-btn'), flag=$('flag-btn'), end=$('end-session-btn');
  const live=$('live-feedback'), results=$('results-area');
  const ta=$('custom-words'), fileIn=$('file-input'), apply=$('apply-words'), note=$('cw-note');

  let words=[], i=0, incorrect=[], flagged=[];

  function setWords(list){ words=list.slice(); i=0; incorrect=[]; flagged=[]; results.classList.add('hidden'); area.classList.remove('hidden'); update(); input.value=''; input.focus(); }
  function update(){ visual.textContent=`Word ${Math.min(i+1,words.length)} of ${words.length}`; }

  function startPracticeMode(){ setWords(oetWords); }
  function startExamMode(){ setWords(oetWords.slice().sort(()=>0.5-Math.random()).slice(0,24)); }

  function check(){
    const w=words[i]; const v=(input.value||'').trim().toLowerCase(); if(!v) return;
    const ok=v===w.toLowerCase();
    live.style.display='block'; live.className=`feedback ${ok?'correct':'incorrect'}`;
    live.innerHTML=ok?`✅ Correct: <b>${w}</b>`:`❌ ${v}<br>✔ <b>${w}</b>`;
    if(!ok) incorrect.push(w);
    i++; input.value=''; if(i>=words.length) return summary();
    update(); input.focus();
  }

  function summary(){
    area.classList.add('hidden'); results.classList.remove('hidden');
    const score=Math.round(((words.length-incorrect.length)/Math.max(1,words.length))*100);
    results.innerHTML=`
      <div class="summary-header">
        <h2>Session Complete</h2>
        <div class="score-display">${score}</div>
        <div class="score-percent">${words.length-incorrect.length}/${words.length} correct</div>
      </div>
      <div class="results-grid">
        <div class="results-card correct">
          <h3><i class="fa fa-flag"></i> Flagged</h3>
          <ul class="word-list">${(flagged.length?flagged:['– None –']).map(w=>`<li class="word-item">${w}</li>`).join('')}</ul>
        </div>
        <div class="results-card incorrect">
          <h3><i class="fa fa-xmark"></i> Incorrect</h3>
          <ul class="word-list">${(incorrect.length?incorrect:['– None –']).map(w=>`<li class="word-item">${w}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="summary-actions">
        <button id="restart" class="btn-secondary"><i class="fa fa-redo"></i> Restart</button>
        <a class="btn-primary" href="https://incandescent-kataifi-622903.netlify.app/premium.html"><i class="fa fa-crown"></i> Go Premium</a>
      </div>`;
    document.getElementById('restart').addEventListener('click', startPracticeMode);
  }

  // events
  startPractice.addEventListener('click', startPracticeMode);
  startExam.addEventListener('click', startExamMode);
  submit.addEventListener('click', check);
  input.addEventListener('keypress', e=>{ if(e.key==='Enter'){ e.preventDefault(); check(); }});
  next.addEventListener('click', ()=>{ if(i<words.length) incorrect.push(words[i]); i++; (i>=words.length)?summary():(update(),input.focus()); });
  flag.addEventListener('click', ()=>{ if(i<words.length) flagged.push(words[i]); flag.classList.add('active'); setTimeout(()=>flag.classList.remove('active'),500); });
  end.addEventListener('click', summary);

  // custom words (unlimited)
  function parse(t){ return t.split(/[\n,]+| {2,}/g).map(s=>s.trim()).filter(Boolean).slice(0,1000); }
  apply.addEventListener('click', ()=>{ const list=parse(ta.value); if(!list.length){ note.textContent='Paste or upload words first.'; return; } setWords(list); note.textContent=`Custom list applied with ${list.length} words.`; });
  fileIn.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; ta.value=await f.text(); });
})();
