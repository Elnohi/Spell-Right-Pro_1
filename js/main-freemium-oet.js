// main-freemium-oet.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Your Firebase configuration (replace with your own if needed)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Basic Elements
const fileUpload = document.getElementById("fileUpload");
const startButton = document.getElementById("startButton");
const nextButton = document.getElementById("nextButton");
const speakButton = document.getElementById("speakButton");
const accentSelect = document.getElementById("accentSelect");
const summaryDiv = document.getElementById("summary");

let wordList = [];
let currentWordIndex = 0;
let correctCount = 0;
let incorrectCount = 0;

// Load and process file upload (limited to 1 per day - enforced manually for now)
fileUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = function (e) {
    const content = e.target.result;
    wordList = content
      .split(/\r?\n/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    alert("Word list loaded. Click Start to begin.");
  };

  if (file.type === "text/plain") {
    reader.readAsText(file);
  } else {
    alert("Only .txt files are supported in freemium.");
  }
});

// Start test
startButton.addEventListener("click", () => {
  if (wordList.length === 0) {
    alert("Please upload a word list first.");
    return;
  }
  currentWordIndex = 0;
  correctCount = 0;
  incorrectCount = 0;
  speakWord(wordList[currentWordIndex]);
});

// Next word
nextButton.addEventListener("click", () => {
  if (currentWordIndex >= wordList.length - 1) {
    showSummary();
    return;
  }
  currentWordIndex++;
  speakWord(wordList[currentWordIndex]);
});

// Repeat word
speakButton.addEventListener("click", () => {
  if (wordList[currentWordIndex]) {
    speakWord(wordList[currentWordIndex]);
  }
});

// Text-to-speech
function speakWord(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accentSelect.value;
  speechSynthesis.speak(utterance);

  promptSpelling(word);
}

// Prompt spelling using speech recognition
function promptSpelling(correctWord) {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = accentSelect.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    if (transcript === correctWord.toLowerCase()) {
      correctCount++;
      alert("✅ Correct!");
    } else {
      incorrectCount++;
      alert(`❌ Incorrect. You said: "${transcript}", expected: "${correctWord}"`);
    }
  };

  recognition.onerror = function () {
    alert("Speech recognition error. Please try again.");
  };
}

// Display session summary
function showSummary() {
  summaryDiv.innerHTML = `
    <h3>Session Summary</h3>
    <p>Total Words: ${wordList.length}</p>
    <p>Correct: ${correctCount}</p>
    <p>Incorrect: ${incorrectCount}</p>
  `;
}

// Optional: Auto sign in with Google (freemium can be anonymous too)
onAuthStateChanged(auth, (user) => {
  if (!user) {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(result => {
        console.log("Signed in as", result.user.displayName);
      })
      .catch(error => {
        console.error("Authentication failed", error);
      });
  } else {
    console.log("Already signed in:", user.email);
  }
});
