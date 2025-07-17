// main-freemium.js

import { oetWords } from "./oet_word_list.js";

let currentWordIndex = 0;
let currentAccent = "en-US";
let recognition;

const accentSelect = document.getElementById("accentSelect");
const startBtn = document.getElementById("startBtn");
const hearBtn = document.getElementById("hearBtn");
const checkBtn = document.getElementById("checkBtn");
const inputField = document.getElementById("spellingInput");
const resultMsg = document.getElementById("resultMsg");
const darkModeBtn = document.getElementById("darkModeBtn");

function speakWord(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = currentAccent;
  speechSynthesis.speak(utterance);
}

function getCurrentWord() {
  return oetWords[currentWordIndex];
}

function showResult(correct) {
  resultMsg.textContent = correct ? "Correct!" : `Incorrect. The word was: ${getCurrentWord()}`;
  resultMsg.style.color = correct ? "green" : "red";
}

function checkSpelling() {
  const userSpelling = inputField.value.trim().toLowerCase();
  const correctSpelling = getCurrentWord().toLowerCase();
  const isCorrect = userSpelling === correctSpelling;
  showResult(isCorrect);
  currentWordIndex = (currentWordIndex + 1) % oetWords.length;
  inputField.value = "";
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function initRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = currentAccent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    inputField.value = event.results[0][0].transcript;
  };
}

// Event Listeners
hearBtn.addEventListener("click", () => speakWord(getCurrentWord()));
checkBtn.addEventListener("click", checkSpelling);
startBtn.addEventListener("click", () => recognition.start());
darkModeBtn.addEventListener("click", toggleDarkMode);
accentSelect.addEventListener("change", (e) => {
  currentAccent = e.target.value;
  recognition.lang = currentAccent;
});

// Initialize
initRecognition();
speakWord(getCurrentWord());
