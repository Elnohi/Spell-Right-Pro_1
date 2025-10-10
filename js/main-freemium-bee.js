<script>
/*!
 * main-freemium-bee.js
 * Hands-free spelling bee: speak letters, we grade, then advance.
 * Works with your current purple layout & button labels.
 */
(function () {
  document.addEventListener('DOMContentLoaded', init);

  // ---- selectors (flexible to match your HTML) -----------------------------
  const $ = sel => document.querySelector(sel);

  const els = {
    start : document.querySelector('[data-action="start"], #btnStart, .btn-start, button.start'),
    next  : document.querySelector('[data-action="next"],  #btnNext'),
    prev  : document.querySelector('[data-action="prev"],  #btnPrev'),
    flag  : document.querySelector('[data-action="flag"],  #btnFlag'),
    end   : document.querySelector('[data-action="end"],   #btnEnd'),
    say   : document.querySelector('[data-action="say"],   #btnSayAgain, .btn-say'),
    progress : document.querySelector('[data-role="progress"], #wordProgress, .word-progress, .progress-display'),
    feedback : document.querySelector('[data-role="feedback"], #feedback, .feedback'),
    textarea : document.querySelector('#customWords, [data-role="custom-words"], textarea'),
    count    : document.querySelector('[data-role="counter"]')
  };

  // ---- state ----------------------------------------------------------------
  const state = {
    words: [],
    i: 0,
    active: false,
    recognizing: false,
    awaitingResult: false,
    flags: new Set(),
    correct: [],
    incorrect: [],
    timeoutId: null
  };

  // ---- config ---------------------------------------------------------------
  const DEFAULT_LIST_PATH = 'data/word-lists/spelling-bee.json';
  const LIST_FALLBACK = [
    'accommodate','rhythm','occurrence','necessary','embarrass',
    'challenge','definitely','separate','recommend','privilege'
  ];

  // ---- helpers --------------------------------------------------------------
  function text(el, value) { if (el) el.textContent = value; }
  function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

  function normalizeSpelled(s) {
    if (!s) return '';
    // example inputs:
    //  "c h e r r y", "c-h-e-r-r-y", "cherry.", "cherry"
    return s
      .toLowerCase()
      .replace(/[^\p{L}]+/gu, '')        // keep letters only
      .replace(/\.$/, '');               // strip trailing dot
  }

  function showProgress() {
    if (!els.progress) return;
    const total = state.words.length || 0;
    const idx = Math.min(state.i + 1, total);
    text(els.progress, `Word ${idx} of ${total}`);
  }

  function speakWord(word) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window)) return resolve();
      const utter = new SpeechSynthesisUtterance(word);
      // mild rate so letters are heard clearly
      utter.rate = 0.9;
      // choose an English voice if available
      const voices = speechSynthesis.getVoices();
      const v = voices.find(v => /^en[-_]/i.test(v.lang)) || voices[0];
      if (v) utter.voice = v;

      utter.onend = () => resolve();
      speechSynthesis.cancel(); // stop anything pending
      speechSynthesis.speak(utter);
    });
  }

  function stopRecognitionSafe(rec) {
    try { rec.stop(); } catch(_) {}
    state.recognizing = false;
    state.awaitingResult = false;
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
  }

  // ---- word list ------------------------------------------------------------
  async function loadWords() {
    // 1) custom list if present
    let custom = (els.textarea && els.textarea.value || '').trim();
    if (custom) {
      const parsed = custom
        .split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (parsed.length) return parsed;
    }

    // 2) fetch default json
    try {
      const res = await fetch(DEFAULT_LIST_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const arr = Array.isArray(data?.words) ? data.words : (
                   Array.isArray(data) ? data : []);
      if (arr.length) return arr;
      console.warn('Bee: JSON empty, using fallback.');
    } catch (e) {
      console.warn('Bee: could not load list:', e);
    }
    return LIST_FALLBACK;
  }

  // ---- recognition flow -----------------------------------------------------
  async function hearAndGrade(currentWord) {
    const rec = window.AudioGuards.getRecognition();
    if (!rec) {
      console.warn('SpeechRecognition not supported in this browser.');
      return;
    }

    if (state.recognizing) return;        // guard duplicate starts
    state.recognizing = true;
    state.awaitingResult = true;

    // ensure previous listeners removed
    rec.onresult = null;
    rec.onerror  = null;
    rec.onend    = null;

    rec.lang = rec.lang || 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    return new Promise(resolve => {
      // timeout if no speech
      state.timeoutId = setTimeout(() => {
        stopRecognitionSafe(rec);
        text(els.feedback, '⚠️ No speech detected. Try again.');
        resolve(false);
      }, 8000);

      rec.onresult = (evt) => {
        const said = evt.results[0][0].transcript || '';
        const heard = normalizeSpelled(said);
        const target = normalizeSpelled(currentWord);
        const ok = (heard === target);

        stopRecognitionSafe(rec);

        if (ok) {
          text(els.feedback, '✅ Correct');
          state.correct.push(currentWord);
        } else {
          text(els.feedback, `❌ Incorrect — ${currentWord}`);
          state.incorrect.push(currentWord);
        }
        resolve(true);
      };

      rec.onerror = (e) => {
        console.warn('recognition error:', e && e.error);
        stopRecognitionSafe(rec);
        text(els.feedback, '⚠️ Mic error. Tap “Say Again” or press Start.');
        resolve(false);
      };

      rec.onend = () => {
        // If ended without result (timeout will have handled), just clean state.
        state.recognizing = false;
      };

      try {
        rec.start();
      } catch (err) {
        // "InvalidStateError: recognition has already started" -> just ignore
        console.debug('start() ignored:', err && err.name);
      }
    });
  }

  async function playCurrent() {
    const word = state.words[state.i];
    if (!word) return;

    showProgress();
    text(els.feedback, '🎧 Listen carefully…');

    await speakWord(word);              // speak once
    await pause(120);                   // tiny gap
    await hearAndGrade(word);           // then listen & grade
  }

  function next() {
    if (!state.active) return;
    if (state.i < state.words.length - 1) {
      state.i++;
      playCurrent();
    } else {
      endSession();
    }
  }

  function prev() {
    if (!state.active) return;
    if (state.i > 0) {
      state.i--;
      playCurrent();
    }
  }

  function toggleFlag() {
    if (!state.active) return;
    const w = state.words[state.i];
    if (state.flags.has(w)) {
      state.flags.delete(w);
      text(els.feedback, `🚩 Removed flag on “${w}”`);
    } else {
      state.flags.add(w);
      text(els.feedback, `🚩 Flagged “${w}”`);
    }
  }

  function endSession() {
    state.active = false;
    window.AudioGuards.stopAll();

    const flagged = [...state.flags];
    const summary = [
      `Session complete`,
      `Correct: ${state.correct.length}`,
      `Incorrect: ${state.incorrect.length}`,
      flagged.length ? `Flagged: ${flagged.join(', ')}` : `No flagged words`
    ].join(' • ');

    text(els.feedback, summary);
  }

  // ---- bootstrap ------------------------------------------------------------
  async function init() {
    console.log('Bee Mode Ready ✅');
    if (!window.AudioGuards) {
      console.warn('audio-guards.js missing. Load it before this script.');
    } else {
      await window.AudioGuards.primeAudio();
    }

    // wire buttons (if present)
    els.start && els.start.addEventListener('click', async () => {
      if (state.active) return;
      state.active = true;

      state.words = await loadWords();
      if (!state.words || !state.words.length) {
        console.error('Word list load failed: Empty list');
        text(els.feedback, 'No words available.');
        state.active = false;
        return;
      }

      state.i = 0;
      state.flags.clear();
      state.correct = [];
      state.incorrect = [];

      await playCurrent();
    });

    els.say  && els.say.addEventListener('click', () => playCurrent());
    els.next && els.next.addEventListener('click', () => next());
    els.prev && els.prev.addEventListener('click', () => prev());
    els.flag && els.flag.addEventListener('click', () => toggleFlag());
    els.end  && els.end .addEventListener('click', () => endSession());
  }
})();
</script>
