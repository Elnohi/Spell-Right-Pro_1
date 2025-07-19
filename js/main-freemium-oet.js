import { initializeFirebase, initThemeToggle, speak, showNotification, setupFileUpload } from './common.js';

// Initialize Firebase
const firebase = initializeFirebase();

// DOM Elements
const accentSelect = document.getElementById('accentSelect');
const accentFlag = document.getElementById('accentFlag');
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
let correctCount = 0;
let incorrectWords = [];
let isTestMode = false;

// Initialize
initThemeToggle();

// Event Listeners
accentSelect.addEventListener('change', updateFlag);
startSessionBtn.addEventListener('click', startSession);
prevWordBtn.addEventListener('click', showPreviousWord);
nextWordBtn.addEventListener('click', showNextWord);
practiceModeBtn.addEventListener('click', () => setMode(false));
testModeBtn.addEventListener('click', () => setMode(true));

// Functions
function updateFlag() {
  const countryCode = accentSelect.value.split('-')[1].toLowerCase();
  accentFlag.src = `assets/flags/${countryCode}.png`;
}

function setMode(testMode) {
  isTestMode = testMode;
  practiceModeBtn.classList.toggle('active-mode', !testMode);
  testModeBtn.classList.toggle('active-mode', testMode);
}

function startSession() {
  // Load appropriate word list
  words = isTestMode ? getRandomWords(fullWordList, 24) : fullWordList;
  
  currentIndex = 0;
  correctCount = 0;
  incorrectWords = [];
  
  updateWordCounter();
  presentWord();
}

function presentWord() {
  // Implementation remains similar to previous version
  // but with added navigation controls
}

// ... rest of your existing functions ...

// Initialize flag
updateFlag();
