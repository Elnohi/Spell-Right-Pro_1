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

  const LIST = '/data/word-lists/oet.json';
  const FALLBACK = ['abdomen','anemia','antibiotic','artery','asthma','biopsy','catheter','diagnosis','embolism','fracture'];
  
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
    const a = [...arr]; 
    const out = [];
    while(out.length < Math.min(n, a.length)) {
      const i = Math.floor(Math.random() * a.length); 
      out.push(a.splice(i, 1)[0]);
    }
    return out;
  }

  async function loadDefaultWords() {
    try {
      const r = await fetch(`${LIST}?v=${Date.now()}`, { cache: 'no-store' });
      if(!r.ok) throw new Error('Network response was not ok');
      const j = await r.json();
      const arr = Array.isArray(j?.words) ? j.words : (Array.isArray(j) ? j : []);
      return arr.length ? arr : FALLBACK;
    } catch(_) { 
      return FALLBACK; 
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

  async function startSession() {
    // Determine if custom words are provided
    const customText = (ui.customBox?.value || '').trim();
    let wordList = [];
    
    if (customText) {
      wordList = loadCustomWords(customText);
    } else {
      wordList = await loadDefaultWords();
    }

    if (!wordList.length) {
      t(ui.feedback, 'No words available. Please provide a word list.');
      return;
    }

    // Apply exam/practice mode
    state.words = state.isExam ? randomPick(wordList, 24) : wordList;
    state.i = 0;
    state.correct = [];
    state.incorrect = [];
    state.flags.clear();
    state.active = true;

    t(ui.feedback, 'Session started! Listen carefully...');
    showProgress();
    speakCurrentWord();
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
      state.incorrect.push(target);
      t(ui.feedback, `❌ Incorrect. The correct spelling is: ${target}`);
    }

    // Clear input for next word
    if (ui.area) ui.area.value = '';

    // Move to next word or end session
    state.i++;
    if (state.i < state.words.length) {
      showProgress();
      setTimeout(speakCurrentWord, 1000);
    } else {
      endSession();
    }
  }

  function speakCurrentWord() {
    if (!state.active || state.i >= state.words.length) return;
    const word = state.words[state.i];
    if (word && window.AudioGuards) {
      window.AudioGuards.speakOnce(word);
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
    if (window.AudioGuards) window.AudioGuards.stopAll();

    const total = state.words.length;
    const correctCount = state.correct.length;
    const incorrectCount = state.incorrect.length;
    const flaggedWords = [...state.flags];

    const summary = [
      'Session Complete!',
      `✅ ${correctCount} correct`,
      `❌ ${incorrectCount} incorrect`,
      flaggedWords.length ? `🚩 ${flaggedWords.join(', ')}` : 'No words flagged'
    ].join(' • ');

    t(ui.feedback, summary);
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

  // Initialize the application
  function initialize() {
    setupEventListeners();
    
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
