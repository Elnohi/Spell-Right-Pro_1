// main-freemium-oet.js — Modern Unified Version
import { oetWords } from './oet_word_list.js';

document.addEventListener('DOMContentLoaded', () => {
  const startPracticeBtn = document.getElementById('start-practice-btn');
  const startExamBtn = document.getElementById('start-exam-btn');
  const oetArea = document.getElementById('oet-area');
  const summaryArea = document.getElementById('summary-area');
  const userInput = document.getElementById('user-input');
  const submitBtn = document.getElementById('submit-btn');
  const nextBtn = document.getElementById('next-btn');
  const flagBtn = document.getElementById('flag-btn');
  const moreBtn = document.getElementById('more-btn');
  const moreMenu = document.getElementById('more-menu');
  const wordVisual = document.getElementById('word-visual');

  let words = [];
  let currentIndex = 0;
  let incorrectWords = [];
  let flaggedWords = [];
  let tts;

  // ====== Text-to-Speech ======
  function speak(text) {
    if (!window.speechSynthesis) return;
    tts = new SpeechSynthesisUtterance(text);
    tts.lang = 'en-US';
    window.speechSynthesis.speak(tts);
  }

  // ====== Practice Mode (Full List) ======
  startPracticeBtn.addEventListener('click', () => {
    words = oetWords.slice();
    currentIndex = 0;
    incorrectWords = [];
    flaggedWords = [];
    summaryArea.style.display = 'none';
    oetArea.style.display = 'block';
    startWord();
  });

  // ====== Exam Mode (24 Random Words) ======
  startExamBtn.addEventListener('click', () => {
    words = oetWords.sort(() => 0.5 - Math.random()).slice(0, 24);
    currentIndex = 0;
    incorrectWords = [];
    flaggedWords = [];
    summaryArea.style.display = 'none';
    oetArea.style.display = 'block';
    startWord();
  });

  // ====== Display Word ======
  function startWord() {
    if (currentIndex >= words.length) {
      showSummary();
      return;
    }
    const word = words[currentIndex];
    wordVisual.textContent = `Word ${currentIndex + 1} of ${words.length}`;
    userInput.value = "";
    userInput.focus();
    speak(word);
  }

  // ====== Check Answer ======
  function checkAnswer() {
    const input = userInput.value.trim().toLowerCase();
    if (!input) return;
    const expected = words[currentIndex];
    const correct = input === expected.toLowerCase();

    const feedback = document.createElement('div');
    feedback.className = `feedback ${correct ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = correct
      ? `✅ Correct: <b>${expected}</b>`
      : `❌ Incorrect: ${input}<br>✔ Correct: <b>${expected}</b>`;
    summaryArea.appendChild(feedback);
    summaryArea.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (!correct) incorrectWords.push(expected);
    currentIndex++;
    setTimeout(startWord, 1200);
  }

  // ====== Buttons ======
  submitBtn.addEventListener('click', checkAnswer);
  nextBtn.addEventListener('click', () => { currentIndex++; startWord(); });
  flagBtn.addEventListener('click', () => {
    flaggedWords.push(words[currentIndex]);
    alert(`Flagged: ${words[currentIndex]}`);
  });

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitBtn.click();
    }
  });

  // ====== More Menu ======
  moreBtn.addEventListener('click', () => {
    moreMenu.classList.toggle('show');
  });

  document.getElementById('end-session-btn').addEventListener('click', () => {
    showSummary();
    moreMenu.classList.remove('show');
  });

  // ====== Summary ======
  function showSummary() {
    oetArea.style.display = 'none';
    summaryArea.style.display = 'block';
    summaryArea.innerHTML = `
      <h2>Session Summary</h2>
      <p>Total Words: ${words.length}</p>
      <p>Incorrect: ${incorrectWords.length}</p>
      <p>Flagged: ${flaggedWords.length}</p>
      <hr>
      ${incorrectWords.length ? `<h3>Incorrect Words:</h3><ul>${incorrectWords.map(w => `<li>${w}</li>`).join('')}</ul>` : ''}
      ${flaggedWords.length ? `<h3>Flagged Words:</h3><ul>${flaggedWords.map(w => `<li>${w}</li>`).join('')}</ul>` : ''}
      <button class="btn-secondary" id="restart-btn"><i class="fa fa-redo"></i> Restart</button>
    `;
    document.getElementById('restart-btn').addEventListener('click', () => {
      summaryArea.innerHTML = '';
      startPracticeBtn.click();
    });
  }

  // ====== Upgrade Redirect ======
  document.querySelectorAll('.premium-button, .upgrade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = '/premium.html';
    });
  });
});
