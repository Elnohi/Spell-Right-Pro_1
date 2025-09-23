// main-freemium-oet.js
document.addEventListener('DOMContentLoaded', () => {
  const LIMIT = 10;
  const todayKey = `oet-words-${new Date().toDateString()}`;
  let usedToday = parseInt(localStorage.getItem(todayKey) || "0");

  let words = [];
  let currentIndex = 0;

  const startBtn = document.getElementById('start-btn');
  const wordArea = document.getElementById('word-area');
  const answer = document.getElementById('answer');
  const summary = document.getElementById('summary-area');
  const picker = document.getElementById('accent-picker');

  const correctCountEl = document.getElementById('correct-count');
  const attemptCountEl = document.getElementById('attempt-count');

  // Load lifetime stats
  let lifetimeCorrect = parseInt(localStorage.getItem('oet-correct') || "0");
  let lifetimeAttempts = parseInt(localStorage.getItem('oet-attempts') || "0");
  updateStats();

  // Load sample list
  fetch('/oet.json')
    .then(r => r.json())
    .then(d => words = d.words)
    .catch(err => {
      console.error("OET list failed", err);
      summary.textContent = "⚠️ Could not load OET word list.";
    });

  function updateStats() {
    correctCountEl.textContent = lifetimeCorrect;
    attemptCountEl.textContent = lifetimeAttempts;
  }

  function startSession() {
    if (usedToday >= LIMIT) {
      summary.textContent = "Daily limit of 10 words reached. Upgrade to Premium for unlimited practice.";
      return;
    }
    summary.innerHTML = '';
    currentIndex = 0;
    nextWord();
  }

  function nextWord() {
    if (usedToday >= LIMIT || currentIndex >= words.length) {
      summary.innerHTML += "<p>Daily limit reached. Upgrade to Premium.</p>";
      localStorage.setItem(todayKey, usedToday);
      return;
    }

    const word = words[currentIndex];
    wordArea.textContent = `Word ${currentIndex + 1}: listen and spell.`;

    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = picker?.value || "en-US";
    speechSynthesis.speak(utter);

    answer.value = '';
    answer.focus();

    answer.onkeydown = e => {
      if (e.key === 'Enter') {
        lifetimeAttempts++;
        if (answer.value.trim().toLowerCase() === word.toLowerCase()) {
          lifetimeCorrect++;
          summary.innerHTML += `<p>✅ ${word}</p>`;
        } else {
          summary.innerHTML += `<p>❌ ${answer.value} (correct: ${word})</p>`;
        }
        usedToday++;
        currentIndex++;

        // Save stats
        localStorage.setItem('oet-correct', lifetimeCorrect);
        localStorage.setItem('oet-attempts', lifetimeAttempts);
        localStorage.setItem(todayKey, usedToday);
        updateStats();

        nextWord();
      }
    };
  }

  startBtn?.addEventListener('click', startSession);
});
