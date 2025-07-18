// main-freemium-oet.js (Updated with fixed button logic and improved layout)

let words = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectWords = [];
let flaggedWords = [];
let previousIndexes = [];
let mode = "";

const trainer = document.getElementById("trainer");
const summaryDiv = document.getElementById("scoreDisplay");
const accentSelect = document.getElementById("accentSelect");
const synth = window.speechSynthesis;

function presentWord() {
  trainer.innerHTML = "";
  const word = words[currentIndex];

  const box = document.createElement("div");
  box.className = "word-box";

  const title = document.createElement("h3");
  title.textContent = `Word ${currentIndex + 1} of ${words.length}`;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type what you heard...";
  input.addEventListener("keypress", e => e.key === "Enter" && check());

  const status = document.createElement("div");
  status.className = "status";
  status.style.margin = "10px 0";

  const checkBtn = document.createElement("button");
  checkBtn.textContent = "Check";
  checkBtn.className = "btn btn-success";
  checkBtn.onclick = check;

  const speakBtn = document.createElement("button");
  speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speak Again';
  speakBtn.className = "btn btn-info";
  speakBtn.onclick = () => speak(word);

  const flagBtn = document.createElement("button");
  flagBtn.className = flaggedWords.includes(currentIndex) ? "btn btn-warning" : "btn";
  flagBtn.innerHTML = flaggedWords.includes(currentIndex)
    ? '<i class="fas fa-flag"></i> Unflag'
    : '<i class="far fa-flag"></i> Flag';
  flagBtn.onclick = () => {
    const i = flaggedWords.indexOf(currentIndex);
    if (i === -1) flaggedWords.push(currentIndex);
    else flaggedWords.splice(i, 1);
    presentWord();
  };

  const backBtn = document.createElement("button");
  backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
  backBtn.className = "btn";
  backBtn.disabled = previousIndexes.length === 0;
  backBtn.onclick = () => {
    if (previousIndexes.length > 0) {
      currentIndex = previousIndexes.pop();
      presentWord();
    }
  };

  const nextBtn = document.createElement("button");
  nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Next';
  nextBtn.className = "btn";
  nextBtn.onclick = () => {
    previousIndexes.push(currentIndex);
    currentIndex++;
    if (currentIndex < words.length) presentWord();
    else showScore();
  };

  const controls = document.createElement("div");
  controls.className = "controls";
  controls.style.display = "flex";
  controls.style.gap = "10px";
  controls.style.marginTop = "15px";
  controls.append(backBtn, flagBtn, nextBtn);

  function check() {
    const typed = input.value.trim().toLowerCase();
    const correct = word.toLowerCase();

    if (typed === correct) {
      status.textContent = "✅ Correct!";
      status.className = "status correct";
      correctCount++;
    } else {
      status.textContent = `❌ Incorrect. The correct spelling is: ${word}`;
      status.className = "status incorrect";
      incorrectWords.push({ word, typed });
    }
  }

  box.append(title, speakBtn, document.createElement("br"), input, checkBtn, status, controls);
  trainer.appendChild(box);
  setTimeout(() => speak(word), 500);
  input.focus();
}

function speak(text) {
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = accentSelect.value;
  utterance.rate = 0.9;
  utterance.volume = 1;
  const voices = synth.getVoices();
  const accentVoice = voices.find(v => v.lang === accentSelect.value) || voices[0];
  if (accentVoice) utterance.voice = accentVoice;
  synth.speak(utterance);
}

function showScore() {
  const percent = Math.round((correctCount / words.length) * 100);
  let scoreColor = "#28a745";
  if (percent < 50) scoreColor = "#dc3545";
  else if (percent < 75) scoreColor = "#ffc107";

  summaryDiv.innerHTML = `
    <div class="word-box">
      <h2 style="color: ${scoreColor}">Test Complete</h2>
      <p>You scored <strong style="color: ${scoreColor}">${correctCount}</strong> out of ${words.length} (<strong style="color: ${scoreColor}">${percent}%</strong>)</p>
      ${
        incorrectWords.length
          ? `<h3>Incorrect Words</h3><ul style="text-align: left;">${incorrectWords.map(w => `<li><strong>${w.word}</strong> – You typed: <em>${w.typed}</em></li>`).join('')}</ul>`
          : `<p>🎉 No mistakes. Excellent work!</p>`
      }
      ${
        flaggedWords.length
          ? `<h3>Flagged Words</h3><ul style="text-align: left;">${flaggedWords.map(i => `<li>${words[i]}</li>`).join('')}</ul>`
          : ''
      }
      <button onclick="location.reload()" class="btn btn-info mt-2">
        <i class="fas fa-redo"></i> Start New Session
      </button>
    </div>
  `;
}
