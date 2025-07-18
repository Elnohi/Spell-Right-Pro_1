// main-freemium-bee.js – Improved, bugfixed, one-by-one speaking

import { initThemeToggle, initAuth, addAuthListeners, showNotification, gaEvent } from './common.js';

// --- Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.firebasestorage.app",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};
firebase.initializeApp(firebaseConfig);

// --- Shared UI ---
const auth = initAuth(firebase, "loginStatus", "formHiddenEmail");
addAuthListeners(auth, "loginBtn", "signupBtn", "logoutBtn", "userEmail", "userPassword");
initThemeToggle("modeToggle", "modeIcon");

// --- Spelling Bee Logic ---
let words = [
  "articulate", "pharaoh", "onomatopoeia", "surveillance",
  "metamorphosis", "onomastics", "entrepreneur", "mnemonic"
];
let currentIndex = 0, correctCount = 0, incorrectWords = [];

const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startTest");
const trainerDiv = document.getElementById("trainer");
const scoreDiv = document.getElementById("scoreDisplay");
const wordInput = document.getElementById("wordInput");

// Start test
startButton.addEventListener("click", () => {
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  // Use custom words if present, else fallback to default sample words
  if (wordInput && wordInput.value.trim()) {
    words = wordInput.value.trim().split(/\n+/).map(w => w.trim()).filter(w => w);
  } else {
    words = [
      "articulate", "pharaoh", "onomatopoeia", "surveillance",
      "metamorphosis", "onomastics", "entrepreneur", "mnemonic"
    ];
  }
  if (!words.length) {
    showNotification("Please enter at least one word to begin.", "error");
    return;
  }
  trainerDiv.innerHTML = "<p>🎤 Listening...</p>";
  scoreDiv.innerHTML = "";
  speakWord(words[currentIndex]);
  setTimeout(() => listenAndCheck(words[currentIndex]), 1000); // Give a small pause after speaking
  gaEvent('test', 'start', 'bee-freemium');
});

function speakWord(word) {
  const utter = new SpeechSynthesisUtterance();
  utter.lang = accentSelect.value;
  utter.rate = 0.9;
  utter.text = word; // App speaks whole word only!
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function listenAndCheck(correctWord) {
  if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
    showNotification("Speech recognition not supported in this browser.", "error");
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = accentSelect.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = (event) => {
    // User spells: "P H A R A O H"
    let spoken = event.results[0][0].transcript.toUpperCase().replace(/[^A-Z]/g, "");
    let expected = correctWord.toUpperCase().replace(/[^A-Z]/g, "");

    const box = document.createElement("div");
    box.className = "word-box";
    if (spoken === expected) {
      correctCount++;
      box.innerHTML = `✅ <strong>Correct!</strong> You spelled: ${spoken.split("").join(" ")}`;
    } else {
      incorrectWords.push({ word: correctWord, heard: spoken });
      box.innerHTML = `❌ <strong>Incorrect.</strong> You spelled: <em>${spoken.split("").join(" ")}</em><br>Correct spelling was: <strong>${expected.split("").join(" ")}</strong>`;
    }
    trainerDiv.innerHTML = "";
    trainerDiv.appendChild(box);

    currentIndex++;
    if (currentIndex < words.length) {
      setTimeout(() => {
        trainerDiv.innerHTML = "<p>🎤 Listening...</p>";
        speakWord(words[currentIndex]);
        setTimeout(() => listenAndCheck(words[currentIndex]), 1000);
      }, 2200);
    } else {
      showScore();
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
    showNotification("Speech recognition error. Please try again.", "error");
  };
}

function showScore() {
  const percent = Math.round((correctCount / words.length) * 100);
  let color = "#28a745";
  if (percent < 50) color = "#dc3545";
  else if (percent < 75) color = "#ffc107";

  scoreDiv.innerHTML = `
    <div class="word-box">
      <h3 style="color:${color};">Test Completed</h3>
      <p><strong>Total:</strong> ${words.length}</p>
      <p><strong>Correct:</strong> ${correctCount}</p>
      <p><strong>Score:</strong> ${percent}%</p>
      ${
        incorrectWords.length
          ? `<h4>Incorrect Words</h4><ul>${incorrectWords.map(w => `<li><strong>${w.word}</strong> – You said: <em>${w.heard}</em></li>`).join('')}</ul>`
          : `<p>🎉 No mistakes. Excellent spelling!</p>`
      }
      <button onclick="location.reload()" class="btn btn-info">🔁 Try Again</button>
    </div>
  `;
}

// Feedback form (Netlify)
const form = document.querySelector("form[data-netlify='true']");
const submitBtn = document.getElementById("submitBtn");
const hiddenEmail = document.getElementById("formHiddenEmail");
if (form) {
  form.addEventListener("submit", function (event) {
    if (!hiddenEmail.value) {
      showNotification("Please log in before submitting feedback.", "error");
      event.preventDefault();
    } else {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Comment';
      }, 2000);
    }
  });
}
