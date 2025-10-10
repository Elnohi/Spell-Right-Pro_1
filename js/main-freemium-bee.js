/* SpellRightPro – Freemium Bee Mode
 * Version: October 2025 update
 * Fixes: recognition stops after 1st word, wrong word list path, missing progress, no auto advance
 */

let beeWords = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectList = [];
let flaggedList = [];
let isSessionActive = false;
let recognition;
let synth = window.speechSynthesis;
let currentWord = "";
let isSpeaking = false;

// ====== DOM Elements ======
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

// ====== Initialize Recognition ======
function initRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech Recognition is not supported in this browser.");
    return null;
  }

  const recog = new SpeechRecognition();
  recog.lang = "en-US";
  recog.continuous = false;
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  recog.onresult = (event) => {
    const spokenText = event.results[0][0].transcript
      .trim()
      .toLowerCase()
      .replace(/[.]/g, ""); // ignore stray periods

    console.log("User said:", spokenText);
    checkAnswer(spokenText);
  };

  recog.onerror = (e) => {
    console.error("Recognition error:", e.error);
  };

  recog.onend = () => {
    if (isSessionActive && !isSpeaking) {
      console.log("Restarting recognition...");
      recog.start();
    }
  };

  return recog;
}

// ====== Speak Word ======
function speakWord(word) {
  if (!word) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onstart = () => (isSpeaking = true);
  utterance.onend = () => (isSpeaking = false);
  synth.speak(utterance);
}

// ====== Load Word List ======
async function loadBeeWords() {
  try {
    const res = await fetch("data/word-lists/spelling-bee.json");
    beeWords = await res.json();
    console.log(`Loaded ${beeWords.length} Bee words.`);
  } catch (err) {
    console.error("Failed to load Bee word list:", err);
    beeWords = ["apple", "banana", "cherry", "grape"];
  }
}

// ====== Start Session ======
async function startSession() {
  await loadBeeWords();
  currentIndex = 0;
  correctCount = 0;
  incorrectList = [];
  flaggedList = [];
  isSessionActive = true;
  summaryEl.classList.add("hidden");
  feedbackEl.textContent = "";
  progressEl.textContent = "";
  feedbackEl.classList.remove("d-none");

  if (!recognition) recognition = initRecognition();
  if (!recognition) return;

  recognition.stop(); // reset
  setTimeout(() => nextWord(), 600);
}

// ====== Speak and Recognize ======
function nextWord() {
  if (!isSessionActive) return;
  if (currentIndex >= beeWords.length) return endSession();

  currentWord = beeWords[currentIndex];
  progressEl.textContent = `Word ${currentIndex + 1} of ${beeWords.length}`;
  speakWord(currentWord);

  // Wait for TTS to finish before listening
  setTimeout(() => {
    if (!isSpeaking) recognition.start();
  }, 1200);
}

// ====== Check Answer ======
function checkAnswer(spokenText) {
  if (!spokenText) return;
  let expected = currentWord.trim().toLowerCase();
  let user = spokenText.trim().toLowerCase();

  console.log("Comparing:", expected, "vs", user);
  if (user === expected) {
    feedbackEl.textContent = `✅ Correct: ${expected}`;
    feedbackEl.classList.remove("error");
    correctCount++;
  } else {
    feedbackEl.textContent = `❌ Incorrect: ${user}. Correct was: ${expected}`;
    feedbackEl.classList.add("error");
    incorrectList.push(expected);
  }

  currentIndex++;
  if (currentIndex < beeWords.length) {
    setTimeout(nextWord, 1500);
  } else {
    setTimeout(endSession, 1500);
  }
}

// ====== Flag Current Word ======
flagBtn?.addEventListener("click", () => {
  if (currentWord) {
    flaggedList.push(currentWord);
    feedbackEl.textContent = `🚩 Flagged: ${currentWord}`;
  }
});

// ====== End Session ======
function endSession() {
  isSessionActive = false;
  try {
    recognition.stop();
  } catch (e) {
    console.warn("Recognition already stopped.");
  }

  let total = beeWords.length;
  let percent = Math.round((correctCount / total) * 100);
  scoreEl.textContent = `${correctCount} / ${total}`;
  percentEl.textContent = `${percent}%`;

  correctListEl.innerHTML = beeWords
    .slice(0, correctCount)
    .map((w) => `<span>${w}</span>`)
    .join(", ");
  incorrectListEl.innerHTML = incorrectList
    .concat(flaggedList)
    .map((w) => `<span>${w}</span>`)
    .join(", ");

  summaryEl.classList.remove("hidden");
  feedbackEl.textContent = "Session ended.";
}

// ====== Retry / Review Buttons ======
retryBtn?.addEventListener("click", () => startSession());
reviewFlaggedBtn?.addEventListener("click", () => {
  if (flaggedList.length === 0) return alert("No flagged words to review!");
  beeWords = flaggedList;
  flaggedList = [];
  startSession();
});

// ====== Nav Buttons ======
prevBtn?.addEventListener("click", () => {
  if (currentIndex > 0) currentIndex--;
  nextWord();
});

nextBtn?.addEventListener("click", () => {
  if (currentIndex < beeWords.length - 1) currentIndex++;
  nextWord();
});

endBtn?.addEventListener("click", endSession);
startBtn?.addEventListener("click", startSession);

// ====== Audio Guard Integration ======
if (window.initAudioGuards) initAudioGuards(recognition);

console.log("Freemium Bee Mode ready ✅");
