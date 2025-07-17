// main-freemium.js

import { oetWords } from './oet_word_list.js';
const examSelect = document.getElementById('examSelect');
const startButton = document.getElementById('startExamBtn');
const checkButton = document.getElementById('checkSpellingBtn');
const nextButton = document.getElementById('nextWordBtn');
const userInput = document.getElementById('userInput');
const ttsSelect = document.getElementById('voiceSelect');
const wordDisplay = document.getElementById('wordDisplay');
const feedback = document.getElementById('feedback');
const notification = document.getElementById('notification');

let currentWordIndex = 0;
let currentVoice = null;

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

function populateVoices() {
  const voices = window.speechSynthesis.getVoices();
  ttsSelect.innerHTML = '';
  voices.forEach(voice => {
    if (voice.lang.includes('en-US') || voice.lang.includes('en-GB')) {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      ttsSelect.appendChild(option);
    }
  });
}

function speakWord(word) {
  if (!currentVoice) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.voice = currentVoice;
  window.speechSynthesis.speak(utterance);
}

function loadNextWord() {
  if (currentWordIndex >= oetWords.length) {
    showNotification("You've completed all the words!");
    return;
  }
  const word = oetWords[currentWordIndex];
  wordDisplay.textContent = `Word #${currentWordIndex + 1}`;
  userInput.value = '';
  speakWord(word);
}

function checkSpelling() {
  const input = userInput.value.trim().toLowerCase();
  const correct = oetWords[currentWordIndex].toLowerCase();
  if (input === correct) {
    feedback.textContent = '✅ Correct!';
    feedback.style.color = 'green';
  } else {
    feedback.textContent = `❌ Incorrect. Correct: ${correct}`;
    feedback.style.color = 'red';
  }
}

startButton.addEventListener('click', () => {
  currentWordIndex = 0;
  loadNextWord();
});

checkButton.addEventListener('click', () => {
  checkSpelling();
});

nextButton.addEventListener('click', () => {
  currentWordIndex++;
  loadNextWord();
});

ttsSelect.addEventListener('change', () => {
  const selected = ttsSelect.value;
  currentVoice = window.speechSynthesis.getVoices().find(v => v.name === selected);
});

examSelect.addEventListener('change', () => {
  if (examSelect.value !== 'OET') {
    showNotification('🔒 Only OET is available in Freemium. Upgrade for more options.');
    examSelect.value = 'OET';
  }
});

window.speechSynthesis.onvoiceschanged = populateVoices;
window.addEventListener('DOMContentLoaded', () => {
  populateVoices();
  currentVoice = speechSynthesis.getVoices().find(v => v.lang.includes('en')) || null;
});
