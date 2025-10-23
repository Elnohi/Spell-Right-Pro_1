/* /js/main-freemium-school.js */
(() => {
  const $ = s => document.querySelector(s);
  const ui = {
    area: document.querySelector('#answer') || (()=>{const ta=document.createElement('textarea'); ta.id='answer'; ta.placeholder='Type the spelling here…'; ta.style.width='100%'; ta.style.minHeight='56px'; ta.style.borderRadius='10px'; ta.style.padding='12px'; (document.querySelector('.training-card')||document.body).appendChild(ta); return ta;})(),
    submit: document.querySelector('#btnSubmit') || (()=>{const b=document.createElement('button'); b.id='btnSubmit'; b.textContent='Submit'; b.className='btn-secondary'; (document.querySelector('.button-group')||document.querySelector('.training-card')||document.body).appendChild(b); return b;})(),
    upload: document.querySelector('#fileInput') || (()=>{const i=document.createElement('input'); i.type='file'; i.accept='.txt,.json'; i.id='fileInput'; i.style.marginTop='8px'; (document.querySelector('.training-card')||document.body).appendChild(i); return i;})(),
    start:  document.querySelector('[data-action="start"], #btnStart'),
    say:    document.querySelector('[data-action="say"],   #btnSay'),
    progress: document.querySelector('[data-role="progress"]') || (()=>{const d=document.createElement('div'); d.setAttribute('data-role','progress'); d.style.fontWeight='700'; d.style.marginTop='8px'; (document.querySelector('.training-card')||document.body).prepend(d); return d;})(),
    feedback: document.querySelector('[data-role="feedback"]') || (()=>{const d=document.createElement('div'); d.setAttribute('data-role','feedback'); d.style.minHeight='22px'; d.style.marginTop='8px'; (document.querySelector('.training-card')||document.body).appendChild(d); return d;})()
  };

  const LIST='/data/word-lists/school.json';
  const state={ words:[], i:0, correct:[], incorrect:[], flags:new Set(), active:false };

  function t(el,s){ if(el) el.textContent=s; }
  function norm(s){ return (s||'').toLowerCase().trim(); }
  function show(){ t(ui.progress, `Word ${Math.min(state.i+1,state.words.length)} of ${state.words.length}`); }

  async function loadDefault(){
    try{ const r=await fetch(`${LIST}?v=${Date.now()}`,{cache:'no-store'});
      if(!r.ok) throw 0; const j=await r.json();
      const arr=Array.isArray(j?.words)?j.words:Array.isArray(j)?j:[]; return arr;
    }catch(_){ return []; }
  }

  async function start(){
    const custom=(ui.area.value||'').trim();
    state.words = custom ? custom.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean) : await loadDefault();
    state.i=0; state.correct=[]; state.incorrect=[]; state.flags.clear(); state.active=true;
    if(!state.words.length){ t(ui.feedback,'No words loaded. Paste or upload a list.'); return; }
    t(ui.feedback,''); show(); say();
  }

  function check(){
    if(!state.active) return;
    const target=(state.words[state.i]||'').trim();
    const ans=(ui.area.value||'').trim();
    if(!target) return;
    if(!ans){ t(ui.feedback,'Type your answer, then press Enter or Submit.'); return; }
    if(norm(ans)===norm(target)){ state.correct.push(target); t(ui.feedback,'✅ Correct'); }
    else { state.incorrect.push(target); t(ui.feedback,`❌ Incorrect — ${target}`); }
    ui.area.value=''; state.i++;
    if(state.i>=state.words.length){ end(); } else { show(); say(); }
  }

  function say(){ const w=state.words[state.i]; if(!w) return; window.AudioGuards?.speakOnce(w); }
  function end(){
    state.active=false; window.AudioGuards?.stopAll();
    const lines=['Session Complete',`✅ ${state.correct.length}`,`❌ ${state.incorrect.length}`, state.flags.size?`🚩 ${[...state.flags].join(', ')}`:'No flagged'];
    t(ui.feedback, lines.join(' • '));
  }

  ui.start && ui.start.addEventListener('click', start);
  ui.submit.addEventListener('click', check);
  ui.area.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); check(); }});
  ui.say && ui.say.addEventListener('click', say);
  ui.upload.addEventListener('change', async ev=>{
    const f=ev.target.files?.[0]; if(!f) return; const txt=await f.text();
    try{ const j=JSON.parse(txt); state.words=Array.isArray(j?.words)?j.words:Array.isArray(j)?j:[]; }
    catch(_){ state.words=txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean); }
    t(ui.feedback, `Loaded ${state.words.length} words. Press Start.`);
  });

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

  console.log('School ready');
})();
