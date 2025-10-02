// SpellRightPro — Freemium Bee (fixed)
(() => {
  'use strict';

  const state = {
    words: [],
    current: 0,
    correct: 0,
    attempts: 0,
    accent: 'us',
    addedTodayKey: 'bee_custom_date'
  };

  const els = {};
  const synth = window.speechSynthesis;

  function $(id) { return document.getElementById(id); }

  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function canAddCustom(){ return localStorage.getItem(state.addedTodayKey) !== todayISO(); }
  function markCustom(){ localStorage.setItem(state.addedTodayKey, todayISO()); }

  function speak(word){
    try{
      synth.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = state.accent === 'uk' ? 'en-GB' : state.accent === 'au' ? 'en-AU' : 'en-US';
      synth.speak(u);
    }catch(e){}
  }

  function parseTextarea(){
    const ta = $('words-textarea');
    if(!ta || !ta.value.trim()) return [];
    return ta.value.split(/[\s,;\n]+/).map(w=>w.trim()).filter(Boolean);
  }

  function ensureWordsThenStart(){
    if(state.words.length === 0){
      // load sample list if user added nothing (#4)
      fetch('/data/spelling-bee.json',{cache:'no-cache'})
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          state.words = Array.isArray(data) ? data.slice(0, 10) : [
            'example','spelling','practice','education','learning',
            'knowledge','vocabulary','language','pronunciation','exercise'
          ];
          startGame();
        })
        .catch(() => {
          state.words = ['example','spelling','practice','education','learning',
            'knowledge','vocabulary','language','pronunciation','exercise'];
          startGame();
        });
    } else {
      startGame();
    }
  }

  function startGame(){
    state.current = 0;
    $('home-page').style.display = 'none';
    $('game-page').style.display = 'block';
    updateProgress();
    loadWord();
  }

  function updateProgress(){
    const total = state.words.length || 10;
    $('progress-count') && ($('progress-count').textContent = `${state.current}/${total}`);
    $('correct-count') && ($('correct-count').textContent = state.correct);
    $('attempts-count') && ($('attempts-count').textContent = state.attempts);
    $('word-progress') && ($('word-progress').textContent = `Word ${state.current+1} of ${total}`);
  }

  function loadWord(){
    const word = state.words[state.current] || '';
    $('spelling-input').value = '';
    speak(word);
  }

  function repeat(){ speak(state.words[state.current] || ''); }

  function previous(){
    if(state.current>0){ state.current--; updateProgress(); loadWord(); }
  }

  function check(){
    const input = $('spelling-input').value.trim();
    const word = (state.words[state.current] || '').trim();
    state.attempts++;
    if(input.toLowerCase() === word.toLowerCase()){
      state.correct++;
      setFeedback(`✅ ${word}`, true);
      next();
    }else{
      setFeedback(`❌ ${input} → ${word}`, false);
    }
    updateProgress();
  }

  function next(){
    state.current++;
    if(state.current >= state.words.length){
      finish();
    }else{
      updateProgress();
      loadWord();
    }
  }

  function finish(){
    $('game-page').style.display = 'none';
    $('results-page').style.display = 'block';
    $('summary-area').innerHTML = `
      <p><strong>Correct:</strong> ${state.correct}</p>
      <p><strong>Attempts:</strong> ${state.attempts}</p>
    `;
  }

  function setFeedback(text, ok){
    const el = $('feedback-area');
    if(!el) return;
    el.textContent = text;
    el.style.color = ok ? '#16a34a' : '#ef4444';
    el.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function addWordsFromTextarea(){
    const list = parseTextarea();
    if(!list.length){ alert('Enter some words first.'); return; }
    if(!canAddCustom()){ alert('Freemium: one custom list per day.'); return; }
    state.words = list.slice(0, 50);
    $('words-textarea').value = '';
    markCustom();
    alert(`Added ${state.words.length} words.`);
  }

  function addWordsFromFile(file){
    if(!file) return;
    if(!canAddCustom()){ alert('Freemium: one custom list per day.'); return; }
    const r = new FileReader();
    r.onload = () => {
      const txt = String(r.result||'');
      const words = txt.split(/\r?\n|,|;|\t| /).map(w=>w.trim()).filter(Boolean);
      if(!words.length){ alert('No words found in file.'); return; }
      state.words = words.slice(0, 50);
      markCustom();
      alert(`Uploaded ${state.words.length} words.`);
    };
    r.readAsText(file);
  }

  function bind(){
    // buttons
    $('start-button')?.addEventListener('click', () => {
      if(state.words.length===0){
        // If user typed words but didn’t click Add Words, accept them on Start too
        const typed = parseTextarea();
        if(typed.length){ state.words = typed.slice(0,50); }
      }
      ensureWordsThenStart();
    });

    $('prev-button')?.addEventListener('click', previous);
    $('repeat-button')?.addEventListener('click', repeat);
    $('submit-button')?.addEventListener('click', check);
    $('spelling-input')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); check(); } });

    // accent
    document.querySelectorAll('.accent-btn').forEach(b=>{
      b.addEventListener('click', ()=>{
        document.querySelectorAll('.accent-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        state.accent = b.dataset.accent || 'us';
      });
    });

    // custom words
    $('add-words-btn')?.addEventListener('click', addWordsFromTextarea);
    $('file-input')?.addEventListener('change', e => addWordsFromFile(e.target.files?.[0]));

    // premium
    document.querySelectorAll('a[href="/premium.html"], #premium-button, #premium-main-btn')
      .forEach(el => el.addEventListener('click', (e)=>{
        // ensure navigation instead of alert
        if(el.tagName !== 'A'){ e.preventDefault(); window.location.href='/premium.html'; }
      }));
  }

  document.addEventListener('DOMContentLoaded', bind);
})();
