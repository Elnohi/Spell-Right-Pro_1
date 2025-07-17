// main-freemium-bee.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';

import { firebaseConfig } from './firebase.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let currentWord = '';
let wordList = ['apple', 'banana', 'elephant', 'giraffe', 'library']; // Default list
let wordIndex = 0;
let recognition;

const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');
const speakButton = document.getElementById('speakButton');
const accentSelect = document.getElementById('accentSelect');

function speakWord(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accentSelect.value;
  speechSynthesis.speak(utterance);
}

function startTest() {
  wordIndex = 0;
  currentWord = wordList[wordIndex];
  speakWord(currentWord);
  startRecognition();
}

function nextWord() {
  wordIndex++;
  if (wordIndex < wordList.length) {
    currentWord = wordList[wordIndex];
    speakWord(currentWord);
    startRecognition();
  } else {
    showSummary();
  }
}

function startRecognition() {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript.trim().toLowerCase();
    console.log('User spelled:', result);
    // For Spelling Bee, ideally we compare letter-by-letter
    // Currently doing simple match
    if (result.replace(/\s+/g, '') === currentWord.replace(/\s+/g, '')) {
      alert('Correct!');
    } else {
      alert(`Incorrect. You said: ${result}`);
    }
  };
  recognition.start();
}

function showSummary() {
  document.getElementById('summary').innerText = 'Session completed. Upgrade to Premium for detailed results.';
}

startButton?.addEventListener('click', startTest);
nextButton?.addEventListener('click', nextWord);
speakButton?.addEventListener('click', () => speakWord(currentWord));

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert('Please log in to use this feature.');
    window.location.href = 'index.html';
  }
});
