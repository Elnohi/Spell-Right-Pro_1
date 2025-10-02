/* SpellRightPro – Freemium Bee (Fixed)
   - Fallback to sample words if user added none
   - Add "Add Words" button + file upload parsing
   - Keep Premium links working
*/
(() => {
  'use strict';

  const state = {
    words: [],
    idx: 0,
    correct: 0,
    attempts: 0,
    accent: 'us',
    customAddedToday: false
  };

  // elements
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const homePage = $('#home-page');
  const gamePage = $('#game-page');
  const resultsPage = $('#results-page');

  const progressCount = $('#progress-count');
  const correctCount = $('#correct-count');
  const attemptsCount = $('#attempts-count');
  const wordProgress = $('#word-progress');
  const lettersPad = $('#letters-pad');
  const input = $('#spelling-input');
  const feedback = $('#feedback-area');

  const startBtn = $('#start-button');
  const addWordsBtn = $('#add-words-btn');
  const wordsTextarea = $('#words-textarea');
  const fileInput = $('#file-input');

  const prevBtn = $('#prev-button');
  const repeatBtn = $('#repeat-button');
  const submitBtn = $('#submit-button');

  // ===== Helpers =====
  function speak(word) {
    try {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = state.accent === 'uk' ? 'en-GB' : state.accent === 'au' ? 'en-AU' : 'en-US';
      (window.speechSynthesis || speechSynthesis).speak(u);
    } catch {}
  }
  function show(el) { el && (el.style.display = 'block'); }
  function hide(el) { el && (el.style.display = 'none'); }
  function upStats() {
    progressCount.textContent = `${state.idx}/${Math.max(10, state.words.length)}`;
    correctCount.textContent = state.correct;
    attemptsCount.textContent = state.attempts;
  }
  function mkLettersPad() {
    if (!lettersPad) return;
    lettersPad.innerHTML = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(ch => {
      const b = document.createElement('button');
      b.className = 'letter-tile';
      b.textContent = ch;
      b.addEventListener('click', () => {
        input.value += ch.toLowerCase();
        input.focus();
      });
      lettersPad.appendChild(b);
    });
  }

  // ===== Accent buttons =====
  $$('.accent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.accent-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.accent = btn.getAttribute('data-accent') || 'us';
    });
  });

  // ===== Add words handlers =====
  function parseTextToWords(text) {
    return text.split(/[\s,;]+/).map(w => w.trim()).filter(Boolean);
  }
  addWordsBtn?.addEventListener('click', () => {
    const raw = (wordsTextarea?.value || '').trim();
    if (!raw) { alert('Enter some words first.'); return; }
    const added = parseTextToWords(raw);
    state.words.push(...added);
    state.words = Array.from(new Set(state.words));
    state.customAddedToday = true;
    wordsTextarea.value = '';
    alert(`Added ${added.length} word(s).`);
  });
  fileInput?.addEventListener('change', e => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const added = parseTextToWords(String(r.result || ''));
      state.words.push(...added);
      state.words = Array.from(new Set(state.words));
      state.customAddedToday = true;
      alert(`Uploaded ${added.length} word(s).`);
    };
    r.readAsText(f);
    e.target.value = '';
  });

  // ===== Start game =====
  async function loadDefaultWordsIfNeeded() {
    if (state.words.length) return;
    // Fallback to sample words from a local JSON, then to hardcoded list
    try {
      const res = await fetch('/data/spelling-bee.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data?.words) ? data.words : data;
        if (Array.isArray(arr) && arr.length) {
          state.words = arr.slice(0, 30);
          return;
        }
      }
    } catch {}
    state.words = ['example','spelling','practice','education','learning','knowledge','vocabulary','language','pronunciation','exercise'];
  }

  function showHome() { show(homePage); hide(gamePage); hide(resultsPage); }
  function showGame() { hide(homePage); show(gamePage); hide(resultsPage); input?.focus(); }
  function showResults() {
    hide(homePage); hide(gamePage); show(resultsPage);
    $('#summary-area').innerHTML = `
      <p>Correct: <strong>${state.correct}</strong> / Attempts: <strong>${state.attempts}</strong></p>
    `;
  }

  function loadWord() {
    if (state.idx >= state.words.length) { showResults(); return; }
    const w = state.words[state.idx];
    wordProgress.textContent = `Word ${state.idx + 1} of ${state.words.length}`;
    input.value = '';
    feedback.textContent = '';
    speak(w);
    // Keep typing area visible
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function submit() {
    const guess = (input.value || '').trim();
    if (!guess) { speak(state.words[state.idx]); return; }
    state.attempts++;
    if (guess.toLowerCase() === state.words[state.idx].toLowerCase()) {
      state.correct++;
      feedback.textContent = '✅ Correct';
      state.idx++;
      setTimeout(loadWord, 400);
    } else {
      feedback.textContent = `❌ Try again`;
    }
    upStats();
  }

  prevBtn?.addEventListener('click', () => {
    state.idx = Math.max(0, state.idx - 1);
    loadWord();
  });
  repeatBtn?.addEventListener('click', () => speak(state.words[state.idx]));
  submitBtn?.addEventListener('click', submit);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    if (e.code === 'Space') { e.preventDefault(); speak(state.words[state.idx]); }
  });

  startBtn?.addEventListener('click', async () => {
    await loadDefaultWordsIfNeeded();
    state.idx = 0; state.correct = 0; state.attempts = 0;
    upStats(); mkLettersPad(); showGame(); loadWord();
  });

  // premium links always navigate (in case any buttons remain)
  document.querySelectorAll('.btn-primary[href="/premium.html"], #premium-button, #premium-main-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      if (el.tagName !== 'A') { e.preventDefault(); window.location.href = '/premium.html'; }
    });
  });

  showHome();
})();
