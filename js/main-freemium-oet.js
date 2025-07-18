// main-freemium-oet.js (modern, clean, modular)
// Import shared UI/logic helpers
import { initThemeToggle, initAuth, addAuthListeners, showNotification } from './common.js';

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
initThemeToggle("modeIcon", "modeIcon");

// --- OET Words ---
// (If you have your word list in a separate file, import here. For demo, use sample.)
let words = [
  "Scalp", "Eczema", "Osteoarthritis", "Atrial fibrillation", "Fatigue",
  "Constipation", "Bruising", "Lying down", "Autism", "Insomnia"
  // ...import all OET words here or load from oet_word_list.js if using ES6 exports
];

let currentIndex = 0, correctCount = 0, incorrectWords = [];

const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startOET");
const trainerDiv = document.getElementById("trainer");
const scoreDiv = document.getElementById("scoreDisplay");

// -- Practice session --
startButton.addEventListener("click", () => {
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  scoreDiv.innerHTML = "";
  presentWord();
});

// Render word UI and listen for answer
function presentWord() {
  trainerDiv.innerHTML = "";
  if (currentIndex >= words.length) {
    showScore();
    return;
  }
  const word = words[currentIndex];

  const box = document.createElement("div");
  box.className = "word-box";
  box.innerHTML = `
    <h3>Word ${currentIndex + 1} of ${words.length}</h3>
    <button class="btn btn-info" id="speakBtn"><i class="fas fa-volume-up"></i> Speak</button>
    <input type="text" id="userInput" placeholder="Type what you heard..." autofocus style="margin-top:10px;">
    <button class="btn btn-success" id="checkBtn">Check</button>
    <div id="status" style="margin: 10px 0; min-height:24px;"></div>
  `;
  trainerDiv.appendChild(box);

  // Speak word on first render
  setTimeout(() => speak(word), 600);

  document.getElementById("speakBtn").onclick = () => speak(word);
  document.getElementById("checkBtn").onclick = checkAnswer;
  document.getElementById("userInput").onkeypress = (e) => {
    if (e.key === "Enter") checkAnswer();
  };

  function checkAnswer() {
    const input = document.getElementById("userInput").value.trim().toLowerCase();
    const correct = word.toLowerCase();
    const status = document.getElementById("status");
    if (input === correct) {
      correctCount++;
      status.textContent = "✅ Correct!";
      status.className = "status correct";
    } else {
      incorrectWords.push({ word, typed: input });
      status.textContent = `❌ Incorrect. Correct: ${word}`;
      status.className = "status incorrect";
    }
    setTimeout(() => {
      currentIndex++;
      presentWord();
    }, 1600);
  }
}

// TTS
function speak(text) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = accentSelect.value;
  utterance.rate = 0.95;
  utterance.volume = 1;
  const voices = synth.getVoices();
  const voice = voices.find(v => v.lang === accentSelect.value) || voices[0];
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

// Results
function showScore() {
  const percent = Math.round((correctCount / words.length) * 100);
  let scoreColor = "#28a745";
  if (percent < 50) scoreColor = "#dc3545";
  else if (percent < 75) scoreColor = "#ffc107";
  scoreDiv.innerHTML = `
    <div class="word-box">
      <h2 style="color: ${scoreColor}">Test Complete</h2>
      <p>You scored <strong style="color: ${scoreColor}">${correctCount}</strong> out of ${words.length} (<strong style="color: ${scoreColor}">${percent}%</strong>)</p>
      ${incorrectWords.length
        ? `<h3>Incorrect Words</h3><ul style="text-align:left;">${incorrectWords.map(w => `<li><strong>${w.word}</strong> – You typed: <em>${w.typed}</em></li>`).join('')}</ul>`
        : `<p>🎉 No mistakes. Excellent work!</p>`
      }
      <button onclick="location.reload()" class="btn btn-info mt-2">
        <i class="fas fa-redo"></i> Start New Session
      </button>
    </div>
  `;
}

// Feedback form (Netlify anti-bot + UI feedback)
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
