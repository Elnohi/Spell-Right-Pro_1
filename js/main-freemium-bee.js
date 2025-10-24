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

  // FIXED: Enhanced speech synthesis
  function speakWord(word) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        t(els.feedback, '🎤 Text-to-speech not supported in this browser');
        resolve();
        return;
      }

      try {
        speechSynthesis.cancel(); // Cancel any ongoing speech
        
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Get available voices
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Prefer UK English voice, fallback to any English voice
          const ukVoice = voices.find(v => v.lang.includes('en-GB')) || 
                         voices.find(v => v.lang.includes('en-US')) || 
                         voices[0];
          utterance.voice = ukVoice;
        }
        
        utterance.onend = () => {
          console.log('Finished speaking:', word);
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('Speech error:', event);
          t(els.feedback, '⚠️ Speech error. Continuing...');
          resolve();
        };
        
        speechSynthesis.speak(utterance);
        t(els.feedback, '🎧 Listening...');
        
      } catch (error) {
        console.error('Speech synthesis failed:', error);
        t(els.feedback, '⚠️ Could not speak word');
        resolve();
      }
    });
  }

  // FIXED: Enhanced speech recognition
  function listenForWord(w) {
    return new Promise((resolve) => {
      // Check for speech recognition support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        t(els.feedback, '🎤 Speech recognition not supported. Use typing instead.');
        resolve(false);
        return;
      }

      if (state.recognizing) {
        resolve(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      state.recognizing = true;

      let gotResult = false;
      const timer = setTimeout(() => {
        if (!gotResult) {
          recognition.stop();
          t(els.feedback, '⏱️ No speech detected. Try again.');
          state.recognizing = false;
          resolve(false);
        }
      }, 7000);

      recognition.onresult = (event) => {
        gotResult = true;
        clearTimeout(timer);
        
        const said = event.results[0][0].transcript || '';
        const isCorrect = norm(said) === norm(w);
        
        if (isCorrect) {
          t(els.feedback, '✅ Correct!');
          state.correct.push(w);
        } else {
          t(els.feedback, `❌ Incorrect - Said: "${said}", Correct: "${w}"`);
          state.incorrect.push(w);
        }
        
        state.recognizing = false;
        resolve(isCorrect);
      };

      recognition.onerror = (event) => {
        clearTimeout(timer);
        console.error('Recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          t(els.feedback, '⚠️ Microphone access denied. Check permissions.');
        } else {
          t(els.feedback, '⚠️ Recognition error. Try again.');
        }
        
        state.recognizing = false;
        resolve(false);
      };

      recognition.onend = () => {
        if (!gotResult) {
          clearTimeout(timer);
          state.recognizing = false;
          resolve(false);
        }
      };

      try {
        recognition.start();
      } catch (error) {
        console.error('Recognition start failed:', error);
        t(els.feedback, '⚠️ Could not start recognition');
        state.recognizing = false;
        resolve(false);
      }
    });
  }

  async function loadWords(){
    try{
      const r = await fetch(`${LIST}?v=${Date.now()}`, {cache:'no-store'});
      if(!r.ok) throw 0; const j = await r.json();
      const arr = Array.isArray(j?.words)? j.words : Array.isArray(j) ? j : [];
      return arr.length?arr:FALLBACK;
    }catch(_){ return FALLBACK; }
  }
  
  function show(){ 
    const n=state.words.length; 
    t(els.progress, `Word ${Math.min(state.i+1,n)} of ${n}`); 
  }
  
  async function play(){
    if(!state.active) return;
    
    const w=state.words[state.i]; 
    if(!w) return;
    
    show(); 
    t(els.feedback,'🎧 Speaking...');
    
    await speakWord(w);
    const isCorrect = await listenForWord(w);
    
    // Auto-advance after short delay
    if(isCorrect) {
      setTimeout(() => {
        if(state.i < state.words.length - 1) {
          state.i++;
          play();
        } else {
          endSession();
        }
      }, 1500);
    }
  }

  function endSession(){
    state.active=false; 
    speechSynthesis.cancel();
    
    const flagged=[...state.flags];
    const lines=[
      `Session Complete`,
      `✅ ${state.correct.length} correct`,
      `❌ ${state.incorrect.length} incorrect`,
      flagged.length ? `🚩 ${flagged.join(', ')}` : 'No words flagged'
    ];
    
    t(els.feedback, lines.join(' • '));
  }

  // Initialize speech synthesis
  function initializeSpeech() {
    if ('speechSynthesis' in window) {
      // Preload voices
      speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('Voices loaded:', speechSynthesis.getVoices().length);
      };
    }
  }

  els.start?.addEventListener('click', async ()=>{
    // Initialize speech
    initializeSpeech();
    
    state.words = await loadWords();
    if(!state.words.length){ t(els.feedback,'No words loaded.'); return; }
    
    state.i=0; state.flags.clear(); state.correct=[]; state.incorrect=[]; state.active=true;
    play();
  });
  
  els.next && els.next.addEventListener('click', ()=>{ 
    if(!state.active) return;
    if(state.i<state.words.length-1){ state.i++; play(); } 
    else { endSession(); }
  });
  
  els.prev && els.prev.addEventListener('click', ()=>{ 
    if(!state.active) return; 
    if(state.i>0){ state.i--; play(); } 
  });
  
  els.flag && els.flag.addEventListener('click', ()=>{ 
    if(!state.active) return; 
    const w=state.words[state.i]; 
    if(!w) return;
    
    if(state.flags.has(w)){ 
      state.flags.delete(w); 
      t(els.feedback,`🚩 Removed flag on "${w}"`); 
    } else { 
      state.flags.add(w); 
      t(els.feedback,`🚩 Flagged "${w}"`); 
    }
  });
  
  els.say && els.say.addEventListener('click', ()=>{ 
    if(!state.active) return; 
    const w = state.words[state.i];
    if(w) speakWord(w);
  });
  
  els.end && els.end.addEventListener('click', endSession);

  // Consistent Dark Mode Toggle
  function initializeDarkModeToggle() {
    const darkModeToggle = document.getElementById('toggleDark');
    if (!darkModeToggle) return;

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
      localStorage.setItem('dark', document.body.classList.contains('dark-mode'));
    });

    const savedDarkMode = localStorage.getItem('dark') === 'true';
    if (savedDarkMode && !document.body.classList.contains('dark-mode')) {
      document.body.classList.add('dark-mode');
      const icon = darkModeToggle.querySelector('i');
      if (icon) {
        icon.className = 'fa fa-sun';
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDarkModeToggle);
  } else {
    initializeDarkModeToggle();
  }

  console.log('Bee ready - Speech enhanced');
})();
