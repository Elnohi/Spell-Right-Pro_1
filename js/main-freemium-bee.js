// ======================
// SpellRightPro Bee Mode
// ======================
let words = [];
let currentIndex = 0;
let score = 0;
let accent = "en-US";
let recognition;
let synth = window.speechSynthesis;

// DOM Elements
const setupSection = document.getElementById("setup-section");
const gameSection = document.getElementById("game-section");
const resultsSection = document.getElementById("results-section");
const spellingInput = document.getElementById("spelling-input");
const feedbackArea = document.getElementById("feedback-area");
const micStatus = document.getElementById("mic-status");
const wordIndexSpan = document.getElementById("word-index");
const wordTotalSpan = document.getElementById("word-total");

document.querySelectorAll(".accent-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".accent-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    accent = btn.dataset.accent;
  });
});

// Add Words Button
document.getElementById("add-words-btn").addEventListener("click", () => {
  const text = document.getElementById("words-textarea").value.trim();
  if (!text) return alert("Please enter some words.");
  words = text.split(/[\s,]+/).filter(Boolean);
  alert(`${words.length} words added!`);
});

// Start Button
document.getElementById("start-button").addEventListener("click", async () => {
  if (words.length === 0) {
    try {
      const res = await fetch("/data/spelling-bee.json");
      words = await res.json();
    } catch {
      words = ["apple", "banana", "cherry"];
    }
  }

  setupSection.style.display = "none";
  gameSection.style.display = "block";
  wordTotalSpan.textContent = words.length;

  initSpeechRecognition();
  startWord();
});

function startWord() {
  if (currentIndex >= words.length) {
    endSession();
    return;
  }

  const word = words[currentIndex];
  wordIndexSpan.textContent = currentIndex + 1;
  spellingInput.value = "";
  feedbackArea.innerHTML = "";

  speakWord(word);
}

function speakWord(word) {
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent;
  synth.speak(utter);
  utter.onend = () => {
    startListening();
  };
}

function startListening() {
  if (!recognition) return;
  micStatus.style.display = "block";
  recognition.start();
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech Recognition not supported in your browser.");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = accent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript.trim().toLowerCase();
    micStatus.style.display = "none";
    checkSpelling(transcript);
  };

  recognition.onerror = (e) => {
    console.warn("Speech error:", e);
    micStatus.style.display = "none";
  };

  recognition.onend = () => {
    if (micStatus.style.display === "block") micStatus.style.display = "none";
  };
}

// Manual Submit (typing)
document.getElementById("submit-btn").addEventListener("click", () => {
  const typed = spellingInput.value.trim().toLowerCase();
  if (!typed) return;
  checkSpelling(typed);
});

function checkSpelling(answer) {
  const correct = words[currentIndex].toLowerCase();
  if (answer === correct) {
    feedbackArea.innerHTML = `<p class="correct">✅ Correct: ${correct}</p>`;
    score++;
  } else {
    feedbackArea.innerHTML = `<p class="incorrect">❌ ${answer} → ${correct}</p>`;
  }
  feedbackArea.scrollIntoView({behavior: "smooth"});
  setTimeout(() => nextWord(), 1500);
}

function nextWord() {
  currentIndex++;
  startWord();
}

function endSession() {
  gameSection.style.display = "none";
  resultsSection.style.display = "block";
  document.getElementById("summary-area").innerHTML = `
    <p>Your score: ${score} / ${words.length}</p>
    <p>Well done! Practice daily to improve.</p>
  `;
}

document.getElementById("restart-btn").addEventListener("click", () => {
  currentIndex = 0;
  score = 0;
  resultsSection.style.display = "none";
  setupSection.style.display = "block";
});
