/* /js/main-freemium-bee.js */
(() => {
  const $ = s => document.querySelector(s);
  const els = {
    start:  $('[data-action="start"], #btnStart, .btn-start') || [...document.querySelectorAll('button')].find(b=>/^\s*start\s*$/i.test(b.textContent)),
    next:   $('[data-action="next"],  #btnNext'),
    prev:   $('[data-action="prev"],  #btnPrev'),
    flag:   $('[data-action="flag"],  #btnFlag'),
    end:    $('[data-action="end"],   #btnEnd'),
    say:    $('[data-action="say"],   #btnSayAgain, .btn-say'),
    progress: $('[data-role="progress"], .word-progress') || (()=>{
      const d=document.createElement('div'); d.setAttribute('data-role','progress'); d.style.fontWeight='700'; d.style.margin='8px 0 4px';
      (document.querySelector('.training-card')||document.body).prepend(d); return d;
    })(),
    feedback: $('[data-role="feedback"], .feedback') || (()=>{
      const d=document.createElement('div'); d.setAttribute('data-role','feedback'); d.style.minHeight='22px'; d.style.marginTop='10px';
      (document.querySelector('.training-card')||document.body).appendChild(d); return d;
    })()
  };

  const LIST = '/data/word-lists/spelling-bee.json';
  const FALLBACK = ['accommodate','rhythm','occurrence','necessary','embarrass','challenge','definitely','separate','recommend','privilege'];

  const state = { words:[], i:0, flags:new Set(), correct:[], incorrect:[], active:false, recognizing:false };

  function t(el,s){ if(el) el.textContent=s; }
  const norm = s => (s||'').toLowerCase().replace(/[^\p{L}]+/gu,'');

  async function loadWords(){
    try{
      const r = await fetch(`${LIST}?v=${Date.now()}`, {cache:'no-store'});
      if(!r.ok) throw 0; const j = await r.json();
      const arr = Array.isArray(j?.words)? j.words : Array.isArray(j) ? j : [];
      return arr.length?arr:FALLBACK;
    }catch(_){ return FALLBACK; }
  }
  function show(){ const n=state.words.length; t(els.progress, `Word ${Math.min(state.i+1,n)} of ${n}`); }
  async function speak(w){ await window.AudioGuards?.speakOnce(w, {rate:0.92}); }

  async function listen(w){
    const rec = window.AudioGuards?.getRecognition();
    if(!rec){ t(els.feedback,'🎤 Speech not supported in this browser.'); return; }
    if(state.recognizing) return;
    state.recognizing=true;

    let ok=false, got=false;
    const timer=setTimeout(()=>{ if(!got){ t(els.feedback,'⏱️ No speech heard. Tap "Say Again" or Next.'); state.recognizing=false; }}, 7000);

    rec.onresult=(e)=>{ got=true;
      const said = e.results[0][0].transcript||'';
      ok = norm(said)===norm(w);
      if(ok){ t(els.feedback,'✅ Correct'); state.correct.push(w); }
      else  { t(els.feedback,`❌ Incorrect — ${w}`); state.incorrect.push(w); }
      clearTimeout(timer); state.recognizing=false;
    };
    rec.onerror=()=>{ clearTimeout(timer); state.recognizing=false; t(els.feedback,'⚠️ Mic error. Use Next or Say Again.'); };
    rec.onend=()=>{};
    await window.AudioGuards.safeStart(rec);
  }

  async function play(){
    const w=state.words[state.i]; if(!w) return;
    show(); t(els.feedback,'🎧 Listen…');
    await speak(w); await listen(w);
  }

  function endSession(){
    state.active=false; window.AudioGuards?.stopAll();
    const flagged=[...state.flags];
    const lines=[
      `Session Complete`,
      `✅ ${state.correct.length}`,
      `❌ ${state.incorrect.length}`,
      flagged.length?`🚩 ${flagged.join(', ')}`:'No flagged'
    ];
    t(els.feedback, lines.join(' • '));
  }

  els.start?.addEventListener('click', async ()=>{
    await window.AudioGuards?.primeAudio();
    state.words = await loadWords();
    if(!state.words.length){ t(els.feedback,'No words.'); return; }
    state.i=0; state.flags.clear(); state.correct=[]; state.incorrect=[]; state.active=true;
    play();
  });
  els.next && els.next.addEventListener('click', ()=>{ if(!state.active) return;
    if(state.i<state.words.length-1){ state.i++; play(); } else { endSession(); }});
  els.prev && els.prev.addEventListener('click', ()=>{ if(!state.active) return; if(state.i>0){ state.i--; play(); }});
  els.flag && els.flag.addEventListener('click', ()=>{ if(!state.active) return; const w=state.words[state.i]; if(!w) return;
    if(state.flags.has(w)){ state.flags.delete(w); t(els.feedback,`🚩 Removed flag on "${w}"`); } else { state.flags.add(w); t(els.feedback,`🚩 Flagged "${w}"`); }});
  els.say  && els.say .addEventListener('click', ()=>{ if(!state.active) return; play(); });
  els.end  && els.end .addEventListener('click', endSession);

  // Consistent Dark Mode Toggle
  function initializeDarkModeToggle() {
    const darkModeToggle = document.getElementById('toggleDark');
    if (!darkModeToggle) return;

    // Initialize icon based on current mode
    const icon = darkModeToggle.querySelector('i');
    const isDark = document.body.classList.contains('dark-mode');
    if (icon) {
      icon.className = isDark ? 'fa fa-sun' : 'fa fa-moon';
    }

    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const icon = darkModeToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
      }
      
      // Save preference
      localStorage.setItem('dark', document.body.classList.contains('dark-mode'));
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDarkModeToggle);
  } else {
    initializeDarkModeToggle();
  }

  console.log('Bee ready');
})();
