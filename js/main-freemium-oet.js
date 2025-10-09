// ==========================================================
// SpellRightPro — main-freemium-oet.js
// Mode: OET Practice (typing + TTS)
// ==========================================================

let words = [];
let currentIndex = 0;
let score = 0;
let flaggedWords = [];
let incorrectWords = [];
let accent = "en-US";
let synth = window.speechSynthesis;
let recognition;

// Elements
const startBtn = document.getElementById("start-btn");
const inputField = document.getElementById("spelling-input");
const feedbackDiv = document.getElementById("feedback");
const progressText = document.getElementById("word-progress");
const summaryArea = document.getElementById("summary-area");
const correctList = document.getElementById("correct-list");
const incorrectList = document.getElementById("incorrect-list");
const flaggedList = document.getElementById("flagged-list");
const endSessionBtn = document.getElementById("end-session");

// Audio guards
if (window.initAudioGuards) initAudioGuards();

// Load OET words
async function loadWords() {
  const res = await fetch("oet.json");
  const data = await res.json();
  words = data;
}

// Speak
function speakWord(word) {
  stopSpeech();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent;
  synth.speak(utter);
}

// Start
async function startPractice() {
  if (!words.length) await loadWords();
  currentIndex = 0;
  score = 0;
  incorrectWords = [];
  flaggedWords = [];
  summaryArea.classList.add("hidden");
  nextWord();
}

// Next
function nextWord() {
  if (currentIndex >= words.length) return endSession();
  const word = words[currentIndex];
  progressText.textContent = `Word ${currentIndex + 1} / ${words.length}`;
  speakWord(word);
  inputField.focus();
}

// Check
function checkAnswer() {
  const input = inputField.value.trim().toLowerCase();
  const correct = words[currentIndex].trim().toLowerCase();
  if (input === correct) {
    score++;
    feedback("✅ Correct", true);
  } else {
    feedback(`❌ Incorrect (${correct})`, false);
    incorrectWords.push(correct);
  }
  inputField.value = "";
  currentIndex++;
  nextWord();
}

// Feedback
function feedback(msg, correct) {
  feedbackDiv.innerHTML = msg;
  feedbackDiv.className = "feedback " + (correct ? "correct" : "incorrect");
}

// End
function endSession() {
  stopSpeech();
  safeStopRecognition(window.currentRecognition);
  summaryArea.classList.remove("hidden");
  correctList.innerHTML = `<li>${score} correct</li>`;
  incorrectList.innerHTML = incorrectWords.map((w) => `<li>${w}</li>`).join("");
  flaggedList.innerHTML = flaggedWords.map((w) => `<li>${w}</li>`).join("");
}

// Events
startBtn?.addEventListener("click", startPractice);
inputField?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAnswer();
});
endSessionBtn?.addEventListener("click", endSession);

// Audio guard init
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initAudioGuards === "function") initAudioGuards(window.currentRecognition);
});
