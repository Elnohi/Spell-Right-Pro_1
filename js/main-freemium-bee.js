/* /js/main-freemium-bee.js - FIXED VERSION */
(() => {
  const $ = s => document.querySelector(s);
  const els = {
    start:  $('#btnStart'),
    flag:   $('#btnFlag'),
    end:    $('#btnEnd'),
    say:    $('#btnSayAgain'),
    progress: $('#progress'),
    feedback: $('#feedback'),
    customBox: $('#customWords'),
    fileInput: $('#fileInput'),
    useCustom: $('#useCustomList'),
    fileName: $('#fileName'),
    summary: $('.summary-area')
  };

  const LIST = '/data/word-lists/spelling-bee.json';
  const FALLBACK = ['accommodate','rhythm','occurrence','necessary','embarrass','challenge','definitely','separate','recommend','privilege'];

  const state = { 
    words: [], 
    i: 0, 
    flags: new Set(), 
    correct: [], 
    incorrect: [], 
    active: false, 
    recognizing: false 
  };

  function t(el, s) { if (el) el.textContent = s; }
  const norm = s => (s || '').toLowerCase().replace(/[^\p{L}]+/gu, '');

  // FIXED: Enhanced speech synthesis
  function speakWord(word) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        t(els.feedback, '🎤 Text-to-speech not supported in this browser');
        resolve();
        return;
      }

      try {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
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

  // FIXED: Enhanced speech recognition with AUTO-ADVANCE
  function listenForWord(w) {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        t(els.feedback, '🎤 Speech recognition not supported.');
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
          state.incorrect.push({ word: w, answer: said });
        }
        
        state.recognizing = false;
        
        // FIXED: AUTO-ADVANCE after result
        setTimeout(() => {
          if (state.i < state.words.length - 1) {
            state.i++;
            play();
          } else {
            endSession();
          }
        }, 1500);
        
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

  async function loadWords() {
    try {
      const r = await fetch(`${LIST}?v=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed to fetch');
      const j = await r.json();
      const arr = Array.isArray(j?.words) ? j.words : (Array.isArray(j) ? j : []);
      return arr.length ? arr : FALLBACK;
    } catch (_) { 
      return FALLBACK; 
    }
  }

  function loadCustomWords(text) {
    try {
      const j = JSON.parse(text);
      return Array.isArray(j?.words) ? j.words : (Array.isArray(j) ? j : []);
    } catch (_) {
      return text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    }
  }
  
  function showProgress() { 
    const n = state.words.length; 
    t(els.progress, `Word ${Math.min(state.i + 1, n)} of ${n}`); 
  }
  
  async function play() {
    if (!state.active) return;
    
    const w = state.words[state.i]; 
    if (!w) return;
    
    showProgress(); 
    t(els.feedback, '🎧 Speaking...');
    
    await speakWord(w);
    await listenForWord(w);
  }

  function endSession() {
    state.active = false; 
    speechSynthesis.cancel();
    
    const flagged = [...state.flags];
    const total = state.words.length;
    const correctCount = state.correct.length;
    const incorrectCount = state.incorrect.length;

    let summaryHTML = `
      <div style="background: rgba(0,0,0,0.05); padding: 20px; border-radius: 10px;">
        <h3 style="margin-top: 0; color: #7b2ff7;">Bee Session Complete! 🎉</h3>
        <p style="font-size: 1.2em; font-weight: bold; color: #7b2ff7;">Score: ${correctCount}/${total} correct</p>
    `;

    // Show incorrect words
    if (state.incorrect.length > 0) {
      summaryHTML += `
        <div style="margin: 20px 0;">
          <h4 style="color: #f72585; margin-bottom: 10px;">❌ Incorrect Words (${state.incorrect.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">
      `;
      
      state.incorrect.forEach(item => {
        summaryHTML += `
          <div style="background: rgba(247, 37, 133, 0.1); padding: 10px 15px; border-radius: 8px; border-left: 4px solid #f72585;">
            <strong style="color: #f72585;">${item.word}</strong><br>
            <small style="color: #666;">You said: "${item.answer}"</small>
          </div>
        `;
      });
      
      summaryHTML += `</div></div>`;
    }

    // Show flagged words
    if (flagged.length > 0) {
      summaryHTML += `
        <div style="margin: 20px 0;">
          <h4 style="color: #ffd166; margin-bottom: 10px;">🚩 Flagged Words (${flagged.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
      `;
      
      flagged.forEach(word => {
        summaryHTML += `
          <div style="background: rgba(255, 209, 102, 0.1); padding: 10px 15px; border-radius: 8px; border-left: 4px solid #ffd166;">
            ${word}
          </div>
        `;
      });
      
      summaryHTML += `</div></div>`;
    }

    // Restart button
    summaryHTML += `
      <div style="text-align: center; margin-top: 25px;">
        <button onclick="restartBeeTraining()" style="background: #7b2ff7; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem;">
          🔄 Start New Session
        </button>
      </div>
    `;

    summaryHTML += `</div>`;
    
    if (els.summary) {
      els.summary.innerHTML = summaryHTML;
      els.summary.style.display = 'block';
    }
  }

  function toggleFlag() {
    if (!state.active) return; 
    const w = state.words[state.i]; 
    if (!w) return;
    
    if (state.flags.has(w)) { 
      state.flags.delete(w); 
      t(els.feedback, `🚩 Removed flag on "${w}"`); 
    } else { 
      state.flags.add(w); 
      t(els.feedback, `🚩 Flagged "${w}"`); 
    }
  }

  function restartBeeTraining() {
    state.i = 0;
    state.correct = [];
    state.incorrect = [];
    state.flags.clear();
    if (els.summary) els.summary.style.display = 'none';
    t(els.feedback, 'Ready to start new session');
    showProgress();
  }

  // Initialize speech synthesis
  function initializeSpeech() {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('Voices loaded:', speechSynthesis.getVoices().length);
      };
    }
  }

  // Event listeners
  els.start?.addEventListener('click', async () => {
    initializeSpeech();
    
    const customText = (els.customBox?.value || '').trim();
    if (customText) {
      state.words = loadCustomWords(customText);
      t(els.feedback, `Custom list loaded: ${state.words.length} words`);
    } else {
      state.words = await loadWords();
      t(els.feedback, `Bee words loaded: ${state.words.length} words`);
    }
    
    if (!state.words.length) { 
      t(els.feedback, 'No words loaded.'); 
      return; 
    }
    
    state.i = 0; 
    state.flags.clear(); 
    state.correct = []; 
    state.incorrect = []; 
    state.active = true;
    
    if (els.summary) els.summary.style.display = 'none';
    
    play();
  });
  
  els.flag?.addEventListener('click', toggleFlag);
  
  els.say?.addEventListener('click', () => { 
    if (!state.active) return; 
    const w = state.words[state.i];
    if (w) speakWord(w);
  });
  
  els.end?.addEventListener('click', endSession);

  // File upload handler
  els.fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (els.fileName) {
      els.fileName.textContent = file.name;
    }

    try {
      const text = await file.text();
      const words = loadCustomWords(text);
      state.words = words;
      t(els.feedback, `Loaded ${words.length} words from file. Ready to start!`);
    } catch (error) {
      t(els.feedback, 'Error reading file. Please try again.');
    }
  });

  // Custom list handler
  els.useCustom?.addEventListener('click', () => {
    const customText = (els.customBox?.value || '').trim();
    if (!customText) {
      t(els.feedback, 'Please enter words in the custom words box first.');
      return;
    }
    const words = loadCustomWords(customText);
    state.words = words;
    t(els.feedback, `Custom list loaded: ${words.length} words. Ready to start!`);
  });

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

  // Make restart function globally available
  window.restartBeeTraining = restartBeeTraining;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDarkModeToggle);
  } else {
    initializeDarkModeToggle();
  }

  console.log('Bee ready - Fixed with auto-advance');
})();
