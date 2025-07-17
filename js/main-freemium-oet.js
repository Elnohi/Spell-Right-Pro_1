// main-freemium-oet.js (with Analytics)

let words = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];
let mode = "OET";

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

      if (typeof gtag === 'function') {
        gtag('event', 'start_exam', {
          exam: 'OET',
          variant: 'freemium'
        });
      }
    })
    .catch(err => alert("❌ Failed to load OET words."));
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

function checkAnswer(userInput) {
  const correct = words[currentIndex].toLowerCase();
  const input = userInput.toLowerCase();

  if (input === correct) {
    correctCount++;
    alert("✅ Correct!");
  } else {
    incorrectWords.push({ word: words[currentIndex], typed: input });
    alert(`❌ Incorrect. Correct: ${correct}`);
  }

  if (typeof gtag === 'function') {
    gtag('event', 'word_checked', {
      word: words[currentIndex],
      correct: input === correct,
      typed: input
    });
  }
}

function showSummary() {
  const percent = Math.round((correctCount / words.length) * 100);

  if (typeof gtag === 'function') {
    gtag('event', 'session_complete', {
      exam: 'OET',
      variant: 'freemium',
      score: percent,
      totalWords: words.length,
      correctCount
    });
  }

  summaryDiv.innerHTML = `
    <div class="word-box">
      <h3>Freemium Session Summary</h3>
      <p><strong>Total:</strong> ${words.length}</p>
      <p><strong>Correct:</strong> ${correctCount}</p>
      <p><strong>Score:</strong> ${percent}%</p>
      ${
        incorrectWords.length
          ? `<h4>Incorrect Words</h4><ul>${incorrectWords.map(w => `<li><strong>${w.word}</strong> – You typed: <em>${w.typed}</em></li>`).join('')}</ul>`
          : `<p>🎉 No mistakes. Great job!</p>`
      }
      <button onclick="location.reload()" class="btn btn-info">🔄 Start Over</button>
    </div>
  `;
}
