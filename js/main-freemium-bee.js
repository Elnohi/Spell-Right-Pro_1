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
import { defaultWords, examTypes } from './config.js';

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

// DOM Elements
const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startTest");
const trainerDiv = document.getElementById("trainer");
const scoreDiv = document.getElementById("scoreDisplay");
const wordInput = document.getElementById("wordInput");

// Start Test
startButton.addEventListener("click", async () => {
  // Use custom words if provided, otherwise default words
  if (wordInput && wordInput.value.trim()) {
    words = wordInput.value.trim().split(/\n+/).map(w => w.trim()).filter(w => w);
  } else {
    words = [...defaultWords[examTypes.SPELLING_BEE]];
  }

  if (words.length === 0) {
    showNotification("Please enter at least one word to begin", "error");
    return;
  }

  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  trainerDiv.innerHTML = "<p>🎤 Listening...</p>";
  scoreDiv.innerHTML = "";

  try {
    await speakWord(words[currentIndex]);
    setTimeout(() => listenAndCheck(words[currentIndex]), 1000);
  } catch (error) {
    showNotification("Failed to start test", "error");
    console.error(error);
  }
});

async function speakWord(word) {
  try {
    await speak(word, accentSelect.value, 0.85);
  } catch (error) {
    console.error("Speech error:", error);
    throw new Error("Couldn't speak the word");
  }
}

function listenAndCheck(correctWord) {
  try {
    const recognition = setupSpeechRecognition(
      accentSelect.value,
      (transcript) => handleRecognitionResult(transcript, correctWord),
      (error) => {
        showNotification(`Recognition error: ${error}`, "error");
        console.error("Recognition error:", error);
      }
    );
    recognition.start();
  } catch (error) {
    showNotification(error.message, "error");
    console.error(error);
  }
}

function handleRecognitionResult(transcript, correctWord) {
  const spoken = transcript.toUpperCase().replace(/[^A-Z]/g, "");
  const expected = correctWord.toUpperCase().replace(/[^A-Z]/g, "");

  const box = document.createElement("div");
  box.className = "word-box";
  
  if (spoken === expected) {
    correctCount++;
    box.innerHTML = `✅ <strong>Correct!</strong> You spelled: ${spoken.split("").join(" ")}`;
  } else {
    incorrectWords.push({ word: correctWord, heard: spoken });
    box.innerHTML = `❌ <strong>Incorrect.</strong> You spelled: <em>${spoken.split("").join(" ")}</em><br>
                    Correct spelling was: <strong>${expected.split("").join(" ")}</strong>`;
  }

  trainerDiv.innerHTML = "";
  trainerDiv.appendChild(box);

  currentIndex++;
  if (currentIndex < words.length) {
    setTimeout(() => {
      trainerDiv.innerHTML = "<p>🎤 Listening...</p>";
      speakWord(words[currentIndex])
        .then(() => setTimeout(() => listenAndCheck(words[currentIndex]), 1000))
        .catch(console.error);
    }, 2200);
  } else {
    showScore(scoreDiv, correctCount, words.length, incorrectWords);
  }
}
