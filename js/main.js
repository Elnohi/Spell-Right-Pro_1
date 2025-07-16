// Firebase Config and Init
const firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.appspot.com",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let words = [];
let userEmail = "";
let currentWordIndex = 0;
let correctCount = 0;
let previousWords = [];
let incorrectWords = [];
const synth = window.speechSynthesis;

// UI Binding
window.onload = () => {
  document.getElementById("loginBtn").onclick = loginUser;
  document.getElementById("signupBtn").onclick = signUpUser;
  document.getElementById("logoutBtn").onclick = logoutUser;
  document.getElementById("startPracticeBtn").onclick = startPractice;
  document.getElementById("startTestBtn").onclick = startTest;
  document.getElementById("modeToggle").onclick = toggleDarkMode;
  
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      userEmail = user.email;
      document.getElementById("loginStatus").textContent = `Logged in as ${userEmail}`;
      loadWordList();
    } else {
      document.getElementById("loginStatus").textContent = "Not logged in";
    }
  });
}

// Auth Functions
function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => alert("Login successful"))
    .catch(err => alert(err.message));
}

function signUpUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert("Account created"))
    .catch(err => alert(err.message));
}

function logoutUser() {
  auth.signOut().then(() => {
    alert("Logged out");
    location.reload();
  });
}

// Word Logic
function startPractice() {
  if (!words.length) return alert("No words loaded");
  currentWordIndex = 0;
  correctCount = 0;
  previousWords = [];
  incorrectWords = [];
  presentWord();
}

function startTest() {
  if (!words.length) return alert("No words loaded");
  words = shuffle(words).slice(0, 24);
  currentWordIndex = 0;
  correctCount = 0;
  previousWords = [];
  incorrectWords = [];
  presentWord();
}

function presentWord() {
  const word = words[currentWordIndex];
  document.getElementById("wordBox").innerHTML = `
    <h3>Word ${currentWordIndex + 1} of ${words.length}</h3>
    <button onclick="speak('${word}')">🔊 Speak</button>
    <input type="text" id="userInput" placeholder="Type what you heard">
    <button onclick="checkAnswer('${word}')">Check</button>
  `;
  speak(word);
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  synth.cancel();
  synth.speak(utterance);
}

function checkAnswer(expected) {
  const typed = document.getElementById("userInput").value.trim().toLowerCase();
  if (typed === expected.toLowerCase()) {
    correctCount++;
  } else {
    incorrectWords.push({ expected, typed });
  }
  currentWordIndex++;
  if (currentWordIndex < words.length) {
    presentWord();
  } else {
    showScore();
  }
}

function showScore() {
  const score = Math.round((correctCount / words.length) * 100);
  document.getElementById("wordBox").innerHTML = `
    <h2>Test Complete</h2>
    <p>Score: ${correctCount} / ${words.length} (${score}%)</p>
  `;
}

function loadWordList() {
  if (!userEmail) return;
  db.collection("wordLists").doc(userEmail).get()
    .then(doc => {
      if (doc.exists) {
        words = doc.data().words || [];
      }
    });
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
