// main-freemium-oet.js (Improved Navigation & Button Logic)

let words = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];
let flaggedIndexes = [];
let historyStack = [];
let mode = "";

const trainer = document.getElementById("trainer");
const examSelect = document.getElementById("examSelect");
const accentSelect = document.getElementById("accentSelect");
const startPracticeBtn = document.getElementById("startPractice");
const startTestBtn = document.getElementById("startTest");
const fileInput = document.getElementById("fileInput");
const wordInput = document.getElementById("wordInput");
const summaryDiv = document.getElementById("scoreDisplay");

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = accentSelect.value;
  utter.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function resetSession() {
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  flaggedIndexes = [];
  historyStack = [];
  summaryDiv.innerHTML = "";
}

function presentWord() {
  const word = words[currentIndex];
  if (!word) return;

  trainer.innerHTML = "";

  const box = document.createElement("div");
  box.className = "word-box";

  const title = document.createElement("h3");
  title.textContent = `Word ${currentIndex + 1} of ${words.length}`;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type the word you hear...";
  input.addEventListener("keypress", (e) => e.key === "Enter" && check());

  const status = document.createElement("div");
  status.className = "status";

  const checkBtn = document.createElement("button");
  checkBtn.className = "btn btn-success";
  checkBtn.textContent = "Check";
  checkBtn.onclick = check;

  const speakBtn = document.createElement("button");
  speakBtn.className = "btn btn-info";
  speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speak Again';
  speakBtn.onclick = () => speak(word);

  const flagBtn = document.createElement("button");
  flagBtn.className = flaggedIndexes.includes(currentIndex) ? "btn btn-warning" : "btn";
  flagBtn.innerHTML = flaggedIndexes.includes(currentIndex) ? '<i class="fas fa-flag"></i> Unflag' : '<i class="far fa-flag"></i> Flag';
  flagBtn.onclick = () => {
    const i = flaggedIndexes.indexOf(currentIndex);
    if (i === -1) flaggedIndexes.push(currentIndex);
    else flaggedIndexes.splice(i, 1);
    presentWord();
  };

  const backBtn = document.createElement("button");
  backBtn.className = "btn";
  backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
  backBtn.disabled = historyStack.length === 0;
  backBtn.onclick = () => {
    if (historyStack.length > 0) {
      currentIndex = historyStack.pop();
      presentWord();
    }
  };

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn";
  nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Next';
  nextBtn.onclick = () => {
    historyStack.push(currentIndex);
    currentIndex++;
    if (currentIndex < words.length) presentWord();
    else showSummary();
  };

  const controls = document.createElement("div");
  controls.className = "form-row";
  controls.append(backBtn, flagBtn, nextBtn);

  box.append(title, speakBtn, input, checkBtn, status, controls);
  trainer.appendChild(box);
  input.focus();

  setTimeout(() => speak(word), 300);

  function check() {
    const typed = input.value.trim().toLowerCase();
    const correct = word.toLowerCase();
    if (typed === correct) {
      status.textContent = "✔️ Correct!";
      status.className = "status correct";
      correctCount++;
    } else {
      status.textContent = `✖️ Incorrect. The correct spelling is: ${word}`;
      status.className = "status incorrect";
      incorrectWords.push({ word, typed });
    }
    setTimeout(() => nextBtn.click(), 1200);
  }
}

function showSummary() {
  const percent = Math.round((correctCount / words.length) * 100);
  let color = percent >= 80 ? "green" : percent >= 50 ? "orange" : "red";

  summaryDiv.innerHTML = `
    <div class="word-box">
      <h3 style="color:${color}">Session Complete</h3>
      <p><strong>Total:</strong> ${words.length}</p>
      <p><strong>Correct:</strong> ${correctCount}</p>
      <p><strong>Score:</strong> ${percent}%</p>
      ${
        incorrectWords.length > 0
          ? `<h4>Incorrect Words:</h4><ul>${incorrectWords.map(w => `<li>${w.word} (You typed: ${w.typed})</li>`).join('')}</ul>`
          : `<p>No mistakes. Well done! 🎉</p>`
      }
      ${
        flaggedIndexes.length > 0
          ? `<h4>Flagged Words:</h4><ul>${flaggedIndexes.map(i => `<li>${words[i]}</li>`).join('')}</ul>`
          : ""
      }
      <button onclick="location.reload()" class="btn btn-info">🔁 Start New Session</button>
    </div>
  `;
}

startPracticeBtn.addEventListener("click", () => {
  if (!words.length) return alert("Please load words first");
  mode = "practice";
  resetSession();
  presentWord();
});

startTestBtn.addEventListener("click", () => {
  if (!words.length) return alert("Please load words first");
  mode = "test";
  words = shuffle([...words]).slice(0, 24);
  resetSession();
  presentWord();
});

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
