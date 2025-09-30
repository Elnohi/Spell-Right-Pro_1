// ==================== SpellRightPro — Freemium Spelling Bee (Hands-Free) ====================
document.addEventListener('DOMContentLoaded', async () => {
  // ---------- App Initialization Check ----------
  try {
    await initApp();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showError('This app requires speech synthesis and recognition support. Please try a modern browser like Chrome.');
    return;
  }

  // ---------- DOM Elements ----------
  const elements = {
    beeArea: document.getElementById('bee-area'),
    spellingVisual: document.getElementById('spelling-visual'),
    feedbackBox: document.getElementById('feedback'),
    summaryArea: document.getElementById('summary-area'),
    addCustomBtn: document.getElementById('add-custom-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    fileInput: document.getElementById('file-input'),
    customInput: document.getElementById('custom-words'),
    startBtn: document.getElementById('start-btn'),
    accentPicker: document.querySelector('.accent-picker'),
    prevBtn: document.getElementById('bee-prev'),
    repeatBtn: document.getElementById('bee-repeat'),
    nextBtn: document.getElementById('bee-next'),
    micStatus: document.getElementById('mic-status'),
    dailyProgress: document.getElementById('daily-progress'),
    lifeCorrect: document.getElementById('life-correct'),
    lifeAttempts: document.getElementById('life-attempts'),
    loadingState: document.getElementById('loading-state'),
    currentWordIndex: document.getElementById('current-word-index'),
    totalWords: document.getElementById('total-words')
  };

  // ---------- Configuration ----------
  const config = {
    FREEMIUM_LIMIT_ENABLED: false,
    FREEMIUM_MAX: 10,
    DELAY_BEFORE_LISTEN: 2000,
    DELAY_AFTER_FEEDBACK: 1800,
    RECOGNITION_TIMEOUT: 6000
  };

  // ---------- App State ----------
  let state = {
    accent: 'en-US',
    synth: window.speechSynthesis,
    recognition: null,
    recognitionTimer: null,
    baseBee: [],
    customWords: [],
    words: [],
    currentIndex: 0,
    score: 0,
    answers: [],
    isRunning: false,
    autoNextTimer: null,
    lifeCorrect: parseInt(localStorage.getItem('bee_life_correct') || '0', 10),
    lifeAttempts: parseInt(localStorage.getItem('bee_life_attempts') || '0', 10),
    usedToday: 0
  };

  // ---------- Initialization ----------
  async function initApp() {
    // Check for required APIs
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }
    
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    showLoading('Loading spelling bee words...');
    
    try {
      // Load base words
      await loadBaseWords();
      
      // Initialize UI
      updateLifeStats();
      updateDailyProgress();
      setupEventListeners();
      
      hideLoading();
      
      // Check if we can start a session
      const merged = mergeUnique(state.baseBee.slice(), state.customWords);
      const sessionWords = capForToday(merged);
      
      if (sessionWords.length === 0) {
        showInfo('Add some words or wait until tomorrow for a new session.');
      }
    } catch (error) {
      hideLoading();
      showError('Failed to load word list. Please refresh the page.');
      console.error('Initialization error:', error);
    }
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'feedback incorrect';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.querySelector('.training-card').prepend(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  function showInfo(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'info-box';
    infoDiv.innerHTML = `<p>${message}</p>`;
    document.querySelector('.training-card').prepend(infoDiv);
  }

  function showLoading(message = 'Loading...') {
    if (elements.loadingState) {
      elements.loadingState.innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p>${message}</p>
        </div>
      `;
      elements.loadingState.classList.remove('hidden');
    }
  }

  function hideLoading() {
    if (elements.loadingState) {
      elements.loadingState.classList.add('hidden');
    }
  }

  // ---------- TTS Functions ----------
  function speak(text, options = {}) {
    return new Promise((resolve) => {
      try {
        if (!text) {
          resolve();
          return;
        }
        
        // Cancel any ongoing speech
        state.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = state.accent;
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        
        utterance.onend = () => {
          resolve();
        };
        
        utterance.onerror = (error) => {
          console.warn('[TTS Error]', error);
          resolve();
        };
        
        state.synth.speak(utterance);
      } catch (error) {
        console.error('[TTS]', error);
        resolve();
      }
    });
  }

  // ---------- Speech Recognition Functions ----------
  function createRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return null;
    
    const recognition = new Recognition();
    recognition.lang = state.accent;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    return recognition;
  }

  function startRecognition(onResult, onError) {
    // Clean up any existing recognition
    stopRecognition();
    
    state.recognition = createRecognition();
    if (!state.recognition) {
      console.warn('SpeechRecognition not supported.');
      onError && onError(new Error('unsupported'));
      return;
    }
    
    try {
      state.recognition.onresult = (event) => {
        clearRecognitionTimer();
        const transcript = (event.results?.[0]?.[0]?.transcript || '').trim();
        stopRecognition();
        provideHapticFeedback();
        onResult && onResult(transcript);
      };
      
      state.recognition.onerror = (event) => {
        clearRecognitionTimer();
        stopRecognition();
        onError && onError(event.error);
      };
      
      state.recognition.onend = () => {
        clearRecognitionTimer();
        stopRecognition();
      };
      
      // Start recognition
      state.recognition.start();
      
      // Set timeout for recognition
      state.recognitionTimer = setTimeout(() => {
        stopRecognition();
        onError && onError(new Error('timeout'));
      }, config.RECOGNITION_TIMEOUT);
      
      // Show mic status
      if (elements.micStatus) {
        elements.micStatus.classList.remove('hidden');
      }
    } catch (error) {
      console.error('[Recognition start]', error);
      onError && onError(error);
    }
  }

  function stopRecognition() {
    try {
      if (state.recognition) {
        // Remove event listeners
        state.recognition.onresult = null;
        state.recognition.onerror = null;
        state.recognition.onend = null;
        
        // Stop recognition
        try { state.recognition.stop(); } catch (_) {}
        try { state.recognition.abort(); } catch (_) {}
      }
    } catch (_) {}
    
    state.recognition = null;
    clearRecognitionTimer();
    
    // Hide mic status
    if (elements.micStatus) {
      elements.micStatus.classList.add('hidden');
    }
  }

  function clearRecognitionTimer() {
    if (state.recognitionTimer) {
      clearTimeout(state.recognitionTimer);
      state.recognitionTimer = null;
    }
  }

  // ---------- Haptic Feedback ----------
  function provideHapticFeedback() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch (error) {
        // Silent fail for haptic feedback
      }
    }
  }

  // ---------- Daily Cap Management ----------
  function getDayKey() {
    const today = new Date();
    return `srp_daily_words_Bee_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  function getUsedToday() {
    return parseInt(localStorage.getItem(getDayKey()) || '0', 10);
  }

  function setUsedToday(count) {
    localStorage.setItem(getDayKey(), String(count));
  }

  function capForToday(wordList) {
    if (!config.FREEMIUM_LIMIT_ENABLED) return wordList;
    
    state.usedToday = getUsedToday();
    const remaining = Math.max(0, config.FREEMIUM_MAX - state.usedToday);
    
    if (remaining === 0) {
      showInfo(`Daily limit reached: ${config.FREEMIUM_MAX} words. Come back tomorrow!`);
      return [];
    }
    
    updateDailyProgress();
    return wordList.slice(0, remaining);
  }

  function updateDailyProgress() {
    if (elements.dailyProgress) {
      const used = getUsedToday();
      elements.dailyProgress.textContent = `${used}/${config.FREEMIUM_MAX}`;
    }
  }

  // ---------- Word List Management ----------
  async function loadBaseWords() {
    try {
      const response = await fetch('/data/word-lists/spelling-bee.json', { 
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data?.words)) {
        state.baseBee = data.words.filter(word => word && typeof word === 'string').map(word => word.trim());
      } else if (Array.isArray(data)) {
        state.baseBee = data.filter(word => word && typeof word === 'string').map(word => word.trim());
      } else {
        state.baseBee = [];
      }
      
      console.log(`Loaded ${state.baseBee.length} base words`);
    } catch (error) {
      console.warn('Could not load spelling-bee.json', error);
      state.baseBee = [];
      
      // Provide some fallback words
      state.baseBee = [
        'apple', 'banana', 'computer', 'dictionary', 'elephant',
        'friendly', 'garden', 'hospital', 'important', 'jungle'
      ];
    }
  }

  // ---------- Custom Words Management ----------
  function getTodayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function canAddCustom() {
    return localStorage.getItem('bee_customListDate') !== getTodayString();
  }

  function markCustomAdded() {
    localStorage.setItem('bee_customListDate', getTodayString());
  }

  function addCustomWords(newWords) {
    if (!canAddCustom()) {
      showError('Freemium allows one custom list per day. Upgrade to Premium for unlimited custom words.');
      return false;
    }
    
    if (!newWords || newWords.length === 0) {
      showError('Please enter some words first.');
      return false;
    }
    
    state.customWords = mergeUnique(state.customWords, newWords);
    markCustomAdded();
    
    // Save custom words to localStorage for persistence
    localStorage.setItem('bee_customWords', JSON.stringify(state.customWords));
    
    return true;
  }

  function loadCustomWordsFromStorage() {
    try {
      const saved = localStorage.getItem('bee_customWords');
      if (saved) {
        state.customWords = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load custom words from storage:', error);
      state.customWords = [];
    }
  }

  // ---------- Session Management ----------
  function startSession() {
    const merged = mergeUnique(state.baseBee.slice(), state.customWords);
    const sessionWords = capForToday(merged);
    
    if (sessionWords.length === 0) {
      showError('No words available. Please add some words or try again tomorrow.');
      return;
    }
    
    // Initialize session state
    state.words = sessionWords;
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    state.isRunning = true;
    
    // Update UI
    if (elements.beeArea) elements.beeArea.classList.remove('hidden');
    if (elements.summaryArea) elements.summaryArea.classList.add('hidden');
    if (elements.startBtn) {
      elements.startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
      elements.startBtn.classList.add('stop');
    }
    
    if (elements.currentWordIndex) elements.currentWordIndex.textContent = '1';
    if (elements.totalWords) elements.totalWords.textContent = sessionWords.length.toString();
    
    // Enable/disable navigation buttons
    updateNavigationButtons();
    
    // Start with first word
    runCurrentWord();
  }

  function endSession() {
    state.isRunning = false;
    clearTimers();
    stopRecognition();
    
    // Update daily usage if limit is enabled
    if (config.FREEMIUM_LIMIT_ENABLED) {
      const newUsed = getUsedToday() + state.words.length;
      setUsedToday(newUsed);
      updateDailyProgress();
    }
    
    // Update lifetime stats
    state.lifeCorrect += state.score;
    state.lifeAttempts += state.words.length;
    updateLifeStats();
    saveLifeStats();
    
    // Show summary
    showSessionSummary();
    
    // Update UI
    if (elements.beeArea) elements.beeArea.classList.add('hidden');
    if (elements.summaryArea) elements.summaryArea.classList.remove('hidden');
    if (elements.startBtn) {
      elements.startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
      elements.startBtn.classList.remove('stop');
    }
    
    // Inject summary ad
    if (window.insertSummaryAd) {
      window.insertSummaryAd();
    }
  }

  function runCurrentWord() {
    // Clean up any existing timers or recognition
    clearTimers();
    stopRecognition();
    
    // Check if session should end
    if (state.currentIndex >= state.words.length) {
      endSession();
      return;
    }
    
    const currentWord = state.words[state.currentIndex];
    
    // Update progress indicator
    if (elements.currentWordIndex) {
      elements.currentWordIndex.textContent = (state.currentIndex + 1).toString();
    }
    
    // Render blank letter tiles
    if (elements.spellingVisual) {
      elements.spellingVisual.innerHTML = Array.from({ length: currentWord.length })
        .map(() => `<div class="letter-tile">&nbsp;</div>`)
        .join('');
    }
    
    // Reset feedback
    if (elements.feedbackBox) {
      elements.feedbackBox.classList.remove('correct', 'incorrect');
      elements.feedbackBox.innerHTML = 'Listen carefully to the word...';
    }
    
    // Enable/disable navigation buttons
    updateNavigationButtons();
    
    // Step 1: Speak the word
    speak(currentWord).then(() => {
      // Step 2: Wait before starting recognition
      setTimeout(() => {
        // Step 3: Start speech recognition
        startRecognition(
          // onResult callback
          (transcript) => {
            gradeAndShowResult(transcript, currentWord);
            
            // Step 4: Auto-advance after feedback delay
            state.autoNextTimer = setTimeout(() => {
              state.currentIndex++;
              runCurrentWord();
            }, config.DELAY_AFTER_FEEDBACK);
          },
          // onError callback
          (error) => {
            const errorMessage = error === 'timeout' ? 'No speech detected' : 'Recognition error';
            gradeAndShowResult('', currentWord, true, errorMessage);
            
            // Auto-advance on error as well
            state.autoNextTimer = setTimeout(() => {
              state.currentIndex++;
              runCurrentWord();
            }, config.DELAY_AFTER_FEEDBACK);
          }
        );
      }, config.DELAY_BEFORE_LISTEN);
    });
  }

  function gradeAndShowResult(transcript, correctWord, noResponse = false, errorMessage = '') {
    const userAnswer = (transcript || '').trim().toLowerCase();
    const correctAnswer = (correctWord || '').toLowerCase();
    const isCorrect = userAnswer === correctAnswer;
    
    // Record answer and update score
    state.answers[state.currentIndex] = userAnswer;
    if (isCorrect && !noResponse) {
      state.score++;
    }
    
    // Update lifetime stats immediately for visual feedback
    if (!noResponse) {
      state.lifeAttempts++;
      if (isCorrect) state.lifeCorrect++;
      updateLifeStats();
    }
    
    // Show visual feedback
    if (elements.feedbackBox) {
      elements.feedbackBox.classList.remove('correct', 'incorrect');
      
      if (noResponse) {
        elements.feedbackBox.classList.add('incorrect');
        elements.feedbackBox.innerHTML = `
          <i class="fas fa-microphone-slash"></i> 
          ${errorMessage || 'No response detected.'}<br>
          Correct: <strong>${escapeHtml(correctWord)}</strong>
        `;
      } else if (isCorrect) {
        elements.feedbackBox.classList.add('correct');
        elements.feedbackBox.innerHTML = `
          <i class="fas fa-check-circle"></i> 
          Correct! <strong>${escapeHtml(correctWord)}</strong>
        `;
        provideHapticFeedback();
      } else {
        elements.feedbackBox.classList.add('incorrect');
        elements.feedbackBox.innerHTML = `
          <i class="fas fa-times-circle"></i> 
          You said: "<strong>${escapeHtml(userAnswer)}</strong>"<br>
          Correct: <strong>${escapeHtml(correctWord)}</strong>
        `;
      }
    }
    
    // Update letter tiles with color coding
    if (elements.spellingVisual) {
      const characters = correctWord.split('');
      elements.spellingVisual.innerHTML = characters.map((char, index) => {
        const userChar = userAnswer[index] || '';
        const isCharCorrect = userChar.toLowerCase() === char.toLowerCase();
        const statusClass = noResponse ? 'incorrect' : (isCharCorrect ? 'correct' : 'incorrect');
        
        return `<div class="letter-tile ${statusClass}">${escapeHtml(char.toUpperCase())}</div>`;
      }).join('');
    }
    
    // Save updated lifetime stats
    saveLifeStats();
  }

  function showSessionSummary() {
    if (!elements.summaryArea) return;
    
    const totalWords = state.words.length;
    const percentage = totalWords > 0 ? Math.round((state.score / totalWords) * 100) : 0;
    
    // Get words that need practice
    const needsPractice = state.words.filter((word, index) => {
      const userAnswer = state.answers[index] || '';
      return userAnswer.toLowerCase() !== word.toLowerCase();
    });
    
    elements.summaryArea.innerHTML = `
      <div class="summary-header">
        <h2><i class="fas fa-chart-bar"></i> Spelling Bee Results</h2>
        <div class="score-display">${state.score}/${totalWords} (${percentage}%)</div>
        ${percentage >= 80 ? '<div class="score-percent">🎉 Excellent work!</div>' : 
          percentage >= 60 ? '<div class="score-percent">👍 Good job!</div>' : 
          '<div class="score-percent">💪 Keep practicing!</div>'}
      </div>
      
      <div class="results-grid">
        <div class="results-card correct">
          <h3><i class="fas fa-check-circle"></i> Words Mastered</h3>
          <div class="score-number">${state.score}</div>
          <div class="word-list">
            ${state.words.filter((word, index) => {
              const userAnswer = state.answers[index] || '';
              return userAnswer.toLowerCase() === word.toLowerCase();
            }).map(word => `<div class="word-item">${escapeHtml(word)}</div>`).join('')}
          </div>
        </div>
        
        <div class="results-card incorrect">
          <h3><i class="fas fa-redo-alt"></i> Needs Practice</h3>
          <div class="score-number">${needsPractice.length}</div>
          <div class="word-list">
            ${needsPractice.map(word => `<div class="word-item">${escapeHtml(word)}</div>`).join('')}
          </div>
        </div>
      </div>
      
      <div class="summary-actions">
        <button id="retry-session" class="btn-secondary">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
        <button id="new-words" class="btn-primary">
          <i class="fas fa-plus"></i> New Session
        </button>
      </div>
      
      <div class="summary-ad-container ad-container" style="margin-top: 20px;"></div>
    `;
    
    // Add event listeners to summary buttons
    document.getElementById('retry-session')?.addEventListener('click', () => {
      state.words = shuffleArray([...state.words]);
      state.currentIndex = 0;
      state.score = 0;
      state.answers = [];
      startSession();
    });
    
    document.getElementById('new-words')?.addEventListener('click', () => {
      startSession();
    });
  }

  // ---------- Navigation Controls ----------
  function updateNavigationButtons() {
    if (elements.prevBtn) {
      elements.prevBtn.disabled = state.currentIndex === 0;
    }
    if (elements.nextBtn) {
      elements.nextBtn.disabled = state.currentIndex >= state.words.length - 1;
    }
  }

  function goToPreviousWord() {
    if (!state.isRunning || state.currentIndex === 0) return;
    
    state.currentIndex--;
    runCurrentWord();
  }

  function goToNextWord() {
    if (!state.isRunning) return;
    
    if (state.currentIndex < state.words.length - 1) {
      state.currentIndex++;
      runCurrentWord();
    } else {
      endSession();
    }
  }

  function repeatCurrentWord() {
    if (!state.isRunning || state.currentIndex >= state.words.length) return;
    
    const currentWord = state.words[state.currentIndex];
    speak(currentWord);
  }

  // ---------- Utility Functions ----------
  function mergeUnique(baseArray, additionalArray) {
    const seen = new Set(baseArray.map(word => word.toLowerCase()));
    const result = [...baseArray];
    
    additionalArray.forEach(word => {
      const lowerWord = word.toLowerCase();
      if (!seen.has(lowerWord)) {
        seen.add(lowerWord);
        result.push(word);
      }
    });
    
    return result;
  }

  function shuffleArray(array) {
    const shuffled = [...array];
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

  function clearTimers() {
    if (state.autoNextTimer) {
      clearTimeout(state.autoNextTimer);
      state.autoNextTimer = null;
    }
  }

  function updateLifeStats() {
    if (elements.lifeCorrect) {
      elements.lifeCorrect.textContent = state.lifeCorrect.toString();
    }
    if (elements.lifeAttempts) {
      elements.lifeAttempts.textContent = state.lifeAttempts.toString();
    }
  }

  function saveLifeStats() {
    localStorage.setItem('bee_life_correct', state.lifeCorrect.toString());
    localStorage.setItem('bee_life_attempts', state.lifeAttempts.toString());
  }

  // ---------- Event Listeners Setup ----------
  function setupEventListeners() {
    // Load custom words from storage
    loadCustomWordsFromStorage();
    
    // Accent picker
    if (elements.accentPicker) {
      elements.accentPicker.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-accent]');
        if (button) {
          state.accent = button.getAttribute('data-accent') || 'en-US';
          elements.accentPicker.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
          });
          button.classList.add('active');
          provideHapticFeedback();
        }
      });
    }
    
    // Start/Stop session button
    if (elements.startBtn) {
      elements.startBtn.addEventListener('click', (event) => {
        event.preventDefault();
        provideHapticFeedback();
        
        if (!state.isRunning) {
          startSession();
        } else {
          endSession();
        }
      });
    }
    
    // Custom words addition
    if (elements.addCustomBtn) {
      elements.addCustomBtn.addEventListener('click', (event) => {
        event.preventDefault();
        provideHapticFeedback();
        
        const rawText = (elements.customInput?.value || '').trim();
        if (!rawText) {
          showError('Please enter some words first.');
          return;
        }
        
        const words = rawText.split(/[\s,;]+/).map(word => word.trim()).filter(word => word);
        
        if (addCustomWords(words)) {
          if (elements.customInput) {
            elements.customInput.value = '';
          }
          showInfo(`Added ${words.length} custom words to your list.`);
        }
      });
    }
    
    // File upload
    if (elements.uploadBtn) {
      elements.uploadBtn.addEventListener('click', (event) => {
        event.preventDefault();
        provideHapticFeedback();
        elements.fileInput?.click();
      });
    }
    
    if (elements.fileInput) {
      elements.fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        if (!canAddCustom()) {
          showError('Freemium allows one custom list per day. Upgrade to Premium for unlimited custom words.');
          event.target.value = '';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result || '';
            const words = text.split(/\r?\n|,|;|\t/).map(word => word.trim()).filter(word => word);
            
            if (addCustomWords(words)) {
              showInfo(`Uploaded ${words.length} custom words from file.`);
            }
          } catch (error) {
            showError('Failed to read the file. Please make sure it\'s a valid text file.');
            console.error('File read error:', error);
          }
          
          // Reset file input
          event.target.value = '';
        };
        
        reader.onerror = () => {
          showError('Error reading file. Please try another file.');
          event.target.value = '';
        };
        
        reader.readAsText(file);
      });
    }
    
    // Navigation buttons
    if (elements.prevBtn) {
      elements.prevBtn.addEventListener('click', (event) => {
        event.preventDefault();
        provideHapticFeedback();
        goToPreviousWord();
      });
    }
    
    if (elements.repeatBtn) {
      elements.repeatBtn.addEventListener('click', (event) => {
        event.preventDefault();
        provideHapticFeedback();
        repeatCurrentWord();
      });
    }
    
    if (elements.nextBtn) {
      elements.nextBtn.addEventListener('click', (event) => {
        event.preventDefault();
        provideHapticFeedback();
        goToNextWord();
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (!state.isRunning) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousWord();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextWord();
          break;
        case ' ':
          event.preventDefault();
          repeatCurrentWord();
          break;
      }
    });
  }

  // ---------- Cleanup on Page Unload ----------
  window.addEventListener('beforeunload', () => {
    clearTimers();
    stopRecognition();
    state.synth.cancel();
  });

  // Log initialization
  console.log('SpellRightPro Spelling Bee initialized successfully');
});
