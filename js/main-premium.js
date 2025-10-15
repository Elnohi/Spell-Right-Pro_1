/* ======================================================
   Premium tabs (Bee / School / OET)
   - Switch without page reload
   - Remembers last tab (localStorage 'premiumTab')
   - Bee voice recognition; School/OET typed input
   - Clear input immediately after marking
   - OET uses window.OET_WORDS; Exam = 24 random
====================================================== */
(function(){
  "use strict";

  // ----- tabs -----
  const tabs = [
    {btn:'#tabBee',    sec:'#secBee',    key:'bee'},
    {btn:'#tabSchool', sec:'#secSchool', key:'school'},
    {btn:'#tabOet',    sec:'#secOet',    key:'oet'}
  ];
  function q(s){ return document.querySelector(s); }
  function activate(key){
    tabs.forEach(t=>{
      q(t.btn).classList.toggle('active', t.key===key);
      q(t.sec).classList.toggle('active', t.key===key);
    });
    localStorage.setItem('premiumTab', key);
  }
  tabs.forEach(t=> q(t.btn).addEventListener('click', ()=>activate(t.key)));
  activate(localStorage.getItem('premiumTab') || 'bee');

  // ---- shared helpers ----
  const sanitize = (w)=> (w||'').toString().trim().toLowerCase().replace(/[.,!?;:'"()]/g,'');
  const speak = (t)=>{ try {
    if (!("speechSynthesis" in window) || !t) return;
    const u=new SpeechSynthesisUtterance(t); u.rate=0.96; u.pitch=1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch{} };

  function summaryBox(container, correct, attempts, incorrect, flags){
    container.innerHTML = `
      <div class="summary-header">
        <h2>Session complete</h2>
        <div class="score-percent">${correct}/${attempts} correct</div>
      </div>
      <div class="results-grid">
        <div class="results-card incorrect">
          <h3><i class="fa fa-xmark"></i> Incorrect (${incorrect.length})</h3>
          <div class="word-list">${incorrect.map(w=>`<div class="word-item">${w}</div>`).join('') || '<em>None</em>'}</div>
        </div>
        <div class="results-card">
          <h3><i class="fa fa-flag"></i> Flagged (${flags.length})</h3>
          <div class="word-list">${flags.map(w=>`<div class="word-item">${w}</div>`).join('') || '<em>None</em>'}</div>
        </div>
      </div>`;
  }

  // ---- Bee (voice) ----
  (function Bee(){
    const els = {
      start: q('#beeStart'), say:q('#beeSay'), flag:q('#beeFlag'), end:q('#beeEnd'),
      feedback:q('#beeFeedback'), progress:q('#beeProgress'), summary:q('#beeSummary'),
      custom:q('#beeCustom'), file:q('#beeFile'), load:q('#beeLoad')
    };
    let master=[], list=[], idx=0, correct=0, attempts=0, incorrect=[], flags=new Set();
    const rec = window.AudioGuards?.getRecognition?.(); if (rec){ rec.interimResults=false; rec.maxAlternatives=1; rec.lang='en-US'; }

    async function loadList(){
      if (master.length) return;
      try{
        const res = await fetch('/data/word-lists/spelling-bee.json', {cache:'no-store'});
        const data = await res.json();
        master = (Array.isArray(data?.words)?data.words:Array.isArray(data)?data:[]).filter(Boolean);
      }catch{ master = ['accommodate','rhythm','occurrence','necessary','embarrass']; }
    }
    function start(){
      if (!master.length){ els.feedback.textContent='No words available.'; return; }
      list = master.slice(); idx=0; correct=0; attempts=0; incorrect.length=0; flags.clear();
      els.summary.innerHTML='';
      speak(list[idx]); // do not show on screen
      if (rec){ try{ rec.stop(); }catch{} setTimeout(()=>{ try{ rec.start(); }catch{} }, 250); }
      showProgress();
    }
    function showProgress(){ els.progress.textContent = `Word ${Math.min(idx+1,list.length)} of ${list.length}`; }
    function grade(heard){
      const t = list[idx]; attempts++;
      const ok = sanitize(heard) === sanitize(t);
      if (ok){ correct++; els.feedback.textContent='✅ Correct'; }
      else   { incorrect.push(t); els.feedback.textContent=`❌ Incorrect — ${t}`; }
      setTimeout(next, 500);
    }
    function next(){
      if (idx<list.length-1){ idx++; speak(list[idx]); if(rec){ try{rec.stop();}catch{} try{rec.start();}catch{} } showProgress(); }
      else end();
    }
    function end(){
      summaryBox(els.summary, correct, attempts, incorrect, [...flags]);
    }
    function useCustom(arr){ master = arr.slice(); els.feedback.textContent='Custom list loaded. Press Start.'; }

    // events
    els.start?.addEventListener('click', async ()=>{ await loadList(); start(); });
    els.say?.addEventListener('click', ()=>{ speak(list[idx]); if(rec){ try{rec.stop();}catch{} try{rec.start();}catch{} }});
    els.flag?.addEventListener('click', ()=>{ const w=list[idx]; if(!w)return; if(flags.has(w)){flags.delete(w); els.feedback.textContent=`🚩 Removed flag on “${w}”`;} else {flags.add(w); els.feedback.textContent=`🚩 Flagged “${w}”`; }});
    els.end?.addEventListener('click', end);
    els.load?.addEventListener('click', ()=>{
      const txt=(els.custom?.value||'').trim(); if(!txt) return alert('Paste words first or upload a file.');
      const arr = txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean); if(!arr.length) return alert('No valid words found.');
      useCustom(arr);
    });
    els.file?.addEventListener('change', async (e)=>{
      const f=e.target.files&&e.target.files[0]; if(!f) return;
      const text = await f.text(); const arr=text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length) return alert('No valid words in file.'); useCustom(arr);
    });

    if (rec){
      rec.onresult = (evt)=>{ const heard = evt.results[0][0].transcript||''; grade(heard); };
      rec.onerror  = ()=>{ els.feedback.textContent='⚠️ Mic error. Tap “Say Again” to retry.'; };
    }
  })();

  // ---- School (typed) ----
  (function School(){
    const els = {
      start:q('#schoolStart'), submit:q('#schoolSubmit'), flag:q('#schoolFlag'), end:q('#schoolEnd'),
      input:q('#schoolAnswer'), feedback:q('#schoolFeedback'), progress:q('#schoolProgress'), summary:q('#schoolSummary'),
      custom:q('#schoolCustom'), file:q('#schoolFile'), load:q('#schoolLoad')
    };
    let master=[], list=[], idx=0, correct=0, attempts=0, incorrect=[], flags=new Set();

    async function loadList(){
      if (master.length) return;
      try{
        const res = await fetch('/data/word-lists/school.json', {cache:'no-store'});
        const data = await res.json();
        master = (Array.isArray(data?.words)?data.words:Array.isArray(data)?data:[]).filter(Boolean);
      }catch{ master = ['apple','banana','computer','library','mountain']; }
    }
    function start(){
      if (!master.length){ els.feedback.textContent='No words available.'; return; }
      list = master.slice(); idx=0; correct=0; attempts=0; incorrect.length=0; flags.clear();
      els.summary.innerHTML=''; speak(list[idx]); show();
    }
    function show(){ els.progress.textContent=`Word ${idx+1} of ${list.length}`; els.input?.focus(); }
    function grade(){
      const t=list[idx]; const typed=(els.input?.value||'').trim();
      const ok = sanitize(typed)===sanitize(t); attempts++;
      if (ok){ correct++; els.feedback.textContent='✅ Correct'; }
      else   { incorrect.push(t); els.feedback.textContent=`❌ Incorrect — ${t}`; }
      if (els.input) els.input.value='';
      setTimeout(next, 500);
    }
    function next(){
      if (idx<list.length-1){ idx++; speak(list[idx]); show(); }
      else end();
    }
    function end(){ summaryBox(els.summary, correct, attempts, incorrect, [...flags]); }
    function useCustom(arr){ master=arr.slice(); els.feedback.textContent='Custom list loaded. Press Start.'; }

    els.start?.addEventListener('click', async ()=>{ await loadList(); start(); });
    els.submit?.addEventListener('click', grade);
    els.input?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); grade(); }});
    els.flag?.addEventListener('click', ()=>{ const w=list[idx]; if(!w)return; if(flags.has(w)){flags.delete(w); els.feedback.textContent=`🚩 Removed flag on “${w}”`;} else {flags.add(w); els.feedback.textContent=`🚩 Flagged “${w}”`; }});
    els.end?.addEventListener('click', end);
    els.load?.addEventListener('click', ()=>{
      const txt=(els.custom?.value||'').trim(); if(!txt) return alert('Paste words first or upload a file.');
      const arr = txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean); if(!arr.length) return alert('No valid words found.');
      useCustom(arr);
    });
    els.file?.addEventListener('change', async (e)=>{
      const f=e.target.files&&e.target.files[0]; if(!f) return;
      const text = await f.text(); const arr=text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length) return alert('No valid words in file.'); useCustom(arr);
    });
  })();

  // ---- OET (typed, practice/exam) ----
  (function OET(){
    const els = {
      practice:q('#oetPractice'), exam:q('#oetExam'),
      start:q('#oetStart'), submit:q('#oetSubmit'), flag:q('#oetFlag'), end:q('#oetEnd'),
      input:q('#oetAnswer'), feedback:q('#oetFeedback'), progress:q('#oetProgress'), summary:q('#oetSummary'),
      custom:q('#oetCustom'), file:q('#oetFile'), load:q('#oetLoad')
    };
    let master=[], list=[], idx=0, correct=0, attempts=0, incorrect=[], flags=new Set();
    let exam=false;

    async function loadList(){
      if (master.length) return;
      if (Array.isArray(window.OET_WORDS) && window.OET_WORDS.length){ master = window.OET_WORDS.slice(); }
      else { master = ['abdomen','anemia','antibiotic','artery','asthma','biopsy','catheter','diagnosis','embolism','fracture']; }
    }
    function start(){
      if (!master.length){ els.feedback.textContent='No words available.'; return; }
      const base = master.slice();
      if (exam){ base.sort(()=>Math.random()-0.5); list = base.slice(0,24); }
      else list = base;
      idx=0; correct=0; attempts=0; incorrect.length=0; flags.clear();
      els.summary.innerHTML=''; speak(list[idx]); show();
    }
    function show(){ els.progress.textContent=`Word ${idx+1} of ${list.length}`; els.input?.focus(); }
    function grade(){
      const t=list[idx]; const typed=(els.input?.value||'').trim();
      const ok = sanitize(typed)===sanitize(t); attempts++;
      if (ok){ correct++; els.feedback.textContent='✅ Correct'; }
      else   { incorrect.push(t); els.feedback.textContent=`❌ Incorrect — ${t}`; }
      if (els.input) els.input.value='';
      setTimeout(next, 500);
    }
    function next(){ if(idx<list.length-1){ idx++; speak(list[idx]); show(); } else end(); }
    function end(){ summaryBox(els.summary, correct, attempts, incorrect, [...flags]); }
    function useCustom(arr){ master=arr.slice(); els.feedback.textContent='Custom list loaded. Press Start.'; }

    els.practice?.addEventListener('click', ()=>{ exam=false; els.feedback.textContent='Practice mode selected.'; });
    els.exam?.addEventListener('click', ()=>{ exam=true;  els.feedback.textContent='Exam mode (24) selected.'; });

    els.start?.addEventListener('click', async ()=>{ await loadList(); start(); });
    els.submit?.addEventListener('click', grade);
    els.input?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); grade(); }});
    els.flag?.addEventListener('click', ()=>{ const w=list[idx]; if(!w)return; if(flags.has(w)){flags.delete(w); els.feedback.textContent=`🚩 Removed flag on “${w}”`;} else {flags.add(w); els.feedback.textContent=`🚩 Flagged “${w}”`; }});
    els.end?.addEventListener('click', end);
    els.load?.addEventListener('click', ()=>{
      const txt=(els.custom?.value||'').trim(); if(!txt) return alert('Paste words first or upload a file.');
      const arr = txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean); if(!arr.length) return alert('No valid words found.');
      useCustom(arr);
    });
    els.file?.addEventListener('change', async (e)=>{
      const f=e.target.files&&e.target.files[0]; if(!f) return;
      const text = await f.text(); const arr=text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length) return alert('No valid words in file.'); useCustom(arr);
    });
  })();

})();
