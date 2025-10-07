// main-freemium-bee.js — Modern Unified Version
document.addEventListener('DOMContentLoaded', () => {
  // ====== DOM Elements ======
  const startBtn = document.getElementById('start-btn');
  const beeArea = document.getElementById('bee-area');
  const spellingVisual = document.getElementById('spelling-visual');
  const summaryArea = document.getElementById('summary-area');
  const userInput = document.getElementById('user-input');
  const submitBtn = document.getElementById('submit-btn');
  const nextBtn = document.getElementById('next-btn');
  const flagBtn = document.getElementById('flag-btn');
  const moreBtn = document.getElementById('more-btn');
  const moreMenu = document.getElementById('more-menu');

  // ====== App State ======
  let words = [];
  let currentIndex = 0;
  let incorrectWords = [];
  let flaggedWords = [];
  let recognizing = false;
  let recognition;
  let tts;

  // ====== Load Default Sample Words ======
  const sampleWords = [
    "apple", "banana", "cherry", "orange", "grape",
    "pineapple", "strawberry", "blueberry", "watermelon",
    "mango", "papaya", "peach", "pear", "plum"
  ];

  // ====== Initialize Speech ======
  function speak(text) {
    if (!window.speechSynthesis) return;
    tts = new SpeechSynthesisUtterance(text);
    tts.lang = 'en-US';
    window.speechSynthesis.speak(tts);
  }

  function initRecognition() {
    if (!('webkitSpeechRecognition' in window)) return null;
    const r = new webkitSpeechRecognition();
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = false;
    return r;
  }

  // ====== Start Practice ======
  startBtn.addEventListener('click', () => {
    words = sampleWords.slice(); // default sample if none uploaded
    currentIndex = 0;
    incorrectWords = [];
    flaggedWords = [];
    summaryArea.style.display = 'none';
    beeArea.style.display = 'block';
    startWord();
  });

  // ====== Play Current Word ======
  function startWord() {
    if (currentIndex >= words.length) {
      showSummary();
      return;
    }
    const word = words[currentIndex];
    spellingVisual.textContent = `Word ${currentIndex + 1} of ${words.length}`;
    userInput.value = "";
    userInput.focus();
    speak(word);
    recognizeSpeech(word);
  }

  // ====== Speech Recognition ======
  function recognizeSpeech(expectedWord) {
    recognition = initRecognition();
    if (!recognition) return;
    recognizing = true;
    recognition.start();

    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript.trim().toLowerCase();
      checkAnswer(spoken, expectedWord);
      recognizing = false;
    };
    recognition.onerror = () => { recognizing = false; };
    recognition.onend = () => { recognizing = false; };
  }

  // ====== Check Answer ======
  function checkAnswer(answer, expected) {
    const normalized = answer.replace(/\./g, '').trim();
    const correct = normalized === expected.toLowerCase();

    const feedback = document.createElement('div');
    feedback.className = `feedback ${correct ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = correct
      ? `✅ Correct: <b>${expected}</b>`
      : `❌ Incorrect: ${answer}<br>✔ Correct spelling: <b>${expected}</b>`;
    summaryArea.appendChild(feedback);
    summaryArea.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (!correct) incorrectWords.push(expected);
    currentIndex++;
    setTimeout(startWord, 1500);
  }

  // ====== Manual Submission ======
  submitBtn.addEventListener('click', () => {
    const input = userInput.value.trim().toLowerCase();
    if (!input) return;
    checkAnswer(input, words[currentIndex]);
  });

  // Allow Enter key
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitBtn.click();
    }
  });

  // ====== Flag Button ======
  flagBtn.addEventListener('click', () => {
    if (!words[currentIndex]) return;
    flaggedWords.push(words[currentIndex]);
    alert(`Flagged: ${words[currentIndex]}`);
  });

  // ====== Next Button ======
  nextBtn.addEventListener('click', () => {
    currentIndex++;
    startWord();
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
    beeArea.style.display = 'none';
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
      startBtn.click();
    });
  }

  // ====== Upgrade Redirect (Unified) ======
  document.querySelectorAll('.premium-button, .upgrade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = '/premium.html';
    });
  });
});
