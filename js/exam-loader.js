let words = [];
let currentWord = "";
let correct = 0;
let wrong = 0;

function loadExam() {
  const mode = document.getElementById("exam-select").value;
  correct = 0;
  wrong = 0;
  document.getElementById("correct-count").textContent = "0";
  document.getElementById("wrong-count").textContent = "0";

  if (mode === "oet") {
    words = [...oetWords]; // Use all 24 OET words
  } else if (mode === "spellingbee") {
    words = [...oetWords]; // Can be any list or replaced with beeWords
  } else if (mode === "custom") {
    const input = document.getElementById("customWords").value.trim();
    words = input ? input.split(/\n+/).map(w => w.trim()).filter(w => w) : [];
  }

  if (words.length === 0) {
    alert("No words found for this mode.");
    return;
  }

  nextWord();
}

function nextWord() {
  if (words.length === 0) return;
  currentWord = words[Math.floor(Math.random() * words.length)];
  speakWord();
}
