// ==========================================================
// SpellRightPro — main-freemium-school.js
// Mode: School (typing input, OET-based words)
// ==========================================================

let words = [];
let currentIndex = 0;
let score = 0;
let incorrectWords = [];
let flaggedWords = [];
let accent = "en-US";
let recognition;
let synth = window.speechSynthesis;
let isSessionActive = false;

// ==== Elements ====
const startBtn = document.getElementById("start-btn");
const inputField = document.getElementById("spelling-input");
const feedbackDiv = document.getElementById("feedback");
const progressText = document.getElementById("word-progress");
const summaryArea = document.getElementById("summary-area");
const correctList = document.getElementById("correct-list");
const incorrectList = document.getElementById("incorrect-list");
const flaggedList = document.getElementById("flagged-list");
const endSessionBtn = document.getElementById("end-session");
const flagBtn = document.getElementById("flag-btn");

// ==== Audio Guards ====
if (window.initAudioGuards) initAudioGuards();

// ==== Speech Recognition Setup ====
function setupRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  recognition = new SpeechRecognition();
  recognition.lang = accent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  window.currentRecognition = recognition;
  return recognition;
}

// ==== Load Words ====
async function loadWords() {
  try {
    const res = await fetch("data/word-lists/oet.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    words = data;
    console.log(`📘 Loaded ${words.length} School/OET words`);
  } catch (err) {
    console.error("❌ Error loading oet.json:", err);
    feedback("⚠️ Could not load words. Using fallback.", false);
    words = ["patient", "nurse", "doctor", "hospital"]; // fallback
  }
}

// ==== Speak Word ====
function speakWord(word) {
  stopSpeech();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent;
  synth.speak(utter);
}

// ==== Start Session ====
async function startPractice() {
  if (!words.length) await loadWords();
  currentIndex = 0;
  score = 0;
  incorrectWords = [];
  flaggedWords = [];
  summaryArea.classList.add("hidden");
  isSessionActive = true;
  nextWord();
}

// ==== Next Word ====
function nextWord() {
  if (currentIndex >= words.length) return endSession();
  const word = words[currentIndex];
  progressText.textContent = `Word ${currentIndex + 1} of ${words.length}`;
  stopSpeech();
  safeStopRecognition(window.currentRecognition);
  speakWord(word);
  setTimeout(() => inputField.focus(), 400);
}

// ==== Check Answer ====
function checkAnswer() {
  const input = inputField.value.trim().toLowerCase();
  const correct = words[currentIndex].trim().toLowerCase();
  if (!input) return;

  if (input === correct) {
    score++;
    feedback(`✅ Correct: ${correct}`, true);
  } else {
    feedback(`❌ Incorrect: ${input}<br>✔️ Correct: ${correct}`, false);
    incorrectWords.push(correct);
  }

  inputField.value = "";
  currentIndex++;
  setTimeout(nextWord, 1000);
}

// ==== Feedback ====
function feedback(msg, correct) {
  feedbackDiv.innerHTML = msg;
  feedbackDiv.className = "feedback " + (correct ? "correct" : "incorrect");
}

// ==== End Session ====
function endSession() {
  stopSpeech();
  safeStopRecognition(window.currentRecognition);
  isSessionActive = false;
  summaryArea.classList.remove("hidden");

  correctList.innerHTML = `<li>${score} correct</li>`;
  incorrectList.innerHTML = incorrectWords.map((w) => `<li>${w}</li>`).join("");
  flaggedList.innerHTML = flaggedWords.map((w) => `<li>${w}</li>`).join("");
}

// ==== Flag Word ====
function flagWord() {
  const word = words[currentIndex];
  if (word && !flaggedWords.includes(word)) flaggedWords.push(word);
}

// ==== Event Listeners ====
startBtn?.addEventListener("click", startPractice);
inputField?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAnswer();
});
endSessionBtn?.addEventListener("click", endSession);
flagBtn?.addEventListener("click", flagWord);

// ==== Audio Guards Init ====
document.addEventListener("DOMContentLoaded", () => {
  if (typeof initAudioGuards === "function")
    initAudioGuards(window.currentRecognition);
});
