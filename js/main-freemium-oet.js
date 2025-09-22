// main-freemium-oet.js - Strict Custom List, Multi-File, One/Day (2024-08-05)
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const accentPicker = document.querySelector('.accent-picker');
  const practiceBtn = document.getElementById('practice-mode-btn');
  const testBtn = document.getElementById('test-mode-btn');
  const customInput = document.getElementById('custom-words');
  const fileInput = document.getElementById('file-input');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const startBtn = document.getElementById('start-btn');
  const trainerArea = document.getElementById('trainer-area');
  const summaryArea = document.getElementById('summary-area');
  const modeSwitchBtn = document.getElementById('mode-switch-btn');

  // State Variables
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let sessionMode = "practice";
  let flaggedWords = JSON.parse(localStorage.getItem('flaggedWords')) || [];
  let userAnswers = [];
  let usedCustomListToday = false;
  const todayKey = new Date().toISOString().split('T')[0];
  let customListDate = localStorage.getItem('oet_customListDate');

  if (customListDate === todayKey) {
    usedCustomListToday = true;
  }

  let accent = "en-US";
  let autoPlayTimeout;
  let speechSynthesis = window.speechSynthesis || null;
  let isSessionActive = false;

  // === Freemium daily cap (OET) ===
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

  // Default OET List (replace with your real import or window.oetWords)
  let oetWords = window.oetWords || [
    "jaundice", "sepsis", "hepatitis", "diabetes", "survey", "blurred vision"
    // ... add more
  ];

  // --- INIT ---
  loadSavedSession();
  setupEventListeners();
  initDarkMode();

  function setupEventListeners() {
    practiceBtn?.addEventListener('click', () => setMode("practice"));
    testBtn?.addEventListener('click', () => setMode("test"));
    accentPicker?.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        accentPicker.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        accent = e.target.dataset.accent;
      }
    });
    addCustomBtn?.addEventListener('click', addCustomWords);
    fileInput?.addEventListener('change', handleFileUpload);
    startBtn?.addEventListener('click', toggleSession);
    modeSwitchBtn?.addEventListener('click', switchMode);
    document.addEventListener('keydown', (e) => {
      if (!isSessionActive) return;
      if (e.key === 'Enter') submitAnswer();
    });
  }

  function initDarkMode() {
    const dm = localStorage.getItem('srp_dark') === '1';
    document.body.classList.toggle('dark-mode', dm);
  }

  function loadSavedSession() {}

  function setMode(mode) {
    sessionMode = mode;
    showAlert(`Mode switched to ${mode.toUpperCase()}.`, 'info');
  }

  function showAlert(message, type = 'info') {
    const existing = document.querySelector('.alert');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    div.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.querySelector('.card')?.insertAdjacentElement('afterbegin', div);
    setTimeout(() => div.remove(), 2500);
  }

  function toggleSession() {
    isSessionActive ? endSession() : startSession();
  }

  function startSession() {
    // Built-in OET list should always work unlimited times!
    if (words.length === 0 && !usedCustomListToday) {
      words = Array.isArray(oetWords) ? [...oetWords] : [];
    }
    if (sessionMode === "test") {
      words = shuffleArray([...words]).slice(0, 24);
    }
    // Apply daily cap
    words = capWordsForToday("OET", words);
    if (!words.length) { isSessionActive = false; return; }
    currentIndex = 0; score = 0; userAnswers = []; isSessionActive = true;
    updateUIForActiveSession();
    playCurrentWord();
  }
  function updateUIForActiveSession() {
    trainerArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    startBtn.innerHTML = '<i class="fas fa-stop"></i> End Session';
    customInput.disabled = true; fileInput.disabled = true; addCustomBtn.disabled = true;
  }
  function playCurrentWord() {
    clearTimeout(autoPlayTimeout);
    if (currentIndex >= words.length) { endSession(); return; }
    const word = words[currentIndex];
    trainerArea.innerHTML = `
      <div class="word-playback">
        <button id="hear-word" class="btn-icon" title="Hear again"><i class="fas fa-volume-up"></i></button>
        <span class="indicator">Word ${currentIndex + 1}/${words.length}</span>
      </div>
      <div class="answer-row">
        <input id="answer-input" type="text" placeholder="Type the spelling..." autocomplete="off"/>
        <button id="submit-answer" class="btn-primary"><i class="fas fa-check"></i> Submit</button>
        <button id="skip-answer" class="btn-secondary"><i class="fas fa-forward"></i> Skip</button>
      </div>
      <div class="flag-row">
        <button id="flag-btn" class="btn-flag"><i class="fas fa-flag"></i> Flag</button>
      </div>
    `;
    document.getElementById('hear-word')?.addEventListener('click', () => speakWord(word));
    document.getElementById('submit-answer')?.addEventListener('click', submitAnswer);
    document.getElementById('skip-answer')?.addEventListener('click', () => { userAnswers.push(''); nextWord(); });
    document.getElementById('answer-input')?.focus();
    speakWord(word);
    updateFlagButton();
  }
  function submitAnswer() {
    const input = (document.getElementById('answer-input')?.value || '').trim();
    const correct = (words[currentIndex] || '').trim();
    userAnswers.push(input);
    if (input.toLowerCase() === correct.toLowerCase()) score++;
    nextWord();
  }
  function nextWord() {
    currentIndex++;
    if (currentIndex >= words.length) endSession();
    else playCurrentWord();
  }
  function endSession() {
    isSessionActive = false; clearTimeout(autoPlayTimeout);
    const percent = Math.round((score / words.length) * 100);
    const wrongWords = words.filter((w, i) => (userAnswers[i] || "").toLowerCase() !== w.toLowerCase());
    // increment daily usage
    setUsedToday("OET", usedToday("OET") + words.length);
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${score}/${words.length} (${percent}%)</div>
      </div>
      <div class="results-grid">
        <div class="results-card correct">
          <h3><i class="fas fa-check-circle"></i> Correct</h3>
          <div class="score-number">${score}</div>
          <div class="word-list">${words.filter((w, i) => (userAnswers[i] || "").toLowerCase() === w.toLowerCase())
            .map(w => `<div class="word-item">${w}</div>`).join('')}</div>
        </div>
        <div class="results-card incorrect">
          <h3><i class="fas fa-times-circle"></i> Needs Practice</h3>
          <div class="score-number">${wrongWords.length}</div>
          <div class="word-list">${wrongWords.map(w => `<div class="word-item">${w}</div>`).join('')}</div>
        </div>
      </div>
      <div class="summary-actions">
        <button id="restart-btn" class="btn-primary"><i class="fas fa-redo"></i> Restart Session</button>
        <button id="new-list-btn" class="btn-secondary"><i class="fas fa-sync-alt"></i> Change Word List</button>
      </div>
    `;
trainerArea.classList.add('hidden');
summaryArea.classList.remove('hidden');
startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
customInput.disabled = false; fileInput.disabled = false; addCustomBtn.disabled = false;

// >>> INSERT THIS LINE <<<
if (window.insertSummaryAd) window.insertSummaryAd();

document.getElementById('restart-btn')?.addEventListener('click', startSession);
document.getElementById('new-list-btn')?.addEventListener('click', resetWordList);

  // ---- WORD LIST MANAGEMENT ----
  function resetWordList() {
  words = [];
  usedCustomListToday = false;
  localStorage.removeItem('oet_customListDate');
  customInput.value = '';
  fileInput.value = '';
  summaryArea.classList.add('hidden');
  showAlert("Word list cleared. Add new words or use default OET list.", 'info');
  // Add this line:
  words = Array.isArray(window.oetWords) ? [...window.oetWords] : [];
}
  function switchMode() {
    sessionMode = (sessionMode === "practice" ? "test" : "practice");
    showAlert(`Switched to ${sessionMode.toUpperCase()} mode.`, 'info');
  }
  function addCustomWords() {
    const input = (customInput.value || "").trim();
    if (!input) return showAlert("Please enter some words or upload a file.", "error");
    const newWords = input.split(/[\s,]+/).map(w => w.trim()).filter(Boolean);
    if (!newWords.length) return showAlert("No valid words found.", "error");
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('oet_customListDate');
    if (lastDate === today) return showAlert("You have already added a custom list today (Freemium).", "warning");
    const uniqueNew = mergeUnique(words, newWords);
    words = uniqueNew;
    localStorage.setItem('oet_customListDate', today);
    usedCustomListToday = true;
    showAlert(`Added ${newWords.length} words.`, 'success');
    customInput.value = '';
  }
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result || '';
      const parsed = parseTextContent(content);
      const today = new Date().toISOString().split('T')[0];
      const lastDate = localStorage.getItem('oet_customListDate');
      if (lastDate === today) return showAlert("You have already added a custom list today (Freemium).", "warning");
      words = mergeUnique(words, parsed);
      localStorage.setItem('oet_customListDate', today);
      usedCustomListToday = true;
      showAlert(`Uploaded ${parsed.length} words.`, 'success');
    };
    reader.readAsText(file);
  }
  function parseTextContent(text) {
    return text.split(/\r?\n|,|;|\t/).map(w => w.trim()).filter(Boolean);
  }
  function mergeUnique(base, add) {
    const set = new Set(base.map(w => w.toLowerCase()));
    const out = base.slice();
    add.forEach(w => { const k = w.toLowerCase(); if (!set.has(k)) { set.add(k); out.push(w); } });
    return out;
  }
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function speakWord(word) {
    try {
      if (!speechSynthesis) speechSynthesis = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = accent;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch(e) {}
  }
  function updateFlagButton() {
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
      const word = words[currentIndex];
      flagBtn.classList.toggle('active', flaggedWords.includes(word));
    }
  }
});
