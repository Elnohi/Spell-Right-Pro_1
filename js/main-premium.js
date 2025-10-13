/* /js/main-premium.js */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const els = {
    start: $("#btnStart"), next: $("#btnNext"), prev: $("#btnPrev"),
    flag: $("#btnFlag"), end: $("#btnEnd"), say: $("#btnSay"),
    input: $("#wordInput"),
    progress: document.querySelector('[data-role="progress"]'),
    feedback: document.querySelector('[data-role="feedback"]'),
  };

  // You can switch to another list later; premium often uses OET-sized banks
  const DEFAULT_LIST_PATH = "/data/word-lists/oet.json";
  const FALLBACK = ["accommodation","anaesthesia","diagnosis","emergency","respiration","infection","abdomen","injection","stethoscope","cardiology"];

  const state = { words:[], i:0, flags:new Set(), correct:[], incorrect:[], recognizing:false, active:false, };

  function t(el, s){ if(el) el.textContent=s; }
  function norm(s){ return (s||"").toLowerCase().replace(/[^\p{L}]+/gu,""); }
  function showProgress(){ const total=state.words.length||0; const idx=Math.min(state.i+1,total); t(els.progress, `Word ${idx} of ${total}`); }

  async function loadWords(){
    try{
      const res = await fetch(`${DEFAULT_LIST_PATH}?v=${Date.now()}`, {cache:"no-store"});
      if(!res.ok) throw 0; const data = await res.json();
      const arr = Array.isArray(data?.words)?data.words:Array.isArray(data)?data:[];
      return arr.length?arr:FALLBACK;
    }catch(_){ return FALLBACK; }
  }

  async function speakWord(w){ await window.AudioGuards?.speakOnce(w, {rate:0.9}); }

  async function hearAndGrade(currentWord){
    const rec = window.AudioGuards?.getRecognition();
    if(!rec){ return; }
    if(state.recognizing) return;
    state.recognizing=true;

    let gotResult=false, timer=null;
    function cleanup(){ if(timer){clearTimeout(timer);} state.recognizing=false; }

    rec.onresult = (e)=>{
      gotResult=true;
      const said = e.results[0][0].transcript||"";
      const ok = norm(said)===norm(currentWord);
      if(ok){ t(els.feedback,"✅ Correct"); state.correct.push(currentWord);}
      else { t(els.feedback,`❌ Incorrect — ${currentWord}`); state.incorrect.push(currentWord);}
      cleanup();
    };
    rec.onerror = ()=>{ cleanup(); t(els.feedback,'⚠️ Mic error. Use typing or “Say Again”.'); };
    rec.onend   = ()=>{ /* handled by timer or result */ };

    timer = setTimeout(()=>{ if(!gotResult){ t(els.feedback,'⏱️ No speech heard. Try again or type your answer.'); } cleanup(); }, 7000);
    await window.AudioGuards.safeStart(rec);
  }

  async function playCurrent(){
    const w=state.words[state.i]; if(!w) return;
    showProgress(); t(els.feedback,'🎧 Listen…');
    await speakWord(w); await hearAndGrade(w);
  }

  function next(){
    if(state.i<state.words.length-1){ state.i++; playCurrent(); }
    else { endSession(); }
  }
  function prev(){ if(state.i>0){ state.i--; playCurrent(); } }
  function toggleFlag(){
    const w=state.words[state.i]; if(!w) return;
    if(state.flags.has(w)){ state.flags.delete(w); t(els.feedback,`🚩 Removed flag on “${w}”`); }
    else { state.flags.add(w); t(els.feedback,`🚩 Flagged “${w}”`); }
  }

  function checkAnswer(){
    const target = (state.words[state.i]||"").trim();
    const ans    = (els.input.value||"").trim();
    if(!target) return;
    if(!ans){ t(els.feedback,'Type the spelling or use your mic.'); return; }

    if(norm(ans)===norm(target)){ t(els.feedback,"✅ Correct"); state.correct.push(target);}
    else { t(els.feedback,`❌ Incorrect — ${target}`); state.incorrect.push(target); }

    els.input.value = ""; next();
  }

  function endSession(){
    state.active=false; window.AudioGuards?.stopAll();
    const flagged=[...state.flags];
    const lines=[
      `Session Complete`,
      `✅ Correct: ${state.correct.length}`,
      `❌ Incorrect: ${state.incorrect.length}`,
      flagged.length?`🚩 Flagged: ${flagged.join(", ")}`:`No flagged words`
    ];
    t(els.feedback, lines.join(' • '));
  }

  document.addEventListener("DOMContentLoaded", async ()=>{
    await window.AudioGuards?.primeAudio();

    els.start?.addEventListener("click", async ()=>{
      state.words = await loadWords();
      if(!state.words.length){ t(els.feedback,'No words loaded.'); return; }
      state.i=0; state.flags.clear(); state.correct=[]; state.incorrect=[]; state.active=true;
      playCurrent();
    });
    els.next?.addEventListener("click", next);
    els.prev?.addEventListener("click", prev);
    els.flag?.addEventListener("click", toggleFlag);
    els.say ?.addEventListener("click", playCurrent);
    els.end ?.addEventListener("click", endSession);

    els.input?.addEventListener("keydown", (e)=>{ if(e.key==='Enter'){ e.preventDefault(); checkAnswer(); } });
  });
})();
