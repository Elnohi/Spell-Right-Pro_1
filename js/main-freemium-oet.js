import { oetWords } from './oet_word_list.js';

let words = [];
let currentIndex = 0;
let isTestMode = false;
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsOET')) || [];
let score = 0;

const trainerDiv = document.getElementById('trainer');
const scoreDiv = document.getElementById('scoreDisplay');
const accentSelect = document.getElementById('accentSelect');
const accentFlag = document.getElementById('accentFlag');

document.getElementById('practiceModeBtn').onclick = () => setMode(false);
document.getElementById('testModeBtn').onclick = () => setMode(true);

function setMode(testMode) {
  isTestMode = testMode;
  document.getElementById('practiceModeBtn').classList.toggle('active-mode', !testMode);
  document.getElementById('testModeBtn').classList.toggle('active-mode', testMode);
}

accentSelect.onchange = function() {
  const map = { "en-US": "us", "en-GB": "gb", "en-AU": "au" };
  accentFlag.src = `assets/flags/${map[accentSelect.value] || "us"}.png`;
};

document.getElementById('startOET').onclick = () => {
  words = isTestMode ? getRandomWords(oetWords, 24) : [...oetWords];
  if (!words.length) {
    alert("No OET words found!");
    return;
  }
  currentIndex = 0;
  score = 0;
  scoreDiv.innerHTML = '';
  showWord();
};

function showWord() {
  const word = words[currentIndex];
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${words.length}</h3>
      <input type="text" id="userInput" class="form-control" placeholder="Type what you heard..." autofocus>
      <button id="checkBtn" class="btn btn-success">Check</button>
      <button id="prevBtn" class="btn btn-outline-primary" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
      <button id="nextBtn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <div id="feedback" style="margin-top:1em;"></div>
    </div>
  `;
  // Speak the word immediately
  setTimeout(() => speakWord(word), 350);
  // Focus input when ready
  setTimeout(() => {
    const input = document.getElementById('userInput');
    if (input) input.focus();
  }, 700);

  document.getElementById('checkBtn').onclick = () => checkWord(word);
  document.getElementById('userInput').onkeypress = (e) => { if (e.key === "Enter") checkWord(word); };
  document.getElementById('nextBtn').onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showWord(); }};
  document.getElementById('prevBtn').onclick = () => { if (currentIndex > 0) { currentIndex--; showWord(); }};
  document.getElementById('flagBtn').onclick = () => toggleFlag(word);
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value || 'en-US';
  window.speechSynthesis.speak(utter);
}

function checkWord(word) {
  const inputElem = document.getElementById('userInput');
  if (!inputElem) return;
  const input = inputElem.value.trim();
  const feedbackDiv = document.getElementById('feedback');
  if (!input) {
    feedbackDiv.textContent = "Please enter your answer!";
    feedbackDiv.style.color = "#dc3545";
    inputElem.focus();
    return;
  }
  if (input.toLowerCase() === word.toLowerCase()) {
    feedbackDiv.textContent = "Correct!";
    feedbackDiv.style.color = "#28a745";
    score++;
  } else {
    feedbackDiv.textContent = `Incorrect. The word was: ${word}`;
    feedbackDiv.style.color = "#dc3545";
  }
  // After feedback, auto-advance after 1.2s
  setTimeout(() => {
    if (currentIndex < words.length-1) {
      currentIndex++;
      showWord();
    } else {
      endSession();
    }
  }, 1200);
}

function toggleFlag(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  localStorage.setItem('flaggedWordsOET', JSON.stringify(flaggedWords));
  showWord();
}

function endSession() {
  trainerDiv.innerHTML = "";
  scoreDiv.innerHTML = `<h3>Session Complete!</h3>
    <p>Your score: ${score}/${words.length}</p>
    ${flaggedWords.length ? `<button id="practiceFlaggedBtn" class="btn btn-info">Practice Flagged Words (${flaggedWords.length})</button>` : ""}
  `;
  if (flaggedWords.length) {
    document.getElementById('practiceFlaggedBtn').onclick = () => {
      words = [...flaggedWords];
      currentIndex = 0; score = 0;
      showWord();
      scoreDiv.innerHTML = '';
    };
  }
}

function getRandomWords(list, count) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, count);
}
