/* SpellRightPro – Freemium Bee Mode (Finalized October 2025)
   Fixes: first word freeze, no recognition, no next on click
*/

let beeWords = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectList = [];
let flaggedList = [];
let recognition;
let isListening = false;
let isSpeaking = false;
let isSessionActive = false;

// === DOM Elements ===
const startBtn = document.getElementById("beeStartBtn");
const endBtn = document.getElementById("beeEndBtn");
const prevBtn = document.getElementById("beePrevBtn");
const nextBtn = document.getElementById("beeNextBtn");
const flagBtn = document.getElementById("beeFlagBtn");
const feedbackEl = document.getElementById("beeFeedback");
const progressEl = document.getElementById("beeProgress");
const summaryEl = document.getElementById("beeSummary");
const correctListEl = document.getElementById("beeCorrectList");
const incorrectListEl = document.getElementById("beeIncorrectList");
const scoreEl = document.getElementById("beeScore");
const percentEl = document.getElementById("beePercent");
const retryBtn = document.getElementById("beeRetryBtn");
const reviewFlaggedBtn = document.getElementById("beeReviewFlaggedBtn");

// === Speech Recognition Init ===
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech Recognition not supported in this browser.");
    return null;
  }
  const recog = new SpeechRecognition();
  recog.lang = "en-US";
  recog.continuous = false;
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  recog.onresult = (e) => {
    const result = e.results[0][0].transcript.trim().toLowerCase();
    console.log("User said:", result);
    handleAnswer(result);
  };

  recog.onerror = (err) => {
    console.warn("Recognition error:", err.error);
    // Retry after 1.5s if active
    if (isSessionActive) setTimeout(() => startListening(), 1500);
  };

  recog.onend = () => {
    isListening = false;
    if (isSessionActive && !isSpeaking) {
      console.log("Restarting recognition...");
      setTimeout(() => startListening(), 1000);
    }
  };

  return recog;
}

// === Speak Word ===
function speakWord(word, callback) {
  const synth = window.speechSynthesis;
  if (!synth) return;

  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = 0.9;
  utter.pitch = 1;
  utter.volume = 1;
  isSpeaking = true;

  utter.onend = () => {
    isSpeaking = false;
    if (callback) callback();
  };

  synth.cancel(); // Clear queue
  synth.speak(utter);
}

// === Load Words ===
async function loadBeeWords() {
  try {
    const res = await fetch("data/word-lists/spelling-bee.json");
    beeWords = await res.json();
    console.log(`Bee words loaded: ${beeWords.length}`);
  } catch (e) {
    console.error("Word list load failed:", e);
    beeWords = ["apple", "banana", "cherry"];
  }
}

// === Start / End Session ===
async function startSession() {
  await loadBeeWords();
  if (!beeWords.length) return alert("No word list found.");

  if (!recognition) recognition = initRecognition();
  if (!recognition) return;

  currentIndex = 0;
  correctCount = 0;
  incorrectList = [];
  flaggedList = [];
  summaryEl.classList.add("hidden");
  feedbackEl.textContent = "";
  isSessionActive = true;

  console.log("Session started.");
  nextWord();
}

function endSession() {
  isSessionActive = false;
  try { recognition.stop(); } catch {}
  showSummary();
}

// === Speak + Listen Cycle ===
function nextWord() {
  if (!isSessionActive) return;
  if (currentIndex >= beeWords.length) return endSession();

  const word = beeWords[currentIndex];
  progressEl.textContent = `Word ${currentIndex + 1} of ${beeWords.length}`;
  feedbackEl.textContent = "Listen carefully...";

  speakWord(word, () => {
    console.log("Speaking done, now listening...");
    startListening();
  });
}

function startListening() {
  if (!isSessionActive || !recognition) return;
  try {
    recognition.stop(); // ensure clean state
    recognition.start();
    isListening = true;
    console.log("Listening...");
  } catch (err) {
    console.warn("Could not start recognition:", err);
  }
}

// === Handle Answer ===
function handleAnswer(spoken) {
  if (!spoken) return;
  const expected = beeWords[currentIndex].trim().toLowerCase();
  const user = spoken.trim().toLowerCase();

  if (user === expected) {
    feedbackEl.textContent = `✅ Correct: ${expected}`;
    correctCount++;
  } else {
    feedbackEl.textContent = `❌ Incorrect: ${user} → ${expected}`;
    incorrectList.push(expected);
  }

  currentIndex++;
  if (currentIndex < beeWords.length) {
    setTimeout(nextWord, 1500);
  } else {
    endSession();
  }
}

// === Flagging + Summary ===
flagBtn?.addEventListener("click", () => {
  const w = beeWords[currentIndex];
  if (w) flaggedList.push(w);
  feedbackEl.textContent = `🚩 Flagged: ${w}`;
});

function showSummary() {
  const total = beeWords.length;
  const percent = Math.round((correctCount / total) * 100);
  scoreEl.textContent = `${correctCount}/${total}`;
  percentEl.textContent = `${percent}%`;
  correctListEl.innerHTML = beeWords
    .slice(0, correctCount)
    .map((w) => `<span>${w}</span>`)
    .join(", ");
  incorrectListEl.innerHTML = incorrectList.map((w) => `<span>${w}</span>`).join(", ");
  summaryEl.classList.remove("hidden");
  feedbackEl.textContent = "Session complete.";
}

// === Buttons ===
startBtn?.addEventListener("click", startSession);
endBtn?.addEventListener("click", endSession);
nextBtn?.addEventListener("click", () => {
  if (!isSessionActive) return;
  recognition?.stop();
  currentIndex++;
  if (currentIndex >= beeWords.length) return endSession();
  nextWord();
});
prevBtn?.addEventListener("click", () => {
  if (!isSessionActive) return;
  recognition?.stop();
  if (currentIndex > 0) currentIndex--;
  nextWord();
});
retryBtn?.addEventListener("click", startSession);
reviewFlaggedBtn?.addEventListener("click", () => {
  if (!flaggedList.length) return alert("No flagged words.");
  beeWords = flaggedList;
  flaggedList = [];
  startSession();
});

// === Audio Guards (optional) ===
if (window.initAudioGuards) initAudioGuards(recognition);

console.log("Bee Mode Ready ✅");
