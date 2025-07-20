import { initFlagButton, showFlaggedWords } from './common.js';

let currentWord = '';
let wordList = [];
let currentIndex = 0;
let score = 0;

// Helper: Clean & split custom word input (one per line)
function getWordsFromInput() {
  const customWords = document.getElementById('wordInput').value;
  // Split by newlines, trim, filter out empty lines
  return customWords.split(/\r?\n/).map(w => w.trim()).filter(w => w.length > 0);
}

function displayWord(word) {
  currentWord = word;
  document.querySelector('.current-word').textContent = word;
  document.getElementById('spellingInput').value = '';
  document.querySelector('.feedback').textContent = '';
  document.getElementById('spellingInput').focus();
  initFlagButton(word);
  // Speak the word when it appears
  if ('speechSynthesis' in window) {
    let utter = new window.SpeechSynthesisUtterance(word);
    let accent = document.getElementById('accentSelect').value;
    utter.lang = accent || 'en-US';
    window.speechSynthesis.speak(utter);
  }
}

function checkSpelling() {
  const input = document.getElementById('spellingInput').value.trim();
  const feedback = document.querySelector('.feedback');
  
  if (input.toLowerCase() === currentWord.toLowerCase()) {
    feedback.textContent = 'Correct!';
    feedback.style.color = 'green';
    score++;
  } else {
    feedback.textContent = `Incorrect. The correct spelling is: ${currentWord}`;
    feedback.style.color = 'red';
  }

  document.getElementById('scoreDisplay').textContent = `Score: ${score}/${wordList.length}`;
  
  // Move to next word or end session
  currentIndex++;
  if (currentIndex < wordList.length) {
    setTimeout(() => displayWord(wordList[currentIndex]), 1500);
  } else {
    setTimeout(endSession, 1500);
  }
}

function startSession(words) {
  wordList = [...words];
  currentIndex = 0;
  score = 0;
  document.getElementById('scoreDisplay').textContent = '';
  document.querySelector('.flagged-section')?.remove();
  displayWord(wordList[0]);
  
  document.getElementById('spellingInput').onkeypress = (e) => {
    if (e.key === 'Enter') checkSpelling();
  };
}

function endSession() {
  document.getElementById('scoreDisplay').innerHTML = `
    <h3>Test Complete!</h3>
    <p>Your score: ${score}/${wordList.length}</p>
  `;
  showFlaggedWords();
  
  // Setup practice flagged words button
  document.getElementById('practiceFlaggedBtn')?.addEventListener('click', () => {
    const flagged = JSON.parse(localStorage.getItem('flaggedWords')) || [];
    if (flagged.length > 0) {
      startSession(flagged);
    }
  });
}

// Event Listeners
document.getElementById('startTest').addEventListener('click', () => {
  const words = getWordsFromInput();
  startSession(words.length ? words : ['sample', 'words']);
});

document.getElementById('useSampleBtn').addEventListener('click', () => {
  startSession(['apple', 'banana', 'cherry', 'dolphin', 'elephant']);
});
