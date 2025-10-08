// Voice spelling with SpeechRecognition + safe timeouts + summary + 1/day custom list
(function () {
  const $ = (id) => document.getElementById(id);
  const startBtn=$('start-btn'), area=$('bee-area'), prog=$('spelling-visual');
  const repeatBtn=$('repeat-btn'), skipBtn=$('skip-btn'), flagBtn=$('flag-btn'), endBtn=$('end-session-btn');
  const live=$('live-feedback'), results=$('results-area');
  const ta=$('custom-words'), fileIn=$('file-input'), apply=$('apply-words'), note=$('cw-note');

  // limit: 1 custom list / day
  const CW_KEY='bee_cw_last';
  const canApply=()=>{const t=localStorage.getItem(CW_KEY);return !t||new Date(+t).toDateString()!==new Date().toDateString();}
  const markApplied=()=>localStorage.setItem(CW_KEY, Date.now().toString());

  // sample list
  let base = ["apple","banana","cherry","orange","grape","mango","peach","pear","plum","papaya","strawberry","blueberry","watermelon","kiwi","lemon"];
  let words=base.slice(), i=0, incorrect=[], flagged=[], rec=null, speakUtter=null, wordTimer=null;

  // TTS
  function speak(t){
    if(!('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); } catch {}
    speakUtter = new SpeechSynthesisUtterance(t);
    speakUtter.lang='en-US';
    speechSynthesis.speak(speakUtter);
  }

  // robust letter aliases
  const MAP = {
    a:'a','ay':'a','hey':'a','eh':'a',
    b:'b','bee':'b',
    c:'c','see':'c','sea':'c',
    d:'d','dee':'d',
    e:'e','ee':'e',
    f:'f','ef':'f',
    g:'g','gee':'g',
    h:'h','aitch':'h','age':'h',
    i:'i','eye':'i',
    j:'j','jay':'j',
    k:'k','kay':'k',
    l:'l','el':'l',
    m:'m','em':'m',
    n:'n','en':'n',
    o:'o','oh':'o',
    p:'p','pee':'p',
    q:'q','cue':'q','queue':'q',
    r:'r','ar':'r',
    s:'s','ess':'s',
    t:'t','tee':'t',
    u:'u','you':'u',
    v:'v','vee':'v',
    w:'w','double u':'w','double-you':'w','doubleu':'w',
    x:'x','ex':'x',
    y:'y','why':'y',
    z:'z','zee':'z','zed':'z'
  };
  const normalize = s => s.toLowerCase().replace(/[,.;:!?]/g,' ').replace(/\s+/g,' ').trim();
  function toWord(transcript){
    return normalize(transcript).split(' ').map(tok=>MAP[tok]||tok.replace(/[^a-z]/g,'')).join('');
  }

  function SR(){
    const R = window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!R) return null;
    const r = new R();
    r.lang='en-US'; r.continuous=false; r.interimResults=false;
    return r;
  }

  function update(){ prog.textContent=`Word ${Math.min(i+1,words.length)} of ${words.length}`; }

  function stopRec(){ try{rec?.onresult=null; rec?.onerror=null; rec?.onend=null; rec?.stop();}catch{} rec=null; }
  function clearTimer(){ if(wordTimer){ clearTimeout(wordTimer); wordTimer=null; } }

  function startWord(){
    clearTimer(); stopRec();
    if(i>=words.length){ return summary(); }
    const w = words[i];
    update(); speak(w);
    live.style.display='none';

    rec = SR();
    if(!rec){
      live.style.display='block'; live.className='feedback incorrect';
      live.textContent='Speech recognition not supported. Try Chrome/Edge on desktop or Android.';
      return;
    }

    let finished=false;
    function finish(correct, heard){
      if(finished) return; finished=true;
      clearTimer(); stopRec();
      live.style.display='block';
      live.className = `feedback ${correct?'correct':'incorrect'}`;
      live.innerHTML = correct ? `✅ Correct: <b>${w}</b>` : `❌ Heard: <code>${heard}</code> • ✔ <b>${w}</b>`;
      if(!correct) incorrect.push(w);
      i++; setTimeout(startWord, 900);
    }

    rec.onresult = (e)=>{
      const raw = e.results[0][0].transcript || '';
      const spelled = toWord(raw);
      finish(spelled===w.toLowerCase(), spelled||raw);
    };
    rec.onerror = ()=>finish(false,'(no audio)');
    rec.onend = ()=>{};
    try { rec.start(); } catch {}

    // safety auto-skip if silent for 6s
    wordTimer = setTimeout(()=>finish(false,'(timeout)'), 6000);
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
    document.getElementById('restart').addEventListener('click', ()=>{ i=0; incorrect=[]; flagged=[]; results.classList.add('hidden'); area.classList.remove('hidden'); startWord();});
  }

  // UI
  startBtn.addEventListener('click', ()=>{ i=0; incorrect=[]; flagged=[]; results.classList.add('hidden'); area.classList.remove('hidden'); startWord(); });
  repeatBtn.addEventListener('click', ()=>{ if(i<words.length) speak(words[i]); });
  skipBtn.addEventListener('click', ()=>{ if(i<words.length) incorrect.push(words[i]); i++; startWord(); });
  flagBtn.addEventListener('click', ()=>{ if(i<words.length) flagged.push(words[i]); flagBtn.classList.add('active'); setTimeout(()=>flagBtn.classList.remove('active'),500); });
  endBtn.addEventListener('click', summary);

  // custom list
  function parse(text){ return text.split(/[\n,]+| {2,}/g).map(s=>s.trim()).filter(Boolean).slice(0,200); }
  apply.addEventListener('click', ()=>{
    if(!canApply()){ note.textContent='Limit reached: one custom list per day on Bee.'; return; }
    const list=parse(ta.value); if(!list.length){ note.textContent='Paste or upload words first.'; return; }
    words=list; markApplied(); note.textContent=`Custom list applied with ${words.length} words.`; i=0;
  });
  fileIn.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; ta.value=await f.text(); });
})();
