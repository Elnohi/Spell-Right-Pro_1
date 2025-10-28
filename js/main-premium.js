/* =======================================================
   SpellRightPro Premium Logic - WITH VOICE RECOGNITION & REAL-TIME MARKING
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

// --- Voice Recognition ---
let recognition = null;
let isListening = false;

// --- Real-time Marking Variables ---
let realTimeMarkingEnabled = true;
let currentWordElement = null;

// Initialize speech recognition
function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
      isListening = true;
      updateBeeVoiceUI(true);
    };
    
    recognition.onresult = function(event) {
      const spokenText = event.results[0][0].transcript.trim();
      processSpokenSpelling(spokenText);
    };
    
    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      showFeedback(`Voice recognition error: ${event.error}`, 'error');
      updateBeeVoiceUI(false);
      isListening = false;
    };
    
    recognition.onend = function() {
      isListening = false;
      updateBeeVoiceUI(false);
    };
  } else {
    console.warn('Speech recognition not supported in this browser');
    showFeedback('Voice recognition not supported. Please use Chrome or Edge.', 'warning');
  }
}

function updateBeeVoiceUI(listening) {
  const voiceStatus = document.getElementById('beeVoiceStatus');
  const voiceText = document.getElementById('beeVoiceText');
  const recognizedText = document.getElementById('beeRecognizedText');
  
  if (listening) {
    voiceStatus.style.display = 'block';
    voiceText.textContent = 'Listening... Speak now!';
    recognizedText.style.display = 'none';
    
    // Animate voice visualizer
    animateVoiceVisualizer(true);
  } else {
    voiceStatus.style.display = 'none';
    animateVoiceVisualizer(false);
  }
}

function animateVoiceVisualizer(active) {
  const bars = document.querySelectorAll('.voice-bar');
  bars.forEach(bar => {
    if (active) {
      bar.style.animation = 'pulse 0.8s infinite alternate';
    } else {
      bar.style.animation = 'none';
      bar.style.height = '5px';
    }
  });
}

function processSpokenSpelling(spokenText) {
  const recognizedText = document.getElementById('beeRecognizedText');
  const spokenTextElement = document.getElementById('beeSpokenText');
  
  spokenTextElement.textContent = spokenText;
  recognizedText.style.display = 'block';
  
  // Auto-check the answer after a brief delay
  setTimeout(() => {
    checkBeeAnswer(spokenText);
  }, 1000);
}

function startVoiceRecognition() {
  if (!recognition) {
    showFeedback('Voice recognition not available', 'error');
    return;
  }
  
  if (isListening) {
    recognition.stop();
    return;
  }
  
  try {
    recognition.start();
    showFeedback('Listening... Please spell the word', 'info');
  } catch (error) {
    console.error('Error starting recognition:', error);
    showFeedback('Error starting voice recognition', 'error');
  }
}

function checkBeeAnswer(spokenText) {
  if (currentIndex >= currentList.length) return;
  
  const word = currentList[currentIndex];
  const normalizedSpoken = spokenText.toLowerCase().replace(/[^a-z]/g, '');
  const normalizedWord = word.toLowerCase().trim();
  
  // Hide recognized text during processing
  document.getElementById('beeRecognizedText').style.display = 'none';
  
  if (normalizedSpoken === normalizedWord) {
    score++;
    correctWords.push(word);
    showFeedback("✅ Correct! Well done!", "success");
    
    // Visual confirmation
    const feedbackElement = document.getElementById('beeFeedback');
    feedbackElement.style.color = '#28a745';
    feedbackElement.style.fontWeight = 'bold';
  } else {
    incorrectWords.push({ word: word, answer: spokenText });
    showFeedback(`❌ Incorrect. The word was: ${word}`, "error");
    
    // Visual feedback
    const feedbackElement = document.getElementById('beeFeedback');
    feedbackElement.style.color = '#dc3545';
    feedbackElement.style.fontWeight = 'bold';
  }
  
  currentIndex++;
  
  if (currentIndex < currentList.length) {
    setTimeout(nextWord, 2000);
  } else {
    setTimeout(showSummary, 1500);
  }
}

// --- REAL-TIME MARKING FUNCTIONS ---
function initializeRealTimeMarking() {
  // Add real-time marking toggle
  const realTimeToggleHTML = `
    <div class="real-time-marking-toggle" style="margin: 15px 0; display: flex; align-items: center; justify-content: center; gap: 10px;">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="realTimeMarkingToggle" checked>
        <span>Real-time Spelling Check</span>
      </label>
    </div>
  `;
  
  // Add to each trainer area except bee mode
  document.querySelectorAll('.trainer-area').forEach(area => {
    if (!area.id.includes('bee')) {
      const inputGroup = area.querySelector('.input-group');
      if (inputGroup) {
        inputGroup.insertAdjacentHTML('beforebegin', realTimeToggleHTML);
      }
    }
  });
  
  // Add event listener for toggle
  document.addEventListener('change', function(e) {
    if (e.target.id === 'realTimeMarkingToggle') {
      realTimeMarkingEnabled = e.target.checked;
      showFeedback(`Real-time marking ${realTimeMarkingEnabled ? 'enabled' : 'disabled'}`, 'info');
      
      // Clear any existing real-time feedback
      clearRealTimeFeedback();
    }
  });
  
  // Add input event listeners for real-time checking
  document.querySelectorAll('.answer-input').forEach(input => {
    input.addEventListener('input', function() {
      if (realTimeMarkingEnabled && currentIndex < currentList.length) {
        checkRealTimeSpelling(this.value, currentList[currentIndex]);
      } else {
        clearRealTimeFeedback();
      }
    });
    
    input.addEventListener('focus', function() {
      if (realTimeMarkingEnabled && currentIndex < currentList.length) {
        currentWordElement = this;
      }
    });
  });
}

function checkRealTimeSpelling(userInput, correctWord) {
  if (!userInput.trim()) {
    clearRealTimeFeedback();
    return;
  }
  
  const feedbackElement = document.getElementById(`${currentMode}Feedback`);
  const inputElement = document.getElementById(`${currentMode}Input`);
  
  if (!feedbackElement || !inputElement) return;
  
  const normalizedInput = userInput.toLowerCase().trim();
  const normalizedCorrect = correctWord.toLowerCase().trim();
  
  // Clear previous styling
  inputElement.style.borderColor = '';
  inputElement.style.background = '';
  
  if (normalizedInput === normalizedCorrect) {
    // Perfect match
    inputElement.style.borderColor = '#28a745';
    inputElement.style.background = 'rgba(40, 167, 69, 0.1)';
    feedbackElement.innerHTML = '<span style="color: #28a745;">✅ Spelling is correct!</span>';
  } else if (normalizedCorrect.startsWith(normalizedInput)) {
    // Partial match - on the right track
    inputElement.style.borderColor = '#ffc107';
    inputElement.style.background = 'rgba(255, 193, 7, 0.1)';
    
    const remaining = normalizedCorrect.slice(normalizedInput.length);
    feedbackElement.innerHTML = `<span style="color: #ffc107;">↳ Continue with: <strong>${remaining}</strong></span>`;
  } else {
    // Incorrect spelling
    inputElement.style.borderColor = '#dc3545';
    inputElement.style.background = 'rgba(220, 53, 69, 0.1)';
    
    // Provide hints for common mistakes
    const hint = generateSpellingHint(userInput, correctWord);
    feedbackElement.innerHTML = `<span style="color: #dc3545;">❌ ${hint}</span>`;
  }
}

function generateSpellingHint(wrongWord, correctWord) {
  const wrong = wrongWord.toLowerCase();
  const correct = correctWord.toLowerCase();
  
  // Common spelling mistake patterns
  if (wrong.length === correct.length) {
    // Check for single letter differences
    let differences = [];
    for (let i = 0; i < Math.min(wrong.length, correct.length); i++) {
      if (wrong[i] !== correct[i]) {
        differences.push(`Position ${i + 1}: "${wrong[i]}" should be "${correct[i]}"`);
      }
    }
    
    if (differences.length === 1) {
      return `Check ${differences[0]}`;
    } else if (differences.length > 0) {
      return `Multiple spelling errors detected`;
    }
  }
  
  // Check for missing/extra letters
  if (wrong.length < correct.length) {
    return `Word seems too short. Check for missing letters.`;
  } else if (wrong.length > correct.length) {
    return `Word seems too long. Check for extra letters.`;
  }
  
  // General hint
  return `Incorrect spelling. Listen carefully to the word.`;
}

function clearRealTimeFeedback() {
  const feedbackElement = document.getElementById(`${currentMode}Feedback`);
  const inputElement = document.getElementById(`${currentMode}Input`);
  
  if (feedbackElement) {
    feedbackElement.innerHTML = 'Type your answer...';
    feedbackElement.style.color = '';
  }
  
  if (inputElement) {
    inputElement.style.borderColor = '';
    inputElement.style.background = '';
  }
}

// --- Enhanced Answer Checking with Detailed Feedback ---
function checkAnswer() {
  if (currentIndex >= currentList.length) return;
  
  const word = currentList[currentIndex];
  let userAnswer = "";
  
  // Get answer based on mode
  if (currentMode === "bee") {
    // For bee mode, start voice recognition instead of using prompt
    startVoiceRecognition();
    return;
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
  
  // Enhanced feedback system
  if (normalizedAnswer === normalizedWord) {
    score++;
    correctWords.push(word);
    showDetailedFeedback(true, word, userAnswer);
  } else {
    incorrectWords.push({ word: word, answer: userAnswer });
    showDetailedFeedback(false, word, userAnswer);
  }
  
  currentIndex++;
  
  // Clear input and real-time feedback for next word
  const inputElement = document.getElementById(`${currentMode}Input`);
  if (inputElement) {
    inputElement.value = "";
    clearRealTimeFeedback();
  }
  
  if (currentIndex < currentList.length) {
    setTimeout(nextWord, 2000);
  } else {
    setTimeout(showSummary, 1000);
  }
}

function showDetailedFeedback(isCorrect, correctWord, userAnswer) {
  const feedbackElement = document.getElementById(`${currentMode}Feedback`);
  if (!feedbackElement) return;
  
  if (isCorrect) {
    feedbackElement.innerHTML = `
      <div style="color: #28a745; font-weight: bold;">
        ✅ Correct! Excellent spelling!
      </div>
      <div style="font-size: 0.9em; opacity: 0.9; margin-top: 5px;">
        You spelled "<strong>${correctWord}</strong>" perfectly.
      </div>
    `;
  } else {
    // Analyze the mistake
    const analysis = analyzeSpellingMistake(userAnswer, correctWord);
    
    feedbackElement.innerHTML = `
      <div style="color: #dc3545; font-weight: bold;">
        ❌ Incorrect
      </div>
      <div style="font-size: 0.9em; margin-top: 5px;">
        <div>Correct: <strong>${correctWord}</strong></div>
        <div>Your answer: <strong>${userAnswer}</strong></div>
        ${analysis ? `<div style="margin-top: 5px; color: #ffc107;">💡 ${analysis}</div>` : ''}
      </div>
    `;
  }
}

function analyzeSpellingMistake(wrong, correct) {
  const w = wrong.toLowerCase();
  const c = correct.toLowerCase();
  
  // Common spelling patterns to check
  if (w.replace(/[^a-z]/g, '') === c.replace(/[^a-z]/g, '')) {
    return "Watch out for unnecessary spaces or punctuation";
  }
  
  // Double letter mistakes
  const doubleLetterMistakes = {
    'acommodate': 'accommodate',
    'comitee': 'committee',
    'embarass': 'embarrass',
    'ocured': 'occurred'
  };
  
  if (doubleLetterMistakes[w]) {
    return "This word has double letters. Remember: " + doubleLetterMistakes[w];
  }
  
  // Silent letter mistakes
  if (w === c.replace(/[bckg]/g, '')) {
    return "This word has silent letters. Listen carefully to each syllable.";
  }
  
  // Vowel mistakes
  const vowelChanges = w.split('').filter((char, i) => 
    'aeiou'.includes(char) && i < c.length && char !== c[i]
  );
  
  if (vowelChanges.length > 0) {
    return "Check the vowels in the word. English vowels can be tricky!";
  }
  
  return "Practice this word's spelling pattern";
}

// --- Custom Words Management ---
let customLists = JSON.parse(localStorage.getItem('premiumCustomLists') || '{}');
let currentCustomList = null;

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
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
    border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
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
// CUSTOM WORDS FEATURE - UPDATED IMPLEMENTATION
// =======================================================

function createCustomWordsUI() {
  const customHTML = `
    <div class="custom-words-area" style="margin-top: 20px; display: none;">
      <h4><i class="fa fa-file-upload"></i> Custom Words</h4>
      
      <!-- Upload New List -->
      <div class="upload-section" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: var(--radius); margin-bottom: 20px;">
        <h5>Upload New Word List</h5>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <input type="text" id="newListName" placeholder="List Name" 
                 style="padding: 10px; border-radius: 8px; border: 1px solid #ccc; flex: 1; min-width: 150px;">
          <input type="file" id="wordListFile" accept=".txt,.csv" 
                 style="flex: 2; min-width: 200px;">
          <button onclick="uploadWordList()" class="nav-btn">
            <i class="fa fa-upload"></i> Upload
          </button>
        </div>
        <p style="font-size: 0.8rem; margin-top: 10px; opacity: 0.8;">
          Supported formats: .txt (one word per line) or .csv
        </p>
      </div>

      <!-- Manage Existing Lists -->
      <div class="lists-section">
        <h5>Your Word Lists</h5>
        <div id="customListsContainer" class="lists-container"></div>
      </div>

      <!-- Quick Create -->
      <div class="quick-create" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: var(--radius);">
        <h5>Quick Create</h5>
        <textarea id="quickWordsInput" placeholder="Enter words separated by commas or new lines" 
                  style="width: 100%; height: 80px; padding: 10px; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 10px;"></textarea>
        <button onclick="createQuickList()" class="nav-btn">
            <i class="fa fa-plus"></i> Create List
        </button>
      </div>
    </div>
  `;

  // Insert custom words into EACH trainer area
  document.querySelectorAll('.trainer-area').forEach(area => {
    const existingCustom = area.querySelector('.custom-words-area');
    if (!existingCustom) {
      // Insert after the h3 title but before other content
      const title = area.querySelector('h3');
      if (title) {
        title.insertAdjacentHTML('afterend', customHTML);
      }
    }
  });
}

function initializeCustomWords() {
  loadCustomLists();
  updateCustomListsDisplay();
}

function uploadWordList() {
  const listName = document.getElementById('newListName').value.trim();
  const fileInput = document.getElementById('wordListFile');
  
  if (!listName) {
    showFeedback('Please enter a list name', 'error');
    return;
  }
  
  if (!fileInput.files.length) {
    showFeedback('Please select a file', 'error');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      const words = parseWordList(content, file.name);
      
      if (words.length === 0) {
        showFeedback('No valid words found in file', 'error');
        return;
      }
      
      // Save the list
      customLists[listName] = {
        words: words,
        createdAt: new Date().toISOString(),
        wordCount: words.length
      };
      
      saveCustomLists();
      updateCustomListsDisplay();
      
      // Clear inputs
      document.getElementById('newListName').value = '';
      fileInput.value = '';
      
      showFeedback(`List "${listName}" created with ${words.length} words`, 'success');
    } catch (error) {
      showFeedback('Error reading file: ' + error.message, 'error');
    }
  };
  
  reader.readAsText(file);
}

function parseWordList(content, filename) {
  let words = [];
  
  if (filename.toLowerCase().endsWith('.csv')) {
    // Parse CSV - simple comma separation
    words = content.split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);
  } else {
    // Parse TXT - line by line
    words = content.split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);
  }
  
  // Remove duplicates and empty strings
  words = [...new Set(words)].filter(word => word.length > 0);
  
  return words;
}

function createQuickList() {
  const input = document.getElementById('quickWordsInput').value.trim();
  const listName = `Quick List ${new Date().toLocaleDateString()}`;
  
  if (!input) {
    showFeedback('Please enter some words', 'error');
    return;
  }
  
  // Parse words (both comma and newline separated)
  const words = input.split(/[\n,]/)
    .map(word => word.trim())
    .filter(word => word.length > 0);
  
  if (words.length === 0) {
    showFeedback('No valid words found', 'error');
    return;
  }
  
  // Save the list
  customLists[listName] = {
    words: words,
    createdAt: new Date().toISOString(),
    wordCount: words.length
  };
  
  saveCustomLists();
  updateCustomListsDisplay();
  document.getElementById('quickWordsInput').value = '';
  
  showFeedback(`Quick list created with ${words.length} words`, 'success');
}

function updateCustomListsDisplay() {
  const container = document.getElementById('customListsContainer');
  if (!container) return;
  
  if (Object.keys(customLists).length === 0) {
    container.innerHTML = '<p style="opacity: 0.7; text-align: center;">No custom lists yet. Upload your first list!</p>';
    return;
  }
  
  let html = '<div class="lists-grid">';
  
  Object.entries(customLists).forEach(([listName, listData]) => {
    html += `
      <div class="list-card">
        <div class="list-header">
          <strong>${listName}</strong>
          <span class="word-count">${listData.wordCount} words</span>
        </div>
        <div class="list-words-preview">
          ${listData.words.slice(0, 3).join(', ')}${listData.words.length > 3 ? '...' : ''}
        </div>
        <div class="list-actions">
          <button onclick="loadCustomList('${listName}')" class="btn-small">
            <i class="fa fa-play"></i> Use
          </button>
          <button onclick="renameCustomList('${listName}')" class="btn-small">
            <i class="fa fa-edit"></i> Rename
          </button>
          <button onclick="deleteCustomList('${listName}')" class="btn-small btn-danger">
            <i class="fa fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function loadCustomList(listName) {
  if (!customLists[listName]) {
    showFeedback('List not found', 'error');
    return;
  }
  
  currentCustomList = listName;
  currentList = customLists[listName].words;
  
  showFeedback(`Loaded "${listName}" with ${currentList.length} words`, 'success');
  
  // Auto-start training if a mode is selected
  if (currentMode) {
    setTimeout(() => {
      startTraining(currentMode);
    }, 1000);
  }
}

function renameCustomList(oldName) {
  const newName = prompt('Enter new name for the list:', oldName);
  if (newName && newName.trim() && newName !== oldName) {
    if (customLists[newName]) {
      showFeedback('A list with this name already exists', 'error');
      return;
    }
    
    customLists[newName] = customLists[oldName];
    delete customLists[oldName];
    saveCustomLists();
    updateCustomListsDisplay();
    showFeedback(`List renamed to "${newName}"`, 'success');
  }
}

function deleteCustomList(listName) {
  if (confirm(`Are you sure you want to delete "${listName}"?`)) {
    delete customLists[listName];
    saveCustomLists();
    updateCustomListsDisplay();
    showFeedback(`List "${listName}" deleted`, 'success');
  }
}

function saveCustomLists() {
  localStorage.setItem('premiumCustomLists', JSON.stringify(customLists));
}

function loadCustomLists() {
  const saved = localStorage.getItem('premiumCustomLists');
  if (saved) {
    customLists = JSON.parse(saved);
  }
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

// Enhanced Mode selection - Show custom words when mode is selected
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
      
      // Show custom words section for the selected mode
      const customWordsSection = selectedArea.querySelector('.custom-words-area');
      if (customWordsSection) {
        customWordsSection.style.display = "block";
      }
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
  
  // Stop voice recognition if active
  if (recognition && isListening) {
    recognition.stop();
  }
  
  // Clear real-time feedback
  clearRealTimeFeedback();
}

// Start button - FIXED: Proper mode handling
document.querySelectorAll(".start-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    startTraining(mode);
  });
});

// ENHANCED START TRAINING FUNCTION
function startTraining(mode) {
  resetTraining();
  
  // Use custom list if loaded, otherwise use default
  if (currentCustomList && customLists[currentCustomList]) {
    currentList = customLists[currentCustomList].words;
    showFeedback(`Using "${currentCustomList}" - ${currentList.length} words`, 'info');
  } else if (mode === "oet") {
    loadOETWords();
    return;
  } else if (mode === "bee") {
    currentList = ["accommodate", "rhythm", "occurrence", "necessary", "embarrass", "challenge", "definitely", "separate", "recommend", "privilege"];
    showFeedback("Bee mode started with default words", "info");
  } else if (mode === "school") {
    currentList = ["example", "language", "grammar", "knowledge", "science", "mathematics", "history", "geography", "literature", "chemistry"];
    showFeedback("School mode started with default words", "info");
  }
  
  nextWord();
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
    feedbackElement.innerHTML = "Listen carefully...";
    feedbackElement.style.color = ''; // Reset color
    feedbackElement.style.fontWeight = ''; // Reset font weight
  }
  
  // Clear any previous voice recognition UI
  updateBeeVoiceUI(false);
  document.getElementById('beeRecognizedText').style.display = 'none';
  
  // Clear input field
  const inputElement = document.getElementById(`${currentMode}Input`);
  if (inputElement) {
    inputElement.value = "";
    inputElement.style.borderColor = '';
    inputElement.style.background = '';
  }
  
  // Speak the word with a slight delay
  setTimeout(() => {
    speakWord(word);
  }, 500);
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
          <strong>${item.word}</strong> - You said: "${item.answer}"
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
  
  // Bee Listen button
  document.getElementById('beeListen')?.addEventListener('click', startVoiceRecognition);
  
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

// Initialize speech synthesis and recognition
function initializeSpeechSynthesis() {
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function() {
      console.log("Voices loaded:", speechSynthesis.getVoices().length);
    };
  }
  
  // Initialize voice recognition
  initializeSpeechRecognition();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  initializeSpeechSynthesis();
  createCustomWordsUI(); // Create the custom words UI in each mode
  initializeCustomWords(); // Initialize custom words functionality
  initializeRealTimeMarking(); // Initialize real-time marking
  console.log("SpellRightPro Premium with Voice Recognition & Real-time Marking initialized");
});
