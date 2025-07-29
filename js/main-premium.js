// main-premium.js — Fixed Full Version with Auto-Advance Fixes and AdSense Integration

// ==================== ADVERTISEMENT INTEGRATION ====================
let adsLoaded = false;

function loadAdsIfNeeded() {
  if (!auth.currentUser && !adsLoaded) {
    (adsbygoogle = window.adsbygoogle || []).push({});
    adsLoaded = true;
  }
}

window.addEventListener('error', (e) => {
  if (e.message.includes('adsbygoogle')) {
    console.error('AdSense failed to load:', e.message);
    const adContainer = document.querySelector('.ad-container');
    if (adContainer) adContainer.style.display = 'none';
  }
});

// ==================== SPEECH SYNTHESIS ====================
let voicesReady = false;

function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    window.speechSynthesis.onvoiceschanged = null;
  }
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speakWord(word, rate = 1.0) {
  if (!voicesReady) {
    setTimeout(() => speakWord(word, rate), 300);
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = rate;
    utterance.lang = accent;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang === accent) || 
                          voices.find(v => v.lang.startsWith(accent.split('-')[0]));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } else {
    console.error('Speech synthesis not supported');
    showAlert('Text-to-speech not supported in your browser', 'error');
  }
}

// ==================== GLOBAL STATE ====================
let currentUser = null;
let examType = "OET";
let accent = "en-US";
let words = [];
let currentIndex = 0;
let sessionMode = "practice";
let score = 0;
let flaggedWords = [];
let userAnswers = [];
let userAttempts = [];
let sessionStartTime;
let wordStartTime;
const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);

// ==================== FIREBASE AUTH STATE ====================
auth.onAuthStateChanged(user => {
  currentUser = user;
});

// ==================== SPEECH SYNTHESIS ====================
let voicesReady = false;
function loadVoices() {
  const v = window.speechSynthesis.getVoices();
  if (v.length) { voicesReady = true; window.speechSynthesis.onvoiceschanged = null; }
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();
function speakWord(word) {
  if (!voicesReady) return setTimeout(() => speakWord(word), 200);
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent;
  utter.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ==================== UTILS ====================
function toggleFlag() {
  const w = words[currentIndex];
  const idx = flaggedWords.indexOf(w);
  if (idx === -1) flaggedWords.push(w);
  else flaggedWords.splice(idx, 1);
}

function restartSession() {
  if (examType === "OET") startOET();
  else if (examType === "Bee") startBee();
  else startCustomPractice();
}

// ==================== OET MODE ====================
function startOET() {
  currentIndex = 0; score = 0; flaggedWords = []; userAnswers = [];
  words = window.oetWords?.slice() || [];
  if (!words.length) { alert("No OET words loaded."); return; }
  sessionStartTime = Date.now();
  showOETWord();
}

function showOETWord() {
  if (currentIndex >= words.length) return showSummary();
  const w = words[currentIndex];
  document.getElementById('trainer-area').innerHTML = `
    <h3>Word ${currentIndex+1} of ${words.length}</h3>
    <input id="user-input" placeholder="Type what you heard" autofocus />
    <button id="submit-btn">Submit</button>
    <button id="flag-btn">${flaggedWords.includes(w)? 'Unflag':'Flag'}</button>
  `;
  document.getElementById('submit-btn').onclick = checkOETAnswer;
  document.getElementById('flag-btn').onclick = toggleFlag;
  setTimeout(() => speakWord(w), 200);
}

function checkOETAnswer() {
  const input = document.getElementById('user-input').value.trim();
  userAnswers[currentIndex] = input;
  if (input.toLowerCase() === words[currentIndex].toLowerCase()) score++;
  currentIndex++;
  if (currentIndex < words.length) showOETWord(); else showSummary();
}

// ==================== BEE MODE ====================
function startBee() {
  currentIndex = 0; score = 0; flaggedWords = []; userAttempts = [];
  words = ["accommodate","belligerent","conscientious","disastrous",
            "embarrass","foreign","guarantee","harass",
            "interrupt","jealous","knowledge","liaison",
            "millennium","necessary","occasionally","possession",
            "questionnaire","rhythm","separate","tomorrow",
            "unforeseen","vacuum","withhold","yacht"];
  showBeeWord();
}

function showBeeWord() {
  if (currentIndex >= words.length) return showSummary();
  const w = words[currentIndex];
  document.getElementById('trainer-area').innerHTML = `
    <h3>Spelling Bee: Spell the word</h3>
    <button id="listen-btn">🔊 Hear Word</button>
    <button id="flag-btn">${flaggedWords.includes(w)? 'Unflag':'Flag'}</button>
  `;
  document.getElementById('listen-btn').onclick = () => speakWord(w) || listenBee(w);
  document.getElementById('flag-btn').onclick = toggleFlag;
  speakWord(w);
}

function listenBee(correctWord) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Speech recognition not supported"); return; }
  const r = new SR(); r.lang = accent;
  r.onresult = e => {
    const attempt = e.results[0][0].transcript.replace(/\s+/g, '').toLowerCase();
    userAttempts[currentIndex] = attempt;
    if (attempt === correctWord.toLowerCase()) score++;
    currentIndex++;
    showBeeWord();
  };
  r.start();
}

// ==================== CUSTOM MODE ====================
function startCustomPractice() {
  currentIndex = 0; score = 0; flaggedWords = []; userAnswers = [];
  // words should be set by renderCustomInput
  showCustomWord();
}

function showCustomWord() {
  if (currentIndex >= words.length) return showSummary();
  const w = words[currentIndex];
  document.getElementById('trainer-area').innerHTML = `
    <h3>Word ${currentIndex+1} of ${words.length}</h3>
    <input id="custom-input" placeholder="Type what you heard" autofocus />
    <button id="submit-btn">Submit</button>
    <button id="flag-btn">${flaggedWords.includes(w)? 'Unflag':'Flag'}</button>
  `;
  document.getElementById('submit-btn').onclick = checkCustomAnswer;
  document.getElementById('flag-btn').onclick = toggleFlag;
  setTimeout(() => speakWord(w), 200);
}

function checkCustomAnswer() {
  const input = document.getElementById('custom-input').value.trim();
  userAnswers[currentIndex] = input;
  if (input.toLowerCase() === words[currentIndex].toLowerCase()) score++;
  currentIndex++;
  if (currentIndex < words.length) showCustomWord(); else showSummary();
}

// ==================== SUMMARY & RETRY ====================
function showSummary() {
  const total = words.length;
  const accuracy = Math.round(score/total*100);
  const incorrectList = words.filter((w,i)=>(userAnswers[i]||userAttempts[i]||"").toLowerCase()!==w.toLowerCase());
  document.getElementById('summary-area').innerHTML = `
    <h2>Session Summary</h2>
    <p>Mode: ${examType}</p>
    <p>Score: ${score}/${total} (${accuracy}%)</p>
    <h3>Flagged Words (${flaggedWords.length})</h3>
    <ul>${flaggedWords.map(w=>`<li>${w}</li>`).join('')}</ul>
    <h3>Incorrect Words (${incorrectList.length})</h3>
    <ul>${incorrectList.map(w=>`<li>${w}</li>`).join('')}</ul>
    <button onclick="restartSession()">Restart Full Session</button>
    ${incorrectList.length?'<button onclick="retryIncorrect()">Retry Incorrect</button>':''}
  `;
  document.getElementById('trainer-area').innerHTML = '';
  saveSessionToFirebase();
}

function retryIncorrect() {
  const incorrectList = words.filter((w,i)=>(userAnswers[i]||userAttempts[i]||"").toLowerCase()!==w.toLowerCase());
  words = incorrectList;
  currentIndex = 0; score = 0; flaggedWords=[]; userAnswers=[]; userAttempts=[];
  document.getElementById('summary-area').innerHTML = '';
  if (examType==="OET") showOETWord();
  else if(examType==="Bee") showBeeWord();
  else showCustomWord();
}

// ==================== FIREBASE LOGGING ====================
function saveSessionToFirebase() {
  if (!currentUser || !firebase?.firestore) return;
  const db = firebase.firestore();
  db.collection('sessions').add({
    userId: currentUser.uid,
    examType,
    mode: sessionMode,
    totalWords: words.length,
    score,
    accuracy: Math.round(score/words.length*100),
    flaggedWords,
    userAnswers,
    userAttempts,
    timestamp: new Date()
  })
  .then(()=>console.log('Session saved'))
  .catch(e=>console.error('Firebase error', e));
}

// ==================== EXAM UI ====================
function renderExamUI() {
  examUI.innerHTML = `
    <div class="mode-selector">
      <button id="practice-mode-btn" class="mode-btn ${sessionMode === 'practice' ? 'selected' : ''}">
        <i class="fas fa-graduation-cap"></i> Practice Mode
      </button>
      <button id="test-mode-btn" class="mode-btn ${sessionMode === 'test' ? 'selected' : ''}">
        <i class="fas fa-clipboard-check"></i> Test Mode
      </button>
    </div>
    <div class="input-group">
      <select id="exam-type" class="form-control">
        <option value="OET">OET Spelling</option>
        <option value="Bee">Spelling Bee</option>
        <option value="Custom">Custom Words</option>
      </select>
      <select id="accent-select" class="form-control" style="max-width: 150px;">
        <option value="en-US">American English</option>
        <option value="en-GB">British English</option>
        <option value="en-AU">Australian English</option>
      </select>
      <span id="flag-svg" style="display: inline-flex; align-items: center;"></span>
    </div>
    <div id="custom-upload-area"></div>
    <button id="start-btn" class="btn btn-primary" style="margin-top: 15px;">
      <i class="fas fa-play"></i> Start Session
    </button>`;

  document.getElementById('exam-type').value = examType;
  document.getElementById('accent-select').value = accent;

  document.getElementById('exam-type').onchange = e => {
    examType = e.target.value;
    renderExamUI(); // reload UI
  };

  document.getElementById('accent-select').onchange = e => {
    accent = e.target.value;
    updateFlag();
  };

  document.getElementById('practice-mode-btn').onclick = () => {
    sessionMode = "practice";
    renderExamUI();
  };

  document.getElementById('test-mode-btn').onclick = () => {
    sessionMode = "test";
    renderExamUI();
  };

  document.getElementById('start-btn').onclick = () => {
    summaryArea.innerHTML = "";
    if (examType === "OET") {
      startOET();
    } else if (examType === "Bee") {
      startBee();
    } else if (examType === "Custom") {
      renderCustomInput();
    }
  };

  if (examType === "Custom") renderCustomInput();
}

function updateFlag() {
  const flagSVGs = {
    "en-US": `<svg width="24" height="16" viewBox="0 0 60 40"><!-- US flag SVG --></svg>`,
    "en-GB": `<svg width="24" height="16" viewBox="0 0 60 40"><!-- UK flag SVG --></svg>`,
    "en-AU": `<svg width="24" height="16" viewBox="0 0 60 40"><!-- AU flag SVG --></svg>`
  };
  document.getElementById('flag-svg').innerHTML = flagSVGs[accent] || "";
}

function renderCustomInput() {
  document.getElementById('custom-upload-area').innerHTML = `
    <textarea id="custom-words" class="form-control" rows="4" 
      placeholder="Enter words (separated by commas, spaces, or new lines)"></textarea>
    <button id="add-custom-btn" class="btn btn-info" style="margin-top: 10px;">
      <i class="fas fa-plus-circle"></i> Use These Words
    </button>`;

  document.getElementById('add-custom-btn').onclick = () => {
    const input = document.getElementById('custom-words').value.trim();
    if (!input) {
      showAlert("Please enter some words first!", 'error');
      return;
    }

    try {
      processWordList(input);
      trackEvent('custom_words_processed', { session_id: sessionId, word_count: words.length });
      showAlert(`Added ${words.length} words!`, 'success');
      appTitle.textContent = "Custom Spelling Practice";
      startCustomPractice();
    } catch (error) {
      trackError(error, { context: 'custom_words_input' });
      showAlert(error.message, 'error');
    }
  };
}

function processWordList(text) {
  words = [...new Set(text.split(/[\s,;\/\-–—|]+/))]
    .map(w => w.trim())
    .filter(w => w && w.length > 1);
  if (words.length === 0) {
    throw new Error("No valid words found in the input");
  }
  return words;
}

// ==================== OET PRACTICE (FIXED AUTO-ADVANCE) ====================
function startOET() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";

  words = sessionMode === "test" 
    ? [...window.oetWords].sort(() => 0.5 - Math.random()).slice(0, 24)
    : window.oetWords.slice();

  trackEvent('session_started', {
    session_id: sessionId,
    exam_type: 'OET',
    mode: sessionMode,
    word_count: words.length
  });

  showOETWord();
  setTimeout(() => speakCurrentWord(), 300);
}

function showOETWord() {
  if (currentIndex >= words.length) {
    trackEvent('session_completed', {
      session_id: sessionId,
      score: score,
      total_words: words.length,
      accuracy: Math.round((score / words.length) * 100),
      flagged_words: flaggedWords.length
    });
    showSummary();
    return;
  }

  wordStartTime = Date.now();
  const word = words[currentIndex];

  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    <div class="input-wrapper">
      <input type="text" id="user-input" class="form-control ${userAnswers[currentIndex] ? 
        (userAnswers[currentIndex].toLowerCase() === word.toLowerCase() ? 'correct-input' : 'incorrect-input') : ''}" 
        placeholder="Type what you heard..." autofocus>
    </div>
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length - 1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Next
      </button>
    </div>
    <div id="feedback" class="feedback"></div>`;

  const input = document.getElementById('user-input');
  document.getElementById('repeat-btn').onclick = speakCurrentWord;
  document.getElementById('prev-btn').onclick = prevOETWord;
  document.getElementById('next-btn').onclick = nextOETWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

  input.focus();
  input.select();

  input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); // prevent accidental form submission
    checkOETAnswer(word);
  }
});

function speakCurrentWord() {
  const statusElement = document.getElementById('word-status');
  if (statusElement) {
    statusElement.innerHTML = '<i class="fas fa-volume-up speech-loading"></i>';
  }
  
  speakWord(words[currentIndex]);
  
  setTimeout(() => {
    if (statusElement) {
      statusElement.innerHTML = '';
    }
  }, 500);
}

function checkOETAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();

  if (isCorrect) {
    score++;
    showFeedback("✓ Correct!", "correct");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i>';
    userInput.classList.add('correct-input');
    userInput.classList.remove('incorrect-input');
  } else {
    showFeedback(`\u2717 Incorrect. Correct: ${correctWord}`, "incorrect");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
    userInput.classList.add('incorrect-input');
    userInput.classList.remove('correct-input');
  }

  // Auto-advance after delay (regardless of correct/incorrect)
  setTimeout(() => {
    trainerArea.classList.add('word-transition');
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showOETWord();
        speakCurrentWord();
      } else {
        showSummary();
      }
    }, 300);
  }, 1500);
}

function nextOETWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showOETWord();
    speakCurrentWord();
  }
}

function prevOETWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showOETWord();
    speakCurrentWord();
  }
}

function toggleFlagWord(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  showOETWord();
}

// ==================== CUSTOM PRACTICE (FIXED AUTO-ADVANCE) ====================
function startCustomPractice() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";

  trackEvent('session_started', {
    session_id: sessionId,
    exam_type: 'Custom',
    mode: sessionMode,
    word_count: words.length
  });

  showCustomWord();
  setTimeout(() => speakCurrentWord(), 300);
}

function showCustomWord() {
  if (currentIndex >= words.length) {
    showSummary();
    return;
  }

  wordStartTime = Date.now();
  const word = words[currentIndex];

  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    <div class="input-wrapper">
      <input type="text" id="user-input" class="form-control ${userAnswers[currentIndex] ? 
        (userAnswers[currentIndex].toLowerCase() === word.toLowerCase() ? 'correct-input' : 'incorrect-input') : ''}" 
        placeholder="Type what you heard..." autofocus
        value="${userAnswers[currentIndex] || ''}">
      <span id="real-time-feedback" class="real-time-feedback"></span>
    </div>
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length-1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Next
      </button>
    </div>
    <div id="feedback" class="feedback"></div>`;

  const input = document.getElementById('user-input');
  const feedback = document.getElementById('real-time-feedback');

  input.addEventListener('input', (e) => {
    const currentInput = e.target.value.toLowerCase();
    const correctWord = word.toLowerCase();
    
    if (currentInput === correctWord) {
      feedback.innerHTML = '<i class="fas fa-check correct-feedback"></i>';
      setTimeout(() => checkCustomAnswer(word), 300);
    } else if (correctWord.startsWith(currentInput)) {
      feedback.innerHTML = '<i class="fas fa-thumbs-up correct-feedback"></i>';
    } else {
      feedback.innerHTML = '<i class="fas fa-times incorrect-feedback"></i>';
    }
  });

  document.getElementById('repeat-btn').onclick = speakCurrentWord;
  document.getElementById('prev-btn').onclick = prevCustomWord;
  document.getElementById('next-btn').onclick = nextCustomWord;
  document.getElementById('flag-btn').onclick = () => toggleFlagWord(word);

  input.focus();
  input.select();
}

function checkCustomAnswer(correctWord) {
  const input = document.getElementById('user-input');
  const userAnswer = input.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const isCorrect = userAnswer.toLowerCase() === correctWord.toLowerCase();

  if (isCorrect) {
    score++;
    showFeedback("✓ Correct!", "correct");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i>';
    input.classList.add('correct-input');
    input.classList.remove('incorrect-input');
  } else {
    showFeedback(`✗ Incorrect. Correct: ${correctWord}`, "incorrect");
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle" style="color:var(--danger)"></i>';
    input.classList.add('incorrect-input');
    input.classList.remove('correct-input');
  }

  // Auto-advance after delay (regardless of correct/incorrect)
  setTimeout(() => {
    trainerArea.classList.add('word-transition');
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        showCustomWord();
        speakCurrentWord();
      } else {
        showSummary();
      }
    }, 300);
  }, 1500);
}

function nextCustomWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showCustomWord();
    speakCurrentWord();
  }
}

function prevCustomWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showCustomWord();
    speakCurrentWord();
  }
}

// ==================== SPELLING BEE (UNCHANGED) ====================
function startBee() {
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAttempts = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";

  words = [
    "accommodate", "belligerent", "conscientious", "disastrous", 
    "embarrass", "foreign", "guarantee", "harass", 
    "interrupt", "jealous", "knowledge", "liaison",
    "millennium", "necessary", "occasionally", "possession",
    "questionnaire", "rhythm", "separate", "tomorrow",
    "unforeseen", "vacuum", "withhold", "yacht"
  ];

  trackEvent('session_started', {
    session_id: sessionId,
    exam_type: 'Bee',
    mode: sessionMode,
    word_count: words.length
  });

  showBeeWord();
  speakCurrentBeeWord();
}

function showBeeWord() {
  if (currentIndex >= words.length) {
    showBeeSummary();
    return;
  }

  wordStartTime = Date.now();
  const word = words[currentIndex];

  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word">
        <i class="fas fa-redo"></i>
      </button>
      <span id="word-status"></span>
    </div>
    <div class="auto-recording-info">
      <i class="fas fa-info-circle"></i> Speak the spelling after hearing the word
    </div>
    <div id="spelling-visual" style="margin: 15px 0;"></div>
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> 
        ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <button id="next-btn" class="btn btn-secondary" ${currentIndex === words.length-1 ? "disabled" : ""}>
        <i class="fas fa-arrow-right"></i> Skip
      </button>
    </div>
    <div id="mic-feedback" class="feedback"></div>`;

  document.getElementById('repeat-btn').onclick = () => speakCurrentBeeWord();
  document.getElementById('prev-btn').onclick = prevBeeWord;
  document.getElementById('next-btn').onclick = nextBeeWord;
  document.getElementById('flag-btn').onclick = () => toggleBeeFlagWord(word);

  setTimeout(() => {
    listenForSpelling(word);
  }, 500);
}

function speakCurrentBeeWord() {
  const statusElement = document.getElementById('word-status');
  if (statusElement) {
    statusElement.innerHTML = '<i class="fas fa-volume-up speech-loading"></i>';
  }
  
  speakWord(words[currentIndex]);
  
  setTimeout(() => {
    if (statusElement) {
      statusElement.innerHTML = '';
    }
  }, 500);
}

function listenForSpelling(correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  micFeedback.textContent = "Listening... Please spell the word.";
  micFeedback.className = "feedback";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micFeedback.textContent = "Speech recognition not supported.";
    micFeedback.className = "feedback incorrect";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = accent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  recognition.onresult = (event) => {
    const results = event.results[0];
    const bestMatch = findBestMatch(results);
    processSpellingAttempt(bestMatch, correctWord);
  };

  recognition.onerror = (event) => {
    trackError(new Error(event.error), { context: 'speech_recognition', session_id: sessionId });
    micFeedback.textContent = `Error: ${event.error}`;
    micFeedback.className = "feedback incorrect";
  };

  recognition.start();
}

function findBestMatch(results) {
  for (let i = 0; i < results.length; i++) {
    const transcript = results[i].transcript.trim().toLowerCase();
    const cleaned = transcript.replace(/[^a-z]/g, '');
    if (cleaned.length > 0) return cleaned;
  }
  return '';
}

function processSpellingAttempt(attempt, correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  if (!attempt) {
    micFeedback.textContent = "Couldn't detect your spelling. Try again.";
    micFeedback.className = "feedback incorrect";
    return;
  }

  userAttempts[currentIndex] = attempt;
  const isCorrect = attempt === correctWord.toLowerCase();

  updateSpellingVisual(
    correctWord.split('').map((letter, i) => ({
      letter: attempt[i] || '',
      correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
    }))
  );

  if (isCorrect) {
    score++;
    micFeedback.textContent = "✓ Correct!";
    micFeedback.className = "feedback correct";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
  } else {
    micFeedback.textContent = `✗ Incorrect. You spelled: ${attempt}. Correct: ${correctWord}`;
    micFeedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }

  setTimeout(() => {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      showBeeWord();
      speakCurrentBeeWord();
    } else {
      showBeeSummary();
    }
  }, 1500);
}

function updateSpellingVisual(letters = []) {
  const spellingVisual = document.getElementById('spelling-visual');
  const word = words[currentIndex];
  spellingVisual.innerHTML = word.split('').map((letter, i) => {
    const letterData = letters[i] || {};
    const letterClass = letterData.correct ? 'correct' : (letterData.letter ? 'incorrect' : '');
    return `<div class="letter-tile ${letterClass}">${letterData.letter || ''}</div>`;
  }).join('');
}

function nextBeeWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showBeeWord();
    speakCurrentBeeWord();
  }
}

function prevBeeWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showBeeWord();
    speakCurrentBeeWord();
  }
}

function toggleBeeFlagWord(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  showBeeWord();
}

// ==================== SUMMARY DISPLAY ====================
function showSummary() {
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);
  const accuracy = Math.round((score / words.length) * 100);
  
  const summaryHTML = `
    <div class="summary-card">
      <h3>Session Summary</h3>
      <p><strong>Mode:</strong> ${examType.toUpperCase()}</p>
      <p><strong>Words Attempted:</strong> ${words.length}</p>
      <p><strong>Score:</strong> ${score}</p>
      <p><strong>Accuracy:</strong> ${accuracy}%</p>
      <p><strong>Duration:</strong> ${duration} seconds</p>
      ${flaggedWords.length > 0 ? `
        <div class="flagged-section">
          <h4>Flagged Words (${flaggedWords.length}):</h4>
          <ul>${flaggedWords.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>` : '<p>No flagged words.</p>'}
      <button class="btn btn-primary" onclick="restartSession()">Restart</button>
    </div>
  `;

  summaryArea.innerHTML = summaryHTML;
  trainerArea.innerHTML = '';
  examUI.innerHTML = '';
}

function showBeeSummary() {
  const percent = Math.round((score / words.length) * 100);
  const wrongWords = words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase());

  summaryArea.innerHTML = `
    <div class="card-header"><h3>Spelling Bee Results</h3>
    <div class="score-display">${score}/${words.length} (${percent}%)</div></div>
    <div class="results-grid">
      <div class="results-card correct">
        <h3><i class="fas fa-check-circle"></i> Correct</h3>
        <div class="score-number">${score}</div>
        <div class="word-list">${words.filter((w, i) => (userAttempts[i] || "").toLowerCase() === w.toLowerCase()).map(w => `<div class="word-item">${w}</div>`).join('')}</div>
      </div>
      <div class="results-card incorrect">
        <h3><i class="fas fa-times-circle"></i> Needs Practice</h3>
        <div class="score-number">${wrongWords.length}</div>
        <div class="word-list">${wrongWords.map(w => `<div class="word-item">${w}</div>`).join('')}</div>
      </div>
    </div>
    <div class="summary-actions">
      <button id="restart-btn" class="btn btn-primary"><i class="fas fa-redo"></i> Restart Bee</button>
      <button id="new-list-btn" class="btn btn-secondary"><i class="fas fa-sync-alt"></i> New List</button>
    </div>`;

  document.getElementById('restart-btn').onclick = () => startBee();
  document.getElementById('new-list-btn').onclick = () => {
    summaryArea.innerHTML = "";
    renderExamUI();
  };
}

function showFeedback(message, type = 'correct') {
  const feedback = document.getElementById('feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
  };
}
  
