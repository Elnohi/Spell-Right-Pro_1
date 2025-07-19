import { 
  initializeFirebase,
  initThemeToggle,
  initAuth,
  addAuthListeners,
  showNotification,
  loadWordsFromFile,
  setupFileUpload,
  speak,
  createWordBox,
  showScore
} from './common.js';
import { defaultWords, examTypes } from './config.js';

// Initialize Firebase
const firebase = initializeFirebase();

// Initialize UI
const auth = initAuth(firebase, "loginStatus", "formHiddenEmail");
addAuthListeners(auth, "loginBtn", "signupBtn", "logoutBtn", "userEmail", "userPassword");
initThemeToggle("modeIcon", "modeIcon");

// Practice Session State
let words = [...defaultWords[examTypes.OET]];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];

// DOM Elements
const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startOET");
const trainerDiv = document.getElementById("trainer");
const scoreDiv = document.getElementById("scoreDisplay");

// Setup file upload if available
setupFileUpload("fileUpload", (loadedWords) => {
  words = loadedWords;
});

// Start Practice Session
startButton.addEventListener("click", () => {
  if (words.length === 0) {
    showNotification("No words available to practice", "error");
    return;
  }

  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  scoreDiv.innerHTML = "";
  presentWord();
});

async function presentWord() {
  trainerDiv.innerHTML = "";
  
  if (currentIndex >= words.length) {
    showScore(scoreDiv, correctCount, words.length, incorrectWords);
    return;
  }

  const word = words[currentIndex];
  const wordBox = createWordBox(word, currentIndex + 1, words.length);
  trainerDiv.appendChild(wordBox);

  try {
    await speak(word, accentSelect.value);
    setupInputHandlers(word);
  } catch (error) {
    showNotification("Couldn't speak the word", "error");
    console.error(error);
  }
}

function setupInputHandlers(correctWord) {
  document.getElementById("speakBtn").onclick = () => speak(correctWord, accentSelect.value);
  
  const checkAnswer = async () => {
    const input = document.getElementById("userInput").value.trim().toLowerCase();
    const correct = correctWord.toLowerCase();
    const status = document.getElementById("status");
    
    if (input === correct) {
      correctCount++;
      status.textContent = "✅ Correct!";
      status.className = "status correct";
    } else {
      incorrectWords.push({ word: correctWord, typed: input });
      status.textContent = `❌ Incorrect. Correct: ${correctWord}`;
      status.className = "status incorrect";
    }
    
    await new Promise(resolve => setTimeout(resolve, 1600));
    currentIndex++;
    presentWord();
  };

  document.getElementById("checkBtn").onclick = checkAnswer;
  document.getElementById("userInput").onkeypress = (e) => {
    if (e.key === "Enter") checkAnswer();
  };
}
