/* ==================== SpellRightPro Premium — FULL ==================== */
(function () {
  'use strict';

  /* ==================== GLOBAL STATE ==================== */
  let currentUser = null;
  let premiumUser = false;
  let isInitialized = false;

  let examType = "OET";
  let accent = "en-US";
  let sessionMode = "practice";

  let words = [];
  let originalWords = [];
  let flaggedWords = new Set();
  let correctCount = 0;
  let wrongCount = 0;
  let totalAsked = 0;
  let currentIndex = 0;
  let isSpeaking = false;
  let isListening = false;
  let listeningController = null;
  let ttsVoice = null;

  // UI refs
  let appTitle, trainerArea, summaryArea, examUIRoot;

  // Firebase
  let app, auth, db, analytics;

  /* ==================== HELPERS ==================== */
  function $(sel, root = document) { 
    return root.querySelector(sel); 
  }
  
  function $all(sel, root = document) { 
    return Array.from(root.querySelectorAll(sel)); 
  }
  
  function nowISO() { 
    return new Date().toISOString(); 
  }

  function log(...args) { 
    console.log("[SRP Premium]", ...args); 
  }
  
  function warn(...args) { 
    console.warn("[SRP Premium]", ...args); 
  }
  
  function error(...args) { 
    console.error("[SRP Premium]", ...args); 
  }

  function showAlert(message, type = 'success', duration = 5000) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
      ${message}
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 500);
    }, duration);
  }

  function showGlobalLoading(message) {
    if (window.showGlobalLoading) {
      window.showGlobalLoading(message);
    }
  }

  function hideGlobalLoading() {
    if (window.hideGlobalLoading) {
      window.hideGlobalLoading();
    }
  }

  /* ==================== FIREBASE INIT ==================== */
  async function initFirebase() {
    try {
      // Try to get existing app first
      const apps = firebase.apps;
      if (apps.length > 0) {
        app = apps[0];
        log('Using existing Firebase app');
      } else {
        // Initialize new app
        if (!window.SRP_CONFIG) {
          throw new Error('Firebase configuration not found');
        }
        
        app = firebase.initializeApp(window.SRP_CONFIG);
        log('Initialized new Firebase app');
      }
      
      auth = firebase.auth();
      db = firebase.firestore();
      
      // Initialize analytics if available
      if (firebase.analytics) {
        analytics = firebase.analytics();
        log('Analytics initialized');
      }
      
      // Configure persistence
      try {
        await db.enablePersistence({ synchronizeTabs: true });
        log('Firestore persistence enabled');
      } catch (e) {
        warn('Persistence failed:', e);
      }
    } catch (e) {
      error('Firebase initialization failed:', e);
      throw e;
    }
  }

  function track(eventName, params = {}) {
    try {
      analytics?.logEvent?.(eventName, {
        ...params,
        timestamp: nowISO(),
        uid: currentUser?.uid || 'anonymous',
        premium: premiumUser
      });
    } catch (e) {
      // Silent fail for analytics
    }
  }

  /* ==================== AUTH MANAGEMENT ==================== */
  async function checkPremiumStatus(user) {
    try {
      if (!user) return false;
      
      // For now, assume all authenticated users are premium
      // In a real app, you would check Firestore or a premium claims
      return true;
      
      // Example of real premium check:
      // const userDoc = await db.collection('users').doc(user.uid).get();
      // return userDoc.exists && userDoc.data().premium === true;
    } catch (e) {
      error('Premium check failed:', e);
      return false;
    }
  }

  async function signOut() {
    try {
      showGlobalLoading('Signing out...');
      await auth.signOut();
      // Don't redirect immediately, let the auth state change handle it
    } catch (e) {
      error('Sign out failed:', e);
      showAlert('Sign out failed. Please try again.', 'error');
      hideGlobalLoading();
    }
  }

  function drawSignedIn(user) {
    currentUser = user;
    
    // Check premium status
    checkPremiumStatus(user).then(isPremium => {
      premiumUser = isPremium;
      
      if (!isPremium) {
        showAlert('Premium access required. Redirecting...', 'error', 3000);
        setTimeout(() => {
          window.location.href = "/premium.html?upgrade=true";
        }, 3000);
        return;
      }
      
      // Get DOM elements
      appTitle = $("#app-title");
      examUIRoot = $("#exam-ui");
      trainerArea = $("#trainer-area");
      summaryArea = $("#summary-area");
      
      if (!examUIRoot || !trainerArea || !summaryArea) {
        error('Required DOM elements not found');
        showAlert('UI initialization failed. Please refresh the page.', 'error');
        return;
      }
      
      // Build UI
      buildUI();
      wireUI();
      
      // Initialize TTS voice
      initTTS();
      
      // Start with OET practice
      startOETPractice();
      
      // Show success message
      showAlert(`Welcome to SpellRightPro Premium, ${user.email || 'User'}!`, 'success');
      
      // Hide auth area and show premium app
      const authArea = $("#auth-area");
      const premiumApp = $("#premium-app");
      
      if (authArea) authArea.style.display = 'none';
      if (premiumApp) premiumApp.classList.remove('hidden');
      
      track("premium_access_granted", { uid: user.uid, email: user.email });
    });
  }

  function drawSignedOut() {
    // Only redirect if we're not already on the index page
    if (!window.location.pathname.includes('index.html')) {
      window.location.href = "/index.html";
    }
  }

  /* ==================== TTS & RECOGNITION ==================== */
  function selectVoice(accent) {
    try {
      const voices = speechSynthesis.getVoices() || [];
      if (!voices.length) return null;
      
      // Try exact match first
      let voice = voices.find(v => v.lang === accent);
      
      // Then try language match
      if (!voice) {
        const lang = accent.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(lang));
      }
      
      // Fallback to first available voice
      return voice || voices[0] || null;
    } catch (e) {
      console.warn('Voice selection failed:', e);
      return null;
    }
  }

  function initTTS() {
    try {
      ttsVoice = selectVoice(accent);
      
      // Set up voice change listener
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          ttsVoice = selectVoice(accent);
          log('Voices updated, selected:', ttsVoice?.name);
        };
      }
    } catch (e) {
      warn('TTS initialization failed:', e);
    }
  }

  function speak(text, { rate = 0.9, pitch = 1, volume = 1 } = {}) {
    return new Promise((resolve) => {
      try {
        if (!text || typeof text !== 'string') {
          resolve();
          return;
        }

        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        if (ttsVoice) utterance.voice = ttsVoice;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;
        utterance.lang = accent;
        
        utterance.onend = () => {
          isSpeaking = false;
          resolve();
        };
        
        utterance.onerror = (e) => {
          console.warn('TTS Error:', e);
          isSpeaking = false;
          resolve();
        };
        
        isSpeaking = true;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speak error:', e);
        isSpeaking = false;
        resolve();
      }
    });
  }

  function stopSpeaking() {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // Silent fail
    }
    isSpeaking = false;
  }

  /* ==================== UI TEMPLATES ==================== */
  function premiumHeaderHTML() {
    return `
      <div class="toolbar">
        <div class="toolbar-left">
          <button id="logout-btn" class="btn danger small" aria-label="Logout">
            <i class="fa fa-sign-out-alt"></i> Logout
          </button>
        </div>
        <div class="toolbar-right">
          <label class="toggle" style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="mode-toggle" aria-label="Toggle test mode" />
            <span>Test Mode</span>
          </label>
        </div>
      </div>
      <div class="input-group">
        <select id="exam-type" class="form-control" aria-label="Select exam type">
          <option value="OET">OET Spelling</option>
          <option value="Bee">Spelling Bee (Voice)</option>
          <option value="School">School Lists</option>
        </select>
        <select id="accent-select" class="form-control" aria-label="Select accent" style="max-width:150px;">
          <option value="en-US">American English</option>
          <option value="en-GB">British English</option>
          <option value="en-AU">Australian English</option>
        </select>
        <button id="shuffle-btn" class="btn outline" aria-label="Shuffle words">
          <i class="fa fa-random"></i> Shuffle
        </button>
        <button id="repeat-btn" class="btn outline" aria-label="Repeat word">
          <i class="fa fa-volume-up"></i> Repeat
        </button>
        <button id="flag-btn" class="btn" aria-label="Flag current word">
          <i class="fa fa-flag"></i> Flag
        </button>
      </div>`;
  }

  function premiumBodyHTML() {
    return `
      <div class="row" style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;">
        <div class="col">
          <h2 id="app-title" class="card-title">Premium Trainer</h2>
          <div class="muted" style="margin:4px 0 14px;">
            <p>Unlock OET, Bee, School lists, history & more.</p>
          </div>
          
          <div id="word-audio" class="word-audio-feedback">
            <i class="fas fa-volume-up"></i>
            <span>Listen to the word...</span>
          </div>
          
          <div class="input-row" style="display:flex;gap:0.75rem;margin:1rem 0;">
            <div class="input-wrapper" style="flex:1">
              <input id="answer-input" type="text" class="form-control" 
                     placeholder="Type the spelling and press Enter" 
                     autocomplete="off" aria-label="Type your answer"/>
              <div id="real-time-feedback" class="real-time-feedback"></div>
            </div>
            <button id="submit-btn" class="btn success" aria-label="Submit answer">
              <i class="fas fa-check"></i> Submit
            </button>
            <button id="skip-btn" class="btn" aria-label="Skip word">
              <i class="fas fa-forward"></i> Skip
            </button>
          </div>

          <div class="word-progress">
            <i class="fas fa-list-ol"></i>
            Progress: <span id="progress-text">0 / 0</span>
          </div>
        </div>
        
        <div class="col">
          <div class="card">
            <h3 class="card-title"><i class="fas fa-cog"></i> Controls</h3>
            <div class="controls-grid" style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem;align-items:center">
              <label for="accent-select-secondary">Accent</label>
              <select id="accent-select-secondary" class="form-control">
                <option value="en-US">American English</option>
                <option value="en-GB">British English</option>
                <option value="en-AU">Australian English</option>
              </select>
              
              <label for="mode-select">Mode</label>
              <select id="mode-select" class="form-control">
                <option value="practice">Practice</option>
                <option value="test">Test</option>
              </select>
              
              <label>Session</label>
              <div id="progress-meta" style="font-weight:600">0 / 0</div>
              
              <label>Score</label>
              <div id="score-meta" style="font-weight:600;color:var(--success)">0</div>
            </div>
          </div>
          
          <div class="card" id="custom-upload-card">
            <h3 class="card-title"><i class="fas fa-upload"></i> Custom Lists</h3>
            <p class="muted">Upload .txt, .json, .docx or .pdf files with one word per line.</p>
            <input type="file" id="file-upload" accept=".txt,.json,.docx,.pdf" 
                   aria-label="Upload word list" style="margin:0.5rem 0"/>
            <div id="upload-status" class="muted" style="font-size:0.8rem"></div>
          </div>
        </div>
      </div>`;
  }

  function summaryHTML() {
    return `
      <div class="card">
        <h3 class="card-title"><i class="fas fa-chart-bar"></i> Session Summary</h3>
        <div id="summary-stats" style="margin:1rem 0"></div>
        <div id="flagged-list" style="margin:1rem 0"></div>
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem;flex-wrap:wrap">
          <button id="retry-flagged" class="btn outline">
            <i class="fas fa-redo"></i> Retry Flagged
          </button>
          <button id="retry-wrong" class="btn outline">
            <i class="fas fa-bolt"></i> Retry Wrong
          </button>
          <button id="new-session" class="btn primary">
            <i class="fas fa-plus"></i> New Session
          </button>
        </div>
      </div>`;
  }

  /* ==================== DOM BUILD ==================== */
  function buildUI() {
    if (!examUIRoot) {
      error('examUIRoot not found');
      return;
    }
    
    examUIRoot.innerHTML = premiumHeaderHTML() + premiumBodyHTML();
    appTitle = $("#app-title");
    trainerArea = $("#trainer-area");
    summaryArea = $("#summary-area");
    
    if (!summaryArea) {
      error('summaryArea not found');
      return;
    }
    
    summaryArea.innerHTML = summaryHTML();
    
    // Hide ads for premium users
    document.querySelectorAll('.ad-container').forEach(ad => {
      ad.style.display = 'none';
    });
  }

  /* ==================== DATA LOADING ==================== */
  async function loadOET() {
    try {
      showGlobalLoading('Loading OET words...');
      const res = await fetch("/data/word-lists/oet.json", { 
        cache: "no-cache",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const words = uniqueWords(data?.words || []);
      
      log(`Loaded ${words.length} OET words`);
      return words;
    } catch (e) {
      error('OET load failed:', e);
      showAlert('Failed to load OET words. Using fallback list.', 'error');
      
      // Fallback words
      return uniqueWords([
        'abdominal', 'biopsy', 'cardiac', 'diagnosis', 'epidural',
        'fracture', 'gastric', 'hemorrhage', 'intravenous', 'jaundice'
      ]);
    } finally {
      hideGlobalLoading();
    }
  }

  async function loadBee() {
    try {
      showGlobalLoading('Loading spelling bee words...');
      const res = await fetch("/data/word-lists/spelling-bee.json", { 
        cache: "no-cache" 
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const words = uniqueWords(data?.words || []);
      
      log(`Loaded ${words.length} spelling bee words`);
      return words;
    } catch (e) {
      error('Bee load failed:', e);
      showAlert('Failed to load spelling bee words. Using fallback list.', 'error');
      
      return uniqueWords([
        'accommodate', 'belligerent', 'conscience', 'dilemma', 'embarrass',
        'fluorescent', 'guarantee', 'harass', 'ignorance', 'jeopardy'
      ]);
    } finally {
      hideGlobalLoading();
    }
  }

  async function loadSchoolFromUpload(file) {
    try {
      showGlobalLoading('Processing your word list...');
      
      const text = await file.text();
      let wordList = [];
      
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        wordList = Array.isArray(parsed?.words) ? parsed.words : parsed;
      } else {
        // Handle text files with various delimiters
        wordList = text.split(/\r?\n|,|;|\t/).map(l => l.trim()).filter(Boolean);
      }
      
      const unique = uniqueWords(wordList);
      log(`Processed ${unique.length} words from upload`);
      showAlert(`Successfully loaded ${unique.length} words from ${file.name}`, 'success');
      
      return unique;
    } catch (e) {
      error('File upload processing failed:', e);
      showAlert('Failed to process the uploaded file. Please check the format.', 'error');
      return [];
    } finally {
      hideGlobalLoading();
    }
  }

  function uniqueWords(arr) {
    const seen = new Set();
    const out = [];
    
    for (const w of arr) {
      const k = (w || "").trim().toLowerCase();
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(w.trim());
      }
    }
    
    return out;
  }

  function shuffle(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ==================== TRAINER FUNCTIONS ==================== */
  function resetSession() {
    words = [];
    originalWords = [];
    flaggedWords.clear();
    correctCount = 0;
    wrongCount = 0;
    totalAsked = 0;
    currentIndex = 0;
    
    stopSpeaking();
    
    $("#answer-input")?.focus();
    updateMeta(0, 0);
  }

  function updateMeta(current, total) {
    const progress = $("#progress-meta");
    const score = $("#score-meta");
    const progressText = $("#progress-text");
    
    if (progress) progress.textContent = `${current} / ${total}`;
    if (score) score.textContent = `Score: ${correctCount}`;
    if (progressText) progressText.textContent = `${current} / ${total}`;
  }

  function showWord(word) {
    const wordAudio = $("#word-audio");
    if (wordAudio) {
      wordAudio.innerHTML = `<i class="fas fa-volume-up"></i> 🔊 ${escapeHtml(word)}`;
    }
    
    speak(word);
  }

  function askNext() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }
    
    showWord(words[currentIndex]);
    
    // Focus input
    const input = $("#answer-input");
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  function submitAnswer(val) {
    const input = $("#answer-input");
    const userAnswer = (val || (input?.value || "")).trim();
    const correctAnswer = (words[currentIndex] || "").trim();
    
    if (!userAnswer) {
      showAlert('Please enter an answer before submitting.', 'error', 3000);
      return;
    }
    
    totalAsked++;
    
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
      correctCount++;
      showAlert('✅ Correct!', 'success', 2000);
    } else {
      wrongCount++;
      showAlert(`❌ Incorrect. Correct: ${correctAnswer}`, 'error', 4000);
    }
    
    currentIndex++;
    updateMeta(currentIndex, words.length);
    
    // Auto-advance after short delay
    setTimeout(askNext, 1000);
  }

  function endSession() {
    if (!trainerArea || !summaryArea) return;
    
    trainerArea.innerHTML = "";
    
    const stats = $("#summary-stats");
    if (stats) {
      stats.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;text-align:center">
          <div>
            <div style="font-size:0.9rem;color:var(--gray)">Words Attempted</div>
            <div style="font-size:2rem;font-weight:bold;color:var(--primary)">${totalAsked}</div>
          </div>
          <div>
            <div style="font-size:0.9rem;color:var(--gray)">Correct</div>
            <div style="font-size:2rem;font-weight:bold;color:var(--success)">${correctCount}</div>
          </div>
          <div>
            <div style="font-size:0.9rem;color:var(--gray)">Accuracy</div>
            <div style="font-size:2rem;font-weight:bold;color:var(--${totalAsked ? (correctCount/totalAsked >= 0.7 ? 'success' : 'warning') : 'gray'})">
              ${totalAsked ? Math.round((correctCount / totalAsked) * 100) : 0}%
            </div>
          </div>
        </div>
      `;
    }
    
    const flagged = $("#flagged-list");
    if (flagged) {
      const flaggedArray = Array.from(flaggedWords);
      flagged.innerHTML = flaggedArray.length ? `
        <div style="margin-top:1rem">
          <h4 style="margin-bottom:0.5rem"><i class="fas fa-flag"></i> Flagged Words</h4>
          <div class="word-list">
            ${flaggedArray.map(w => `<div class="word-item">${escapeHtml(w)}</div>`).join('')}
          </div>
        </div>
      ` : `<p style="color:var(--gray);text-align:center">No words were flagged this session.</p>`;
    }
    
    summaryArea.classList.remove("hidden");
    
    track("session_end", {
      mode: sessionMode,
      examType: examType,
      totalAsked: totalAsked,
      correctCount: correctCount,
      wrongCount: wrongCount,
      flaggedCount: flaggedWords.size,
      accuracy: totalAsked ? (correctCount / totalAsked) : 0
    });
  }

  function onFlag() {
    const word = words[currentIndex];
    if (word) {
      if (flaggedWords.has(word)) {
        flaggedWords.delete(word);
        showAlert('Word unflagged', 'success', 2000);
      } else {
        flaggedWords.add(word);
        showAlert('Word flagged for review', 'success', 2000);
      }
    }
  }

  function onShuffle() {
    words = shuffle(words);
    currentIndex = 0;
    updateMeta(0, words.length);
    askNext();
  }

  function setAccent(newAccent) {
    accent = newAccent;
    ttsVoice = selectVoice(accent);
    
    // Update both select elements
    $all('#accent-select, #accent-select-secondary').forEach(select => {
      if (select) select.value = newAccent;
    });
    
    showAlert(`Accent set to ${newAccent}`, 'success', 2000);
  }

  /* ==================== START MODES ==================== */
  async function startOETPractice() {
    resetSession();
    if (appTitle) appTitle.textContent = "OET Spelling Practice";
    
    const loadedWords = await loadOET();
    words = loadedWords;
    originalWords = words.slice();
    
    updateMeta(0, words.length);
    askNext();
    
    track("session_start", { type: "OET", mode: sessionMode, wordCount: words.length });
  }

  async function startBeePractice() {
    resetSession();
    if (appTitle) appTitle.textContent = "Spelling Bee Practice";
    
    const loadedWords = await loadBee();
    words = loadedWords;
    originalWords = words.slice();
    
    updateMeta(0, words.length);
    askNext();
    
    track("session_start", { type: "Bee", mode: sessionMode, wordCount: words.length });
  }

  function startSchoolPractice() {
    resetSession();
    if (appTitle) appTitle.textContent = "School Spelling Practice";
    
    const fileInput = $("#file-upload");
    if (!fileInput?.files?.[0]) {
      if (trainerArea) {
        trainerArea.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-upload"></i>
            <h3>No File Selected</h3>
            <p>Please upload a word list using the file uploader on the right.</p>
            <button class="btn primary" onclick="document.getElementById('file-upload').click()">
              <i class="fas fa-file-upload"></i> Choose File
            </button>
          </div>
        `;
      }
      return;
    }
    
    (async () => {
      const loadedWords = await loadSchoolFromUpload(fileInput.files[0]);
      if (loadedWords.length === 0) return;
      
      words = loadedWords;
      originalWords = words.slice();
      updateMeta(0, words.length);
      askNext();
      
      track("session_start", { type: "School", mode: sessionMode, wordCount: words.length });
    })();
  }

  /* ==================== WIRING ==================== */
  function wireUI() {
    // Answer submission
    $("#submit-btn")?.addEventListener("click", () => submitAnswer());
    
    // Skip functionality
    $("#skip-btn")?.addEventListener("click", () => {
      currentIndex++;
      updateMeta(currentIndex, words.length);
      askNext();
    });
    
    // Word repetition
    $("#repeat-btn")?.addEventListener("click", () => {
      const word = words[currentIndex];
      if (word) speak(word);
    });
    
    // Shuffle words
    $("#shuffle-btn")?.addEventListener("click", onShuffle);
    
    // Flag word
    $("#flag-btn")?.addEventListener("click", onFlag);
    
    // Retry flagged words
    $("#retry-flagged")?.addEventListener("click", () => {
      const list = Array.from(flaggedWords);
      if (!list.length) {
        showAlert('No flagged words to retry', 'error', 3000);
        return;
      }
      
      words = list.slice();
      currentIndex = 0;
      correctCount = wrongCount = totalAsked = 0;
      updateMeta(0, words.length);
      askNext();
    });
    
    // Retry wrong answers (simplified)
    $("#retry-wrong")?.addEventListener("click", () => {
      if (!originalWords.length) {
        showAlert('No session data available', 'error', 3000);
        return;
      }
      
      words = shuffle(originalWords.slice());
      currentIndex = 0;
      correctCount = wrongCount = totalAsked = 0;
      updateMeta(0, words.length);
      askNext();
    });
    
    // New session
    $("#new-session")?.addEventListener("click", () => {
      if (examType === "OET") startOETPractice();
      else if (examType === "Bee") startBeePractice();
      else startSchoolPractice();
    });
    
    // Exam type change
    const examTypeSel = $("#exam-type");
    examTypeSel?.addEventListener("change", (e) => {
      examType = e.target.value;
      if (examType === "OET") startOETPractice();
      else if (examType === "Bee") startBeePractice();
      else startSchoolPractice();
    });
    
    // Accent changes
    $("#accent-select")?.addEventListener("change", (e) => setAccent(e.target.value));
    $("#accent-select-secondary")?.addEventListener("change", (e) => setAccent(e.target.value));
    
    // Mode toggle
    const modeToggle = $("#mode-toggle");
    modeToggle?.addEventListener("change", (e) => {
      sessionMode = e.target.checked ? "test" : "practice";
      showAlert(`Switched to ${sessionMode} mode`, 'success', 2000);
    });
    
    // File upload
    const fileUpload = $("#file-upload");
    fileUpload?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      const status = $("#upload-status");
      
      if (file && status) {
        status.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`;
        status.style.color = "var(--success)";
        
        // Auto-start school practice if school mode is selected
        if (examType === "School") {
          startSchoolPractice();
        }
      }
    });
    
    // Enter key support
    const answerInput = $("#answer-input");
    answerInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        submitAnswer();
      }
    });
    
    // Real-time input feedback
    answerInput?.addEventListener("input", (e) => {
      const feedback = $("#real-time-feedback");
      if (!feedback) return;
      
      const input = e.target.value.trim();
      if (!input) {
        feedback.innerHTML = '';
        return;
      }
      
      // Simple length-based feedback
      const currentWord = words[currentIndex];
      if (currentWord) {
        if (input.length === currentWord.length) {
          feedback.innerHTML = '<i class="fas fa-check correct-feedback"></i>';
        } else if (input.length > currentWord.length) {
          feedback.innerHTML = '<i class="fas fa-exclamation-triangle incorrect-feedback"></i>';
        } else {
          feedback.innerHTML = '';
        }
      }
    });
    
    // Logout button
    $("#logout-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      signOut();
    });
  }

  /* ==================== INIT ==================== */
  async function initApp() {
    if (isInitialized) {
      log('App already initialized');
      return;
    }
    
    try {
      showGlobalLoading('Initializing SpellRightPro Premium...');
      
      // Initialize Firebase
      await initFirebase();
      log('Firebase initialized successfully');
      
      // Set up auth state listener
      auth.onAuthStateChanged(user => {
        log('Auth state changed:', user ? 'signed in' : 'signed out');
        if (user) {
          drawSignedIn(user);
        } else {
          drawSignedOut();
        }
        hideGlobalLoading();
      });
      
      // Set up upgrade button (for non-premium users)
      $("#upgrade-btn")?.addEventListener("click", () => {
        window.location.href = "https://spellrightpro.org/checkout";
      });
      
      isInitialized = true;
      log('SpellRightPro Premium initialized successfully');
      
    } catch (error) {
      console.error('Initialization failed:', error);
      showAlert('Failed to initialize the app. Please refresh the page.', 'error');
      hideGlobalLoading();
    }
  }

  // Start the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    showAlert('An unexpected error occurred. Please refresh the page.', 'error');
  });

  // Export functions for global access
  window.SpellRightPro = {
    startOETPractice,
    startBeePractice,
    startSchoolPractice,
    signOut,
    track
  };
})();
