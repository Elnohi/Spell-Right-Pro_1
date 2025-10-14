/*!
 * main-premium.js
 * Unified premium controller for Bee / School / OET tabs
 * Self-contained (includes internal TTS + SpeechRecognition)
 */

(function(){
  document.addEventListener("DOMContentLoaded", init);

  // ---------- utilities ----------
  const $ = sel => document.querySelector(sel);
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const clean = s => s.toLowerCase().replace(/[^\p{L}]/gu,"");

  // ---------- Speech & TTS ----------
  function speak(text){
    return new Promise(res=>{
      if(!("speechSynthesis" in window)) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      const v = speechSynthesis.getVoices().find(v=>/^en/i.test(v.lang)) || null;
      if(v) u.voice=v;
      u.onend=res;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
  }

  function listen(){
    return new Promise(resolve=>{
      const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){ console.warn("SpeechRecognition unsupported"); return resolve("");}
      const rec = new SR();
      rec.lang="en-US"; rec.interimResults=false; rec.maxAlternatives=1;
      let done=false;
      rec.onresult=e=>{done=true; resolve(e.results[0][0].transcript);}
      rec.onerror=e=>{console.warn("rec err",e.error); if(!done)resolve("");}
      rec.onend=()=>{if(!done)resolve("");}
      rec.start();
    });
  }

  // ---------- mode states ----------
  const modes = {
    bee:{words:[],i:0,correct:[],wrong:[],flags:new Set(),active:false},
    school:{words:[],i:0,correct:[],wrong:[],flags:new Set(),active:false},
    oet:{words:[],i:0,correct:[],wrong:[],flags:new Set(),active:false}
  };

  // ---------- load words ----------
  async function loadWords(area,upload,defaultList){
    let words=[];
    const txt = area.value.trim();
    if(txt) words = txt.split(/[\n,]+/).map(w=>w.trim()).filter(Boolean);
    if(!words.length && upload.files[0]){
      const f = await upload.files[0].text();
      words = f.split(/[\n,]+/).map(w=>w.trim()).filter(Boolean);
    }
    if(!words.length) words = defaultList;
    return words;
  }

  // ---------- summaries ----------
  function showSummary(mode){
    const s = modes[mode];
    const flagged=[...s.flags];
    const html = `
      <h3>${mode.toUpperCase()} Summary</h3>
      <p>✅ Correct: ${s.correct.length}</p>
      <p>❌ Incorrect: ${s.wrong.join(", ")||"None"}</p>
      <p>🚩 Flagged: ${flagged.join(", ")||"None"}</p>`;
    $("#summary").innerHTML=html;
  }

  // ---------- Bee logic ----------
  async function beeNext(auto){
    const s=modes.bee; if(!s.active) return;
    if(s.i>=s.words.length){ s.active=false; return showSummary("bee"); }
    const w=s.words[s.i];
    $("#beeFeedback").textContent=`🎧 Listen: ${w}`;
    await speak(w);
    const heard=clean(await listen());
    const target=clean(w);
    if(heard===target){$("#beeFeedback").textContent="✅ Correct";s.correct.push(w);}
    else {$("#beeFeedback").textContent=`❌ Incorrect — ${w}`;s.wrong.push(w);}
    s.i++;
    await sleep(1000);
    beeNext(true);
  }

  // ---------- School & OET logic ----------
  async function startTypingMode(mode,inputEl,feedbackEl){
    const s=modes[mode]; if(!s.active)return;
    if(s.i>=s.words.length){ s.active=false; return showSummary(mode); }
    const w=s.words[s.i];
    feedbackEl.textContent=`🎧 Listen carefully…`;
    await speak(w);
    inputEl.value="";
    inputEl.focus();
    const check=()=>{ 
      const ans=clean(inputEl.value);
      const target=clean(w);
      if(!ans)return;
      if(ans===target){feedbackEl.textContent="✅ Correct";s.correct.push(w);}
      else{feedbackEl.textContent=`❌ Incorrect — ${w}`;s.wrong.push(w);}
      s.i++; 
      setTimeout(()=>startTypingMode(mode,inputEl,feedbackEl),800);
    };
    inputEl.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();check();}};
  }

  // ---------- init -------------
  function init(){
    console.log("Premium JS loaded");

    // Bee
    $("#beeStart").onclick=async()=>{
      const s=modes.bee;
      s.words=await loadWords($("#beeCustom"),$("#beeUpload"),
        ["accommodate","rhythm","necessary","separate","recommend"]);
      s.i=0;s.correct=[];s.wrong=[];s.flags.clear();s.active=true;
      $("#summary").innerHTML=""; beeNext();
    };
    $("#beeSay").onclick=()=>speak(modes.bee.words[modes.bee.i]||"");
    $("#beeEnd").onclick=()=>{modes.bee.active=false;showSummary("bee");};

    // School
    $("#schoolStart").onclick=async()=>{
      const s=modes.school;
      s.words=await loadWords($("#schoolCustom"),$("#schoolUpload"),
        ["biology","anatomy","physiology","neuron","surgery"]);
      s.i=0;s.correct=[];s.wrong=[];s.flags.clear();s.active=true;
      $("#summary").innerHTML=""; startTypingMode("school",$("#schoolInput"),$("#schoolFeedback"));
    };
    $("#schoolNext").onclick=()=>startTypingMode("school",$("#schoolInput"),$("#schoolFeedback"));
    $("#schoolEnd").onclick=()=>{modes.school.active=false;showSummary("school");};

    // OET
    $("#oetStart").onclick=async()=>{
      const s=modes.oet;
      s.words=await loadWords($("#oetCustom"),$("#oetUpload"),
        ["diagnosis","prescription","stethoscope","patient","symptom"]);
      s.i=0;s.correct=[];s.wrong=[];s.flags.clear();s.active=true;
      $("#summary").innerHTML=""; startTypingMode("oet",$("#oetInput"),$("#oetFeedback"));
    };
    $("#oetNext").onclick=()=>startTypingMode("oet",$("#oetInput"),$("#oetFeedback"));
    $("#oetEnd").onclick=()=>{modes.oet.active=false;showSummary("oet");};
  }
})();
