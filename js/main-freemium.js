// js/main-freemium.js

import { speakWord, setVoiceOptions } from './tts.js';
import { listenAndCheckSpelling } from './stt.js';
import { checkSpelling } from './spelling-check.js';
import { showNotification, toggleDarkMode, handleUpgradeClick } from './ui-utils.js';
import { loadOETWords } from './exam-loader.js';

let currentWord = '';
let currentIndex = 0;
let wordList = [];

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-btn').addEventListener('click', startSpelling);
  document.getElementById('hear-btn').addEventListener('click', () => speakWord(currentWord));
  document.getElementById('check-btn').addEventListener('click', checkAnswer);
  document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
  document.getElementById('upgrade-btn').addEventListener('click', handleUpgradeClick);
  setVoiceOptions();
  initExam();
});

function initExam() {
  wordList = loadOETWords();
  currentIndex = 0;
  currentWord = wordList[currentIndex];
  speakWord(currentWord);
}

function startSpelling() {
  listenAndCheckSpelling((spokenText) => {
    document.getElementById('user-input').value = spokenText;
  });
}

function checkAnswer() {
  const userInput = document.getElementById('user-input').value.trim();
  const result = checkSpelling(currentWord, userInput);
  showNotification(result.correct ? 'Correct!' : `Incorrect. The correct word was: ${currentWord}`);
  if (++currentIndex < wordList.length) {
    currentWord = wordList[currentIndex];
    document.getElementById('user-input').value = '';
    speakWord(currentWord);
  } else {
    showNotification('Exam completed. Great job!');
  }
}
