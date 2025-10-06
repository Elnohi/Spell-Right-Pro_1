// ===========================
// SpellRightPro OET Freemium
// ===========================
let words = [];
let currentIndex = 0;
let score = 0;
let accent = "en-US";
let synth = window.speechSynthesis;

// DOM
const setupSection = document.getElementById("setup-section");
const gameSection = document.getElementById("game-section");
const resultsSection = document.getElementById("results-section");
const spellingInput = document.getElementById("spelling-input");
const feedbackArea = document.getElementById("feedback-area");
const wordIndexSpan = document.getElementById("word-index");
const wordTotalSpan = document.getElementById("word-total");

document.querySelectorAll(".accent-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".accent-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    accent = btn.dataset.accent;
  });
});

document.getElementById("add-words-btn").addEventListener("click", () => {
  const text = document.getElementById("words-textarea").value.trim();
  if (!text) return alert("Please enter some words.");
  words = text.split(/[\s,]+/).filter(Boolean);
  alert(`${words.length} words added!`);
});

document.getElementById("start-button").addEventListener("click", async () => {
  if (words.length === 0) {
    try {
      const res = await fetch("/data/oet.json");
      words = await res.json();
    } catch {
      words = ["diagnosis", "therapy", "abdomen", "stethoscope", "injection"];
    }
  }

  setupSection.style.display = "none";
  gameSection.style.display = "block";
  wordTotalSpan.textContent = words.length;
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
}

document.getElementById("submit-btn").addEventListener("click", () => {
  const answer = spellingInput.value.trim().toLowerCase();
  if (!answer) return;
  checkSpelling(answer);
});

function checkSpelling(answer) {
  const correct = words[currentIndex].toLowerCase();
  if (answer === correct) {
    feedbackArea.innerHTML = `<p class="correct">✅ Correct: ${correct}</p>`;
    score++;
  } else {
    feedbackArea.innerHTML = `<p class="incorrect">❌ ${answer} → ${correct}</p>`;
  }
  feedbackArea.scrollIntoView({ behavior: "smooth" });
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
    <p>Great job! Keep practicing daily.</p>
  `;
}

document.getElementById("restart-btn").addEventListener("click", () => {
  currentIndex = 0;
  score = 0;
  resultsSection.style.display = "none";
  setupSection.style.display = "block";
});
