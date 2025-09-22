// main-freemium-bee.js — Fully Fixed, Working Auto-Advance Freemium Spelling Bee + Summary AdSense

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const accentPicker = document.querySelector('.accent-picker');
  const customInput = document.getElementById('custom-words');
  const fileInput = document.getElementById('file-input');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const startBtn = document.getElementById('start-btn');
  const beeArea = document.getElementById('bee-area');
  const spellingVisual = document.getElementById('spelling-visual');
  const summaryArea = document.getElementById('summary-area');
  const micStatus = document.getElementById('mic-status');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  // State
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let flaggedWords = JSON.parse(localStorage.getItem('bee_flaggedWords') || '[]');
  let userAttempts = [];
  let usedCustomListToday = false;
  let isUsingCustomList = false;
  let isSessionActive = false;
  let currentWord = '';
  let recognition = null;
  let accent = "en-US";

  // === Freemium daily cap (Bee) ===
  const FREEMIUM_MAX = 10;
  function dayKey(mode){
    const d = new Date();
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return `srp_daily_words_${mode}_${y}-${m}-${day}`;
  }
  function usedToday(mode){ return parseInt(localStorage.getItem(dayKey(mode))||'0',10); }
  function setUsedToday(mode, n){ localStorage.setItem(dayKey(mode), String(n)); }
  function capWordsForToday(mode, list){
    const used = usedToday(mode);
    if (used >= FREEMIUM_MAX) { alert(`Freemium limit reached: ${FREEMIUM_MAX} words today. Come back tomorrow or upgrade to Premium.`); return []; }
    const remaining = FREEMIUM_MAX - used;
    return list.length > remaining ? list.slice(0, remaining) : list;
  }

  // ... (your existing helpers and event setup remain unchanged up to startSession)

  function validateCustomAccess() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('bee_customListDate');
    if (lastDate === today) return false;
    return true;
  }

  // (file upload / add words / speech synthesis / recognition code remains unchanged)

  function startSession() {
    currentIndex = 0;
    score = 0;
    userAttempts = [];
    isSessionActive = true;
    // Apply daily cap
    words = capWordsForToday("Bee", words);
    if (!words.length) { isSessionActive = false; startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session'; return; }
    beeArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    startBtn.setAttribute('aria-label', 'End session');
    // ... rest of your original start logic (render UI, speak, start recognition, etc.)
  }

  function endSession() {
    isSessionActive = false;
    if (recognition) recognition.stop();
    // increment daily usage
    setUsedToday("Bee", usedToday("Bee") + words.length);
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Spelling Bee Results</h2>
        <div class="score-display">${score}/${words.length} (${Math.round(score/words.length*100)}%)</div>
      </div>
      <div class="results-grid">
        <div class="results-card correct">
          <h3><i class="fas fa-check-circle"></i> Correct</h3>
          <div class="score-number">${score}</div>
          <div class="word-list">
            ${words.filter((w, i) => (userAttempts[i] || "").toLowerCase() === w.toLowerCase())
              .map(w => `<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
        <div class="results-card incorrect">
          <h3><i class="fas fa-times-circle"></i> Needs Practice</h3>
          <div class="score-number">${words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase()).length}</div>
          <div class="word-list">
            ${words.filter((w, i) => (userAttempts[i] || "").toLowerCase() !== w.toLowerCase())
              .map(w => `<div class="word-item">${w}</div>`).join('')}
          </div>
        </div>
      </div>
    `;
    beeArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
    customInput.disabled = false;
    fileInput.disabled = false;
    if (window.insertSummaryAd) window.insertSummaryAd();
  }

  // ... rest of your existing Bee JS unchanged (rendering tiles, recognition handlers, dark mode, etc.)
});
