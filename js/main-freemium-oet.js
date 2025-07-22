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
  document.getElementById('practiceModeBtn').style.fontWeight = !testMode ? 'bold' : '';
  document.getElementById('testModeBtn').style.fontWeight = testMode ? 'bold' : '';
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
    <h3>Word ${currentIndex + 1} / ${words.length}</h3>
    <button id="speakBtn">🔊 Speak</button>
    <input type="text" id="userInput" placeholder="Type what you heard..." autofocus>
    <button id="checkBtn">Check</button>
    <button id="prevBtn" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
    <button id="nextBtn" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
    <button id="flagBtn" style="color:${flaggedWords.includes(word) ? "orange" : "gray"};">
      ${flaggedWords.includes(word) ? "🚩Flagged" : "Flag Word"}
    </button>
    <div id="feedback" style="margin-top:1em;"></div>
  `;
  document.getElementById('speakBtn').onclick = () => speakWord(word);
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
  const input = document.getElementById('userInput').value.trim();
  const feedbackDiv = document.getElementById('feedback');
  if (!input) {
    feedbackDiv.textContent = "Please enter your answer!";
    feedbackDiv.style.color = "red";
    return;
  }
  if (input.toLowerCase() === word.toLowerCase()) {
    feedbackDiv.textContent = "Correct!";
    feedbackDiv.style.color = "green";
    score++;
  } else {
    feedbackDiv.textContent = `Incorrect. The word was: ${word}`;
    feedbackDiv.style.color = "red";
  }
  setTimeout(() => {
    if (currentIndex < words.length-1) {
      currentIndex++;
      showWord();
    } else {
      endSession();
    }
  }, 1100);
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
    ${flaggedWords.length ? `<button id="practiceFlaggedBtn">Practice Flagged Words (${flaggedWords.length})</button>` : ""}
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
