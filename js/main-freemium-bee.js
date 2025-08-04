// main-freemium-bee.js — Complete Version with Auto-Advance, Firebase, and AdSense

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  };

  // Initialize Firebase services
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();
  const analytics = firebase.analytics();
  
  // AdSense Initialization
  const initAdSense = () => {
    const adsByGoogle = document.createElement('script');
    adsByGoogle.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUB_ID';
    adsByGoogle.async = true;
    adsByGoogle.crossOrigin = "anonymous";
    document.head.appendChild(adsByGoogle);
    
    // Ad slots
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({
      google_ad_client: "ca-pub-YOUR_PUB_ID",
      enable_page_level_ads: true
    });
  };

  // DOM Elements with null checks
const getElement = (id) => document.getElementById(id) || console.warn(`Element ${id} not found`);
const getQuery = (selector) => document.querySelector(selector) || console.warn(`Selector ${selector} not found`);

const accentPicker = getQuery('.accent-picker');
const customInput = getElement('custom-words');
const fileInput = getElement('file-input');
const addCustomBtn = getElement('add-custom-btn');
const startBtn = getElement('start-btn');
const beeArea = getElement('bee-area');
const spellingVisual = getElement('spelling-visual');
const summaryArea = getElement('summary-area');
const micStatus = getElement('mic-status');
const authContainer = getElement('auth-container');
const profileBtn = getElement('profile-btn');
const loginBtn = getElement('login-btn');
const logoutBtn = getElement('logout-btn');
const darkModeToggle = getElement('dark-mode-toggle');

  // State Variables
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let flaggedWords = [];
  let userAttempts = [];
  let usedCustomListToday = false;
  let isUsingCustomList = false;
  let isSessionActive = false;
  let currentWord = "";
  let user = null;
  let recognition = null; // Added missing recognition variable
  
  const todayKey = new Date().toISOString().split('T')[0];
  const WORD_SEPARATORS = /[\s,;\/\-–—|]+/;
  const MIN_WORD_LENGTH = 2;
  const WORD_REGEX = /^[a-zA-Z'-]+$/;
  
  const DEFAULT_BEE_WORDS = [
    "accommodate", "belligerent", "conscientious", "disastrous", 
    "embarrass", "foreign", "guarantee", "harass", 
    "interrupt", "jealous", "knowledge", "liaison",
    "millennium", "necessary", "occasionally", "possession",
    "questionnaire", "rhythm", "separate", "tomorrow",
    "unforeseen", "vacuum", "withhold", "yacht"
  ];

  // Initialize the app
  const initApp = () => {
    checkAuthState();
    loadDefaultList();
    setupEventListeners();
    initDarkMode();
    initAdSense();
    renderAdSlots();
  };

  // Authentication
  const checkAuthState = () => {
    auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        user = firebaseUser;
        loadUserData();
        updateAuthUI(true);
        analytics.setUserId(firebaseUser.uid);
        analytics.logEvent('login');
      } else {
        user = null;
        updateAuthUI(false);
        loadLocalData();
      }
    });
  };

  const loadUserData = async () => {
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        flaggedWords = data.flaggedWords || [];
        usedCustomListToday = data.lastCustomListDate === todayKey;
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      loadLocalData();
    }
  };

  const saveUserData = async () => {
    if (!user) return;
    
    try {
      await db.collection('users').doc(user.uid).set({
        flaggedWords,
        lastCustomListDate: usedCustomListToday ? todayKey : null,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving user data:", error);
      saveLocalData();
    }
  };

  const loadLocalData = () => {
    const storedFlags = localStorage.getItem('flaggedWords');
    flaggedWords = storedFlags ? JSON.parse(storedFlags) : [];
    usedCustomListToday = localStorage.getItem('customListDate') === todayKey;
  };

  const saveLocalData = () => {
    localStorage.setItem('flaggedWords', JSON.stringify(flaggedWords));
    if (usedCustomListToday) {
      localStorage.setItem('customListDate', todayKey);
    } else {
      localStorage.removeItem('customListDate');
    }
  };

  const updateAuthUI = (isLoggedIn) => {
  if (!authContainer || !profileBtn || !logoutBtn || !loginBtn) {
    console.warn("Auth UI elements not found");
    return;
  }

  if (isLoggedIn) {
    authContainer.classList.add('hidden');
    profileBtn.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    if (user) {
      profileBtn.textContent = user.displayName || user.email.split('@')[0];
    }
  } else {
    authContainer.classList.remove('hidden');
    profileBtn.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    loginBtn.classList.remove('hidden');
  }
};

  // Ad Slots
  const renderAdSlots = () => {
    // Top banner ad
    const topAd = document.createElement('ins');
    topAd.className = 'adsbygoogle';
    topAd.style.display = 'block';
    topAd.dataset.adClient = 'ca-pub-YOUR_PUB_ID';
    topAd.dataset.adSlot = 'YOUR_TOP_SLOT';
    topAd.dataset.adFormat = 'auto';
    topAd.dataset.fullWidthResponsive = 'true';
    document.getElementById('top-ad').appendChild(topAd);
    (window.adsbygoogle = window.adsbygoogle || []).push({});

    // Bottom banner ad
    const bottomAd = document.createElement('ins');
    bottomAd.className = 'adsbygoogle';
    bottomAd.style.display = 'block';
    bottomAd.dataset.adClient = 'ca-pub-YOUR_PUB_ID';
    bottomAd.dataset.adSlot = 'YOUR_BOTTOM_SLOT';
    bottomAd.dataset.adFormat = 'auto';
    bottomAd.dataset.fullWidthResponsive = 'true';
    document.getElementById('bottom-ad').appendChild(bottomAd);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  };

  // Core App Functions
  const loadDefaultList = () => {
    words = [...DEFAULT_BEE_WORDS];
    isUsingCustomList = false;
    updateStartBtnState();
  };

  const updateStartBtnState = () => {
    startBtn.disabled = !(words && words.length > 0);
    startBtn.setAttribute('aria-disabled', startBtn.disabled ? 'true' : 'false');
  };

  const setupEventListeners = () => {
  // Auth event listeners - only if elements exist
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).catch(error => {
        console.error("Login error:", error);
        showAlert("Login failed. Please try again.", 'error');
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut().catch(error => {
        console.error("Logout error:", error);
      });
    });
  }

  // App event listeners
  if (accentPicker) {
    accentPicker.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        accentPicker.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        e.target.classList.add('active');
        e.target.setAttribute('aria-pressed', 'true');
        accent = e.target.dataset.accent;
      }
    });
  }

  if (addCustomBtn) addCustomBtn.addEventListener('click', addCustomWords);
  if (fileInput) fileInput.addEventListener('change', handleFileUpload);
  if (startBtn) startBtn.addEventListener('click', toggleSession);

  document.addEventListener('click', (e) => {
    if (!isSessionActive) return;
    if (e.target.closest('#prev-btn')) prevWord();
    if (e.target.closest('#next-btn')) nextWord();
    if (e.target.closest('#repeat-btn')) speakWord(currentWord);
    if (e.target.closest('#flag-btn')) toggleFlagWord(currentWord);
  });

  document.addEventListener('keydown', (e) => {
    if (!isSessionActive) return;
    if (e.key === 'ArrowLeft' && currentIndex > 0) prevWord();
    if (e.key === 'ArrowRight' && currentIndex < words.length - 1) nextWord();
    if (e.key === ' ') {
      e.preventDefault();
      speakWord(currentWord);
    }
  });
};

  // Auto-Advance Functions
  const toggleSession = () => {
    if (isSessionActive) {
      endSession();
    } else {
      if (!words.length) {
        showAlert("No word list loaded. Please add words or upload a list.", 'error');
        return;
      }
      startSession();
    }
  };

  const startSession = () => {
    currentIndex = 0;
    score = 0;
    userAttempts = [];
    isSessionActive = true;

    try {
      analytics.logEvent('start_session', {
        word_count: words.length,
        custom_list: isUsingCustomList
      });
    } catch (e) {
      console.warn("Analytics error:", e);
    }

    updateUIForActiveSession();
    playCurrentWord();
  };

  const playCurrentWord = () => {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }

    if (recognition) {
      recognition.stop();
      recognition = null;
    }

    currentWord = words[currentIndex];
    renderWordInterface();
    speakWordAutoAdvance(currentWord);
  };

  const speakWordAutoAdvance = (word) => {
    if (!window.speechSynthesis) {
      showAlert("Text-to-speech not supported. Auto-advancing...", 'error');
      setTimeout(() => autoAdvance(), 1500);
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.8;

    utterance.onend = () => {
      setTimeout(() => {
        if (isSessionActive) startVoiceRecognition();
      }, 300);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      showAlert("Pronunciation error. Auto-advancing...", 'error');
      setTimeout(() => autoAdvance(), 1500);
    };

    speechSynthesis.speak(utterance);
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showAlert("Speech recognition not supported in this browser.", 'error');
      autoAdvance();
      return;
    }

    micStatus.classList.remove('hidden');
    updateSpellingVisual();

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onresult = (event) => {
      const results = event.results[0];
      const bestMatch = Array.from(results)
        .map(result => result.transcript.trim().toLowerCase().replace(/[^a-z]/g, ''))
        .find(transcript => transcript.length >= MIN_WORD_LENGTH) || '';
      processSpellingAttempt(bestMatch);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error("Recognition error:", event.error);
        showAlert(`Recognition error: ${event.error}`, 'error');
      }
      setTimeout(() => isSessionActive && autoAdvance(), 500);
    };

    recognition.onend = () => {
      if (isSessionActive && !recognition.manualStop) {
        setTimeout(() => startVoiceRecognition(), 500);
      }
    };

    recognition.manualStop = false;
    recognition.start();
  };

  const processSpellingAttempt = (attempt) => {
    const feedback = document.getElementById('mic-feedback');
    if (!feedback) return;

    userAttempts[currentIndex] = attempt || "";
    const isCorrect = attempt === currentWord.toLowerCase();

    updateSpellingVisual(
      currentWord.split('').map((letter, i) => ({
        letter: attempt?.[i] || '',
        correct: attempt?.[i]?.toLowerCase() === letter.toLowerCase()
      }))
    );

    if (isCorrect) {
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
      score++;
      try {
        analytics.logEvent('correct_spelling', { word: currentWord });
      } catch (e) {
        console.warn("Analytics error:", e);
      }
    } else {
      feedback.textContent = `✗ Incorrect. Correct: ${currentWord}`;
      feedback.className = "feedback incorrect";
      try {
        analytics.logEvent('incorrect_spelling', { 
          word: currentWord, 
          attempt: attempt 
        });
      } catch (e) {
        console.warn("Analytics error:", e);
      }
    }

    setTimeout(() => autoAdvance(), 1500);
  };

  const autoAdvance = () => {
    if (!isSessionActive) return;
    
    currentIndex++;
    if (currentIndex < words.length) {
      playCurrentWord();
    } else {
      endSession();
    }
  };

  const endSession = () => {
    isSessionActive = false;
    if (recognition) {
      recognition.manualStop = true;
      recognition.stop();
      recognition = null;
    }
    
    const percent = Math.round((score / words.length) * 100);
    const wrongWords = words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase());
    
    try {
      analytics.logEvent('end_session', {
        score: score,
        total_words: words.length,
        percentage: percent
      });
    } catch (e) {
      console.warn("Analytics error:", e);
    }

    saveUserData();
    renderSummary(percent, wrongWords);
    
    beeArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    customInput.disabled = false;
    fileInput.disabled = false;
    addCustomBtn.disabled = false;
  };

  const renderSummary = (percent, wrongWords) => {
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Spelling Bee Results</h2>
        <div class="score-display">${score}/${words.length} (${percent}%)</div>
      </div>
      
      <div class="results-actions">
        <div class="view-options">
          <button class="view-option active" data-view="all">
            <i class="fas fa-list"></i> All Words
          </button>
          <button class="view-option" data-view="incorrect">
            <i class="fas fa-times-circle"></i> Incorrect (${wrongWords.length})
          </button>
          <button class="view-option" data-view="flagged">
            <i class="fas fa-star"></i> Flagged (${flaggedWords.length})
          </button>
        </div>
      </div>
      
      <div class="results-container">
        <div id="words-display" class="words-list"></div>
      </div>
      
      <div class="summary-actions">
        <button id="restart-btn" class="btn-primary">
          <i class="fas fa-redo"></i> Restart Session
        </button>
        <button id="new-list-btn" class="btn-secondary">
          <i class="fas fa-sync-alt"></i> Change Word List
        </button>
      </div>
      
      <!-- Mid-page ad -->
      <div id="summary-ad" class="ad-container"></div>
    `;
    
    // Render mid-session ad
    const midAd = document.createElement('ins');
    midAd.className = 'adsbygoogle';
    midAd.style.display = 'block';
    midAd.dataset.adClient = 'ca-pub-YOUR_PUB_ID';
    midAd.dataset.adSlot = 'YOUR_MID_SLOT';
    midAd.dataset.adFormat = 'auto';
    midAd.dataset.fullWidthResponsive = 'true';
    document.getElementById('summary-ad').appendChild(midAd);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    
    displayWords('all');
    
    document.querySelectorAll('.view-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        displayWords(btn.dataset.view);
      });
    });
    
    document.getElementById('restart-btn').addEventListener('click', startSession);
    document.getElementById('new-list-btn').addEventListener('click', resetWordList);
  };

  const displayWords = (viewType) => {
    const wordsDisplay = document.getElementById('words-display');
    if (!wordsDisplay) return;
    
    let wordsToShow = [];
    
    switch(viewType) {
      case 'incorrect':
        wordsToShow = words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase());
        break;
      case 'flagged':
        wordsToShow = flaggedWords.filter(w => words.includes(w));
        break;
      default:
        wordsToShow = [...words];
    }
    
    wordsDisplay.innerHTML = wordsToShow.map(word => {
      const isCorrect = userAttempts[words.indexOf(word)]?.toLowerCase() === word.toLowerCase();
      const isFlagged = flaggedWords.includes(word);
      
      return `
        <div class="result-word ${isCorrect ? 'correct' : 'incorrect'} ${isFlagged ? 'flagged' : ''}">
          <span class="word">${word}</span>
          <span class="word-actions">
            <button class="btn-icon small hear-word" data-word="${word}">
              <i class="fas fa-volume-up"></i>
            </button>
            <button class="btn-icon small toggle-flag" data-word="${word}">
              <i class="fas fa-star ${isFlagged ? 'active' : ''}"></i>
            </button>
          </span>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.hear-word').forEach(btn => {
      btn.addEventListener('click', () => speakWord(btn.dataset.word));
    });
    
    document.querySelectorAll('.toggle-flag').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleFlagWord(btn.dataset.word);
        btn.querySelector('i').classList.toggle('active');
      });
    });
  };

  // Helper Functions
  const updateUIForActiveSession = () => {
    beeArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    startBtn.setAttribute('aria-label', 'End session');
    customInput.disabled = true;
    fileInput.disabled = true;
    addCustomBtn.disabled = true;
  };

  const renderWordInterface = () => {
    beeArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div id="spelling-visual" aria-live="polite"></div>
      
      <div id="auto-flow-notice">
        <i class="fas fa-robot"></i> Auto-advance mode active
      </div>
      
      <div id="mic-feedback" class="feedback" aria-live="assertive"></div>
      
      <div class="button-group optional-controls">
        <button id="prev-btn" class="btn-secondary" ${currentIndex === 0 ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i> Previous
        </button>
        <button id="repeat-btn" class="btn-secondary">
          <i class="fas fa-redo"></i> Repeat Word
        </button>
        <button id="next-btn" class="btn-secondary">
          <i class="fas fa-arrow-right"></i> Skip
        </button>
        <button id="flag-btn" class="btn-icon ${flaggedWords.includes(currentWord) ? 'active' : ''}">
          <i class="fas fa-star"></i> Flag
        </button>
      </div>
    `;
    updateFlagButton();
  };

  const updateSpellingVisual = (letters = []) => {
    const spellingVisualEl = document.getElementById('spelling-visual');
    if (!spellingVisualEl) return;
    spellingVisualEl.innerHTML = currentWord.split('').map((letter, i) => {
      const letterData = letters[i] || {};
      const letterClass = letterData.correct ? 'correct' : (letterData.letter ? 'incorrect' : '');
      return `<div class="letter-tile ${letterClass}">${letterData.letter || ''}</div>`;
    }).join('');
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      playCurrentWord();
    } else {
      endSession();
    }
  };

  const prevWord = () => {
    if (currentIndex > 0) {
      currentIndex--;
      playCurrentWord();
    }
  };

  const resetWordList = () => {
    loadDefaultList();
    isUsingCustomList = false;
    customInput.value = '';
    fileInput.value = '';
    summaryArea.classList.add('hidden');
  };

  const toggleFlagWord = (word) => {
    const index = flaggedWords.indexOf(word);
    if (index === -1) {
      flaggedWords.push(word);
      try {
        analytics.logEvent('flag_word', { word });
      } catch (e) {
        console.warn("Analytics error:", e);
      }
    } else {
      flaggedWords.splice(index, 1);
    }
    saveUserData();
    updateFlagButton();
  };

  const updateFlagButton = () => {
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
      flagBtn.classList.toggle('active', flaggedWords.includes(currentWord));
      flagBtn.setAttribute('aria-pressed', flaggedWords.includes(currentWord) ? 'true' : 'false');
    }
  };

  // Word List Management
  const addCustomWords = () => {
    if (usedCustomListToday) {
      showAlert("You can only use one custom list per day.", "warning");
      return;
    }
    const input = customInput.value.trim();
    if (!input) {
      showAlert("Please enter words first!", 'error');
      return;
    }
    processWordList(input);
    usedCustomListToday = true;
    isUsingCustomList = true;
    saveUserData();
    startSession();
  };

  const handleFileUpload = async (e) => {
    if (usedCustomListToday) {
      showAlert("You can only use one custom/uploaded list per day.", "warning");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      processWordList(text);
      usedCustomListToday = true;
      isUsingCustomList = true;
      saveUserData();
      startSession();
    } catch (error) {
      console.error("File upload error:", error);
      showAlert("Error processing file. Please try a text file with one word per line.", 'error');
    }
  };

  const processWordList = (text) => {
    words = [...new Set(
      text.split(WORD_SEPARATORS)
        .map(w => w.trim())
        .filter(w => w.match(WORD_REGEX) && w.length >= MIN_WORD_LENGTH)
    )];
    
    if (!words.length) {
      throw new Error("No valid words found");
    }
    
    try {
      if (analytics) {
        analytics.logEvent('custom_wordlist_loaded', { 
          word_count: words.length 
        });
      }
    } catch (e) {
      console.warn("Analytics error:", e);
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error("File too large (max 2MB)"));
        return;
      }
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsText(file);
    });
  };
  
  // UI Helpers
  const showAlert = (message, type = 'error') => {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.setAttribute('role', 'alert');
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  };

  const initDarkMode = () => {
  if (!darkModeToggle) {
    console.warn("Dark mode toggle not found");
    return;
  }

  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    updateDarkModeIcon();
    try {
      analytics.logEvent('toggle_dark_mode');
    } catch (e) {
      console.warn("Analytics error:", e);
    }
  });

  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  updateDarkModeIcon();
};

  const updateDarkModeIcon = () => {
  const icon = document.querySelector('#dark-mode-toggle i');
  if (!icon) {
    console.warn("Dark mode icon not found");
    return;
  }
  icon.className = document.body.classList.contains('dark-mode')
    ? 'fas fa-sun'
    : 'fas fa-moon';
};

  // Initialize the app
  initApp();
});
