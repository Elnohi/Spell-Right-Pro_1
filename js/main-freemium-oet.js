import { 
  initializeFirebase, 
  initThemeToggle, 
  speak, 
  showNotification 
} from './common.js';

// Initialize Firebase
const firebase = initializeFirebase();

// DOM Elements
const accentSelect = document.getElementById('accentSelect');
const startSessionBtn = document.getElementById('startSession');
const trainerDiv = document.getElementById('trainer');
const prevWordBtn = document.getElementById('prevWord');
const nextWordBtn = document.getElementById('nextWord');
const currentWordPos = document.getElementById('currentWordPos');
const totalWords = document.getElementById('totalWords');
const practiceModeBtn = document.getElementById('practiceModeBtn');
const testModeBtn = document.getElementById('testModeBtn');

// State
let words = [];
let currentIndex = 0;
let isTestMode = false;

// Initialize
initThemeToggle();

// Event Listeners
startSessionBtn.addEventListener('click', startSession);
prevWordBtn.addEventListener('click', showPreviousWord);
nextWordBtn.addEventListener('click', showNextWord);
practiceModeBtn.addEventListener('click', () => setMode(false));
testModeBtn.addEventListener('click', () => setMode(true));

// Functions
function setMode(testMode) {
  isTestMode = testMode;
  practiceModeBtn.classList.toggle('active-mode', !testMode);
  testModeBtn.classList.toggle('active-mode', testMode);
}

function startSession() {
  words = isTestMode ? getRandomWords(fullWordList, 24) : fullWordList;
  currentIndex = 0;
  updateWordCounter();
  presentWord();
}

function presentWord() {
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>${words[currentIndex]}</h3>
      <button id="speakBtn" class="btn btn-primary">
        <i class="fas fa-volume-up"></i> Repeat
      </button>
      <input type="text" id="userInput" placeholder="Type what you heard...">
      <button id="checkBtn" class="btn btn-success">Check</button>
      <div id="feedback"></div>
    </div>
  `;

  document.getElementById('speakBtn').addEventListener('click', () => speakWord());
  document.getElementById('checkBtn').addEventListener('click', checkAnswer);
  
  speakWord();
}

function speakWord() {
  speak(words[currentIndex], accentSelect.value);
}

function checkAnswer() {
  const userInput = document.getElementById('userInput').value;
  const feedbackDiv = document.getElementById('feedback');
  
  if (userInput.toLowerCase() === words[currentIndex].toLowerCase()) {
    feedbackDiv.textContent = "Correct!";
    feedbackDiv.className = "correct";
  } else {
    feedbackDiv.textContent = `Incorrect. The word was: ${words[currentIndex]}`;
    feedbackDiv.className = "incorrect";
  }
  
  nextWordBtn.disabled = false;
}

function showNextWord() {
  currentIndex++;
  updateWordCounter();
  presentWord();
  prevWordBtn.disabled = currentIndex === 0;
}

function showPreviousWord() {
  currentIndex--;
  updateWordCounter();
  presentWord();
  nextWordBtn.disabled = false;
}

function updateWordCounter() {
  currentWordPos.textContent = currentIndex + 1;
  totalWords.textContent = words.length;
  prevWordBtn.disabled = currentIndex === 0;
  nextWordBtn.disabled = currentIndex === words.length - 1;
}

function getRandomWords(wordList, count) {
  return [...wordList].sort(() => 0.5 - Math.random()).slice(0, count);
}

// Word list (would normally import from external file)
const fullWordList = [
  "Articulate", "Pharaoh", "Onomatopoeia", "Surveillance",
  "Metamorphosis", "Onomastics", "Entrepreneur", "Mnemonic"
];
