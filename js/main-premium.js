// main-premium.js

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

startButton.addEventListener("click", () => {
  const exam = examSelect.value;
  mode = exam;

  if (exam === "OET") {
    fetch("js/oet_word_list.js")
      .then(res => res.text())
      .then(data => {
        words = data.split(/\r?\n/).filter(w => w.trim());
        startSession();
      });
  } else if (exam === "SpellingBee") {
    words = ["articulate", "pharaoh", "onomatopoeia", "surveillance"];
    startSession();
  } else if (exam === "Custom") {
    if (words.length === 0) {
      alert("Please upload a custom word list.");
      return;
    }
    startSession();
  }
});

fileUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    words = e.target.result.split(/\r?\n/).map(w => w.trim()).filter(w => w);
    alert("Custom words loaded. Choose 'Custom' to begin.");
  };
  reader.readAsText(file);
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
  speechSynthesis.speak(utterance);
}

function listenSpelling(correctWord) {
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
  };

  recognition.onerror = () => alert("Speech recognition error.");
}

function showSummary() {
  const percent = Math.round((correctCount / words.length) * 100);
  summaryDiv.innerHTML = `
    <h3>Premium Session Summary</h3>
    <p>Total: ${words.length}</p>
    <p>Correct: ${correctCount}</p>
    <p>Score: ${percent}%</p>
    ${
      incorrectWords.length
        ? `<ul>${incorrectWords.map(w => `<li>${w.word} - You said: ${w.heard}</li>`).join('')}</ul>`
        : `<p>No mistakes. Excellent!</p>`
    }
  `;
}
