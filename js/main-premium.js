// main-premium.js — Final Version (Full, No Omission)

// ==================== AD INTEGRATION ====================
let adsLoaded = false;

function loadAdsIfNeeded() {
  if (!auth.currentUser && !adsLoaded) {
    (adsbygoogle = window.adsbygoogle || []).push({});
    adsLoaded = true;
  }
}

window.addEventListener("error", (e) => {
  if (e.message.includes("adsbygoogle")) {
    const adContainer = document.querySelector(".ad-container");
    if (adContainer) adContainer.style.display = "none";
  }
});

// ==================== GLOBALS ====================
let currentUser = null;
let examType = "OET";
let accent = "en-US";
let words = [];
let currentIndex = 0;
let sessionMode = "practice";
let score = 0;
let flaggedWords = [];
let userAnswers = [];
let userAttempts = [];
let retries = [];
let sessionStartTime;
const sessionId = "sess_" + Math.random().toString(36).substring(2, 10);

// ==================== SPEECH ====================
let voicesReady = false;
function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) voicesReady = true;
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speakWord(word, rate = 1.0) {
  if (!voicesReady) return setTimeout(() => speakWord(word, rate), 200);
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent;
  utterance.rate = rate;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang === accent) || voices[0];
  if (voice) utterance.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// ==================== DOM ====================
const trainerArea = document.getElementById("trainer-area");
const summaryArea = document.getElementById("summary-area");

// ==================== AUTH ====================
auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (!user) loadAdsIfNeeded();
});

// ==================== START ====================
function startOET() {
  sessionStartTime = Date.now();
  words = [...(sessionMode === "test" ? shuffle(window.oetWords).slice(0, 24) : window.oetWords)];
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  retries = [];
  showOETWord();
  setTimeout(() => speakCurrentWord(), 300);
}

function showOETWord() {
  if (currentIndex >= words.length) return endSession();

  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <h3>Word ${currentIndex + 1}/${words.length}</h3>
    <button onclick="speakCurrentWord()">🔊 Repeat</button>
    <input id="user-input" class="form-control" placeholder="Type the word" autofocus />
    <button onclick="submitOETAnswer()">Submit</button>
    <button onclick="flagWord()">🚩 Flag</button>
    <div id="feedback"></div>
  `;
  document.getElementById("user-input").focus();
}

function speakCurrentWord() {
  speakWord(words[currentIndex]);
}

function submitOETAnswer() {
  const input = document.getElementById("user-input");
  const userAnswer = input.value.trim();
  const correctWord = words[currentIndex];
  userAnswers[currentIndex] = userAnswer;

  if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
    score++;
    showFeedback("Correct!", "green");
    nextOET();
  } else {
    if (!retries[currentIndex]) {
      retries[currentIndex] = 1;
      showFeedback(`Try again`, "orange");
      input.value = "";
      input.focus();
    } else {
      showFeedback(`Incorrect. Correct: ${correctWord}`, "red");
      nextOET();
    }
  }
}

function nextOET() {
  currentIndex++;
  if (currentIndex < words.length) {
    setTimeout(() => {
      showOETWord();
      speakCurrentWord();
    }, 1000);
  } else {
    endSession();
  }
}

function showFeedback(msg, color) {
  const feedback = document.getElementById("feedback");
  feedback.innerText = msg;
  feedback.style.color = color;
}

function flagWord() {
  const word = words[currentIndex];
  if (!flaggedWords.includes(word)) flaggedWords.push(word);
  alert(`Flagged: ${word}`);
}

// ==================== SPELLING BEE ====================
function startBee() {
  sessionStartTime = Date.now();
  words = [
    "accommodate", "belligerent", "conscientious", "disastrous",
    "embarrass", "foreign", "guarantee", "harass", "interrupt"
  ];
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAttempts = [];
  showBeeWord();
  setTimeout(() => speakCurrentWord(), 300);
  listenToUser();
}

function showBeeWord() {
  if (currentIndex >= words.length) return endSession();

  trainerArea.innerHTML = `
    <h3>Word ${currentIndex + 1}/${words.length}</h3>
    <p>🎤 Spell the word after hearing it.</p>
    <button onclick="speakCurrentWord()">🔊 Repeat</button>
    <button onclick="skipBee()">⏭️ Skip</button>
    <button onclick="flagWord()">🚩 Flag</button>
    <div id="mic-feedback"></div>
  `;
}

function skipBee() {
  currentIndex++;
  if (currentIndex < words.length) {
    showBeeWord();
    speakCurrentWord();
    listenToUser();
  } else {
    endSession();
  }
}

function listenToUser() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById("mic-feedback").textContent = "Speech recognition not supported.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const attempt = event.results[0][0].transcript.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const correct = words[currentIndex].toLowerCase();
    userAttempts[currentIndex] = attempt;

    if (attempt === correct) {
      score++;
      document.getElementById("mic-feedback").innerText = `Correct: ${attempt}`;
    } else {
      document.getElementById("mic-feedback").innerText = `Wrong: ${attempt} | Correct: ${correct}`;
    }

    currentIndex++;
    if (currentIndex < words.length) {
      setTimeout(() => {
        showBeeWord();
        speakCurrentWord();
        listenToUser();
      }, 1500);
    } else {
      endSession();
    }
  };

  recognition.onerror = (e) => {
    document.getElementById("mic-feedback").textContent = "Error recognizing speech. Try again.";
    console.error(e);
  };

  recognition.start();
}

// ==================== CUSTOM ====================
function startCustomPractice() {
  sessionStartTime = Date.now();
  currentIndex = 0;
  score = 0;
  flaggedWords = [];
  userAnswers = [];
  retries = [];
  showCustomWord();
  setTimeout(() => speakCurrentWord(), 300);
}

function showCustomWord() {
  if (currentIndex >= words.length) return endSession();

  const word = words[currentIndex];
  trainerArea.innerHTML = `
    <h3>Word ${currentIndex + 1}/${words.length}</h3>
    <button onclick="speakCurrentWord()">🔊 Repeat</button>
    <input id="user-input" class="form-control" placeholder="Type the word" autofocus />
    <button onclick="submitCustomAnswer()">Submit</button>
    <button onclick="flagWord()">🚩 Flag</button>
    <div id="feedback"></div>
  `;
  document.getElementById("user-input").focus();
}

function submitCustomAnswer() {
  const input = document.getElementById("user-input");
  const userAnswer = input.value.trim();
  const correctWord = words[currentIndex];
  userAnswers[currentIndex] = userAnswer;

  if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
    score++;
    showFeedback("Correct!", "green");
    nextCustom();
  } else {
    if (!retries[currentIndex]) {
      retries[currentIndex] = 1;
      showFeedback("Try again", "orange");
      input.value = "";
      input.focus();
    } else {
      showFeedback(`Incorrect. Correct: ${correctWord}`, "red");
      nextCustom();
    }
  }
}

function nextCustom() {
  currentIndex++;
  if (currentIndex < words.length) {
    setTimeout(() => {
      showCustomWord();
      speakCurrentWord();
    }, 1000);
  } else {
    endSession();
  }
}

// ==================== SUMMARY ====================
function endSession() {
  const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
  const accuracy = Math.round((score / words.length) * 100);

  const flaggedHTML = flaggedWords.length
    ? `<ul>${flaggedWords.map(w => `<li>${w}</li>`).join("")}</ul>`
    : "<p>No flagged words</p>";

  summaryArea.innerHTML = `
    <div class="summary-card">
      <h3>Session Summary</h3>
      <p><strong>Mode:</strong> ${examType}</p>
      <p><strong>Score:</strong> ${score}/${words.length}</p>
      <p><strong>Accuracy:</strong> ${accuracy}%</p>
      <p><strong>Duration:</strong> ${duration} sec</p>
      ${flaggedHTML}
      <button onclick="renderExamUI()">🔁 Restart</button>
    </div>
  `;

  trainerArea.innerHTML = "";

  if (auth.currentUser) {
    database.ref("sessions/" + currentUser.uid + "/" + sessionId).set({
      timestamp: Date.now(),
      examType,
      mode: sessionMode,
      wordCount: words.length,
      score,
      accuracy,
      flaggedWords,
      retries,
    });
  }
}

// ==================== UTILS ====================
function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}
