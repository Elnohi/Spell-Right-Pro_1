// main-freemium-bee.js (with Analytics)

let words = ["articulate", "pharaoh", "onomatopoeia", "surveillance"];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];

const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startButton");
const nextButton = document.getElementById("nextButton");
const speakButton = document.getElementById("speakButton");
const summaryDiv = document.getElementById("summary");

startButton.addEventListener("click", () => {
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  speakWord(words[0]);
  listenSpelling(words[0]);

  if (typeof gtag === 'function') {
    gtag('event', 'start_exam', {
      exam: 'SpellingBee',
      variant: 'freemium'
    });
  }
});

nextButton.addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < words.length) {
    speakWord(words[currentIndex]);
    listenSpelling(words[currentIndex]);
  } else {
    showSummary();
  }
});

speakButton.addEventListener("click", () => {
  if (words[currentIndex]) speakWord(words[currentIndex]);
});

function speakWord(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accentSelect.value;
  utterance.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function listenSpelling(correctWord) {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    alert("⚠️ Speech recognition not supported in this browser.");
    return;
  }
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = accentSelect.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript.toLowerCase().replace(/\s+/g, "");
    const correct = correctWord.toLowerCase().replace(/\s+/g, "");

    const isCorrect = spoken === correct;

    if (isCorrect) {
      correctCount++;
      alert("✅ Correct!");
    } else {
      incorrectWords.push({ word: correctWord, heard: spoken });
      alert(`❌ Incorrect. You said: ${spoken}`);
    }

    if (typeof gtag === 'function') {
      gtag('event', 'word_checked', {
        word: correctWord,
        correct: isCorrect,
        heard: spoken
      });
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
    alert("❌ Speech recognition error occurred.");
  };
}

function showSummary() {
  const percent = Math.round((correctCount / words.length) * 100);

  if (typeof gtag === 'function') {
    gtag('event', 'session_complete', {
      exam: 'SpellingBee',
      variant: 'freemium',
      score: percent,
      totalWords: words.length,
      correctCount
    });
  }

  summaryDiv.innerHTML = `
    <div class="word-box">
      <h3>Freemium Bee Summary</h3>
      <p><strong>Total:</strong> ${words.length}</p>
      <p><strong>Correct:</strong> ${correctCount}</p>
      <p><strong>Score:</strong> ${percent}%</p>
      ${
        incorrectWords.length
          ? `<h4>Incorrect Words</h4><ul>${incorrectWords.map(w => `<li><strong>${w.word}</strong> – You said: <em>${w.heard}</em></li>`).join('')}</ul>`
          : `<p>🎉 Excellent! All correct.</p>`
      }
      <button onclick="location.reload()" class="btn btn-info">🔄 Try Again</button>
    </div>
  `;
}
