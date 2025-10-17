/* ======================================================
   Premium (Bee / School / OET) + Auth Overlay
   - Requires firebase compat (config.js must init the app)
   - Blocks training until user is signed in
   - Google + Email/Password + Forgot Password
   - Remembers last tab; dark-mode handled in HTML
====================================================== */
(function(){
  "use strict";

  // --- Firebase ---
  const auth = firebase.auth();

  // UI helpers
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const setText = (el, t) => { if (el) el.textContent = t; };

  // --- Auth Overlay elements ---
  const overlay     = $('#authOverlay');
  const btnGoogle   = $('#btnGoogle');
  const btnLogin    = $('#btnEmailLogin');
  const btnSignup   = $('#btnEmailSignup');
  const emailEl     = $('#authEmail');
  const passEl      = $('#authPass');
  const msgEl       = $('#authMsg');
  const tabLogin    = $('#authTabLogin');
  const tabSignup   = $('#authTabSignup');
  const toggleText  = $('#authToggleText');
  const btnLogout   = $('#btnLogout');
  const linkForgot  = $('#linkForgot');

  let mode = 'login'; // 'login' or 'signup'

  function showOverlay() { overlay.style.display = 'flex'; msg(''); }
  function hideOverlay() { overlay.style.display = 'none'; msg(''); }
  function msg(t, good=false) {
    if (!msgEl) return;
    msgEl.style.color = good ? 'var(--primary)' : 'var(--gray)';
    setText(msgEl, t || '');
  }
  function setAuthMode(m) {
    mode = m;
    tabLogin.classList.toggle('active', m==='login');
    tabSignup.classList.toggle('active', m==='signup');
    btnLogin.classList.toggle('hidden', m!=='login');
    btnSignup.classList.toggle('hidden', m!=='signup');
    toggleText.textContent = (m==='login')
      ? 'New here? Click “Register”.'
      : 'Already have an account? Click “Login”.';
  }

  // Switch tabs inside overlay
  tabLogin?.addEventListener('click', () => setAuthMode('login'));
  tabSignup?.addEventListener('click', () => setAuthMode('signup'));

  // Google sign-in (no email verification needed)
  btnGoogle?.addEventListener('click', async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      msg('Welcome!', true);
      setTimeout(hideOverlay, 200);
    } catch (e) {
      msg(e.message || 'Google sign-in failed');
    }
  });

  // Email: Login
  btnLogin?.addEventListener('click', async () => {
    const email = emailEl.value.trim(), pass = passEl.value;
    if (!email || !pass) return msg('Enter email & password');
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      msg('Logged in', true);
      setTimeout(hideOverlay, 200);
    } catch(e) {
      msg(e.message || 'Login failed');
    }
  });

  // Email: Signup (send verification but DO NOT block login)
  btnSignup?.addEventListener('click', async () => {
    const email = emailEl.value.trim(), pass = passEl.value;
    if (!email || !pass) return msg('Enter email & password');
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      try {
        await cred.user.sendEmailVerification();
        msg('Account created. Verification email sent (optional).', true);
      } catch {
        msg('Account created. (Email verification optional.)', true);
      }
      setTimeout(hideOverlay, 350);
    } catch(e) {
      msg(e.message || 'Could not create account');
    }
  });

  // Forgot password
  linkForgot?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailEl.value.trim();
    if (!email) return msg('Enter your email then click "Forgot password?"');
    try {
      await auth.sendPasswordResetEmail(email);
      msg('Password reset email sent.', true);
    } catch (e2) {
      msg(e2.message || 'Could not send reset email.');
    }
  });

  // Logout
  btnLogout?.addEventListener('click', async () => {
    try { await auth.signOut(); } catch {}
  });

  // Observe auth state
  auth.onAuthStateChanged((user) => {
    const logged = !!user;
    btnLogout?.classList.toggle('hidden', !logged);
    if (logged) hideOverlay(); else showOverlay();
  });

  // Require auth before actions
  function requireAuth() {
    if (!auth.currentUser) { showOverlay(); return false; }
    return true;
  }

  // --- TABS ---
  const tabs = [
    {btn:'#tabBee',    sec:'#secBee',    key:'bee'},
    {btn:'#tabSchool', sec:'#secSchool', key:'school'},
    {btn:'#tabOet',    sec:'#secOet',    key:'oet'}
  ];
  function activate(key){
  tabs.forEach(t=>{
    const btn = $(t.btn);
    const sec = $(t.sec);
    const isActive = (t.key === key);
    if (btn) btn.classList.toggle('active', isActive);
    if (sec) {
      sec.classList.toggle('active', isActive);
      sec.style.display = isActive ? 'block' : 'none';
    }
  });
  localStorage.setItem('premiumTab', key);
}
  tabs.forEach(t=> $(t.btn)?.addEventListener('click', ()=>activate(t.key)));
  activate(localStorage.getItem('premiumTab') || 'bee');

  // --- Common helpers ---
  const sanitize = w => (w||'').toString().trim().toLowerCase().replace(/[.,!?;:'"()]/g,'');
  const pause = ms => new Promise(r=>setTimeout(r,ms));
  const speak = t => { try {
    if (!("speechSynthesis" in window) || !t) return;
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 0.96; u.pitch = 1;
    const v = speechSynthesis.getVoices().find(v => /^en[-_]/i.test(v.lang));
    if (v) u.voice = v;
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

  // --- Bee (voice) ---
  (function Bee(){
    const els = {
      start:$('#beeStart'), say:$('#beeSay'), flag:$('#beeFlag'), end:$('#beeEnd'),
      feedback:$('#beeFeedback'), progress:$('#beeProgress'), summary:$('#beeSummary'),
      custom:$('#beeCustom'), file:$('#beeFile'), load:$('#beeLoad')
    };
    let master=[], list=[], idx=0, correct=0, attempts=0, incorrect=[], flags=new Set();
    let rec = window.AudioGuards?.getRecognition?.();
    if (rec){ rec.interimResults=false; rec.maxAlternatives=1; rec.lang='en-US'; }

    async function loadList(){
      if (master.length) return;
      try{
        const res = await fetch('/data/word-lists/spelling-bee.json', {cache:'no-store'});
        const data = await res.json();
        master = (Array.isArray(data?.words)?data.words:Array.isArray(data)?data:[]).filter(Boolean);
      }catch{ master=['accommodate','rhythm','occurrence','necessary','embarrass']; }
    }
    function resetSession(){ idx=0; correct=0; attempts=0; incorrect.length=0; flags.clear(); els.summary.innerHTML=''; }
    function showProgress(){ setText(els.progress, `Word ${Math.min(idx+1,list.length)} of ${list.length}`); }
    function end(){ summaryBox(els.summary, correct, attempts, incorrect, [...flags]); }
    function useCustom(arr){ master=arr.slice(); setText(els.feedback,'Custom list loaded. Press Start.'); }

    function listen(){
      if (!rec) return;
      rec.onresult=null; rec.onerror=null;
      rec.onresult=(evt)=>{ const heard=(evt.results?.[0]?.[0]?.transcript)||''; grade(heard); };
      rec.onerror=()=> setText(els.feedback,'⚠️ Mic error. Tap “Say Again”.');
      try { rec.stop(); rec.start(); } catch {}
    }
    function sayAndListen(){
      if (!list[idx]) return;
      speak(list[idx]); showProgress(); listen();
    }
    function grade(heard){
      const t=list[idx]; attempts++;
      const ok = sanitize(heard)===sanitize(t);
      if (ok){ correct++; setText(els.feedback,'✅ Correct'); }
      else   { incorrect.push(t); setText(els.feedback,`❌ Incorrect — ${t}`); }
      idx++;
      setTimeout(()=>{ if (idx<list.length) sayAndListen(); else end(); }, 600);
    }

    els.start?.addEventListener('click', async ()=>{
      if (!requireAuth()) return;
      await loadList();
      list = master.slice();
      if (!list.length) { setText(els.feedback,'No words available.'); return; }
      resetSession();
      sayAndListen();
    });
    els.say?.addEventListener('click', ()=>{ if (!requireAuth()) return; sayAndListen(); });
    els.flag?.addEventListener('click', ()=>{ if (!requireAuth()) return; const w=list[idx]; if(!w)return; if(flags.has(w)){flags.delete(w); setText(els.feedback,`🚩 Removed flag on “${w}”`);} else {flags.add(w); setText(els.feedback,`🚩 Flagged “${w}”`);} });
    els.end?.addEventListener('click', ()=>{ if (!requireAuth()) return; end(); });

    els.load?.addEventListener('click', ()=>{
      const txt=(els.custom?.value||'').trim(); if(!txt) return alert('Paste words first or upload a file.');
      const arr=txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean); if(!arr.length) return alert('No valid words found.');
      useCustom(arr);
    });
    els.file?.addEventListener('change', async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      const text=await f.text(); const arr=text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length) return alert('No valid words in file.'); useCustom(arr);
    });
  })();

  // --- School (typed) ---
  (function School(){
    const els = {
      start:$('#schoolStart'), submit:$('#schoolSubmit'), flag:$('#schoolFlag'), end:$('#schoolEnd'),
      input:$('#schoolAnswer'), feedback:$('#schoolFeedback'), progress:$('#schoolProgress'), summary:$('#schoolSummary'),
      custom:$('#schoolCustom'), file:$('#schoolFile'), load:$('#schoolLoad')
    };
    let master=[], list=[], idx=0, correct=0, attempts=0, incorrect=[], flags=new Set();

    async function loadList(){
      if (master.length) return;
      try{
        const res = await fetch('/data/word-lists/school.json', {cache:'no-store'});
        const data = await res.json();
        master = (Array.isArray(data?.words)?data.words:Array.isArray(data)?data:[]).filter(Boolean);
      }catch{ master=['apple','banana','computer','library','mountain']; }
    }
    function reset(){ idx=0; correct=0; attempts=0; incorrect.length=0; flags.clear(); els.summary.innerHTML=''; }
    function show(){ setText(els.progress, `Word ${idx+1} of ${list.length}`); els.input?.focus(); }
    function end(){ summaryBox(els.summary, correct, attempts, incorrect, [...flags]); }
    function useCustom(arr){ master=arr.slice(); setText(els.feedback,'Custom list loaded. Press Start.'); }

    function grade(){
      const t=list[idx]; const typed=(els.input?.value||'').trim(); const ok=sanitize(typed)===sanitize(t);
      attempts++; if (ok){ correct++; setText(els.feedback,'✅ Correct'); } else { incorrect.push(t); setText(els.feedback,`❌ Incorrect — ${t}`); }
      if (els.input) els.input.value='';
      idx++; setTimeout(()=> idx<list.length ? (speak(list[idx]), show()) : end(), 400);
    }

    els.start?.addEventListener('click', async ()=>{
      if (!requireAuth()) return;
      await loadList();
      list = master.slice();
      if (!list.length) { setText(els.feedback,'No words available.'); return; }
      reset();
      speak(list[idx]); show();
    });
    els.submit?.addEventListener('click', ()=>{ if (!requireAuth()) return; grade(); });
    els.input?.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); if (!requireAuth()) return; grade(); }});
    els.flag?.addEventListener('click',()=>{ if (!requireAuth()) return; const w=list[idx]; if(!w)return; if(flags.has(w)){flags.delete(w); setText(els.feedback,`🚩 Removed flag on “${w}”`);} else {flags.add(w); setText(els.feedback,`🚩 Flagged “${w}”`);} });
    els.end?.addEventListener('click', ()=>{ if (!requireAuth()) return; end(); });

    els.load?.addEventListener('click', ()=>{
      const txt=(els.custom?.value||'').trim(); if(!txt) return alert('Paste words first or upload a file.');
      const arr=txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean); if(!arr.length) return alert('No valid words found.');
      useCustom(arr);
    });
    els.file?.addEventListener('change', async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      const text=await f.text(); const arr=text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length) return alert('No valid words in file.'); useCustom(arr);
    });
  })();

  // --- OET (typed) ---
  (function OET(){
    const els = {
      practice:$('#oetPractice'), exam:$('#oetExam'),
      start:$('#oetStart'), submit:$('#oetSubmit'), flag:$('#oetFlag'), end:$('#oetEnd'),
      input:$('#oetAnswer'), feedback:$('#oetFeedback'), progress:$('#oetProgress'), summary:$('#oetSummary'),
      custom:$('#oetCustom'), file:$('#oetFile'), load:$('#oetLoad')
    };
    let master=[], list=[], idx=0, correct=0, attempts=0, incorrect=[], flags=new Set(), isExam=false;

    async function loadList(){
      if (master.length) return;
      if (Array.isArray(window.OET_WORDS) && window.OET_WORDS.length) master = window.OET_WORDS.slice();
      else master = ['abdomen','anemia','antibiotic','artery','asthma','biopsy','catheter','diagnosis','embolism','fracture'];
    }
    function reset(){ idx=0; correct=0; attempts=0; incorrect.length=0; flags.clear(); els.summary.innerHTML=''; }
    function show(){ setText(els.progress, `Word ${idx+1} of ${list.length}`); els.input?.focus(); }
    function end(){ summaryBox(els.summary, correct, attempts, incorrect, [...flags]); }
    function useCustom(arr){ master=arr.slice(); setText(els.feedback,'Custom list loaded. Press Start.'); }

    function grade(){
      const t=list[idx]; const typed=(els.input?.value||'').trim(); const ok=sanitize(typed)===sanitize(t);
      attempts++; if (ok){ correct++; setText(els.feedback,'✅ Correct'); } else { incorrect.push(t); setText(els.feedback,`❌ Incorrect — ${t}`); }
      if (els.input) els.input.value='';
      idx++; setTimeout(()=> idx<list.length ? (speak(list[idx]), show()) : end(), 400);
    }

    els.practice?.addEventListener('click', ()=>{ isExam=false; setText(els.feedback,'Practice mode selected.'); });
    els.exam?.addEventListener('click', ()=>{ isExam=true; setText(els.feedback,'Exam (24) selected.'); });

    els.start?.addEventListener('click', async ()=>{
      if (!requireAuth()) return;
      await loadList();
      let base = master.slice();
      if (!base.length){ setText(els.feedback,'No words available.'); return; }
      if (isExam) base.sort(()=>Math.random()-0.5);
      list = isExam ? base.slice(0,24) : base;
      reset(); speak(list[idx]); show();
    });
    els.submit?.addEventListener('click', ()=>{ if (!requireAuth()) return; grade(); });
    els.input?.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); if (!requireAuth()) return; grade(); }});
    els.flag?.addEventListener('click',()=>{ if (!requireAuth()) return; const w=list[idx]; if(!w)return; if(flags.has(w)){flags.delete(w); setText(els.feedback,`🚩 Removed flag on “${w}”`);} else {flags.add(w); setText(els.feedback,`🚩 Flagged “${w}”`);} });
    els.end?.addEventListener('click', ()=>{ if (!requireAuth()) return; end(); });

    els.load?.addEventListener('click', ()=>{
      const txt=(els.custom?.value||'').trim(); if(!txt) return alert('Paste words first or upload a file.');
      const arr=txt.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean); if(!arr.length) return alert('No valid words found.');
      useCustom(arr);
    });
    els.file?.addEventListener('change', async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      const text=await f.text(); const arr=text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length) return alert('No valid words in file.'); useCustom(arr);
    });
  })();

})();

