import { 
  initializeFirebase,
  initThemeToggle,
  initAuth,
  addAuthListeners,
  showNotification,
  loadWordsFromFile,
  setupFileUpload,
  speak,
  setupSpeechRecognition,
  showScore
} from './common.js';
import { examTypes, defaultWords } from './config.js';

// Initialize Firebase
const firebase = initializeFirebase();

// Initialize UI
const auth = initAuth(firebase, "loginStatus", "formHiddenEmail");
addAuthListeners(auth, "loginBtn", "signupBtn", "logoutBtn", "userEmail", "userPassword");
initThemeToggle("modeToggle", "modeIcon");

// Practice Session State
let words = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];
let currentMode = "";

// DOM Elements
const examSelect = document.getElementById("examSelect");
const accentSelect = document.getElementById("accentSelect");
const fileUpload = document.getElementById("fileUpload");
const customWordsTextarea = document.getElementById("customWords");
const addCustomBtn = document.getElementById("addCustomWords");
const startButton = document.getElementById("startButton");
const trainerDiv = document.getElementById("trainer");
const scoreDiv = document.getElementById("scoreDisplay");

// Setup event listeners
setupFileUpload("fileUpload", (loadedWords) => {
  words = loadedWords;
  showNotification(`Loaded ${words.length} words`, "success");
});

if (addCustomBtn && customWordsTextarea) {
  addCustomBtn.addEventListener("click", () => {
    const customWords = customWordsTextarea.value.trim().split(/\n+/).filter(w => w.trim());
    if (customWords.length > 0) {
      words = customWords;
      showNotification(`Added ${words.length} custom words`, "success");
    } else {
      showNotification("Please enter some words first", "error");
    }
  });
}

startButton.addEventListener("click", async () => {
  const exam = examSelect.value;
  if (!exam) {
    showNotification("Please select an exam type", "error");
    return;
  }

  currentMode = exam;
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  trainerDiv.innerHTML = "";
  scoreDiv.innerHTML = "";

  try {
    if (exam === examTypes.OET) {
      // In a real app, you might fetch from a server
      words = [...defaultWords[examTypes.OET]];
      startSession();
    } else if (exam === examTypes.SPELLING_BEE) {
      words = [...defaultWords[examTypes.SPELLING_BEE]];
      startSession();
    } else if (exam === examTypes.CUSTOM) {
      if (words.length === 0) {
        showNotification("Please upload or add custom words first", "error");
        return;
      }
      startSession();
    }
  } catch (error) {
    showNotification("Failed to start session", "error");
    console.error(error);
  }
});

function startSession() {
  if (words.length === 0) {
    showNotification("No words available for practice", "error");
    return;
  }

  presentWord();
}

async function presentWord() {
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} of ${words.length}</h3>
      <div class="progress-container">
        <div class="progress-bar" style="width:${(currentIndex/words.length)*100}%"></div>
      </div>
      <button id="speakButton" class="btn btn-info">
        <i class="fas fa-volume-up"></i> Speak Word
      </button>
      ${currentMode === examTypes.SPELLING_BEE ? `
        <p>Spell the word you hear:</p>
        <button id="startListen" class="btn btn-warning">
          <i class="fas fa-microphone"></i> Start Spelling
        </button>
      ` : `
        <input type="text" id="userInput" placeholder="Type what you heard..." autofocus>
        <button id="checkButton" class="btn btn-success">Check</button>
      `}
      <div id="status" role="alert" aria-live="polite"></div>
    </div>
  `;

  try {
    await speak(words[currentIndex], accentSelect.value);
    setupWordHandlers();
  } catch (error) {
    showNotification("Couldn't speak the word", "error");
    console.error(error);
  }
}

function setupWordHandlers() {
  document.getElementById("speakButton").onclick = () => 
    speak(words[currentIndex], accentSelect.value);

  if (currentMode === examTypes.SPELLING_BEE) {
    document.getElementById("startListen").onclick = startListening;
  } else {
    document.getElementById("checkButton").onclick = checkTypedAnswer;
    document.getElementById("userInput").onkeypress = (e) => {
      if (e.key === "Enter") checkTypedAnswer();
    };
  }
}

function checkTypedAnswer() {
  const input = document.getElementById("userInput").value.trim().toLowerCase();
  const correct = words[currentIndex].toLowerCase();
  const status = document.getElementById("status");

  if (input === correct) {
    correctCount++;
    status.textContent = "✅ Correct!";
    status.className = "status correct";
  } else {
    incorrectWords.push({ word: words[currentIndex], typed: input });
    status.textContent = `❌ Incorrect. Correct: ${words[currentIndex]}`;
    status.className = "status incorrect";
  }

  moveToNextWord();
}

function startListening() {
  try {
    const recognition = setupSpeechRecognition(
      accentSelect.value,
      (transcript) => handleSpellingResult(transcript),
      (error) => {
        showNotification(`Recognition error: ${error}`, "error");
        console.error("Recognition error:", error);
      }
    );
    recognition.start();
    document.getElementById("status").textContent = "Listening...";
  } catch (error) {
    showNotification(error.message, "error");
    console.error(error);
  }
}

function handleSpellingResult(transcript) {
  const spoken = transcript.toUpperCase().replace(/[^A-Z]/g, "");
  const expected = words[currentIndex].toUpperCase().replace(/[^A-Z]/g, "");
  const status = document.getElementById("status");

  if (spoken === expected) {
    correctCount++;
    status.innerHTML = "✅ <strong>Correct!</strong>";
    status.className = "status correct";
  } else {
    incorrectWords.push({ word: words[currentIndex], heard: spoken });
    status.innerHTML = `❌ <strong>Incorrect.</strong> You spelled: <em>${spoken.split("").join(" ")}</em>`;
    status.className = "status incorrect";
  }

  moveToNextWord();
}

function moveToNextWord() {
  setTimeout(() => {
    currentIndex++;
    if (currentIndex < words.length) {
      presentWord();
    } else {
      showScore(scoreDiv, correctCount, words.length, incorrectWords);
    }
  }, 1500);
}
