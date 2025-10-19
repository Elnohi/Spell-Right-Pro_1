/* ======================================================
   SpellRightPro Premium (Bee / School / OET)
   Firebase Auth + Voice + Summary
====================================================== */
(function(){
  "use strict";

  // --- Firebase Auth Safe Init ---
  let auth = null;
  try {
    auth = firebase?.auth?.();
  } catch (e) {
    console.error("❌ Firebase not initialized. Check /js/config.js", e);
  }
  if (!auth) return;

  // --- Shortcuts ---
  const $  = (s, r=document) => r.querySelector(s);
  const setText = (el, t) => { if (el) el.textContent = t; };

  // --- Auth Overlay ---
  const overlay=$('#authOverlay'), btnGoogle=$('#btnGoogle'),
        btnLogin=$('#btnEmailLogin'), btnSignup=$('#btnEmailSignup'),
        emailEl=$('#authEmail'), passEl=$('#authPass'), msgEl=$('#authMsg'),
        tabLogin=$('#authTabLogin'), tabSignup=$('#authTabSignup'),
        toggleText=$('#authToggleText'), btnLogout=$('#btnLogout'),
        linkForgot=$('#linkForgot');
  let mode='login';

  function msg(t,good=false){ if(!msgEl)return; msgEl.style.color=good?'#7b2ff7':'#aaa'; msgEl.textContent=t||''; }
  function showOverlay(){ overlay.style.display='flex'; msg(''); }
  function hideOverlay(){ overlay.style.display='none'; msg(''); }
  function setAuthMode(m){
    mode=m;
    tabLogin.classList.toggle('active',m==='login');
    tabSignup.classList.toggle('active',m==='signup');
    btnLogin.classList.toggle('hidden',m!=='login');
    btnSignup.classList.toggle('hidden',m!=='signup');
    toggleText.textContent=(m==='login')?'New here? Click “Register”.':'Already have an account? Click “Login”.';
  }

  tabLogin?.addEventListener('click',()=>setAuthMode('login'));
  tabSignup?.addEventListener('click',()=>setAuthMode('signup'));

  btnGoogle?.addEventListener('click',async()=>{
    try{
      const provider=new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      msg('Welcome!',true); setTimeout(hideOverlay,200);
    }catch(e){ msg(e.message||'Google sign-in failed'); }
  });

  btnLogin?.addEventListener('click',async()=>{
    const email=emailEl.value.trim(), pass=passEl.value;
    if(!email||!pass)return msg('Enter email & password');
    try{ await auth.signInWithEmailAndPassword(email,pass);
      msg('Logged in',true); setTimeout(hideOverlay,200);
    }catch(e){ msg(e.message||'Login failed'); }
  });

  btnSignup?.addEventListener('click',async()=>{
    const email=emailEl.value.trim(), pass=passEl.value;
    if(!email||!pass)return msg('Enter email & password');
    try{
      const cred=await auth.createUserWithEmailAndPassword(email,pass);
      try{ await cred.user.sendEmailVerification(); msg('Account created. Verification optional.',true); }
      catch{ msg('Account created.',true); }
      setTimeout(hideOverlay,350);
    }catch(e){ msg(e.message||'Could not create account'); }
  });

  linkForgot?.addEventListener('click',async(e)=>{
    e.preventDefault();
    const email=emailEl.value.trim(); if(!email)return msg('Enter your email first');
    try{ await auth.sendPasswordResetEmail(email); msg('Reset email sent.',true); }
    catch(e2){ msg(e2.message||'Could not send reset email.'); }
  });

  btnLogout?.addEventListener('click',async()=>{ try{ await auth.signOut(); }catch{} });

  auth.onAuthStateChanged((u)=>{
    const logged=!!u;
    btnLogout?.classList.toggle('hidden',!logged);
    if(logged) hideOverlay(); else showOverlay();
  });
  function requireAuth(){ if(!auth.currentUser){ showOverlay(); return false; } return true; }

  // --- Tab Control ---
  const tabs=[
    {btn:'#tabBee',sec:'#secBee',key:'bee'},
    {btn:'#tabSchool',sec:'#secSchool',key:'school'},
    {btn:'#tabOet',sec:'#secOet',key:'oet'}
  ];
  function activate(key){
    tabs.forEach(t=>{
      const b=$(t.btn), s=$(t.sec);
      const on=(t.key===key);
      b?.classList.toggle('active',on);
      if(s){ s.classList.toggle('active',on); s.style.display=on?'block':'none'; }
    });
    localStorage.setItem('premiumTab',key);
  }
  tabs.forEach(t=>$(t.btn)?.addEventListener('click',()=>activate(t.key)));
  activate(localStorage.getItem('premiumTab')||'bee');

  // --- Helpers ---
  const sanitize=w=>(w||'').toString().trim().toLowerCase().replace(/[.,!?;:'"()]/g,'');
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  function speak(t){
    if(!t||!("speechSynthesis" in window))return;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(t); u.rate=.95; u.pitch=1;
    const v=speechSynthesis.getVoices().find(v=>/^en[-_]/i.test(v.lang));
    if(v)u.voice=v; speechSynthesis.speak(u);
  }
  function summaryBox(el,correct,total,incorrect,flags){
    el.innerHTML=`
    <h2>Session complete</h2>
    <p>${correct}/${total} correct</p>
    <h3>Incorrect (${incorrect.length})</h3>
    <div>${incorrect.map(w=>`<div>${w}</div>`).join('')||'<em>None</em>'}</div>
    <h3>Flagged (${flags.length})</h3>
    <div>${flags.map(w=>`<div>${w}</div>`).join('')||'<em>None</em>'}</div>`;
  }

  // --- Bee ---
  (function Bee(){
    const els={start:$('#beeStart'),say:$('#beeSay'),flag:$('#beeFlag'),end:$('#beeEnd'),
      feedback:$('#beeFeedback'),progress:$('#beeProgress'),summary:$('#beeSummary'),
      custom:$('#beeCustom'),file:$('#beeFile'),load:$('#beeLoad')};
    let master=[],list=[],idx=0,correct=0,total=0,incorrect=[],flags=new Set();
    let rec=null;

    async function initRec(){
      await pause(300);
      rec=window.AudioGuards?.getRecognition?.();
      if(rec){rec.interimResults=false;rec.maxAlternatives=1;rec.lang='en-US';}
      else console.warn('🎤 SpeechRecognition unavailable');
    }
    initRec();

    async function loadList(){
      if(master.length)return;
      try{
        const r=await fetch('/data/word-lists/spelling-bee.json',{cache:'no-store'});
        const d=await r.json();
        master=(Array.isArray(d?.words)?d.words:(Array.isArray(d)?d:[])).filter(Boolean);
      }catch{ master=['accommodate','rhythm','occurrence','necessary','embarrass']; }
    }
    function reset(){idx=0;correct=0;total=0;incorrect=[];flags.clear();els.summary.innerHTML='';}
    function progress(){setText(els.progress,`Word ${Math.min(idx+1,list.length)} of ${list.length}`);}
    function end(){summaryBox(els.summary,correct,total,incorrect,[...flags]);}

    function listen(){
      if(!rec)return;
      rec.onresult=null;rec.onerror=null;
      rec.onresult=e=>{
        const said=e.results?.[0]?.[0]?.transcript||''; grade(said);
      };
      rec.onerror=()=>setText(els.feedback,'Mic error');
      try{rec.stop();rec.start();}catch{}
    }
    function sayAndListen(){
      if(!list[idx])return;
      speak(list[idx]); progress(); listen();
    }
    function grade(said){
      const target=list[idx]; total++;
      const ok=sanitize(said)===sanitize(target);
      if(ok){correct++;setText(els.feedback,'✅ Correct');}
      else{incorrect.push(target);setText(els.feedback,`❌ ${target}`);}
      idx++; progress();
      setTimeout(()=> idx<list.length?sayAndListen():end(),600);
    }

    els.start?.addEventListener('click',async()=>{
      if(!requireAuth())return;
      await loadList();
      list=master.slice();
      if(!list.length)return setText(els.feedback,'No words available');
      reset(); sayAndListen();
    });
    els.say?.addEventListener('click',()=>{if(requireAuth())sayAndListen();});
    els.flag?.addEventListener('click',()=>{if(!requireAuth())return;
      const w=list[idx];if(!w)return;
      if(flags.has(w)){flags.delete(w);setText(els.feedback,`🚩 Removed “${w}”`);}
      else{flags.add(w);setText(els.feedback,`🚩 Flagged “${w}”`);}
    });
    els.end?.addEventListener('click',()=>{if(requireAuth())end();});

    els.load?.addEventListener('click',()=>{
      const t=(els.custom?.value||'').trim();
      if(!t)return alert('Paste words first');
      const arr=t.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length)return alert('No valid words');
      master=arr.slice(); setText(els.feedback,'Custom list loaded');
    });
    els.file?.addEventListener('change',async e=>{
      const f=e.target.files?.[0];if(!f)return;
      const tx=await f.text();const arr=tx.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length)return alert('No valid words'); master=arr.slice();
    });
  })();

  // --- School ---
  (function School(){
    const els={start:$('#schoolStart'),submit:$('#schoolSubmit'),flag:$('#schoolFlag'),
      end:$('#schoolEnd'),input:$('#schoolAnswer'),feedback:$('#schoolFeedback'),
      progress:$('#schoolProgress'),summary:$('#schoolSummary'),
      custom:$('#schoolCustom'),file:$('#schoolFile'),load:$('#schoolLoad')};
    let master=[],list=[],idx=0,correct=0,total=0,incorrect=[],flags=new Set();

    async function loadList(){
      if(master.length)return;
      try{
        const r=await fetch('/data/word-lists/school.json',{cache:'no-store'});
        const d=await r.json();
        master=(Array.isArray(d?.words)?d.words:(Array.isArray(d)?d:[])).filter(Boolean);
      }catch{ master=['apple','banana','computer','library','mountain']; }
    }
    function reset(){idx=0;correct=0;total=0;incorrect=[];flags.clear();els.summary.innerHTML='';}
    function progress(){setText(els.progress,`Word ${idx+1} of ${list.length}`); els.input?.focus();}
    function end(){summaryBox(els.summary,correct,total,incorrect,[...flags]);}

    function grade(){
      const t=list[idx]; const val=(els.input?.value||'').trim();
      const ok=sanitize(val)===sanitize(t);
      total++; if(ok){correct++;setText(els.feedback,'✅');}else{incorrect.push(t);setText(els.feedback,`❌ ${t}`);}
      if(els.input)els.input.value='';
      idx++; progress();
      setTimeout(()=> idx<list.length?(speak(list[idx]),progress()):end(),400);
    }

    els.start?.addEventListener('click',async()=>{
      if(!requireAuth())return;
      await loadList();
      list=master.slice();
      if(!list.length)return setText(els.feedback,'No words');
      reset(); speak(list[idx]); progress();
    });
    els.submit?.addEventListener('click',()=>{if(requireAuth())grade();});
    els.input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(requireAuth())grade();}});
    els.flag?.addEventListener('click',()=>{if(!requireAuth())return;
      const w=list[idx];if(!w)return;
      if(flags.has(w)){flags.delete(w);setText(els.feedback,`🚩 Removed “${w}”`);}
      else{flags.add(w);setText(els.feedback,`🚩 Flagged “${w}”`);}
    });
    els.end?.addEventListener('click',()=>{if(requireAuth())end();});

    els.load?.addEventListener('click',()=>{
      const t=(els.custom?.value||'').trim();
      if(!t)return alert('Paste words first');
      const arr=t.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length)return alert('No valid words');
      master=arr.slice(); setText(els.feedback,'Custom list loaded');
    });
    els.file?.addEventListener('change',async e=>{
      const f=e.target.files?.[0];if(!f)return;
      const tx=await f.text();const arr=tx.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length)return alert('No valid words'); master=arr.slice();
    });
  })();

  // --- OET ---
  (function OET(){
    const els={practice:$('#oetPractice'),exam:$('#oetExam'),start:$('#oetStart'),
      submit:$('#oetSubmit'),flag:$('#oetFlag'),end:$('#oetEnd'),input:$('#oetAnswer'),
      feedback:$('#oetFeedback'),progress:$('#oetProgress'),summary:$('#oetSummary'),
      custom:$('#oetCustom'),file:$('#oetFile'),load:$('#oetLoad')};
    let master=[],list=[],idx=0,correct=0,total=0,incorrect=[],flags=new Set(),isExam=false;

    async function loadList(){
      if(master.length)return;
      if(Array.isArray(window.OET_WORDS)&&window.OET_WORDS.length) master=window.OET_WORDS.slice();
      else{
        // dynamic retry (wait if file loads late)
        for(let i=0;i<10 && (!window.OET_WORDS||!window.OET_WORDS.length);i++) await pause(300);
        if(Array.isArray(window.OET_WORDS)&&window.OET_WORDS.length) master=window.OET_WORDS.slice();
        else master=['abdomen','anemia','antibiotic','artery','asthma','biopsy','catheter','diagnosis','embolism','fracture'];
      }
    }
    function reset(){idx=0;correct=0;total=0;incorrect=[];flags.clear();els.summary.innerHTML='';}
    function progress(){setText(els.progress,`Word ${idx+1} of ${list.length}`); els.input?.focus();}
    function end(){summaryBox(els.summary,correct,total,incorrect,[...flags]);}

    function grade(){
      const t=list[idx]; const val=(els.input?.value||'').trim();
      const ok=sanitize(val)===sanitize(t);
      total++; if(ok){correct++;setText(els.feedback,'✅');}else{incorrect.push(t);setText(els.feedback,`❌ ${t}`);}
      if(els.input)els.input.value='';
      idx++; progress();
      setTimeout(()=> idx<list.length?(speak(list[idx]),progress()):end(),400);
    }

    els.practice?.addEventListener('click',()=>{isExam=false;setText(els.feedback,'Practice mode');});
    els.exam?.addEventListener('click',()=>{isExam=true;setText(els.feedback,'Exam (24) mode');});
    els.start?.addEventListener('click',async()=>{
      if(!requireAuth())return;
      await loadList();
      if(!master.length)return setText(els.feedback,'No words');
      let base=master.slice();
      if(isExam) base.sort(()=>Math.random()-0.5);
      list=isExam?base.slice(0,24):base;
      reset(); speak(list[idx]); progress();
    });
    els.submit?.addEventListener('click',()=>{if(requireAuth())grade();});
    els.input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(requireAuth())grade();}});
    els.flag?.addEventListener('click',()=>{if(!requireAuth())return;
      const w=list[idx];if(!w)return;
      if(flags.has(w)){flags.delete(w);setText(els.feedback,`🚩 Removed “${w}”`);}
      else{flags.add(w);setText(els.feedback,`🚩 Flagged “${w}”`);}
    });
    els.end?.addEventListener('click',()=>{if(requireAuth())end();});

    els.load?.addEventListener('click',()=>{
      const t=(els.custom?.value||'').trim();
      if(!t)return alert('Paste words first');
      const arr=t.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length)return alert('No valid words');
      master=arr.slice(); setText(els.feedback,'Custom list loaded');
    });
    els.file?.addEventListener('change',async e=>{
      const f=e.target.files?.[0];if(!f)return;
      const tx=await f.text();const arr=tx.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
      if(!arr.length)return alert('No valid words'); master=arr.slice();
    });
  })();

})();
