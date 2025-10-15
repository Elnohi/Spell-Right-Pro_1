/* ==========================================================================
   SpellRightPro – Unified Freemium Modes (Bee / School / OET)
   - Fixes: custom list loader button, voice-only Bee, auto-advance,
            immediate clearing after mark, dark mode persistence,
            OET JSON fallback, larger input for accessibility.
   ========================================================================== */
(() => {
  "use strict";

  // ---------- Mode detection ----------
  const MODE =
    (document.body && document.body.dataset.mode) ||
    (location.pathname.includes("bee") ? "bee" :
     location.pathname.includes("school") ? "school" :
     location.pathname.includes("oet") ? "oet" : "school");

  // ---------- Query helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // ---------- Elements ----------
  const els = {
    start:   $('#start'),
    submit:  $('#submit'),
    next:    $('#next'),
    prev:    $('#prev'),
    flag:    $('#flag'),
    end:     $('#end'),

    progress: $('#progress'),
    feedback: $('#feedback'),
    summary:  document.querySelector('.summary-area'),

    // Answer field (School/OET)
    input:   $('#answer'),

    // Custom list UI (all 3 modes)
    customText: $('#customWords'),
    fileInput:  $('#file-input'),
    useCustom:  $('#useCustomList'),

    // OET tabs (freemium still has practice/exam controls)
    tabPractice: $('#tabPractice'),
    tabExam:     $('#tabExam'),

    // Dark mode
    darkToggle:  document.getElementById('darkModeToggle')
  };

  // ---------- Dark mode (works if the toggle exists) ----------
  try {
    if (localStorage.getItem('dark') === 'true') {
      document.body.classList.add('dark-mode');
    }
    on(els.darkToggle, 'click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('dark', document.body.classList.contains('dark-mode'));
    });
  } catch {}

  // ---------- State ----------
  let master = [];        // full list for the selected mode
  let words = [];         // active session list
  let i = 0;              // index
  const incorrect = [];
  const flagged = new Set();
  let isExam = false;     // OET: practice vs exam
  let rec = null;         // web speech (Bee)
  let listening = false;

  // ---------- Utilities ----------
  const sanitize = (w) =>
    (w || "").toString().trim().toLowerCase().replace(/[.,!?;:'"()]/g, "");

  const updateProgress = () => {
    if (!els.progress) return;
    els.progress.textContent = words.length
      ? `Word ${Math.min(i + 1, words.length)} of ${words.length}`
      : '';
  };

  const setFeedback = (msg) => { if (els.feedback) els.feedback.textContent = msg; };

  // Larger, more readable input box on freemium pages
  if (els.input) {
    els.input.style.minHeight = '54px';
    els.input.style.fontSize = '1.1rem';
  }

  // ---------- Word Sources ----------
  async function loadDefaultBee() {
    try {
      const res = await fetch('/data/word-lists/spelling-bee.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return Array.isArray(data?.words) ? data.words : (Array.isArray(data) ? data : []);
    } catch {
      return ['accommodate','rhythm','occurrence','necessary','embarrass','definitely','separate','recommend','privilege','challenge'];
    }
  }

  async function loadDefaultSchool() {
    try {
      const res = await fetch('/data/word-lists/school.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return Array.isArray(data?.words) ? data.words : (Array.isArray(data) ? data : []);
    } catch {
      return ['apple','banana','computer','dictionary','elephant','friendly','garden','hospital','important','jungle','kitchen','library','mountain','notebook','ocean','pencil','question','rabbit','school','teacher'];
    }
  }

  async function loadDefaultOET() {
    // Freemium OET reads from JSON; if missing, fallback to a small set
    try {
      const res = await fetch('/data/word-lists/oet.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return Array.isArray(data?.words) ? data.words : (Array.isArray(data) ? data : []);
    } catch {
      return ['anaphylaxis','auscultation','bronchiole','cyanosis','diaphoresis','edema','fascia','ganglion','hematoma','ischemia','jaundice','kyphosis','lesion','myalgia','necrosis','oedema','pericardium','quadriceps','respiratory','syncope','tendon','ulceration','vital','wrist'];
    }
  }

  function chooseExamSubset(list, count = 24) {
    const arr = [...list];
    for (let j = arr.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
    return arr.slice(0, Math.min(count, arr.length));
  }

  // ---------- Custom list handling (textarea + file) ----------
  async function parseUploadedFile(file) {
    const text = await file.text();
    return text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  }

  function parseCustomTextarea() {
    const raw = (els.customText?.value || '').trim();
    if (!raw) return [];
    return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  }

  async function handleUseCustomList() {
    let list = parseCustomTextarea();

    // if no textarea, try file input
    if ((!list || list.length === 0) && els.fileInput?.files?.[0]) {
      list = await parseUploadedFile(els.fileInput.files[0]);
    }

    if (!list || list.length === 0) {
      alert('Please paste words or upload a .txt/.csv file first.');
      return;
    }

    master = list;
    words  = [...master];
    i = 0;
    incorrect.length = 0;
    flagged.clear();
    setFeedback(`Loaded ${words.length} custom words.`);
    updateProgress();
  }

  on(els.useCustom, 'click', handleUseCustomList);
  on(els.fileInput, 'change', async () => {
    if (!els.fileInput.files[0]) return;
    setFeedback('Reading uploaded file…');
    const list = await parseUploadedFile(els.fileInput.files[0]);
    if (list.length) {
      // keep words in textarea for user visibility, but we’ll still require pressing the button
      setFeedback(`File ready (${list.length} words). Click “+ Use Custom List” to apply.`);
    } else {
      setFeedback('Could not read any words from the file.');
    }
  });

  // ---------- Speech (Bee) ----------
  function getRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (rec) return rec;
    rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    return rec;
  }

  function normalizeSpelled(s) {
    if (!s) return '';
    return s.toLowerCase().replace(/[^\p{L}]+/gu, '').replace(/\.$/, '');
  }

  function speak(text) {
    try {
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function stopRecSafe() {
    try { rec && rec.stop(); } catch {}
    listening = false;
  }

  // ---------- Core flow ----------
  async function ensureMasterLoaded() {
    if (master.length) return;

    if (MODE === 'bee') master = await loadDefaultBee();
    else if (MODE === 'school') master = await loadDefaultSchool();
    else master = await loadDefaultOET(); // freemium OET JSON

    words = [...master];
    i = 0;
    updateProgress();
  }

  async function startSession() {
    await ensureMasterLoaded();
    incorrect.length = 0;
    flagged.clear();
    i = 0;
    setFeedback(MODE === 'bee' ? '🎧 Listen carefully…' : '✍️ Type what you hear…');
    updateProgress();

    if (MODE === 'bee') {
      // voice-only: do not show the word anywhere
      doBeeTurn();
    } else {
      doTypeTurn(); // School / OET
    }
  }

  // Bee: speak, then listen, grade, auto-advance
  function doBeeTurn() {
    if (!words[i]) return endSession();
    const w = words[i];

    // Speak
    speak(w);
    // Start recognition after small delay to avoid picking up the TTS
    setTimeout(() => {
      const R = getRecognition();
      if (!R) {
        setFeedback('⚠️ Speech recognition not supported in this browser.');
        return;
      }
      if (listening) return;
      listening = true;

      R.onresult = (evt) => {
        const said = evt.results[0][0].transcript || '';
        const heard = normalizeSpelled(said);
        const target = normalizeSpelled(w);
        const ok = (heard === target);

        listening = false;
        stopRecSafe();

        if (ok) {
          setFeedback('✅ Correct');
        } else {
          setFeedback('❌ Incorrect');
          incorrect.push(w);
        }

        // auto-advance shortly after grading
        setTimeout(() => {
          i++;
          if (i >= words.length) endSession();
          else doBeeTurn();
          updateProgress();
        }, 600);
      };

      R.onerror = () => {
        listening = false;
        stopRecSafe();
        setFeedback('⚠️ Mic error. Tap Start again.');
      };

      R.onend = () => { listening = false; };

      try { R.start(); } catch {}
    }, 350);
  }

  // School/OET typing flow
  function doTypeTurn() {
    if (!words[i]) return endSession();
    const w = words[i];
    speak(w); // speak once

    // focus input
    if (els.input) {
      els.input.removeAttribute('disabled');
      els.input.value = '';
      els.input.focus();
    }
  }

  function gradeTyped() {
    if (!words[i]) return;

    const w = words[i];
    const a = sanitize(els.input?.value);

    if (!a) {
      setFeedback('✍️ Please type your spelling, then press Enter or Submit.');
      if (els.input) els.input.focus();
      return;
    }

    const ok = (a === sanitize(w));
    setFeedback(ok ? '✅ Correct' : '❌ Incorrect');
    if (!ok) incorrect.push(w);

    // immediately clear the input after mark (requested)
    if (els.input) {
      els.input.value = '';
      els.input.blur();
    }

    // short pause then move on
    setTimeout(() => {
      i++;
      if (i >= words.length) endSession();
      else doTypeTurn();
      updateProgress();
    }, 500);
  }

  function prev() {
    if (i > 0) {
      i--;
      setFeedback('');
      (MODE === 'bee') ? doBeeTurn() : doTypeTurn();
      updateProgress();
    }
  }

  function next() {
    if (i < words.length - 1) {
      i++;
      setFeedback('');
      (MODE === 'bee') ? doBeeTurn() : doTypeTurn();
      updateProgress();
    } else {
      endSession();
    }
  }

  function toggleFlag() {
    const w = words[i];
    if (!w) return;
    if (flagged.has(w)) {
      flagged.delete(w);
      setFeedback('🚩 Flag removed');
    } else {
      flagged.add(w);
      setFeedback('🚩 Flagged');
    }
  }

  function endSession() {
    stopRecSafe();
    const wrong = incorrect.slice();
    const flags = [...flagged];

    if (els.summary) {
      els.summary.classList.remove('hidden');
      els.summary.innerHTML = `
        <div class="summary-header">
          <h3>Session Summary</h3>
        </div>
        <div class="results-grid">
          <div class="results-card incorrect">
            <h3><i class="fa fa-xmark"></i> Incorrect (${wrong.length})</h3>
            <div class="word-list">${
              wrong.length ? wrong.map(w => `<div class="word-item">${w}</div>`).join('') : '<em>None</em>'
            }</div>
          </div>
          <div class="results-card">
            <h3><i class="fa fa-flag"></i> Flagged (${flags.length})</h3>
            <div class="word-list">${
              flags.length ? flags.map(w => `<div class="word-item">${w}</div>`).join('') : '<em>None</em>'
            }</div>
          </div>
        </div>
      `;
      try { window.insertSummaryAd && window.insertSummaryAd(); } catch {}
    }
    setFeedback('✅ Session complete');
  }

  // ---------- OET tabs (freemium) ----------
  on(els.tabPractice, 'click', () => {
    isExam = false;
    words = [...master];
    i = 0;
    setFeedback('Practice mode: full list.');
    updateProgress();
  });
  on(els.tabExam, 'click', () => {
    isExam = true;
    words = chooseExamSubset(master, 24);
    i = 0;
    setFeedback(`Exam mode: 24 random words (loaded ${words.length}).`);
    updateProgress();
  });

  // ---------- Keyboard shortcuts ----------
  on(document, 'keydown', (e) => {
    if (e.key === 'Enter' && els.input && document.activeElement === els.input) {
      e.preventDefault();
      gradeTyped();
    }
  });

  // ---------- Button wiring ----------
  on(els.start,  'click', startSession);
  on(els.submit, 'click', gradeTyped);
  on(els.next,   'click', next);
  on(els.prev,   'click', prev);
  on(els.flag,   'click', toggleFlag);
  on(els.end,    'click', endSession);

  // ---------- Boot ----------
  (async () => {
    // preload master
    await ensureMasterLoaded();
    // default OET tab is Practice
    if (MODE === 'oet') {
      isExam = false;
      words = [...master];
    }
    updateProgress();
  })();
})();
