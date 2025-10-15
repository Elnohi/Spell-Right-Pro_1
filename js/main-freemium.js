/* ==========================================================================
   SpellRightPro – Unified Freemium Modes (Bee / School / OET)
   - Custom list loader button
   - Auto-advance & Enter-to-submit
   - Clear input immediately after marking
   - Bee hides target word (voice only)
   - OET Practice=full list, Exam=24 random (from /js/oet_word_list.js if present)
   - Dark mode respected (from localStorage 'dark')
   ========================================================================== */
(() => {
  "use strict";

  const MODE = (document.body && document.body.dataset.mode) ||
               (location.pathname.includes("bee") ? "bee" :
                location.pathname.includes("school") ? "school" :
                location.pathname.includes("oet") ? "oet" : "school");

  // picks
  const $ = (s) => document.querySelector(s);
  const els = {
    input:   $('#answer'),
    start:   $('#start'),
    submit:  $('#submit'),
    flag:    $('#flag'),
    end:     $('#end'),
    say:     $('#say'),
    progress:$('#progress'),
    feedback:$('#feedback'),
    summary: $('.summary-area'),
    // custom
    customBox: $('#customWords'),
    fileInput: $('#file-input'),
    useCustom: $('#useCustomList'),
    // OET tabs
    tabPractice: $('#tabPractice'),
    tabExam:     $('#tabExam'),
  };

  // state
  let masterList = [];      // underlying mode list
  let sessionList = [];     // active run list
  let idx = 0;
  let correct = 0;
  let attempts = 0;
  const incorrectWords = [];
  const flagged = new Set();
  let isExam = false;

  // ---- helpers
  const sanitize = (w) => (w||'').toString().trim().toLowerCase().replace(/[.,!?;:'"()]/g,'');
  const speak = (t) => { try {
    if (!("speechSynthesis" in window) || !t) return;
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 0.96; u.pitch = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {} };

  function showProgress(){
    if (!els.progress) return;
    const total = sessionList.length;
    els.progress.textContent = total ? `Word ${Math.min(idx+1,total)} of ${total}` : '';
  }

  function showFeedback(msg, ok=null){
    if (!els.feedback) return;
    els.feedback.textContent = msg || '';
    els.feedback.classList.remove('correct','incorrect');
    if (ok===true) els.feedback.classList.add('correct');
    if (ok===false) els.feedback.classList.add('incorrect');
  }

  function endSession(){
    const inc = incorrectWords.slice();
    const flg = [...flagged];
    const html = `
      <div class="summary-header">
        <h2>Session complete</h2>
        <div class="score-percent">${correct}/${attempts} correct</div>
      </div>
      <div class="results-grid">
        <div class="results-card incorrect">
          <h3><i class="fa fa-xmark"></i> Incorrect (${inc.length})</h3>
          <div class="word-list">${inc.map(w=>`<div class="word-item">${w}</div>`).join('') || '<em>None</em>'}</div>
        </div>
        <div class="results-card">
          <h3><i class="fa fa-flag"></i> Flagged (${flg.length})</h3>
          <div class="word-list">${flg.map(w=>`<div class="word-item">${w}</div>`).join('') || '<em>None</em>'}</div>
        </div>
      </div>
      <div class="summary-actions">
        <a class="btn-secondary" href="/index.html"><i class="fa fa-home"></i> Home</a>
      </div>
    `;
    els.summary && (els.summary.innerHTML = html, els.summary.classList.remove('hidden'));
  }

  function gradeTyped(target, typed){
    const ok = sanitize(typed) === sanitize(target);
    attempts++;
    if (ok) { correct++; showFeedback('✅ Correct', true); }
    else    { showFeedback(`❌ Incorrect — ${target}`, false); incorrectWords.push(target); }
    // clear input immediately after mark
    if (els.input) { els.input.value = ''; }
    return ok;
  }

  async function playWord(){
    if (!sessionList.length) return;
    const current = sessionList[idx];
    showProgress();
    // Bee: do NOT reveal the word on screen (voice only)
    if (MODE === 'bee') { speak(current); }
    else { speak(current); }
  }

  function nextWord(auto=false){
    if (!sessionList.length) return;
    if (idx < sessionList.length-1){
      idx++;
      playWord();
    } else {
      endSession();
    }
  }

  function flagWord(){
    const w = sessionList[idx];
    if (!w) return;
    if (flagged.has(w)) { flagged.delete(w); showFeedback(`🚩 Removed flag on “${w}”`); }
    else { flagged.add(w); showFeedback(`🚩 Flagged “${w}”`); }
  }

  // ---- Custom list loader
  function applyCustomList(list){
    masterList = list.slice();
    sessionList = masterList.slice();
    idx = 0; correct = 0; attempts = 0; incorrectWords.length=0; flagged.clear();
    els.summary?.classList.add('hidden');
    showFeedback('Custom list loaded. Press Start.');
    showProgress();
  }

  function parseTextarea(txt){
    return txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  }

  function attachCustomHandlers(){
    els.useCustom?.addEventListener('click', ()=>{
      const txt = (els.customBox?.value||'').trim();
      if (!txt) { alert('Paste words first or upload a file.'); return; }
      const list = parseTextarea(txt);
      if (list.length===0) { alert('No valid words found.'); return; }
      applyCustomList(list);
    });

    els.fileInput?.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const text = await f.text();
      const list = parseTextarea(text);
      if (list.length===0) { alert('No valid words in file.'); return; }
      applyCustomList(list);
    });
  }

  // ---- OET list
  async function loadModeList(){
    if (masterList.length) return;
    if (MODE === 'bee'){
      // Spelling Bee built-in JSON
      try{
        const res = await fetch('/data/word-lists/spelling-bee.json', {cache:'no-store'});
        const data = await res.json();
        const arr = Array.isArray(data?.words) ? data.words : (Array.isArray(data)?data:[]);
        masterList = arr.filter(Boolean);
      }catch(e){
        masterList = ['accommodate','rhythm','occurrence','necessary','embarrass','challenge','definitely','separate','recommend','privilege'];
      }
    } else if (MODE === 'oet'){
      // from /js/oet_word_list.js -> window.OET_WORDS
      if (Array.isArray(window.OET_WORDS) && window.OET_WORDS.length){
        masterList = window.OET_WORDS.slice();
      } else {
        // fallback
        masterList = ['abdomen','anemia','antibiotic','artery','asthma','biopsy','catheter','diagnosis','embolism','fracture'];
      }
    } else {
      // school sample list
      try{
        const res = await fetch('/data/word-lists/school.json', {cache:'no-store'});
        const data = await res.json();
        const arr = Array.isArray(data?.words) ? data.words : (Array.isArray(data)?data:[]);
        masterList = arr.filter(Boolean);
      }catch(e){
        masterList = ['apple','banana','computer','dictionary','elephant','garden','hospital','important','library','mountain'];
      }
    }
  }

  // Session preparation
  function startSession(){
    if (!masterList.length){ showFeedback('No words available.'); return; }
    if (MODE==='oet' && isExam){
      // 24 random
      const shuffled = masterList.slice().sort(()=>Math.random()-0.5);
      sessionList = shuffled.slice(0,24);
    } else {
      sessionList = masterList.slice();
    }
    idx = 0; correct = 0; attempts = 0; incorrectWords.length=0; flagged.clear();
    els.summary?.classList.add('hidden');
    showFeedback('🎧 Listen carefully…');
    playWord();
  }

  // events
  els.start?.addEventListener('click', async ()=>{
    await loadModeList();
    startSession();
  });

  // Bee speech recognition
  function attachBeeRecognition(){
    if (MODE!=='bee') return;
    const rec = window.AudioGuards?.getRecognition?.();
    if (!rec) return;
    rec.interimResults = false; rec.maxAlternatives = 1; rec.lang = 'en-US';

    function doListen(){
      try { rec.stop(); } catch {}
      try { rec.start(); } catch {}
    }

    // we listen automatically after speaking; also on say-again
    els.say?.addEventListener('click', ()=>{ playWord(); setTimeout(doListen, 250); });

    // Start will speak + then listen
    els.start?.addEventListener('click', ()=> setTimeout(doListen, 350));

    rec.onresult = (evt)=>{
      const heard = (evt.results[0] && evt.results[0][0] && evt.results[0][0].transcript) || '';
      const target = sessionList[idx];
      gradeTyped(target, heard);
      // Auto-advance after a short pause
      setTimeout(nextWord, 600);
    };
    rec.onerror = ()=>{ showFeedback('⚠️ Mic error. Tap “Say Again” to retry.'); };
  }

  // typing submit (School & OET; also works if Bee uses typing fallback)
  els.submit?.addEventListener('click', ()=>{
    const target = sessionList[idx];
    if (!target) return;
    const typed = (els.input?.value||'').trim();
    gradeTyped(target, typed);
    setTimeout(nextWord, 500);
    els.input?.focus();
  });
  els.input?.addEventListener('keydown', (e)=>{
    if (e.key==='Enter'){ e.preventDefault(); els.submit?.click(); }
  });

  els.flag?.addEventListener('click', flagWord);
  els.end?.addEventListener('click', endSession);

  // OET tabs
  els.tabPractice?.addEventListener('click', ()=>{ isExam=false; els.tabPractice.classList.add('active'); els.tabExam?.classList.remove('active'); showFeedback('Practice mode selected.'); });
  els.tabExam?.addEventListener('click', ()=>{ isExam=true; els.tabExam.classList.add('active'); els.tabPractice?.classList.remove('active'); showFeedback('Exam mode (24) selected.'); });

  // custom handlers
  attachCustomHandlers();

  // Bee recognition setup
  attachBeeRecognition();

  // make input comfortably large on mobile
  if (els.input) { els.input.style.minHeight = '56px'; els.input.style.fontSize='18px'; }

})();
