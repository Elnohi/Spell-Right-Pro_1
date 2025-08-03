document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const accentPicker = document.getElementById('accent-picker');
  const customInput = document.getElementById('custom-words');
  const fileInput = document.getElementById('file-input');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const startBtn = document.getElementById('start-btn');
  const beeArea = document.getElementById('bee-area');
  const spellingVisual = document.getElementById('spelling-visual');
  const summaryArea = document.getElementById('summary-area');
  const micStatus = document.getElementById('mic-status');

  // State Variables
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let userAttempts = [];
  let accent = "en-US";
  let recognition;
  let isSessionActive = false;
  let currentWord = "";

  // Default Spelling Bee List
  const DEFAULT_BEE_WORDS = [
    "accommodate", "belligerent", "conscientious", "disastrous", 
    "embarrass", "foreign", "guarantee", "harass", 
    "interrupt", "jealous", "knowledge", "liaison",
    "millennium", "necessary", "occasionally", "possession",
    "questionnaire", "rhythm", "separate", "tomorrow",
    "unforeseen", "vacuum", "withhold", "yacht"
  ];

  // Init default
  words = [...DEFAULT_BEE_WORDS];

  accentPicker.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      accentPicker.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      e.target.classList.add('active');
      e.target.setAttribute('aria-pressed', 'true');
      accent = e.target.dataset.accent;
    }
  });

  addCustomBtn.addEventListener('click', () => {
    const input = customInput.value.trim();
    if (!input) return alert("Please enter words first!");
    words = [...new Set(input.split(/\s*[\n,\/\-–—|]+\s*/).map(w => w.trim()).filter(Boolean))];
    customInput.value = '';
    alert("Custom list loaded!");
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    words = [...new Set(text.split(/\s*[\n,\/\-–—|]+\s*/).map(w => w.trim()).filter(Boolean))];
    alert("Word list loaded!");
  });

  startBtn.addEventListener('click', () => {
    if (!words.length) return alert("No word list loaded!");
    currentIndex = 0;
    score = 0;
    userAttempts = [];
    isSessionActive = true;
    summaryArea.classList.add('hidden');
    beeArea.classList.remove('hidden');
    playCurrentWord();
  });

  function playCurrentWord() {
    if (currentIndex >= words.length) {
      endSession();
      return;
    }
    if (recognition) recognition.stop();

    currentWord = words[currentIndex];
    renderWordInterface();
    speakWord(currentWord);
  }

  function renderWordInterface() {
    beeArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div id="spelling-visual"></div>
      <div class="button-group">
        <button id="repeat-btn" class="btn-secondary"><i class="fas fa-redo"></i> Repeat Word</button>
        <button id="next-btn" class="btn-secondary"><i class="fas fa-arrow-right"></i> Skip</button>
      </div>
      <div id="mic-feedback" class="feedback" aria-live="assertive"></div>
    `;
    document.getElementById('repeat-btn').onclick = () => speakWord(currentWord);
    document.getElementById('next-btn').onclick = () => {
      currentIndex++;
      playCurrentWord();
    };
    startVoiceRecognition();
  }

  function speakWord(word) {
    if (!window.speechSynthesis) return alert("Speech Synthesis not supported.");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }

  function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      document.getElementById('mic-feedback').textContent = "Speech recognition not supported!";
      return;
    }
    micStatus.classList.remove('hidden');
    updateSpellingVisual();

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      const results = event.results[0];
      const bestMatch = Array.from(results)
        .map(result => result.transcript.trim().toLowerCase().replace(/[^a-z]/g, ''))
        .find(transcript => transcript.length >= 2) || '';
      processSpellingAttempt(bestMatch);
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        document.getElementById('mic-feedback').textContent = `Recognition error: ${event.error}`;
      }
      setTimeout(() => isSessionActive && startVoiceRecognition(), 600);
    };
    recognition.start();
  }

  function processSpellingAttempt(attempt) {
    const feedback = document.getElementById('mic-feedback');
    if (!attempt) {
      feedback.textContent = "Didn't catch that, try again!";
      feedback.className = "feedback incorrect";
      setTimeout(() => isSessionActive && startVoiceRecognition(), 600);
      return;
    }
    userAttempts[currentIndex] = attempt;
    const isCorrect = attempt === currentWord.toLowerCase();
    updateSpellingVisual(
      currentWord.split('').map((letter, i) => ({
        letter: attempt[i] || '',
        correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
      }))
    );
    if (isCorrect) {
      feedback.textContent = "✓ Correct!";
      feedback.className = "feedback correct";
      score++;
    } else {
      feedback.textContent = `✗ Incorrect. Correct: ${currentWord}`;
      feedback.className = "feedback incorrect";
    }
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    setTimeout(() => {
      currentIndex++;
      if (currentIndex < words.length) playCurrentWord();
      else endSession();
    }, 800);
  }

  function updateSpellingVisual(letters = []) {
    spellingVisual.innerHTML = currentWord.split('').map((letter, i) => {
      const letterData = letters[i] || {};
      const letterClass = letterData.correct ? 'correct' : (letterData.letter ? 'incorrect' : '');
      return `<div class="letter-tile ${letterClass}">${letterData.letter || ''}</div>`;
    }).join('');
  }

  function endSession() {
    isSessionActive = false;
    if (recognition) recognition.stop();
    const percent = Math.round((score / words.length) * 100);
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Spelling Bee Results</h2>
        <div class="score-display">${score}/${words.length} (${percent}%)</div>
      </div>
      <button id="restart-btn" class="btn-secondary"><i class="fas fa-redo"></i> Restart Session</button>
    `;
    beeArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    document.getElementById('restart-btn').onclick = () => {
      summaryArea.classList.add('hidden');
      beeArea.classList.remove('hidden');
      currentIndex = 0;
      score = 0;
      playCurrentWord();
    };
  }
});
