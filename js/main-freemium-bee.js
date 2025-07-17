// main-freemium.js (Updated with enhanced logic)

let words = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];

const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startButton");
const nextButton = document.getElementById("nextButton");
const speakButton = document.getElementById("speakButton");
const summaryDiv = document.getElementById("summary");

startButton.addEventListener("click", () => {
  fetch("js/oet_word_list.js")
    .then(res => res.text())
    .then(data => {
      words = data.split(/\r?\n/).filter(w => w.trim());
      startSession();
    })
    .catch(() => alert("❌ Failed to load OET words."));
});

nextButton.addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < words.length) {
    speakWord(words[currentIndex]);
  } else {
    showSummary();
  }
});

speakButton.addEventListener("click", () => {
  if (words[currentIndex]) speakWord(words[currentIndex]);
});

function startSession() {
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  speakWord(words[0]);
}

function speakWord(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accentSelect.value;
  utterance.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function showSummary() {
  const percent = Math.round((correctCount / words.length) * 100);
  summaryDiv.innerHTML = `
    <div class="word-box">
      <h3>Practice Summary</h3>
      <p><strong>Total:</strong> ${words.length}</p>
      <p><strong>Correct:</strong> ${correctCount}</p>
      <p><strong>Score:</strong> ${percent}%</p>
      <button onclick="location.reload()" class="btn btn-info">🔄 Try Again</button>
    </div>
  `;
}
