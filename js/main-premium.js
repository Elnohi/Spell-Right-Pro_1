/* =======================================================
   SpellRightPro Premium Logic - UPDATED FIREBASE HANDLING
   ======================================================= */

// Wait for Firebase utils to be ready
let auth = null;
let db = null;
let currentUser = null;
let userIsPremium = false;

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

// Initialize Firebase components when ready
function initializeFirebase() {
    if (window.firebaseUtils && window.firebaseUtils.initialized) {
        auth = window.firebaseUtils.auth;
        db = window.firebaseUtils.db;
        console.log('✅ Firebase components initialized');
        
        // Test connection
        window.firebaseUtils.testConnection();
        
        // Start auth state listener
        setupAuthListener();
    } else {
        console.log('⏳ Waiting for Firebase utils...');
        setTimeout(initializeFirebase, 500);
    }
}

// Enhanced auth state handler
function setupAuthListener() {
    if (!auth) {
        console.error('❌ Auth not available');
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        console.log('🔐 Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
            currentUser = user;
            console.log('✅ User authenticated:', user.email);
            
            // Check premium status
            if (window.firebaseUtils) {
                userIsPremium = await window.firebaseUtils.checkPremiumStatus(user);
                console.log('💎 Premium status:', userIsPremium);
            } else {
                userIsPremium = false;
            }
            
            if (userIsPremium) {
                hideOverlay();
                showFeedback('Welcome back to Premium!', 'success');
                initializePremiumFeatures();
            } else {
                showOverlay();
                showNonPremiumMessage();
            }
        } else {
            console.log('❌ No user, showing login');
            currentUser = null;
            userIsPremium = false;
            showOverlay();
        }
    });
}

// Show message for non-premium users
function showNonPremiumMessage() {
    const glassCard = document.querySelector('.glass-card');
    if (!glassCard) return;
    
    // Remove existing premium redirect messages
    const existingMessages = glassCard.querySelectorAll('.premium-redirect');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'premium-redirect';
    messageDiv.innerHTML = `
        <div style="text-align: center; margin: 15px 0; padding: 15px; background: rgba(123, 47, 247, 0.1); border-radius: 8px;">
            <p style="margin: 0 0 10px 0;">Premium access required for full features.</p>
            <button onclick="window.location.href='/pricing.html'" 
                    style="background: #7b2ff7; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 5px 0;">
                <i class="fa fa-crown"></i> Upgrade to Premium
            </button>
            <br>
            <button onclick="quickTest()" 
                    style="background: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; margin: 5px 0;">
                <i class="fa fa-bolt"></i> Quick Test Mode
            </button>
        </div>
    `;
    
    glassCard.appendChild(messageDiv);
}

// UI Functions
function showOverlay() {
    const overlay = document.getElementById("loginOverlay");
    const mainContent = document.querySelector("main");
    if (overlay) overlay.style.display = "flex";
    if (mainContent) mainContent.style.display = "none";
}

function hideOverlay() {
    const overlay = document.getElementById("loginOverlay");
    const mainContent = document.querySelector("main");
    if (overlay) overlay.style.display = "none";
    if (mainContent) mainContent.style.display = "block";
}

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

// Enhanced login form
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showFeedback('Logging in...', 'info');
        
        if (!auth) {
            throw new Error('Authentication service not available');
        }
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Check premium status
        if (window.firebaseUtils) {
            userIsPremium = await window.firebaseUtils.checkPremiumStatus(userCredential.user);
        }
        
        if (userIsPremium) {
            hideOverlay();
            showFeedback('Welcome back to Premium!', 'success');
            initializePremiumFeatures();
        } else {
            showFeedback('Premium access required. Redirecting to pricing...', 'info');
            setTimeout(() => {
                window.location.href = '/pricing.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Login error:', error);
        showFeedback(`Login failed: ${error.message}`, 'error');
    }
});

// Enhanced register form
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
        
        if (!auth) {
            throw new Error('Authentication service not available');
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // NEW FIX: Redirect to pricing page after successful registration
        showFeedback('Account created! Redirecting to pricing...', 'success');
        
        // Redirect to pricing page after a short delay
        setTimeout(() => {
            window.location.href = '/pricing.html';
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        showFeedback(`Registration failed: ${error.message}`, 'error');
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

// Logout
document.getElementById('btnLogout')?.addEventListener('click', () => {
    if (auth) {
        auth.signOut();
        showOverlay();
        showFeedback('Logged out successfully', 'info');
    }
});

// Quick Test function
function quickTest() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.querySelector('main').style.display = 'block';
    // Create a temporary feedback message
    const feedback = document.createElement('div');
    feedback.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px; border-radius: 5px; z-index: 10000;';
    feedback.innerHTML = '<i class="fa fa-bolt"></i> Quick test mode activated!';
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 3000);
}

// Dark Mode Toggle
document.getElementById('toggleDark')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('toggleDark').querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
    }
});

// Initialize premium features only for paid users
function initializePremiumFeatures() {
  console.log('Initializing premium features for:', currentUser.email);
  
  // REMOVE ADS for premium users
  if (window.adManager) {
    window.adManager.removeAds();
  }
  
  initializeSpeechSynthesis();
  createCustomWordsUI();
  initializeCustomWords();
  initializeRealTimeValidation();
  
  // Set user as premium
  if (window.tierManager) {
    window.tierManager.setTier('premium', {
      plan: 'premium',
      activatedAt: new Date().toISOString(),
      active: true
    });
  }
}

// =======================================================
// VOICE RECOGNITION (Existing code remains the same)
// =======================================================

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
// REAL-TIME MARKING (Existing code remains the same)
// =======================================================

function initializeRealTimeValidation() {
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
            clearRealTimeFeedback();
        }
    });
    
    document.querySelectorAll('.answer-input').forEach(input => {
        input.addEventListener('input', function() {
            if (!realTimeMarkingEnabled || currentIndex >= currentList.length) return;
            
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
// CUSTOM WORDS MANAGEMENT (Existing code remains the same)
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
// TRAINING LOGIC (Existing code remains the same)
// =======================================================

// Mode selection
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;
    
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
    currentList = ["accommodate", "rhythm", "occurrence", "necessary", "embarrass", "challenge", "definitely", "separate", "recommend", "privilege"];
    showFeedback("Bee mode started with default words", "info");
  } else if (mode === "school") {
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
            feedbackElement.textContent = "✅ Correct!";
        }
    } else {
        incorrectWords.push({ word: word, answer: userAnswer });
        showFeedback(`❌ Incorrect. The word was: ${word}`, "error");
        
        // Visual feedback for incorrect
        if (inputElement) {
            inputElement.style.borderColor = '#f44336';
            inputElement.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
            inputElement.style.color = '#f44336';
            inputElement.style.fontWeight = 'bold';
            inputElement.style.textDecoration = 'line-through';
        }
        if (feedbackElement) {
            feedbackElement.style.color = '#f44336';
            feedbackElement.style.fontWeight = 'bold';
            feedbackElement.textContent = `❌ Incorrect. Correct: ${word}`;
        }
    }
    
    currentIndex++;
    
    // Auto-advance with delay
    setTimeout(() => {
        // Reset input styling for next word
        if (inputElement) {
            inputElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            inputElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            inputElement.style.color = 'white';
            inputElement.style.fontWeight = 'normal';
            inputElement.style.textDecoration = 'none';
            inputElement.value = "";
        }
        
        if (feedbackElement) {
            feedbackElement.style.color = '';
            feedbackElement.style.fontWeight = '';
        }
        
        if (currentIndex < currentList.length) {
            nextWord();
        } else {
            showSummary();
        }
    }, 2000);
}

// Summary function
function showSummary() {
  const summaryElement = document.getElementById(`${currentMode}Summary`);
  if (!summaryElement) return;
  
  let summaryHTML = `
    <div class="summary-header">
      <h3>Session Complete</h3>
      <div class="score">Score: ${score}/${currentList.length}</div>
    </div>
  `;
  
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

// =======================================================
// EVENT LISTENERS
// =======================================================

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
  
  initializeSpeechRecognition();
}

// =======================================================
// FINAL INITIALIZATION
// =======================================================

// Start Firebase initialization when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting Firebase initialization...');
    initializeFirebase();
    
    // Initialize other features
    initializeSpeechSynthesis();
    createCustomWordsUI();
    initializeCustomWords();
    initializeRealTimeValidation();
    console.log("SpellRightPro Premium with Real-time Marking initialized");
});

// Enhanced function to handle premium access simulation for testing
function simulatePremiumAccess() {
  // This function can be called from browser console for testing
  if (auth && auth.currentUser) {
    const userId = auth.currentUser.uid;
    localStorage.setItem(`premium_${userId}`, 'true');
    console.log('✅ Premium access simulated for user:', userId);
    location.reload();
  } else {
    console.log('❌ No user logged in');
  }
}

// Make simulatePremiumAccess available globally for testing
window.simulatePremiumAccess = simulatePremiumAccess;
window.quickTest = quickTest;

