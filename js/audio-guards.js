/* /js/audio-guards.js */
(() => {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const synth = window.speechSynthesis;

  function wait(ms){return new Promise(r=>setTimeout(r,ms));}
  async function waitVoicesReady(timeout=2500){
    if(!synth) return; const start=Date.now();
    while(synth.getVoices().length===0 && Date.now()-start<timeout){await wait(60);}
  }
  function newRecognition(){
    if(!SpeechRec) return null;
    const rec = new SpeechRec();
    rec.lang='en-US'; rec.interimResults=false; rec.maxAlternatives=1;
    return rec;
  }
  let activeRec=null, pendingStart=false;
  async function safeStart(rec){
    if(!rec||pendingStart) return; pendingStart=true;
    try{
      if(activeRec && activeRec!==rec){ try{activeRec.onend=null; activeRec.stop();}catch(_){}
        activeRec=null; }
      activeRec=rec; rec.onend=()=>{ if(activeRec===rec) activeRec=null; };
      try{ rec.start(); }catch(_){}
    }finally{ pendingStart=false; }
  }
  function stopAll(){ try{synth?.cancel();}catch(_){} if(activeRec){try{activeRec.onend=null;activeRec.stop();}catch(_){} activeRec=null;} }
  function speakOnce(text,opts={}){
    if(!synth) return Promise.resolve();
    return new Promise(async resolve=>{
      await waitVoicesReady();
      const u=new SpeechSynthesisUtterance(text); u.rate=opts.rate??0.95;
      const v=synth.getVoices().find(v=>/^en[-_]/i.test(v.lang))||synth.getVoices()[0];
      if(v) u.voice=v; u.onend=resolve; try{synth.cancel();}catch(_){}
      synth.speak(u);
    });
  }
  window.AudioGuards={ isSupported: !!SpeechRec, getRecognition:()=>newRecognition(),
    primeAudio: async()=>{ try{await waitVoicesReady();}catch(_){} },
    speakOnce, safeStart, stopAll };
})();
