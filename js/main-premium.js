/* =======================================================
   SpellRightPro Premium Logic - SIMPLIFIED & RELIABLE
   ======================================================= */

const firebaseConfig = window.firebaseConfig;

// --- Firebase Setup ---
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// --- Elements ---
const overlay = document.getElementById("loginOverlay");
const logoutBtn = document.getElementById("btnLogout");
const mainContent = document.querySelector("main");

// --- SIMPLIFIED AUTH: Bypass premium checks for now ---
function showOverlay() {
  if (overlay) overlay.style.display = "flex";
  if (mainContent) mainContent.style.display = "none";
}

function hideOverlay() {
  if (overlay) overlay.style.display = "none";
  if (mainContent) mainContent.style.display = "block";
}

// --- Ultra-simple email/password auth ---
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    showFeedback('Logging in...', 'info');
    await auth.signInWithEmailAndPassword(email, password);
    // SUCCESS: Immediately grant access
    hideOverlay();
    showFeedback('Welcome to SpellRightPro Premium!', 'success');
  } catch (error) {
    console.log('Login failed, trying registration...');
    // Try to create account
    try {
      await auth.createUserWithEmailAndPassword(email, password);
      hideOverlay();
      showFeedback('Account created! Welcome to Premium!', 'success');
    } catch (registerError) {
      showFeedback('Authentication failed. Please try again.', 'error');
    }
  }
});

// Register form
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;

  if (password !== confirmPassword) {
    showFeedback('Passwords do not match', 'error');
    return;
  }

  try {
    showFeedback('Creating account...', 'info');
    await auth.createUserWithEmailAndPassword(email, password);
    hideOverlay();
    showFeedback('Account created! Welcome to Premium!', 'success');
  } catch (error) {
    showFeedback('Registration failed: ' + error.message, 'error');
  }
});

// --- Form toggle ---
document.getElementById('showRegister')?.addEventListener('click', () => {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('showRegister').style.display = 'none';
  document.getElementById('showLogin').style.display = 'inline';
});

document.getElementById('showLogin')?.addEventListener('click', () => {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('showLogin').style.display = 'none';
  document.getElementById('showRegister').style.display = 'inline';
});

// --- SIMPLIFIED: Auto-login for testing ---
function quickAuth() {
  const testEmail = 'test@spellrightpro.com';
  const testPassword = 'test123456';
  
  auth.signInWithEmailAndPassword(testEmail, testPassword)
    .then(() => {
      hideOverlay();
      showFeedback('Auto-login successful!', 'success');
    })
    .catch(() => {
      // If auto-login fails, just show the login form
      showOverlay();
    });
}

// --- Auth state: SIMPLIFIED - any logged in user gets premium ---
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('✅ User authenticated:', user.email);
    hideOverlay();
  } else {
    console.log('❌ No user, showing login');
    showOverlay();
    // Try quick auth after a delay
    setTimeout(quickAuth, 1000);
  }
});

// --- Logout ---
logoutBtn?.addEventListener('click', () => {
  auth.signOut();
  showOverlay();
  showFeedback('Logged out successfully', 'info');
});

function showFeedback(message, type = "info") {
  const existing = document.querySelector(".feedback-message");
  if (existing) existing.remove();

  const feedback = document.createElement("div");
  feedback.className = `feedback-message ${type}`;
  feedback.textContent = message;
  feedback.style.cssText = `
    margin-top: 10px; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem;
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
    border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
  `;

  document.querySelector('.glass-card')?.appendChild(feedback);
  setTimeout(() => feedback.remove(), 4000);
}

// =======================================================
// DARK MODE TOGGLE
// =======================================================
const toggleDark = document.getElementById("toggleDark");
if (toggleDark) {
  toggleDark.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = toggleDark.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-moon");
      icon.classList.toggle("fa-sun");
    }
  });
}

// =======================================================
// TRAINING LOGIC (Bee / School / OET)
// =======================================================
let currentMode = null;
let currentIndex = 0;
let currentList = [];
let score = 0;
let correctWords = [];
let incorrectWords = [];
let flaggedWords = new Set();

// Mode selection - FIXED: Hide all areas initially, show only selected
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;
    
    // Hide all trainer areas
    document.querySelectorAll(".trainer-area").forEach(a => {
      a.style.display = "none";
      a.classList.remove("active");
    });
    
    // Show only the selected mode
    const selectedArea = document.getElementById(`${currentMode}-area`);
    if (selectedArea) {
      selectedArea.style.display = "block";
      selectedArea.classList.add("active");
    }
    
    // Reset any ongoing session
    resetTraining();
  });
});

// Initialize - hide all trainer areas on load
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll(".trainer-area").forEach(a => {
    a.style.display = "none";
  });
});

function resetTraining() {
  currentIndex = 0;
  score = 0;
  correctWords = [];
  incorrectWords = [];
  flaggedWords = new Set();
  speechSynthesis.cancel();
}

// Start button - FIXED: Proper mode handling
document.querySelectorAll(".start-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    startTraining(mode);
  });
});

function startTraining(mode) {
  resetTraining();
  
  if (mode === "oet") {
    loadOETWords();
  } else if (mode === "bee") {
    currentList = ["accommodate", "rhythm", "occurrence", "necessary", "embarrass", "challenge", "definitely", "separate", "recommend", "privilege"];
    showFeedback("Bee mode started! Listen carefully...", "info");
    nextWord();
  } else if (mode === "school") {
    currentList = ["example", "language", "grammar", "knowledge", "science", "mathematics", "history", "geography", "literature", "chemistry"];
    showFeedback("School mode started! Type what you hear...", "info");
    nextWord();
  }
}

// FIXED: OET words loading from external file
async function loadOETWords() {
  try {
    // Try to load from external JS file first
    if (typeof window.OET_WORDS !== 'undefined') {
      const isTest = document.querySelector('input[name="examType"]:checked')?.value === "test";
      currentList = isTest ? shuffle(window.OET_WORDS).slice(0, 24) : window.OET_WORDS;
      showFeedback(`OET ${isTest ? 'Test' : 'Practice'} mode: ${currentList.length} words loaded`, "success");
      nextWord();
      return;
    }
    
    // Fallback: fetch the JS file
    const response = await fetch('/js/oet_word_list.js');
    if (response.ok) {
      const jsContent = await response.text();
      
      // Execute the JS to get OET_WORDS
      eval(jsContent);
      
      if (typeof OET_WORDS !== 'undefined') {
        const isTest = document.querySelector('input[name="examType"]:checked')?.value === "test";
        currentList = isTest ? shuffle(OET_WORDS).slice(0, 24) : OET_WORDS;
        showFeedback(`OET ${isTest ? 'Test' : 'Practice'} mode: ${currentList.length} words loaded`, "success");
        nextWord();
      } else {
        throw new Error('OET_WORDS not found in loaded file');
      }
    } else {
      throw new Error('Failed to load OET words file');
    }
  } catch (err) {
    console.error("OET list load error:", err);
    // Fallback words
    currentList = ["abdomen", "anemia", "antibiotic", "artery", "asthma", "biopsy", "catheter", "diagnosis", "embolism", "fracture"];
    showFeedback("Using fallback OET words", "info");
    nextWord();
  }
}

// FIXED: Text-to-speech with proper error handling
function speakWord(word) {
  if (!window.speechSynthesis) {
    showFeedback("Text-to-speech not supported in this browser", "error");
    return;
  }
  
  try {
    const utter = new SpeechSynthesisUtterance(word);
    const accentSelect = document.getElementById(`${currentMode}Accent`);
    const accent = accentSelect?.value || "en-US";
    utter.lang = accent;
    utter.rate = 0.9;
    utter.pitch = 1;
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    utter.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      showFeedback("Error speaking word", "error");
    };
    
    speechSynthesis.speak(utter);
    showFeedback("Speaking...", "info");
  } catch (error) {
    console.error("Speech error:", error);
    showFeedback("Could not speak word", "error");
  }
}

function nextWord() {
  if (currentIndex >= currentList.length) {
    showSummary();
    return;
  }
  
  const word = currentList[currentIndex];
  const progressElement = document.getElementById(`${currentMode}Progress`);
  const feedbackElement = document.getElementById(`${currentMode}Feedback`);
  
  if (progressElement) {
    progressElement.textContent = `Word ${currentIndex + 1} of ${currentList.length}`;
  }
  
  if (feedbackElement) {
    feedbackElement.textContent = "Listen carefully...";
  }
  
  // Clear input field
  const inputElement = document.getElementById(`${currentMode}Input`);
  if (inputElement) inputElement.value = "";
  
  // Speak the word with a slight delay
  setTimeout(() => {
    speakWord(word);
  }, 500);
}

function checkAnswer() {
  if (currentIndex >= currentList.length) return;
  
  const word = currentList[currentIndex];
  let userAnswer = "";
  
  // Get answer based on mode
  if (currentMode === "bee") {
    // For bee mode, use speech recognition mock
    userAnswer = prompt(`Spell the word you heard:`) || "";
  } else {
    const inputElement = document.getElementById(`${currentMode}Input`);
    userAnswer = inputElement ? inputElement.value.trim() : "";
  }
  
  if (!userAnswer) {
    showFeedback("Please provide an answer", "error");
    return;
  }
  
  const normalizedAnswer = userAnswer.toLowerCase().trim();
  const normalizedWord = word.toLowerCase().trim();
  
  if (normalizedAnswer === normalizedWord) {
    score++;
    correctWords.push(word);
    showFeedback("✅ Correct!", "success");
  } else {
    incorrectWords.push({ word: word, answer: userAnswer });
    showFeedback(`❌ Incorrect. The word was: ${word}`, "error");
  }
  
  currentIndex++;
  
  // Clear input for next word
  const inputElement = document.getElementById(`${currentMode}Input`);
  if (inputElement) inputElement.value = "";
  
  if (currentIndex < currentList.length) {
    setTimeout(nextWord, 1500);
  } else {
    setTimeout(showSummary, 1000);
  }
}

// FIXED: Enhanced summary showing actual words
function showSummary() {
  const summaryElement = document.getElementById(`${currentMode}Summary`);
  if (!summaryElement) return;
  
  let summaryHTML = `
    <div class="summary-header">
      <h3>Session Complete</h3>
      <div class="score">Score: ${score}/${currentList.length}</div>
    </div>
  `;
  
  // Show incorrect words with user's answers
  if (incorrectWords.length > 0) {
    summaryHTML += `
      <div class="incorrect-words">
        <h4>❌ Incorrect Words (${incorrectWords.length})</h4>
        <div class="word-list">
    `;
    
    incorrectWords.forEach(item => {
      summaryHTML += `
        <div class="word-item">
          <strong>${item.word}</strong> - You typed: "${item.answer}"
        </div>
      `;
    });
    
    summaryHTML += `</div></div>`;
  }
  
  // Show flagged words
  if (flaggedWords.size > 0) {
    summaryHTML += `
      <div class="flagged-words">
        <h4>🚩 Flagged Words (${flaggedWords.size})</h4>
        <div class="word-list">
    `;
    
    flaggedWords.forEach(word => {
      summaryHTML += `<div class="word-item">${word}</div>`;
    });
    
    summaryHTML += `</div></div>`;
  }
  
  // Show correct words if needed
  if (correctWords.length > 0 && incorrectWords.length === 0) {
    summaryHTML += `
      <div class="correct-words">
        <h4>✅ Correct Words (${correctWords.length})</h4>
        <div class="word-list">
    `;
    
    correctWords.forEach(word => {
      summaryHTML += `<div class="word-item">${word}</div>`;
    });
    
    summaryHTML += `</div></div>`;
  }
  
  summaryElement.innerHTML = summaryHTML;
  summaryElement.style.display = "block";
}

function flagCurrentWord() {
  if (currentIndex >= currentList.length) return;
  
  const word = currentList[currentIndex];
  if (flaggedWords.has(word)) {
    flaggedWords.delete(word);
    showFeedback(`🚩 Removed flag from "${word}"`, "info");
  } else {
    flaggedWords.add(word);
    showFeedback(`🚩 Flagged "${word}" for review`, "success");
  }
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Attach event listeners for mode-specific buttons
document.addEventListener('DOMContentLoaded', function() {
  // Say Again buttons
  document.querySelectorAll('[id$="SayAgain"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentIndex < currentList.length) {
        const word = currentList[currentIndex];
        speakWord(word);
      }
    });
  });
  
  // Flag buttons
  document.querySelectorAll('[id$="Flag"]').forEach(btn => {
    btn.addEventListener('click', flagCurrentWord);
  });
  
  // Submit buttons
  document.querySelectorAll('[id$="Submit"]').forEach(btn => {
    btn.addEventListener('click', checkAnswer);
  });
  
  // End buttons
  document.querySelectorAll('[id$="End"]').forEach(btn => {
    btn.addEventListener('click', showSummary);
  });
  
  // Input field enter key support
  document.querySelectorAll('.answer-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        checkAnswer();
      }
    });
  });
});

// Initialize speech synthesis
function initializeSpeechSynthesis() {
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function() {
      console.log("Voices loaded:", speechSynthesis.getVoices().length);
    };
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  initializeSpeechSynthesis();
  console.log("SpellRightPro Premium initialized");
});
