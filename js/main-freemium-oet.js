// main-freemium-oet.js
let words = [];
let currentIndex = 0;
let score = 0;
let userAnswers = [];
let sessionMode = "practice"; // "practice" or "test"
let flaggedWords = [];
let usedCustomListToday = false;

const accentSelect = document.getElementById('accent-select');
const flagSVG = document.getElementById('flag-svg');
const practiceBtn = document.getElementById('practice-mode-btn');
const testBtn = document.getElementById('test-mode-btn');
const startBtn = document.getElementById('start-btn');
const customInput = document.getElementById('custom-words');
const addCustomBtn = document.getElementById('add-custom-btn');
const fileInput = document.getElementById('file-input');
const trainerArea = document.getElementById('trainer-area');
const summaryArea = document.getElementById('summary-area');

const flagSVGs = {
  "en-US": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#b22234" width="60" height="40"/><g fill="#fff"><rect y="4" width="60" height="4"/><rect y="12" width="60" height="4"/><rect y="20" width="60" height="4"/><rect y="28" width="60" height="4"/><rect y="36" width="60" height="4"/></g><rect width="24" height="16" fill="#3c3b6e"/><g fill="#fff"><g id="s18"><g id="s9"><polygon points="2.5,2.1 3.0,3.5 4.3,3.5 3.2,4.3 3.7,5.7 2.5,4.8 1.3,5.7 1.8,4.3 0.7,3.5 2.0,3.5"/></g><use href="#s9" x="6"/><use href="#s9" x="12"/><use href="#s9" x="18"/><use href="#s9" y="4"/><use href="#s9" x="6" y="4"/><use href="#s9" x="12" y="4"/><use href="#s9" x="18" y="4"/><use href="#s9" y="8"/><use href="#s9" x="6" y="8"/><use href="#s9" x="12" y="8"/><use href="#s9" x="18" y="8"/><use href="#s9" y="12"/><use href="#s9" x="6" y="12"/><use href="#s9" x="12" y="12"/><use href="#s9" x="18" y="12"/></g><use href="#s18" y="2"/></g></svg>`,
  "en-GB": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><path stroke="#fff" stroke-width="6" d="M0,0 L60,40 M60,0 L0,40"/><path stroke="#cf142b" stroke-width="4" d="M0,0 L60,40 M60,0 L0,40"/><rect x="25" width="10" height="40" fill="#fff"/><rect y="15" width="60" height="10" fill="#fff"/><rect x="27" width="6" height="40" fill="#cf142b"/><rect y="17" width="60" height="6" fill="#cf142b"/></svg>`
};

function updateFlag() {
  flagSVG.innerHTML = flagSVGs[accentSelect.value] || "";
}
accentSelect.addEventListener('change', updateFlag);
updateFlag();

practiceBtn.onclick = () => {
  sessionMode = "practice";
  practiceBtn.classList.add("selected");
  testBtn.classList.remove("selected");
};

testBtn.onclick = () => {
  sessionMode = "test";
  testBtn.classList.add("selected");
  practiceBtn.classList.remove("selected");
};

addCustomBtn.onclick = () => {
  if (usedCustomListToday) {
    alert("Only one custom list per day in freemium.");
    return;
  }
  let input = customInput.value.trim();
  let customWords = input.split(/[\s,;]+/).map(w => w.trim()).filter(w => w);
  if (customWords.length === 0) {
    alert("Paste or type custom words!");
    return;
  }
  words = customWords;
  usedCustomListToday = true;
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  currentIndex = 0; score = 0; userAnswers = [];
  startSession();
};

fileInput.onchange = async (e) => {
  if (usedCustomListToday) {
    alert("Only one custom list per day in freemium.");
    return;
  }
  let file = e.target.files[0];
  if (!file) return;
  let text = "";
  if (file.type === "text/plain") {
    text = await file.text();
  } else {
    alert("Only .txt files supported in freemium.");
    return;
  }
  let customWords = text.split(/[\s,;]+/).map(w => w.trim()).filter(w => w);
  words = customWords;
  usedCustomListToday = true;
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  currentIndex = 0; score = 0; userAnswers = [];
  startSession();
};

startBtn.onclick = () => {
  if (!usedCustomListToday) {
    words = window.oetWords.slice();
  }
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  currentIndex = 0; score = 0; userAnswers = [];
  startSession();
};

function startSession() {
  if (!words || words.length === 0) {
    trainerArea.innerHTML = "<p>No words loaded.</p>";
    return;
  }
  showWord();
}

function showWord() {
  if (currentIndex >= words.length) {
    showSummary();
    return;
  }
  let word = words[currentIndex];
  trainerArea.innerHTML = `
    <h3>Word ${currentIndex + 1} / ${words.length}</h3>
    <button id="speak-btn" class="btn btn-primary">🔊 Speak</button>
    <input type="text" id="user-input" class="form-control" autofocus placeholder="Type what you heard...">
    <button id="check-btn" class="btn btn-success">Check</button>
    <button id="next-btn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
    <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
      <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
    </button>
    <div id="feedback" style="margin-top:1em;"></div>
  `;
  document.getElementById('speak-btn').onclick = () => speakWord(word);
  document.getElementById('check-btn').onclick = () => {
    let userInput = document.getElementById('user-input').value.trim();
    userAnswers[currentIndex] = userInput;
    let feedback = document.getElementById('feedback');
    if (sessionMode === "practice") {
      if (userInput.toLowerCase() === word.toLowerCase()) {
        feedback.textContent = "Correct!";
        feedback.style.color = "#28a745";
        score++;
      } else {
        feedback.textContent = `Incorrect. Correct: "${word}"`;
        feedback.style.color = "#dc3545";
      }
    }
    if (sessionMode === "test") {
      score += (userInput.toLowerCase() === word.toLowerCase()) ? 1 : 0;
      currentIndex++;
      showWord();
    }
  };
  document.getElementById('next-btn').onclick = () => {
    currentIndex++;
    showWord();
  };
  document.getElementById('flag-btn').onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    showWord();
  };
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  let utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value;
  window.speechSynthesis.speak(utter);
}

function showSummary() {
  let percent = Math.round((score / words.length) * 100);
  let wrongWords = [];
  words.forEach((w, i) => {
    if ((userAnswers[i] || "").toLowerCase() !== w.toLowerCase()) wrongWords.push(w);
  });
  summaryArea.innerHTML = `
    <h3>Session Complete!</h3>
    <p>Your score: <b>${score}</b> / ${words.length} (<b>${percent}%</b>)</p>
    ${flaggedWords.length ? `<div><b>Flagged Words:</b><ul>${flaggedWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
    ${wrongWords.length ? `<div><b>Wrong Words:</b><ul>${wrongWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
  `;
}
