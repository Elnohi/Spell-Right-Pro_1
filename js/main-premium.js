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

// --- Training Variables ---
let currentMode = null;
let currentIndex = 0;
let currentList = [];
let score = 0;
let correctWords = [];
let incorrectWords = [];
let flaggedWords = new Set();

// --- Custom Words Management ---
let customLists = JSON.parse(localStorage.getItem('premiumCustomLists') || '{}');
let currentCustomList = null;

// --- Premium Status ---
let isPremiumUser = false;

// =======================================================
// AUTHENTICATION - FIXED REGISTRATION FLOW
// =======================================================

function showOverlay() {
  if (overlay) overlay.style.display = "flex";
  if (mainContent) mainContent.style.display = "none";
}

function hideOverlay() {
  if (overlay) overlay.style.display = "none";
  if (mainContent) mainContent.style.display = "block";
}

// Check premium status from Firestore
async function checkPremiumStatus(user) {
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      isPremiumUser = userData.premium === true;
      console.log('Premium status:', isPremiumUser);
      
      // Apply premium restrictions
      applyPremiumRestrictions();
      
      return isPremiumUser;
    } else {
      // New user - not premium
      isPremiumUser = false;
      applyPremiumRestrictions();
      return false;
    }
  } catch (error) {
    console.error('Error checking premium status:', error);
    isPremiumUser = false;
    applyPremiumRestrictions();
    return false;
  }
}

// Apply premium feature restrictions
function applyPremiumRestrictions() {
  const premiumFeatures = document.querySelectorAll('.premium-feature');
  const upgradePrompts = document.querySelectorAll('.upgrade-prompt');
  
  if (isPremiumUser) {
    // User is premium - enable all features
    premiumFeatures.forEach(feature => {
      feature.style.opacity = '1';
      feature.style.pointerEvents = 'auto';
    });
    upgradePrompts.forEach(prompt => {
      prompt.style.display = 'none';
    });
    console.log('Premium features enabled');
  } else {
    // User is not premium - restrict features
    premiumFeatures.forEach(feature => {
      feature.style.opacity = '0.6';
      feature.style.pointerEvents = 'none';
    });
    upgradePrompts.forEach(prompt => {
      prompt.style.display = 'block';
    });
    console.log('Premium features restricted');
  }
}

// Simple login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    showFeedback('Logging in...', 'info');
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const isPremium = await checkPremiumStatus(userCredential.user);
    
    if (isPremium) {
      hideOverlay();
      showFeedback('Welcome back to SpellRightPro Premium!', 'success');
    } else {
      hideOverlay();
      showFeedback('Welcome! Upgrade to Premium for full features.', 'info');
    }
  } catch (error) {
    console.log('Login failed:', error);
    showFeedback('Login failed. Please check your credentials.', 'error');
  }
});

// REGISTRATION WITH PAYMENT REDIRECTION - FIXED
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
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    // Create user document in Firestore
    await db.collection('users').doc(userCredential.user.uid).set({
      email: email,
      createdAt: new Date().toISOString(),
      premium: false // Default to non-premium
    });
    
    showFeedback('Account created! Redirecting to payment...', 'success');
    
    // REDIRECT TO PAYMENT PAGE AFTER REGISTRATION
    setTimeout(() => {
      window.location.href = 'pricing.html';
    }, 2000);
    
  } catch (error) {
    showFeedback('Registration failed: ' + error.message, 'error');
  }
});

// Form toggle
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

// Auth state: check premium status on login
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log('✅ User authenticated:', user.email);
    await checkPremiumStatus(user);
    hideOverlay();
  } else {
    console.log('❌ No user, showing login');
    isPremiumUser = false;
    applyPremiumRestrictions();
    showOverlay();
  }
});

// Logout
logoutBtn?.addEventListener('click', () => {
  auth.signOut();
  isPremiumUser = false;
  applyPremiumRestrictions();
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
// VOICE RECOGNITION - WITH PREMIUM RESTRICTIONS
// =======================================================

function initializeSpeechRecognition() {
  if (!isPremiumUser) {
    console.log('Voice recognition requires premium');
    return;
  }
  
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
      bar.style.animation = 'voicePulse 0.8s infinite alternate';
    } else {
      bar.style.animation = 'none';
      bar.style.height = '8px';
    }
  });
}

function processSpokenSpelling(spokenText) {
  const recognizedText = document.getElementById('beeRecognizedText');
  const spokenTextElement = document.getElementById('beeSpokenText');
  
  spokenTextElement.textContent = spokenText;
  recognizedText.style.display = 'block';
  
  setTimeout(() => {
    checkBeeAnswer(spokenText);
  }, 1000);
}

function startVoiceRecognition() {
  if (!isPremiumUser) {
    showFeedback('Voice recognition is a Premium feature. Please upgrade.', 'warning');
    return;
  }
  
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
  
  document.getElementById('beeRecognizedText').style.display = 'none';
  
  if (normalizedSpoken === normalizedWord) {
    score++;
    correctWords.push(word);
    showFeedback("✅ Correct! Well done!", "success");
    const feedbackElement = document.getElementById('beeFeedback');
    feedbackElement.style.color = '#28a745';
    feedbackElement.style.fontWeight = 'bold';
  } else {
    incorrectWords.push({ word: word, answer: spokenText });
    showFeedback(`❌ Incorrect. The word was: ${word}`, "error");
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

// =======================================================
// REAL-TIME MARKING - WITH PREMIUM RESTRICTIONS
// =======================================================

function initializeRealTimeValidation() {
    // Add real-time marking toggle
    const realTimeToggleHTML = `
        <div class="real-time-marking-toggle" style="margin: 15px 0; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="realTimeMarkingToggle" ${isPremiumUser ? 'checked' : 'disabled'}>
                <span>Real-time Spelling Check ${!isPremiumUser ? '(Premium)' : ''}</span>
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
            if (!isPremiumUser) {
                showFeedback('Real-time marking is a Premium feature. Please upgrade.', 'warning');
                e.target.checked = false;
                return;
            }
            realTimeMarkingEnabled = e.target.checked;
            showFeedback(`Real-time marking ${realTimeMarkingEnabled ? 'enabled' : 'disabled'}`, 'info');
            clearRealTimeFeedback();
        }
    });
    
    document.querySelectorAll('.answer-input').forEach(input => {
        input.addEventListener('input', function() {
            if (!realTimeMarkingEnabled || !isPremiumUser || currentIndex >= currentList.length) return;
            
            const currentWord = currentList[currentIndex];
            const userInput = this.value.trim().toLowerCase();
            const correctWord = currentWord.toLowerCase();
            
            // Real-time visual feedback
            if (userInput === correctWord) {
                this.style.borderColor = '#4CAF50';
                this.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
                this.style.color = '#4CAF50';
                this.style.fontWeight = 'bold';
                this.style.textDecoration = 'none';
            } else if (userInput && correctWord.startsWith(userInput)) {
                this.style.borderColor = '#FFC107';
                this.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                this.style.color = '#FFC107';
                this.style.fontWeight = 'normal';
                this.style.textDecoration = 'none';
            } else if (userInput) {
                this.style.borderColor = '#f44336';
                this.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                this.style.color = '#f44336';
                this.style.fontWeight = 'normal';
                this.style.textDecoration = 'line-through';
            } else {
                this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                this.style.color = 'white';
                this.style.fontWeight = 'normal';
                this.style.textDecoration = 'none';
            }
        });
        
        // Add focus styling
        input.addEventListener('focus', function() {
            this.style.borderColor = '#7b2ff7';
            this.style.boxShadow = '0 0 0 2px rgba(123, 47, 247, 0.3)';
        });
        
        input.addEventListener('blur', function() {
            this.style.boxShadow = 'none';
        });
    });
}

function clearRealTimeFeedback() {
    const inputElement = document.getElementById(`${currentMode}Input`);
    if (inputElement) {
        inputElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        inputElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        inputElement.style.color = 'white';
        inputElement.style.fontWeight = 'normal';
        inputElement.style.textDecoration = 'none';
        inputElement.style.boxShadow = 'none';
    }
}

// =======================================================
// CUSTOM WORDS MANAGEMENT - WITH PREMIUM RESTRICTIONS
// =======================================================

function createCustomWordsUI() {
  const customHTML = `
    <div class="custom-words-area" style="margin-top: 20px; display: none;">
      <h4><i class="fa fa-file-upload"></i> Custom Words ${!isPremiumUser ? '<small style="color: #ffd700;">(Premium)</small>' : ''}</h4>
      
      ${!isPremiumUser ? `
      <div class="upgrade-prompt" style="background: linear-gradient(135deg, #ffd700, #ff6b00); padding: 15px; border-radius: var(--radius); margin-bottom: 15px; text-align: center;">
        <i class="fa fa-crown" style="color: #fff;"></i>
        <strong style="color: #fff;">Upgrade to Premium for unlimited custom word lists!</strong>
        <br>
        <a href="pricing.html" class="btn-primary" style="margin-top: 10px; display: inline-block;">
          <i class="fa fa-arrow-up"></i> Upgrade Now
        </a>
      </div>
      ` : ''}
      
      <!-- Upload New List -->
      <div class="upload-section premium-feature" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: var(--radius); margin-bottom: 20px;">
        <h5>Upload New Word List</h5>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <input type="text" id="newListName" placeholder="List Name" 
                 style="padding: 10px; border-radius: 8px; border: 1px solid #ccc; flex: 1; min-width: 150px;" ${!isPremiumUser ? 'disabled' : ''}>
          <input type="file" id="wordListFile" accept=".txt,.csv" 
                 style="flex: 2; min-width: 200px;" ${!isPremiumUser ? 'disabled' : ''}>
          <button onclick="uploadWordList()" class="nav-btn" ${!isPremiumUser ? 'disabled' : ''}>
            <i class="fa fa-upload"></i> Upload
          </button>
        </div>
        <p style="font-size: 0.8rem; margin-top: 10px; opacity: 0.8;">
          Supported formats: .txt (one word per line) or .csv
        </p>
      </div>

      <!-- Manage Existing Lists -->
      <div class="lists-section premium-feature">
        <h5>Your Word Lists</h5>
        <div id="customListsContainer" class="lists-container"></div>
      </div>

      <!-- Quick Create -->
      <div class="quick-create premium-feature" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: var(--radius);">
        <h5>Quick Create</h5>
        <textarea id="quickWordsInput" placeholder="Enter words separated by commas or new lines" 
                  style="width: 100%; height: 80px; padding: 10px; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 10px;" ${!isPremiumUser ? 'disabled' : ''}></textarea>
        <button onclick="createQuickList()" class="nav-btn" ${!isPremiumUser ? 'disabled' : ''}>
            <i class="fa fa-plus"></i> Create List
        </button>
      </div>
    </div>
  `;

  document.querySelectorAll('.trainer-area').forEach(area => {
    const existingCustom = area.querySelector('.custom-words-area');
    if (!existingCustom) {
      const title = area.querySelector('h3');
      if (title) {
        title.insertAdjacentHTML('afterend', customHTML);
      }
    }
  });
}

function uploadWordList() {
  if (!isPremiumUser) {
    showFeedback('Custom word lists are a Premium feature. Please upgrade.', 'warning');
    return;
  }
  
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
      
      customLists[listName] = {
        words: words,
        createdAt: new Date().toISOString(),
        wordCount: words.length
      };
      
      saveCustomLists();
      updateCustomListsDisplay();
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
    words = content.split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);
  } else {
    words = content.split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);
  }
  
  return [...new Set(words)].filter(word => word.length > 0);
}

function createQuickList() {
  if (!isPremiumUser) {
    showFeedback('Custom word lists are a Premium feature. Please upgrade.', 'warning');
    return;
  }
  
  const input = document.getElementById('quickWordsInput').value.trim();
  const listName = `Quick List ${new Date().toLocaleDateString()}`;
  
  if (!input) {
    showFeedback('Please enter some words', 'error');
    return;
  }
  
  const words = input.split(/[\n,]/)
    .map(word => word.trim())
    .filter(word => word.length > 0);
  
  if (words.length === 0) {
    showFeedback('No valid words found', 'error');
    return;
  }
  
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
  
  if (!isPremiumUser) {
    container.innerHTML = '<p style="opacity: 0.7; text-align: center;">Upgrade to Premium to create and manage custom word lists.</p>';
    return;
  }
  
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
  if (!isPremiumUser) {
    showFeedback('Custom word lists are a Premium feature. Please upgrade.', 'warning');
    return;
  }
  
  if (!customLists[listName]) {
    showFeedback('List not found', 'error');
    return;
  }
  
  currentCustomList = listName;
  currentList = customLists[listName].words;
  showFeedback(`Loaded "${listName}" with ${currentList.length} words`, 'success');
  
  if (currentMode) {
    setTimeout(() => {
      startTraining(currentMode);
    }, 1000);
  }
}

function renameCustomList(oldName) {
  if (!isPremiumUser) {
    showFeedback('Custom word lists are a Premium feature. Please upgrade.', 'warning');
    return;
  }
  
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
  if (!isPremiumUser) {
    showFeedback('Custom word lists are a Premium feature. Please upgrade.', 'warning');
    return;
  }
  
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
// TRAINING LOGIC - WITH PREMIUM RESTRICTIONS
// =======================================================

// Mode selection
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    
    // Check premium restrictions for certain modes
    if ((mode === "bee" || mode === "school") && !isPremiumUser) {
      showFeedback('This training mode requires Premium. Please upgrade.', 'warning');
      return;
    }
    
    currentMode = mode;
    
    document.querySelectorAll(".trainer-area").forEach(a => {
      a.style.display = "none";
      a.classList.remove("active");
    });
    
    const selectedArea = document.getElementById(`${currentMode}-area`);
    if (selectedArea) {
      selectedArea.style.display = "block";
      selectedArea.classList.add("active");
      
      const customWordsSection = selectedArea.querySelector('.custom-words-area');
      if (customWordsSection) {
        customWordsSection.style.display = "block";
      }
    }
    
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
  
  if (recognition && isListening) {
    recognition.stop();
  }
  
  clearRealTimeFeedback();
}

// Start button handlers
document.querySelectorAll(".start-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    
    // Check premium restrictions
    if ((mode === "bee" || mode === "school") && !isPremiumUser) {
      showFeedback('This training mode requires Premium. Please upgrade.', 'warning');
      return;
    }
    
    startTraining(mode);
  });
});

function startTraining(mode) {
  resetTraining();
  
  if (currentCustomList && customLists[currentCustomList]) {
    currentList = customLists[currentCustomList].words;
    showFeedback(`Using "${currentCustomList}" - ${currentList.length} words`, 'info');
  } else if (mode === "oet") {
    loadOETWords();
    return;
  } else if (mode === "bee") {
    if (!isPremiumUser) {
      showFeedback('Bee mode requires Premium. Please upgrade.', 'warning');
      return;
    }
    currentList = ["accommodate", "rhythm", "occurrence", "necessary", "embarrass", "challenge", "definitely", "separate", "recommend", "privilege"];
    showFeedback("Bee mode started with default words", "info");
  } else if (mode === "school") {
    if (!isPremiumUser) {
      showFeedback('School mode requires Premium. Please upgrade.', 'warning');
      return;
    }
    currentList = ["example", "language", "grammar", "knowledge", "science", "mathematics", "history", "geography", "literature", "chemistry"];
    showFeedback("School mode started with default words", "info");
  }
  
  nextWord();
}

// OET words loading
async function loadOETWords() {
  try {
    if (typeof window.OET_WORDS !== 'undefined') {
      const isTest = document.querySelector('input[name="examType"]:checked')?.value === "test";
      currentList = isTest ? shuffle(window.OET_WORDS).slice(0, 24) : window.OET_WORDS;
      showFeedback(`OET ${isTest ? 'Test' : 'Practice'} mode: ${currentList.length} words loaded`, "success");
      nextWord();
      return;
    }
    
    const response = await fetch('/js/oet_word_list.js');
    if (response.ok) {
      const jsContent = await response.text();
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
    currentList = ["abdomen", "anemia", "antibiotic", "artery", "asthma", "biopsy", "catheter", "diagnosis", "embolism", "fracture"];
    showFeedback("Using fallback OET words", "info");
    nextWord();
  }
}

// Text-to-speech with proper error handling
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

// ENHANCED NEXTWORD FUNCTION WITH REAL-TIME MARKING
function nextWord() {
    if (currentIndex >= currentList.length) {
        showSummary();
        return;
    }
    
    const word = currentList[currentIndex];
    const progressElement = document.getElementById(`${currentMode}Progress`);
    const feedbackElement = document.getElementById(`${currentMode}Feedback`);
    const inputElement = document.getElementById(`${currentMode}Input`);
    
    if (progressElement) {
        progressElement.textContent = `Word ${currentIndex + 1} of ${currentList.length}`;
    }
    
    if (feedbackElement) {
        feedbackElement.textContent = "Listen carefully...";
        feedbackElement.style.color = '';
        feedbackElement.style.fontWeight = '';
    }
    
    // Reset input styling
    if (inputElement) {
        inputElement.value = "";
        inputElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        inputElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        inputElement.style.color = 'white';
        inputElement.style.fontWeight = 'normal';
        inputElement.style.textDecoration = 'none';
        inputElement.style.boxShadow = 'none';
    }
    
    // Clear any previous voice recognition UI
    updateBeeVoiceUI(false);
    document.getElementById('beeRecognizedText').style.display = 'none';
    
    // Speak the word with a slight delay
    setTimeout(() => {
        speakWord(word);
    }, 500);
}

// ENHANCED CHECKANSWER FUNCTION WITH REAL-TIME MARKING
function checkAnswer() {
    if (currentIndex >= currentList.length) return;
    
    const word = currentList[currentIndex];
    let userAnswer = "";
    
    if (currentMode === "bee") {
        if (!isPremiumUser) {
            showFeedback('Voice recognition requires Premium. Please upgrade.', 'warning');
            return;
        }
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
    
    // Enhanced real-time visual feedback
    const inputElement = document.getElementById(`${currentMode}Input`);
    const feedbackElement = document.getElementById(`${currentMode}Feedback`);
    
    if (normalizedAnswer === normalizedWord) {
        score++;
        correctWords.push(word);
        showFeedback("✅ Correct! Well done!", "success");
        
        // Visual confirmation
        if (inputElement) {
            inputElement.style.borderColor = '#4CAF50';
            inputElement.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
            inputElement.style.color = '#4CAF50';
            inputElement.style.fontWeight = 'bold';
            inputElement.style.textDecoration = 'none';
        }
        if (feedbackElement) {
            feedbackElement.style.color = '#4CAF50';
            feedbackElement.style.fontWeight = 'bold';
        }
    } else {
        incorrectWords.push({ word: word, answer: userAnswer });
        showFeedback(`❌ Incorrect. The word was: ${word}`, "error");
        
        // Visual correction
        if (inputElement) {
            inputElement.style.borderColor = '#f44336';
            inputElement.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
            inputElement.style.color = '#f44336';
            inputElement.style.fontWeight = 'normal';
            inputElement.style.textDecoration = 'line-through';
        }
        if (feedbackElement) {
            feedbackElement.style.color = '#f44336';
            feedbackElement.style.fontWeight = 'bold';
        }
    }
    
    currentIndex++;
    
    if (currentIndex < currentList.length) {
        setTimeout(nextWord, 2000);
    } else {
        setTimeout(showSummary, 1500);
    }
}

// ENHANCED SUMMARY FUNCTION WITH DETAILED REPORT
function showSummary() {
    const mode = currentMode;
    const trainerArea = document.getElementById(`${mode}-area`);
    const mainContent = trainerArea.querySelector('.trainer-content');
    const scorePercentage = Math.round((score / currentList.length) * 100);
    
    let summaryHTML = `
        <div class="summary-card" style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: var(--radius); max-width: 600px; margin: 0 auto;">
            <h3 style="text-align: center; margin-bottom: 20px;">
                <i class="fa fa-chart-bar"></i> Training Complete!
            </h3>
            
            <div class="score-display" style="text-align: center; margin-bottom: 30px;">
                <div class="score-circle" style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #7b2ff7, #f107a3); display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: white; margin-bottom: 20px;">
                    ${scorePercentage}%
                </div>
                <p style="font-size: 1.2rem;">
                    ${score} out of ${currentList.length} correct
                </p>
            </div>
            
            <div class="results-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div class="correct-words" style="background: rgba(76, 175, 80, 0.2); padding: 15px; border-radius: var(--radius);">
                    <h4 style="color: #4CAF50; margin-bottom: 10px;">
                        <i class="fa fa-check-circle"></i> Correct (${correctWords.length})
                    </h4>
                    <div style="max-height: 150px; overflow-y: auto;">
                        ${correctWords.map(word => `<div style="padding: 2px 0;">${word}</div>`).join('')}
                    </div>
                </div>
                
                <div class="incorrect-words" style="background: rgba(244, 67, 54, 0.2); padding: 15px; border-radius: var(--radius);">
                    <h4 style="color: #f44336; margin-bottom: 10px;">
                        <i class="fa fa-times-circle"></i> Needs Work (${incorrectWords.length})
                    </h4>
                    <div style="max-height: 150px; overflow-y: auto;">
                        ${incorrectWords.map(item => `<div style="padding: 2px 0;">
                            <strong>${item.word}</strong> (you wrote: ${item.answer})
                        </div>`).join('')}
                    </div>
                </div>
            </div>
            
            <div class="summary-actions" style="text-align: center;">
                <button onclick="restartTraining()" class="nav-btn" style="margin: 5px;">
                    <i class="fa fa-redo"></i> Try Again
                </button>
                <button onclick="startTraining('${mode}')" class="nav-btn" style="margin: 5px;">
                    <i class="fa fa-play"></i> New Session
                </button>
                <button onclick="showMainMenu()" class="nav-btn" style="margin: 5px;">
                    <i class="fa fa-home"></i> Main Menu
                </button>
            </div>
        </div>
    `;
    
    mainContent.innerHTML = summaryHTML;
}

function restartTraining() {
    resetTraining();
    nextWord();
}

function showMainMenu() {
    document.querySelectorAll(".trainer-area").forEach(a => {
        a.style.display = "none";
        a.classList.remove("active");
    });
    
    const mainContent = document.querySelector('.trainer-area.active .trainer-content');
    if (mainContent) {
        mainContent.innerHTML = mainContent.dataset.originalContent || '';
    }
    
    resetTraining();
}

// Utility functions
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log('SpellRightPro Premium initializing...');
    
    // Load saved custom lists
    loadCustomLists();
    
    // Initialize voice recognition
    initializeSpeechRecognition();
    
    // Initialize real-time validation
    initializeRealTimeValidation();
    
    // Create custom words UI
    createCustomWordsUI();
    
    // Update custom lists display
    updateCustomListsDisplay();
    
    // Initialize premium status
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await checkPremiumStatus(user);
        }
    });
    
    console.log('SpellRightPro Premium initialized');
});
