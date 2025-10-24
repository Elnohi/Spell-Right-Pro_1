/* /js/main-freemium-oet.js */
(() => {
  const $ = s => document.querySelector(s);
  const ui = {
    area: document.querySelector('#answer') || (()=>{
      const ta=document.createElement('textarea'); 
      ta.id='answer'; 
      ta.placeholder='Type the spelling here…'; 
      ta.style.width='100%'; 
      ta.style.minHeight='56px'; 
      ta.style.borderRadius='10px'; 
      ta.style.padding='12px'; 
      (document.querySelector('.training-card')||document.body).appendChild(ta); 
      return ta;
    })(),
    submit: document.querySelector('#btnSubmit') || (()=>{
      const b=document.createElement('button'); 
      b.id='btnSubmit'; 
      b.textContent='Submit'; 
      b.className='btn-secondary'; 
      (document.querySelector('.button-group')||document.querySelector('.training-card')||document.body).appendChild(b); 
      return b;
    })(),
    upload: document.querySelector('#fileInput') || (()=>{
      const i=document.createElement('input'); 
      i.type='file'; 
      i.accept='.txt,.json'; 
      i.id='fileInput'; 
      i.style.marginTop='8px'; 
      (document.querySelector('.training-card')||document.body).appendChild(i); 
      return i;
    })(),
    start:  document.querySelector('[data-action="start"], #btnStart'),
    say:    document.querySelector('[data-action="say"],   #btnSay'),
    progress: document.querySelector('[data-role="progress"]') || (()=>{
      const d=document.createElement('div'); 
      d.setAttribute('data-role','progress'); 
      d.style.fontWeight='700'; 
      d.style.marginTop='8px'; 
      (document.querySelector('.training-card')||document.body).prepend(d); 
      return d;
    })(),
    feedback: document.querySelector('[data-role="feedback"]') || (()=>{
      const d=document.createElement('div'); 
      d.setAttribute('data-role','feedback'); 
      d.style.minHeight='22px'; 
      d.style.marginTop='8px'; 
      (document.querySelector('.training-card')||document.body).appendChild(d); 
      return d;
    })(),
    testTypeExam: document.querySelector('input[name="testType"][value="exam"]'),
    testTypePractice: document.querySelector('input[name="testType"][value="practice"]'),
    // OET specific elements
    tabExam: document.querySelector('[data-test-type="exam"]'),
    tabPractice: document.querySelector('[data-test-type="practice"]'),
    customBox: document.querySelector('#customWords'),
    useCustom: document.querySelector('#useCustomList')
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

  // FIXED: Proper random pick for exam mode
  function randomPick(arr, n) {
    if (arr.length <= n) return [...arr];
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  // FIXED: OET words loading from external file
  async function loadOETWords() {
    try {
      console.log("Loading OET words from external file...");
      
      // Method 1: Check if OET_WORDS is already available globally
      if (typeof window.OET_WORDS !== 'undefined' && Array.isArray(window.OET_WORDS)) {
        console.log("Found OET_WORDS in global scope:", window.OET_WORDS.length, "words");
        return window.OET_WORDS;
      }
      
      // Method 2: Load the external JS file
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
      // Fallback to embedded word list
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

  // FIXED: Text-to-speech with proper implementation
  function speakWord(word) {
    if (!window.speechSynthesis) {
      t(ui.feedback, "Text-to-speech not supported in this browser");
      return;
    }
    
    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Get available voices and try to use a UK English voice
      const voices = speechSynthesis.getVoices();
      const ukVoice = voices.find(voice => voice.lang.includes('en-GB')) || 
                     voices.find(voice => voice.lang.includes('en-US')) || 
                     voices[0];
      
      if (ukVoice) {
        utterance.voice = ukVoice;
      }
      
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

  // FIXED: Proper exam/practice mode handling
  async function startSession() {
    // Determine if custom words are provided
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

    // FIXED: Proper exam/practice mode handling
    if (state.isExam) {
      // Exam mode: Exactly 24 random words
      state.words = randomPick(wordList, 24);
      t(ui.feedback, `Exam mode: ${state.words.length} random words selected`);
    } else {
      // Practice mode: Use all words
      state.words = [...wordList];
      t(ui.feedback, `Practice mode: All ${state.words.length} words loaded`);
    }

    state.i = 0;
    state.correct = [];
    state.incorrect = [];
    state.flags.clear();
    state.active = true;

    showProgress();
    
    // Wait a moment then speak the first word
    setTimeout(() => {
      speakCurrentWord();
    }, 1000);
  }

  function speakCurrentWord() {
    if (!state.active || state.i >= state.words.length) return;
    const word = state.words[state.i];
    if (word) {
      speakWord(word);
    }
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

    // Clear input for next word
    if (ui.area) ui.area.value = '';

    // Move to next word or end session
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

  // FIXED: Enhanced summary showing actual words
  function endSession() {
    state.active = false;
    speechSynthesis.cancel();

    const total = state.words.length;
    const correctCount = state.correct.length;
    const incorrectCount = state.incorrect.length;
    const flaggedWords = [...state.flags];

    let summaryHTML = `
      <div style="background: rgba(0,0,0,0.05); padding: 20px; border-radius: 10px; margin-top: 20px;">
        <h3 style="margin-top: 0;">Session Complete!</h3>
        <p><strong>Score:</strong> ${correctCount}/${total} correct</p>
    `;

    // Show incorrect words with user's answers
    if (state.incorrect.length > 0) {
      summaryHTML += `
        <div style="margin: 15px 0;">
          <h4 style="color: #f72585; margin-bottom: 10px;">❌ Incorrect Words (${state.incorrect.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px;">
      `;
      
      state.incorrect.forEach(item => {
        summaryHTML += `
          <div style="background: rgba(247, 37, 133, 0.1); padding: 8px 12px; border-radius: 6px; border-left: 4px solid #f72585;">
            <strong>${item.word}</strong><br>
            <small>You typed: "${item.answer}"</small>
          </div>
        `;
      });
      
      summaryHTML += `</div></div>`;
    }

    // Show flagged words
    if (flaggedWords.length > 0) {
      summaryHTML += `
        <div style="margin: 15px 0;">
          <h4 style="color: #ffd166; margin-bottom: 10px;">🚩 Flagged Words (${flaggedWords.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
      `;
      
      flaggedWords.forEach(word => {
        summaryHTML += `
          <div style="background: rgba(255, 209, 102, 0.1); padding: 8px 12px; border-radius: 6px; border-left: 4px solid #ffd166;">
            ${word}
          </div>
        `;
      });
      
      summaryHTML += `</div></div>`;
    }

    summaryHTML += `</div>`;
    
    // Create or update summary element
    let summaryElement = document.querySelector('.summary-area');
    if (!summaryElement) {
      summaryElement = document.createElement('div');
      summaryElement.className = 'summary-area';
      document.querySelector('.main-card').appendChild(summaryElement);
    }
    
    summaryElement.innerHTML = summaryHTML;
    summaryElement.classList.remove('hidden');
    
    t(ui.feedback, `Session completed! Check results below.`);
  }

  function setupEventListeners() {
    // Start session
    if (ui.start) {
      ui.start.addEventListener('click', startSession);
    }

    // Submit answer
    if (ui.submit) {
      ui.submit.addEventListener('click', checkAnswer);
    }

    // Enter key to submit
    if (ui.area) {
      ui.area.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkAnswer();
        }
      });
    }

    // Say again
    if (ui.say) {
      ui.say.addEventListener('click', speakCurrentWord);
    }

    // File upload
    if (ui.upload) {
      ui.upload.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

    // Exam/Practice mode toggle
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

    // Custom list handler
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

    // Flag button
    const flagBtn = document.querySelector('#btnFlag');
    if (flagBtn) {
      flagBtn.addEventListener('click', toggleFlag);
    }

    // End button
    const endBtn = document.querySelector('#btnEnd');
    if (endBtn) {
      endBtn.addEventListener('click', endSession);
    }
  }

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

    // Load saved preference
    const savedDarkMode = localStorage.getItem('dark') === 'true';
    if (savedDarkMode && !document.body.classList.contains('dark-mode')) {
      document.body.classList.add('dark-mode');
      const icon = darkModeToggle.querySelector('i');
      if (icon) {
        icon.className = 'fa fa-sun';
      }
    }
  }

  // Initialize speech synthesis voices
  function initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      // Some browsers need this to populate voices
      speechSynthesis.getVoices();
      
      // Chrome needs this event to load voices
      window.speechSynthesis.onvoiceschanged = function() {
        console.log("Voices loaded:", speechSynthesis.getVoices().length);
      };
    }
  }

  // Initialize the application
  function initialize() {
    setupEventListeners();
    initializeSpeechSynthesis();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeDarkModeToggle);
    } else {
      initializeDarkModeToggle();
    }

    // Set default mode
    if (ui.tabPractice) {
      ui.tabPractice.classList.add('active');
      state.isExam = false;
    }

    console.log('OET Spelling Trainer ready');
  }

  // Start the application
  initialize();

})();
