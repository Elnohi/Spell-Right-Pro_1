// Freemium OET — sample list from oet.json, 10/day cap, lifetime stats, accent, ads
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const replayBtn = document.getElementById('replay-btn');
  const backspaceBtn = document.getElementById('backspace-btn');
  const practice = document.getElementById('practice-area');
  const promptEl = document.getElementById('prompt');
  const tiles = document.getElementById('word-tiles');
  const feedback = document.getElementById('feedback');
  const summary = document.getElementById('summary-area');

  const lifeCorrectEl = document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('life-attempts');

  let accent='en-US'; const picker=document.querySelector('.accent-picker');
  let synth=window.speechSynthesis;

  function speak(w){ try{ synth&&synth.cancel(); const u=new SpeechSynthesisUtterance(w); u.lang=accent; (synth||window.speechSynthesis).speak(u);}catch(e){} }
  picker?.addEventListener('click',(e)=>{
    const btn=e.target.closest('button[data-accent]'); if(!btn) return;
    accent=btn.getAttribute('data-accent')||'en-US';
    picker.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  });

  const CAP=10;
  function todayKey(){ const d=new Date(); return `srp_daily_OET_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function getUsed(){ return parseInt(localStorage.getItem(todayKey())||'0',10); }
  function setUsed(n){ localStorage.setItem(todayKey(), String(n)); }

  function loadLife(){
    const c=parseInt(localStorage.getItem('oet_life_correct')||'0',10);
    const a=parseInt(localStorage.getItem('oet_life_attempts')||'0',10);
    lifeCorrectEl.textContent=c; lifeAttemptsEl.textContent=a;
    return {c,a};
  }
  function saveLife(c,a){
    localStorage.setItem('oet_life_correct', String(c));
    localStorage.setItem('oet_life_attempts', String(a));
    lifeCorrectEl.textContent=c; lifeAttemptsEl.textContent=a;
  }
  let {c:lifeCorrect,a:lifeAttempts} = loadLife();

  let sampleWords=[];
  (async ()=>{
    try{
      const res=await fetch('oet.json',{cache:'no-cache'});
      const data=await res.json();
      sampleWords = Array.isArray(data?.words)? data.words.filter(Boolean):[];
    }catch(e){ console.warn('Failed to load oet.json', e); }
  })();

  let words=[], idx=0, typed='', running=false, currentWord='';

  function capList(list){
    const used=getUsed();
    if(used>=CAP){ alert(`Freemium limit reached: ${CAP} words today.`); return []; }
    const remain=CAP-used; return list.length>remain? list.slice(0,remain):list;
  }

  function startSession(){
    const capped=capList(sampleWords.slice());
    if(!capped.length) return;
    words=capped; idx=0; typed=''; running=true;
    summary.classList.add('hidden'); practice.classList.remove('hidden');
    renderWord();
  }

  function renderWord(){
    if(idx>=words.length){ return finish(); }
    currentWord=words[idx]; typed='';
    tiles.innerHTML = Array.from({length: currentWord.length}).map(()=>`<div class="letter-tile">&nbsp;</div>`).join('');
    updateTiles();
    feedback.textContent='';
    promptEl.textContent=`Word ${idx+1} — listen and type, press Enter`;
    speak(currentWord);

    document.onkeydown=(e)=>{
      if(!running) return;
      if(e.key==='Enter'){ evaluate(); return; }
      if(e.key==='Backspace'){ typed=typed.slice(0,-1); updateTiles(); return; }
      if(/^[a-zA-Z]$/.test(e.key)){ if(typed.length<currentWord.length){ typed+=e.key; updateTiles(); } return; }
      if(e.key===' '){ e.preventDefault(); speak(currentWord); }
    };
  }

  function updateTiles(){
    const children=tiles.children;
    for(let i=0;i<children.length;i++){ children[i].textContent=typed[i]?typed[i].toUpperCase():' '; }
  }

  function evaluate(){
    lifeAttempts++;
    if((typed||'').trim().toLowerCase()===currentWord.toLowerCase()){
      lifeCorrect++; feedback.textContent='✅ Correct';
    }else{
      feedback.textContent=`❌ "${typed}" → ${currentWord}`;
    }
    saveLife(lifeCorrect,lifeAttempts);
    setUsed(getUsed()+1);
    idx++;
    setTimeout(renderWord,350);
  }

  function finish(){
    running=false; document.onkeydown=null;
    const total=idx, pct=total? Math.round(lifeCorrect/(lifeAttempts||1)*100):0;
    summary.innerHTML=`
      <div class="summary-header">
        <h2>Session Summary</h2>
        <div class="score-display">${idx}/${words.length}</div>
      </div>
      <div class="results-grid">
        <div class="results-card"><h3>Tip</h3><p>Replay with <strong>space</strong>, Backspace to edit, Enter to check.</p></div>
        <div class="results-card"><h3>Progress</h3><p>Lifetime accuracy: <strong>${pct}%</strong></p></div>
      </div>`;
    practice.classList.add('hidden'); summary.classList.remove('hidden');
    if(window.insertSummaryAd) window.insertSummaryAd();
  }

  startBtn?.addEventListener('click', startSession);
  replayBtn?.addEventListener('click', ()=> currentWord && speak(currentWord));
  backspaceBtn?.addEventListener('click', ()=>{ if(!running) return; typed=typed.slice(0,-1); updateTiles(); });
});
