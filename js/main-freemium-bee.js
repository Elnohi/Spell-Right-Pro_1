// main-freemium-bee.js (Enhanced + Reviewed)

// Firebase Initialization
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
const auth = firebase.auth();

// DOM Elements
const words = [
  "articulate", "pharaoh", "onomatopoeia", "surveillance",
  "metamorphosis", "onomastics", "entrepreneur", "mnemonic"
];

let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];
let testActive = false;

const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startTest");
const trainerDiv = document.getElementById("trainer");
const scoreDiv = document.getElementById("scoreDisplay");
const form = document.querySelector("form[data-netlify='true']");
const submitBtn = document.getElementById("submitBtn");
const hiddenEmail = document.getElementById("formHiddenEmail");
const loginStatus = document.getElementById("loginStatus");

// Auth status
auth.onAuthStateChanged(user => {
  if (user) {
    hiddenEmail.value = user.email;
    if (loginStatus) loginStatus.textContent = `🔐 Logged in as ${user.email}`;
  } else {
    hiddenEmail.value = "";
    if (loginStatus) loginStatus.textContent = "Not logged in";
  }
});

// Compatibility check
if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
  startButton.disabled = true;
  startButton.textContent = "Speech Recognition Not Supported";
  alert("Your browser does not support speech recognition. Please try Chrome or Edge on desktop.");
}

startButton.addEventListener("click", startBeeTest);

function startBeeTest() {
  testActive = true;
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  trainerDiv.innerHTML = "<p class='word-box'>🎤 Listening... Please spell the word you hear.</p>";
  speakWord(words[currentIndex]);
  listenAndCheck(words[currentIndex]);
}

function speakWord(word) {
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value;
  utter.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function listenAndCheck(correctWord) {
  if (!testActive) return;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = accentSelect.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  trainerDiv.innerHTML = "<p class='word-box'>🎙️ Listening for your response...</p>";

  recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript.toLowerCase().replace(/\s+/g, "");
    const expected = correctWord.toLowerCase().replace(/\s+/g, "");

    const box = document.createElement("div");
    box.className = "word-box";
    if (spoken === expected) {
      correctCount++;
      box.innerHTML = `✅ <strong>Correct!</strong> You spelled: ${spoken}`;
    } else {
      incorrectWords.push({ word: correctWord, heard: spoken });
      box.innerHTML = `❌ <strong>Incorrect.</strong> You said: <em>${spoken}</em><br>Correct spelling was: <strong>${correctWord}</strong>`;
    }

    box.innerHTML += "<p>Next word in 2 seconds...</p>";
    trainerDiv.innerHTML = "";
    trainerDiv.appendChild(box);

    currentIndex++;
    if (currentIndex < words.length) {
      setTimeout(() => {
        speakWord(words[currentIndex]);
        listenAndCheck(words[currentIndex]);
      }, 2000);
    } else {
      showScore();
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
    const box = document.createElement("div");
    box.className = "word-box";
    box.innerHTML = `⚠️ <strong>Error:</strong> ${e.error}. <br>Please click Retry to continue.`;
    box.innerHTML += '<br><button onclick="startBeeTest()" class="btn btn-warning">🔁 Retry Test</button>';
    trainerDiv.innerHTML = "";
    trainerDiv.appendChild(box);
  };
}

function showScore() {
  testActive = false;
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

// Feedback form submission
if (form) {
  form.addEventListener("submit", function (event) {
    if (!hiddenEmail.value) {
      alert("Please log in before submitting feedback.");
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
