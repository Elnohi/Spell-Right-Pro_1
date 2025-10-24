// =======================================================
// VOICE RECOGNITION FOR PREMIUM BEE - NEW IMPLEMENTATION
// =======================================================

let recognition = null;
let isListening = false;

function initializeVoiceRecognition() {
  // Check if browser supports speech recognition
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported in this browser');
    showFeedback('Voice recognition not supported in your browser. Please use Chrome or Edge.', 'error');
    return false;
  }
  
  // Initialize speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  // Configure recognition
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 3; // Get multiple possible results
  
  // Set up event handlers
  recognition.onstart = function() {
    isListening = true;
    showFeedback('🎤 Listening... Speak now!', 'info');
    updateBeeButtonState();
  };
  
  recognition.onresult = function(event) {
    const results = event.results;
    const transcript = results[0][0].transcript.trim();
    const confidence = results[0][0].confidence;
    
    console.log('Voice recognition result:', transcript, 'Confidence:', confidence);
    
    showFeedback(`Heard: "${transcript}" (${Math.round(confidence * 100)}% confident)`, 'success');
    
    // Process the spoken word
    processSpokenWord(transcript);
  };
  
  recognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    updateBeeButtonState();
    
    let errorMessage = 'Voice recognition error: ';
    switch(event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'No microphone found. Please check your microphone.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please allow microphone permissions.';
        break;
      default:
        errorMessage = 'Error with voice recognition. Please try again.';
    }
    
    showFeedback(errorMessage, 'error');
  };
  
  recognition.onend = function() {
    isListening = false;
    updateBeeButtonState();
  };
  
  return true;
}

function startVoiceRecognition() {
  if (!recognition) {
    if (!initializeVoiceRecognition()) {
      return;
    }
  }
  
  if (isListening) {
    stopVoiceRecognition();
    return;
  }
  
  try {
    recognition.start();
    showFeedback('Starting voice recognition...', 'info');
  } catch (error) {
    console.error('Error starting recognition:', error);
    showFeedback('Error starting voice recognition. Please try again.', 'error');
  }
}

function stopVoiceRecognition() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    updateBeeButtonState();
    showFeedback('Voice recognition stopped', 'info');
  }
}

function updateBeeButtonState() {
  const beeStartBtn = document.getElementById('beeStart');
  if (beeStartBtn) {
    if (isListening) {
      beeStartBtn.innerHTML = '<i class="fa fa-microphone-slash"></i> Stop Listening';
      beeStartBtn.style.background = '#f72585';
    } else {
      beeStartBtn.innerHTML = '<i class="fa fa-microphone"></i> Start Listening';
      beeStartBtn.style.background = '#4895ef';
    }
  }
}

function processSpokenWord(spokenText) {
  if (currentIndex >= currentList.length) return;
  
  const currentWord = currentList[currentIndex];
  const normalizedSpoken = spokenText.toLowerCase().trim();
  const normalizedWord = currentWord.toLowerCase().trim();
  
  console.log('Comparing:', normalizedSpoken, 'with:', normalizedWord);
  
  // Check if spoken word matches
  if (normalizedSpoken === normalizedWord) {
    score++;
    correctWords.push(currentWord);
    showFeedback('✅ Correct! Well done!', 'success');
  } else {
    incorrectWords.push({ word: currentWord, answer: spokenText });
    showFeedback(`❌ Incorrect. You said "${spokenText}". The word was: ${currentWord}`, 'error');
  }
  
  currentIndex++;
  
  // Move to next word or show summary
  if (currentIndex < currentList.length) {
    setTimeout(nextWord, 2000);
  } else {
    setTimeout(showSummary, 1500);
  }
}

// =======================================================
// ENHANCED BEE MODE TRAINING
// =======================================================

function startBeeTraining() {
  resetTraining();
  stopVoiceRecognition(); // Ensure any previous listening stops
  
  // Use custom list if loaded, otherwise use default
  if (currentCustomList && customLists[currentCustomList]) {
    currentList = customLists[currentCustomList].words;
    showFeedback(`Bee mode started with "${currentCustomList}" - ${currentList.length} words`, 'info');
  } else {
    currentList = ["accommodate", "rhythm", "occurrence", "necessary", "embarrass", "challenge", "definitely", "separate", "recommend", "privilege"];
    showFeedback("Bee mode started with default words. Speak the words you hear!", "info");
  }
  
  // Initialize voice recognition for bee mode
  initializeVoiceRecognition();
  
  nextWord();
}

// =======================================================
// UPDATED EVENT LISTENERS FOR BEE MODE
// =======================================================

// Update the DOMContentLoaded event listener to include voice recognition
document.addEventListener('DOMContentLoaded', function() {
  initializeSpeechSynthesis();
  initializeCustomWords();
  
  // Initialize voice recognition
  initializeVoiceRecognition();
  
  // Hide all trainer areas on load
  document.querySelectorAll(".trainer-area").forEach(a => {
    a.style.display = "none";
  });
  
  // Ensure custom words section is visible
  const customWordsSection = document.getElementById('customWordsSection');
  if (customWordsSection) {
    customWordsSection.style.display = 'block';
  }
  
  // Enhanced Bee mode button listeners
  const beeStartBtn = document.getElementById('beeStart');
  if (beeStartBtn) {
    beeStartBtn.addEventListener('click', function() {
      if (currentMode === 'bee') {
        if (isListening) {
          stopVoiceRecognition();
        } else {
          startVoiceRecognition();
        }
      } else {
        startBeeTraining();
      }
    });
  }
  
  // Bee Say Again button - stop listening first if active
  const beeSayAgain = document.getElementById('beeSayAgain');
  if (beeSayAgain) {
    beeSayAgain.addEventListener('click', function() {
      if (isListening) {
        stopVoiceRecognition();
      }
      if (currentIndex < currentList.length) {
        const word = currentList[currentIndex];
        speakWord(word);
      }
    });
  }
  
  // Bee End button - stop listening
  const beeEnd = document.getElementById('beeEnd');
  if (beeEnd) {
    beeEnd.addEventListener('click', function() {
      stopVoiceRecognition();
      showSummary();
    });
  }
});

// =======================================================
// ENHANCED START TRAINING FUNCTION WITH VOICE RECOGNITION
// =======================================================

function startTraining(mode) {
  resetTraining();
  stopVoiceRecognition(); // Stop any ongoing voice recognition
  
  if (mode === "bee") {
    startBeeTraining();
    return;
  }
  
  // Use custom list if loaded, otherwise use default
  if (currentCustomList && customLists[currentCustomList]) {
    currentList = customLists[currentCustomList].words;
    showFeedback(`Using "${currentCustomList}" - ${currentList.length} words`, 'info');
  } else if (mode === "oet") {
    loadOETWords();
    return;
  } else if (mode === "school") {
    currentList = ["example", "language", "grammar", "knowledge", "science", "mathematics", "history", "geography", "literature", "chemistry"];
    showFeedback("School mode started with default words", "info");
  }
  
  nextWord();
}
