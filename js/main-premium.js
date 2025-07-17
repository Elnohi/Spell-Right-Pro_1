import { loadVoices, speakWord, showNotification } from './shared/audio.js';
import { extractWordsFromFile } from './shared/fileHandler.js';
import { oetWords } from './shared/oet_word_list.js';

let wordList = [];
let currentIndex = 0;
let voices = [];

const examSelect = document.getElementById('examSelect');
const voiceSelect = document.getElementById('voiceSelect');
const startBtn = document.getElementById('startExamBtn');
const wordDisplay = document.getElementById('wordDisplay');
const userInput = document.getElementById('userInput');
const checkBtn = document.getElementById('checkSpellingBtn');
const nextBtn = document.getElementById('nextWordBtn');
const fileInput = document.getElementById('fileInput');
const customWordsInput = document.getElementById('customWords');
const feedback = document.getElementById('feedback');

window.speechSynthesis.onvoiceschanged = async () => {
  voices = await loadVoices();
  voiceSelect.innerHTML = voices.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
};

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    wordList = await extractWordsFromFile(file);
    showNotification(`Loaded ${wordList.length} words from file.`);
  }
});

startBtn.addEventListener('click', () => {
  const examType = examSelect.value;
  feedback.textContent = '';

  if (examType === 'OET') {
    wordList = [...oetWords];
  } else if (examType === 'Custom') {
    const manualWords = customWordsInput.value.trim().split(/\n|,/).map(w => w.trim()).filter(Boolean);
    if (manualWords.length) wordList = manualWords;
    else {
      showNotification('Please upload or enter words for Custom exam.');
      return;
    }
  } else if (examType === 'SpellingBee') {
    wordList = [...oetWords];
    useSpeechRecognition();
  }

  currentIndex = 0;
  showWord();
});

checkBtn.addEventListener('click', () => {
  const currentWord = wordList[currentIndex];
  const userAnswer = userInput.value.trim();
  feedback.textContent = userAnswer.toLowerCase() === currentWord.toLowerCase()
    ? '✅ Correct!'
    : `❌ Incorrect. The word was: ${currentWord}`;
});

nextBtn.addEventListener('click', () => {
  currentIndex++;
  if (currentIndex < wordList.length) {
    showWord();
  } else {
    wordDisplay.textContent = '✅ Exam complete!';
    userInput.value = '';
    feedback.textContent = '';
  }
});

function showWord() {
  const word = wordList[currentIndex];
  wordDisplay.textContent = `Spell this word:`;
  userInput.value = '';
  speakWord(word, voiceSelect.value);
}

function useSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    showNotification('Speech recognition not supported on this browser.');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript;
    userInput.value = result.replace(/\s+/g, '').toLowerCase();
    checkBtn.click();
  };

  recognition.onerror = (e) => {
    showNotification('Speech recognition error: ' + e.error);
  };

  recognition.onend = () => {
    // Autostart next word?
  };

  recognition.start();
}
