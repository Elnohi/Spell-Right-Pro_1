// main-freemium-bee.js (Enhanced Freemium Spelling Bee)

const words = [
  "articulate", "pharaoh", "onomatopoeia", "surveillance",
  "metamorphosis", "onomastics", "entrepreneur", "mnemonic"
];

let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];
const accentSelect = document.getElementById("accentSelect");
const startButton = document.getElementById("startTest");
const trainerDiv = document.getElementById("trainer");
const scoreDiv = document.getElementById("scoreDisplay");

startButton.addEventListener("click", () => {
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  speakWord(words[currentIndex]);
  listenAndCheck(words[currentIndex]);
});

function speakWord(word) {
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value;
  utter.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function listenAndCheck(correctWord) {
  if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
    alert("Speech recognition not supported in this browser.");
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = accentSelect.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript.toLowerCase().replace(/\s+/g, "");
    const expected = correctWord.toLowerCase().replace(/\s+/g, "");

    const box = document.createElement("div");
    box.className = "word-box";
    if (spoken === expected) {
      correctCount++;
      box.innerHTML = `✅ <strong>Correct!</strong> You spelled: ${spoken}`;
    } else {
      incorrectWords.push({ word: correctWord, heard: spoken });
      box.innerHTML = `❌ <strong>Incorrect.</strong> You said: <em>${spoken}</em><br>Correct spelling was: <strong>${correctWord}</strong>`;
    }
    trainerDiv.innerHTML = "";
    trainerDiv.appendChild(box);

    currentIndex++;
    if (currentIndex < words.length) {
      setTimeout(() => {
        trainerDiv.innerHTML = "";
        speakWord(words[currentIndex]);
        listenAndCheck(words[currentIndex]);
      }, 2500);
    } else {
      showScore();
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
    alert("Speech recognition error. Please try again.");
  };
}

function showScore() {
  const percent = Math.round((correctCount / words.length) * 100);
  let color = "#28a745";
  if (percent < 50) color = "#dc3545";
  else if (percent < 75) color = "#ffc107";

  scoreDiv.innerHTML = `
    <div class="word-box">
      <h3 style="color:${color};">Test Completed</h3>
      <p><strong>Total:</strong> ${words.length}</p>
      <p><strong>Correct:</strong> ${correctCount}</p>
      <p><strong>Score:</strong> ${percent}%</p>
      ${
        incorrectWords.length
          ? `<h4>Incorrect Words</h4><ul>${incorrectWords.map(w => `<li><strong>${w.word}</strong> – You said: <em>${w.heard}</em></li>`).join('')}</ul>`
          : `<p>🎉 No mistakes. Excellent spelling!</p>`
      }
      <button onclick="location.reload()" class="btn btn-info">🔁 Try Again</button>
    </div>
  `;
}
