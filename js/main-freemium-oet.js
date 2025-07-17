// main-premium.js (Enhanced with Analytics)

let words = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];
let mode = "";

const examSelect = document.getElementById("examSelect");
const accentSelect = document.getElementById("accentSelect");
const fileUpload = document.getElementById("fileUpload");
const startButton = document.getElementById("startButton");
const nextButton = document.getElementById("nextButton");
const speakButton = document.getElementById("speakButton");
const summaryDiv = document.getElementById("summary");

// Display selected file name
fileUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  if (file) {
    alert(`📄 File selected: ${file.name}`);
    reader.onload = function (e) {
      words = e.target.result.split(/\r?\n/).map(w => w.trim()).filter(w => w);
      alert("✅ Custom words loaded. Choose 'Custom' to begin.");
    };
    reader.readAsText(file);
  }
});

startButton.addEventListener("click", () => {
  const exam = examSelect.value;
  if (!exam) return alert("Please select an exam type.");
  mode = exam;

  if (typeof gtag === 'function') {
    gtag('event', 'start_exam', { exam });
  }

  if (exam === "OET") {
    fetch("js/oet_word_list.js")
      .then(res => res.text())
      .then(data => {
        words = data.split(/\r?\n/).filter(w => w.trim());
        startSession();
      })
      .catch(err => alert("❌ Failed to load OET words."));
  } else if (exam === "SpellingBee") {
    words = ["articulate", "pharaoh", "onomatopoeia", "surveillance"];
    startSession();
  } else if (exam === "Custom") {
    if (words.length === 0) {
      alert("⚠️ Please upload a custom word list.");
      return;
    }
    startSession();
  }
});

nextButton.addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < words.length) {
    speakWord(words[currentIndex]);
    if (mode === "SpellingBee") listenSpelling(words[currentIndex]);
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
  if (mode === "SpellingBee") listenSpelling(words[0]);
}

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

    if (spoken === correct) {
      correctCount++;
      alert("✅ Correct!");
    } else {
      incorrectWords.push({ word: correctWord, heard: spoken });
      alert(`❌ Incorrect. You said: ${spoken}`);
    }

    if (typeof gtag === 'function') {
      gtag('event', 'word_checked', {
        word: correctWord,
        correct: spoken === correct,
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
      exam: mode,
      score: percent,
      totalWords: words.length,
      correctCount
    });
  }

  summaryDiv.innerHTML = `
    <div class="word-box">
      <h3>Premium Session Summary</h3>
      <p><strong>Total:</strong> ${words.length}</p>
      <p><strong>Correct:</strong> ${correctCount}</p>
      <p><strong>Score:</strong> ${percent}%</p>
      ${
        incorrectWords.length
          ? `<h4>Incorrect Words</h4><ul>${incorrectWords.map(w => `<li><strong>${w.word}</strong> – You said: <em>${w.heard}</em></li>`).join('')}</ul>`
          : `<p>🎉 No mistakes. Excellent work!</p>`
      }
      <button onclick="location.reload()" class="btn btn-info">🔄 Start New Session</button>
    </div>
  `;
}
