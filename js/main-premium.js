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
    nextWord();
  } else if (mode === "school") {
    currentList = ["example", "language", "grammar", "knowledge", "science", "mathematics", "history", "geography", "literature", "chemistry"];
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
    const accent = document.getElementById("accent")?.value || "en-US";
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
    // For bee mode, we'd use speech recognition - for now, mock it
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
  const summaryElement = document.getElementById("summary");
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
  if (correctWords.length > 0) {
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
  document.querySelectorAll('#btnSayAgain').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentIndex < currentList.length) {
        const word = currentList[currentIndex];
        speakWord(word);
      }
    });
  });
  
  // Flag buttons
  document.querySelectorAll('#btnFlag').forEach(btn => {
    btn.addEventListener('click', flagCurrentWord);
  });
  
  // Submit/Check Answer functionality
  document.querySelectorAll('.start-btn').forEach(btn => {
    const mode = btn.dataset.mode;
    if (mode !== 'bee') {
      const inputElement = document.getElementById(`${mode}Input`);
      if (inputElement) {
        inputElement.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            checkAnswer();
          }
        });
      }
    }
  });
  
  // End buttons
  document.querySelectorAll('#btnEnd').forEach(btn => {
    btn.addEventListener('click', showSummary);
  });
});

// Enhanced showFeedback function for premium
function showFeedback(message, type = "info") {
  // Remove existing feedback
  const existingFeedback = document.querySelector(".feedback-message");
  if (existingFeedback) existingFeedback.remove();

  const feedback = document.createElement("div");
  feedback.className = `feedback-message ${type}`;
  feedback.textContent = message;
  feedback.style.marginTop = "10px";
  feedback.style.padding = "8px 12px";
  feedback.style.borderRadius = "6px";
  feedback.style.fontSize = "0.9rem";
  
  if (type === "success") {
    feedback.style.background = "#d4edda";
    feedback.style.color = "#155724";
    feedback.style.border = "1px solid #c3e6cb";
  } else if (type === "error") {
    feedback.style.background = "#f8d7da";
    feedback.style.color = "#721c24";
    feedback.style.border = "1px solid #f5c6cb";
  } else {
    feedback.style.background = "#d1ecf1";
    feedback.style.color = "#0c5460";
    feedback.style.border = "1px solid #bee5eb";
  }

  // Add to current active trainer area or main
  const activeArea = document.querySelector('.trainer-area.active');
  if (activeArea) {
    activeArea.appendChild(feedback);
  } else {
    document.querySelector('main').appendChild(feedback);
  }

  setTimeout(() => {
    if (feedback.parentNode) feedback.remove();
  }, 4000);
}
