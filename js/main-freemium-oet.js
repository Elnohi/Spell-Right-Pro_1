/* /js/main-freemium-oet.js - COMPLETE FIXED VERSION */
(() => {
  const $ = s => document.querySelector(s);
  const ui = {
    area: $('#answer'),
    submit: $('#btnSubmit'),
    upload: $('#fileInput'),
    start: $('#btnStart'),
    say: $('#btnSayAgain'),
    flag: $('#btnFlag'),
    end: $('#btnEnd'),
    progress: $('#progress'),
    feedback: $('#feedback'),
    customBox: $('#customWords'),
    useCustom: $('#useCustomList'),
    fileName: $('#fileName'),
    summary: $('.summary-area'),
    tabExam: $('#tabExam'),
    tabPractice: $('#tabPractice'),
    // FIXED: Added accent selection
    accentSelect: $('#oetAccent')
  };

  const state = { 
    words: [], 
    i: 0, 
    correct: [], 
    incorrect: [], 
    flags: new Set(), 
    active: false,
    isExam: false
  };

  function t(el, s) { if(el) el.textContent = s; }
  function norm(s) { return (s||'').toLowerCase().trim().replace(/[^\p{L}]+/gu, ''); }
  
  function showProgress() { 
    t(ui.progress, `Word ${Math.min(state.i + 1, state.words.length)} of ${state.words.length}`); 
  }

  function randomPick(arr, n) {
    if (arr.length <= n) return [...arr];
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  async function loadOETWords() {
    try {
      console.log("Loading OET words from external file...");
      
      if (typeof window.OET_WORDS !== 'undefined' && Array.isArray(window.OET_WORDS)) {
        console.log("Found OET_WORDS in global scope:", window.OET_WORDS.length, "words");
        return window.OET_WORDS;
      }
      
      const script = document.createElement('script');
      script.src = '/js/oet_word_list.js?v=' + Date.now();
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          console.log("OET words script loaded successfully");
          if (typeof window.OET_WORDS !== 'undefined' && Array.isArray(window.OET_WORDS)) {
            console.log("OET words loaded:", window.OET_WORDS.length, "words");
            resolve(window.OET_WORDS);
          } else {
            reject(new Error('OET_WORDS not found in loaded file'));
          }
        };
        
        script.onerror = () => {
          reject(new Error('Failed to load OET words script'));
        };
        
        document.head.appendChild(script);
      });
      
    } catch (error) {
      console.error("Failed to load OET words:", error);
      const fallbackWords = [
        'abdomen', 'anemia', 'antibiotic', 'artery', 'asthma', 'biopsy', 'catheter', 
        'diagnosis', 'embolism', 'fracture', 'gastroenterology', 'hemorrhage', 'intravenous', 
        'jaundice', 'kidney', 'laceration', 'membrane', 'neurology', 'obstetrics', 'pulmonary'
      ];
      console.log("Using fallback OET words:", fallbackWords.length, "words");
      return fallbackWords;
    }
  }

  function loadCustomWords(text) {
    try {
      const j = JSON.parse(text);
      return Array.isArray(j?.words) ? j.words : (Array.isArray(j) ? j : []);
    } catch(_) {
      return text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    }
  }

  // FIXED: Text-to-speech with accent support
  function speakWord(word) {
    if (!window.speechSynthesis) {
      t(ui.feedback, "Text-to-speech not supported in this browser");
      return;
    }
    
    try {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // FIXED: Use selected accent
      const selectedAccent = ui.accentSelect ? ui.accentSelect.value : 'en-US';
      utterance.lang = selectedAccent;
      
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => voice.lang.includes(selectedAccent)) || 
                           voices.find(voice => voice.lang.includes('en')) || 
                           voices[0];
      
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.onend = function() {
        console.log("Finished speaking:", word);
      };
      
      utterance.onerror = function(event) {
        console.error("Speech synthesis error:", event);
        t(ui.feedback, "Error speaking word");
      };
      
      speechSynthesis.speak(utterance);
      t(ui.feedback, "Speaking...");
      
    } catch (error) {
      console.error("Speech error:", error);
      t(ui.feedback, "Could not speak word");
    }
  }

  async function startSession() {
    const customText = (ui.customBox?.value || '').trim();
    let wordList = [];
    
    if (customText) {
      wordList = loadCustomWords(customText);
      t(ui.feedback, `Using custom list: ${wordList.length} words`);
    } else {
      t(ui.feedback, 'Loading OET words...');
      wordList = await loadOETWords();
      t(ui.feedback, `Loaded OET words: ${wordList.length} words`);
    }

    if (!wordList.length) {
      t(ui.feedback, 'No words available. Please provide a word list.');
      return;
    }

    if (state.isExam) {
      state.words = randomPick(wordList, 24);
      t(ui.feedback, `Exam mode: ${state.words.length} random words selected`);
    } else {
      state.words = [...wordList];
      t(ui.feedback, `Practice mode: All ${state.words.length} words loaded`);
    }

    state.i = 0;
    state.correct = [];
    state.incorrect = [];
    state.flags.clear();
    state.active = true;

    if (ui.summary) ui.summary.style.display = 'none';

    showProgress();
    
    setTimeout(() => {
      speakCurrentWord();
    }, 1000);
  }

  function speakCurrentWord() {
    if (!state.active || state.i >= state.words.length) return;
    const word = state.words[state.i];
    if (word) speakWord(word);
  }

  function checkAnswer() {
    if (!state.active || state.i >= state.words.length) return;
    
    const target = state.words[state.i];
    const answer = (ui.area?.value || '').trim();

    if (!answer) {
      t(ui.feedback, 'Please type your answer before submitting.');
      return;
    }

    const isCorrect = norm(answer) === norm(target);
    
    if (isCorrect) {
      state.correct.push(target);
      t(ui.feedback, '✅ Correct!');
    } else {
      state.incorrect.push({ word: target, answer: answer });
      t(ui.feedback, `❌ Incorrect. The correct spelling is: ${target}`);
    }

    if (ui.area) ui.area.value = '';

    state.i++;
    if (state.i < state.words.length) {
      showProgress();
      setTimeout(speakCurrentWord, 1500);
    } else {
      endSession();
    }
  }

  function toggleFlag() {
    if (!state.active || state.i >= state.words.length) return;
    const word = state.words[state.i];
    if (state.flags.has(word)) {
      state.flags.delete(word);
      t(ui.feedback, `🚩 Removed flag from "${word}"`);
    } else {
      state.flags.add(word);
      t(ui.feedback, `🚩 Flagged "${word}" for review`);
    }
  }

  function endSession() {
    state.active = false;
    speechSynthesis.cancel();

    const total = state.words.length;
    const correctCount = state.correct.length;
    const incorrectCount = state.incorrect.length;
    const flaggedWords = [...state.flags];

    let summaryHTML = `
      <div style="background: rgba(0,0,0,0.05); padding: 20px; border-radius: 10px;">
        <h3 style="margin-top: 0; color: #7b2ff7;">OET Session Complete! 🎉</h3>
        <p style="font-size: 1.2em; font-weight: bold; color: #7b2ff7;">Score: ${correctCount}/${total} correct</p>
    `;

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
            <small style="color: #666;">You typed: "${item.answer}"</small>
          </div>
        `;
      });
      
      summaryHTML += `</div></div>`;
    }

    if (flaggedWords.length > 0) {
      summaryHTML += `
        <div style="margin: 20px 0;">
          <h4 style="color: #ffd166; margin-bottom: 10px;">🚩 Flagged Words (${flaggedWords.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
      `;
      
      flaggedWords.forEach(word => {
        summaryHTML += `
          <div style="background: rgba(255, 209, 102, 0.1); padding: 10px 15px; border-radius: 8px; border-left: 4px solid #ffd166;">
            ${word}
          </div>
        `;
      });
      
      summaryHTML += `</div></div>`;
    }

    if (state.incorrect.length === 0 && correctCount > 0) {
      summaryHTML += `
        <div style="margin: 20px 0; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
          <h4 style="color: #4CAF50; margin-bottom: 10px;">✅ Perfect! All ${correctCount} words correct!</h4>
        </div>
      `;
    }

    summaryHTML += `
      <div style="text-align: center; margin-top: 25px;">
        <button onclick="restartOETTraining()" style="background: #7b2ff7; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem;">
          🔄 Start New Session
        </button>
      </div>
    `;

    summaryHTML += `</div>`;
    
    if (ui.summary) {
      ui.summary.innerHTML = summaryHTML;
      ui.summary.style.display = 'block';
    }
    
    t(ui.feedback, `Session completed! Check results below.`);
  }

  function restartOETTraining() {
    state.i = 0;
    state.correct = [];
    state.incorrect = [];
    state.flags.clear();
    if (ui.summary) ui.summary.style.display = 'none';
    if (ui.area) ui.area.value = '';
    t(ui.feedback, 'Ready to start new session');
    showProgress();
  }

  function setupEventListeners() {
    if (ui.start) ui.start.addEventListener('click', startSession);
    if (ui.submit) ui.submit.addEventListener('click', checkAnswer);
    if (ui.say) ui.say.addEventListener('click', speakCurrentWord);
    if (ui.flag) ui.flag.addEventListener('click', toggleFlag);
    if (ui.end) ui.end.addEventListener('click', endSession);

    if (ui.area) {
      ui.area.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkAnswer();
        }
      });
    }

    if (ui.upload) {
      ui.upload.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (ui.fileName) ui.fileName.textContent = file.name;

        try {
          const text = await file.text();
          const words = loadCustomWords(text);
          state.words = words;
          t(ui.feedback, `Loaded ${words.length} words from file. Ready to start!`);
        } catch (error) {
          t(ui.feedback, 'Error reading file. Please try again.');
        }
      });
    }

    if (ui.tabExam) {
      ui.tabExam.addEventListener('click', () => {
        state.isExam = true;
        ui.tabExam.classList.add('active');
        if (ui.tabPractice) ui.tabPractice.classList.remove('active');
        t(ui.feedback, 'Exam mode selected (24 random words)');
      });
    }

    if (ui.tabPractice) {
      ui.tabPractice.addEventListener('click', () => {
        state.isExam = false;
        ui.tabPractice.classList.add('active');
        if (ui.tabExam) ui.tabExam.classList.remove('active');
        t(ui.feedback, 'Practice mode selected (full word list)');
      });
    }

    if (ui.useCustom) {
      ui.useCustom.addEventListener('click', () => {
        const customText = (ui.customBox?.value || '').trim();
        if (!customText) {
          t(ui.feedback, 'Please enter words in the custom words box first.');
          return;
        }
        const words = loadCustomWords(customText);
        state.words = words;
        t(ui.feedback, `Custom list loaded: ${words.length} words. Ready to start!`);
      });
    }
  }

  function initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = function() {
        console.log("Voices loaded:", speechSynthesis.getVoices().length);
      };
    }
  }

  function initializeDarkModeToggle() {
    const darkModeToggle = document.getElementById('toggleDark');
    if (!darkModeToggle) return;

    const icon = darkModeToggle.querySelector('i');
    const isDark = document.body.classList.contains('dark-mode');
    if (icon) icon.className = isDark ? 'fa fa-sun' : 'fa fa-moon';

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
      if (icon) icon.className = 'fa fa-sun';
    }
  }

  function initialize() {
    setupEventListeners();
    initializeSpeechSynthesis();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeDarkModeToggle);
    } else {
      initializeDarkModeToggle();
    }

    if (ui.tabPractice) {
      ui.tabPractice.classList.add('active');
      state.isExam = false;
    }

    window.restartOETTraining = restartOETTraining;

    console.log('OET Spelling Trainer ready - Fixed with accent support');
  }

  initialize();
})();
