// ==========================================================
// SpellRightPro — main-freemium-bee.js
// Mode: Spelling Bee (voice input)
// ==========================================================

// ========== GLOBAL STATE ==========
let words = [];
let currentIndex = 0;
let score = 0;
let flaggedWords = [];
let incorrectWords = [];
let recognition;
let isListening = false;
let isSessionActive = false;
let accent = "en-US";
let sessionMode = "practice"; // or "exam"
let synth = window.speechSynthesis;
let currentWord = "";

// ========== ELEMENTS ==========
const startBtn = document.getElementById("start-btn");
const submitBtn = document.getElementById("submit-btn");
const flagBtn = document.getElementById("flag-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const feedbackDiv = document.getElementById("feedback");
const progressText = document.getElementById("word-progress");
const summaryArea = document.getElementById("summary-area");
const correctList = document.getElementById("correct-list");
const incorrectList = document.getElementById("incorrect-list");
const flaggedList = document.getElementById("flagged-list");
const scoreDisplay = document.getElementById("score-display");
const inputArea = document.getElementById("spelling-input");
const endSessionBtn = document.getElementById("end-session");

// ========== AUDIO GUARDS ==========
if (window.initAudioGuards) {
  initAudioGuards();
}

// ========== SPEECH RECOGNITION ==========
function setupRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition not supported in this browser.");
    return null;
  }
  recognition = new SpeechRecognition();
  recognition.lang = accent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript.trim().toLowerCase();
    handleAnswer(transcript);
  };

  recognition.onerror = () => {
    feedback("Could not understand. Try again.", false);
    isListening = false;
    setTimeout(startRecognition, 800);
  };

  recognition.onend = () => {
    isListening = false;
  };

  window.currentRecognition = recognition; // <-- important for global guard
  return recognition;
}

// ========== LOAD WORDS ==========
async function loadWords() {
  try {
    const res = await fetch("data/word-lists/spelling-bee.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    words = data.sort(() => Math.random() - 0.5);
    console.log(`🐝 Loaded ${words.length} Bee words`);
  } catch (err) {
    console.error("Error loading spelling-bee.json:", err);
    feedback("⚠️ Error loading Bee word list. Using fallback words.", false);
    words = ["apple", "banana", "cherry", "orange"]; // fallback
  }
}

// ========== SPEAK ==========
function speakWord(word) {
  stopSpeech();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent;
  synth.speak(utter);
  currentWord = word;
}

// ========== START PRACTICE ==========
async function startPractice() {
  if (!words.length) await loadWords();
  currentIndex = 0;
  score = 0;
  incorrectWords = [];
  flaggedWords = [];
  summaryArea.classList.add("hidden");
  isSessionActive = true;
  speakNextWord();
}

// ========== SPEAK NEXT ==========
function speakNextWord() {
  if (currentIndex >= words.length) {
    endSession();
    return;
  }
  const word = words[currentIndex];
  progressText.textContent = `Word ${currentIndex + 1} of ${words.length}`;
  stopSpeech();
  safeStopRecognition(recognition);
  speakWord(word);
  setTimeout(startRecognition, 800);
}

// ========== RECOGNITION CONTROL ==========
function startRecognition() {
  if (!recognition) setupRecognition();
  if (isListening) return;
  try {
    isListening = true;
    recognition.start();
  } catch (e) {
    console.warn("Recognition start blocked:", e);
    isListening = false;
  }
}

function handleAnswer(answer) {
  const correct = currentWord.trim().toLowerCase();
  const clean = answer.replace(/[.,!?]/g, "");
  if (clean === correct) {
    score++;
    feedback(`✅ Correct: ${correct}`, true);
  } else {
    feedback(`❌ Incorrect: ${answer}<br>✔️ Correct: ${correct}`, false);
    incorrectWords.push(correct);
  }
  currentIndex++;
  setTimeout(speakNextWord, 1600);
}

function feedback(msg, correct) {
  feedbackDiv.innerHTML = msg;
  feedbackDiv.className = "feedback " + (correct ? "correct" : "incorrect");
}

// ========== END SESSION ==========
function endSession() {
  isSessionActive = false;
  stopSpeech();
  safeStopRecognition(window.currentRecognition);
  showSummary();
}

function showSummary() {
  summaryArea.classList.remove("hidden");
  correctList.innerHTML = `<li>${score} correct words</li>`;
  incorrectList.innerHTML = incorrectWords.map((w) => `<li>${w}</li>`).join("");
  flaggedList.innerHTML = flaggedWords.map((w) => `<li>${w}</li>`).join("");
  scoreDisplay.textContent = `${Math.round(
    (score / words.length) * 100
  )}% accuracy`;
}

// ========== EVENT LISTENERS ==========
startBtn?.addEventListener("click", startPractice);
endSessionBtn?.addEventListener("click", endSession);
flagBtn?.addEventListener("click", () => {
  if (currentWord) flaggedWords.push(currentWord);
});

// ========== AUDIO GUARDS INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  if (typeof initAudioGuards === "function")
    initAudioGuards(window.currentRecognition);
});
