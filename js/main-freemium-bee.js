/* SpellRightPro – Freemium Bee Mode (2025-10)
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
    alert("Speech Recognition is not supported in this browser. Please use Chrome/Edge on desktop or Android.");
    return null;
  }
  const recog = new SpeechRecognition();
  recog.lang = "en-US";
  recog.continuous = false;
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  recog.onresult = (e) => {
    const result = e.results[0][0].transcript.trim().toLowerCase();
    handleAnswer(result);
  };

  recog.onerror = (err) => {
    console.warn("Recognition error:", err.error);
    // Retry gently during an active session
    if (isSessionActive) setTimeout(() => startListening(), 1200);
  };

  recog.onend = () => {
    isListening = false;
    if (isSessionActive && !isSpeaking) {
      // Keep listening between words while the session is active
      setTimeout(() => startListening(), 800);
    }
  };

  return recog;
}

// === Speak Word ===
function speakWord(word, callback) {
  const synth = window.speechSynthesis;
  if (!synth) {
    callback?.();
    return;
  }

  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = 0.9;
  utter.pitch = 1;
  utter.volume = 1;
  isSpeaking = true;

  utter.onend = () => {
    isSpeaking = false;
    callback?.();
  };

  // Clear any queued utterances then speak
  try { synth.cancel(); } catch {}
  synth.speak(utter);
}

// === Load Bee Words ===
async function loadBeeWords() {
  try {
    const res = await fetch("data/word-lists/spelling-bee.json", { cache: "no-store" });
    beeWords = await res.json();
    if (!Array.isArray(beeWords) || beeWords.length === 0) throw new Error("Empty list");
    console.log(`Bee words loaded: ${beeWords.length}`);
  } catch (e) {
    console.error("Word list load failed:", e);
    beeWords = ["apple", "banana", "cherry"]; // safe fallback
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
  summaryEl?.classList.add("hidden");
  feedbackEl.textContent = "";
  isSessionActive = true;

  nextWord();
}

function endSession() {
  isSessionActive = false;
  try { recognition?.stop(); } catch {}
  showSummary();
}

// === Speak + Listen Cycle ===
function nextWord() {
  if (!isSessionActive) return;
  if (currentIndex >= beeWords.length) return endSession();

  const word = beeWords[currentIndex];
  progressEl.textContent = `Word ${currentIndex + 1} of ${beeWords.length}`;
  feedbackEl.textContent = "Listen carefully…";

  speakWord(word, () => {
    startListening();
  });
}

function startListening() {
  if (!isSessionActive || !recognition) return;

  try {
    recognition.stop(); // ensure clean state
  } catch {}
  try {
    recognition.start();
    isListening = true;
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
    if (!incorrectList.includes(expected)) incorrectList.push(expected);
  }

  currentIndex++;
  if (currentIndex < beeWords.length) {
    setTimeout(nextWord, 1000);
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
  const percent = total ? Math.round((correctCount / total) * 100) : 0;
  scoreEl.textContent = `${correctCount}/${total}`;
  percentEl.textContent = `${percent}%`;

  incorrectListEl.innerHTML = incorrectList.map((w) => `<li>${w}</li>`).join("");
  summaryEl?.classList.remove("hidden");
  feedbackEl.textContent = "Session complete.";
}

// === Buttons ===
startBtn?.addEventListener("click", startSession);
endBtn?.addEventListener("click", endSession);
nextBtn?.addEventListener("click", () => {
  if (!isSessionActive) return;
  try { recognition?.stop(); } catch {}
  currentIndex++;
  if (currentIndex >= beeWords.length) return endSession();
  nextWord();
});
prevBtn?.addEventListener("click", () => {
  if (!isSessionActive) return;
  try { recognition?.stop(); } catch {}
  if (currentIndex > 0) currentIndex--;
  nextWord();
});
retryBtn?.addEventListener("click", startSession);
reviewFlaggedBtn?.addEventListener("click", () => {
  if (!flaggedList.length) return alert("No flagged words.");
  beeWords = [...flaggedList];
  flaggedList = [];
  startSession();
});

// === Audio Guards Hook ===
if (window.initAudioGuards) initAudioGuards(recognition);

console.log("Bee Mode Ready ✅");
