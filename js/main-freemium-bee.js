// Voice spelling with SpeechRecognition + summary + custom words (1 list/day)
(function () {
  const el = (id) => document.getElementById(id);

  const startBtn = el('start-btn');
  const beeArea = el('bee-area');
  const spellingVisual = el('spelling-visual');
  const repeatBtn = el('repeat-btn');
  const skipBtn = el('skip-btn');
  const flagBtn = el('flag-btn');
  const endBtn = el('end-session-btn');
  const liveFeedback = el('live-feedback');
  const results = el('results-area');

  const applyBtn = el('apply-words');
  const ta = el('custom-words');
  const fileInput = el('file-input');
  const cwNote = el('cw-note');

  // 1 list / day limiter
  const CW_KEY = 'bee_cw_last';
  function canApplyCustom() {
    const last = localStorage.getItem(CW_KEY);
    if (!last) return true;
    const then = new Date(+last);
    const now = new Date();
    return then.toDateString() !== now.toDateString();
  }
  function markApplied() { localStorage.setItem(CW_KEY, Date.now().toString()); }

  // default sample
  let baseWords = [
    "apple","banana","cherry","orange","grape","mango","peach","pear","plum","papaya",
    "strawberry","blueberry","watermelon","kiwi","lemon"
  ];
  let words = baseWords.slice();
  let idx = 0;
  let incorrect = [];
  let flagged = [];

  // TTS
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  }

  // Robust letter mapping for ASR quirks
  const LETTERS = {
    a:'a', 'ay':'a', 'hey':'a',
    b:'b', 'bee':'b', 'be':'b',
    c:'c', 'see':'c', 'sea':'c',
    d:'d', 'dee':'d',
    e:'e', 'ee':'e',
    f:'f', 'ef':'f',
    g:'g', 'gee':'g',
    h:'h', 'aitch':'h', 'age':'h',
    i:'i', 'eye':'i',
    j:'j', 'jay':'j',
    k:'k', 'kay':'k',
    l:'l', 'el':'l',
    m:'m', 'em':'m',
    n:'n', 'en':'n',
    o:'o', 'oh':'o',
    p:'p', 'pee':'p',
    q:'q', 'cue':'q', 'queue':'q',
    r:'r', 'ar':'r',
    s:'s', 'ess':'s',
    t:'t', 'tee':'t',
    u:'u', 'you':'u', 'yu':'u',
    v:'v', 'vee':'v',
    w:'w', 'double u':'w', 'double-you':'w',
    x:'x', 'ex':'x',
    y:'y', 'why':'y',
    z:'z', 'zee':'z', 'zed':'z'
  };
  function parseSpelling(transcript) {
    // accept “c h e r r y”, also handles commas/periods
    return transcript
      .toLowerCase()
      .replace(/[,.;:!?]/g,' ')
      .split(/\s+/)
      .map(tok => LETTERS[tok] || tok.replace(/[^a-z]/g,''))
      .join('')
      .trim();
  }

  // SpeechRecognition
  let rec;
  function initRec() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = false;
    return r;
  }

  function updateProgress() {
    spellingVisual.textContent = `Word ${Math.min(idx+1, words.length)} of ${words.length}`;
  }

  function startWord() {
    if (idx >= words.length) return showSummary();
    const w = words[idx];
    updateProgress();
    speak(w);

    // record spelling
    rec = initRec();
    if (!rec) {
      liveFeedback.style.display = 'block';
      liveFeedback.className = 'feedback incorrect';
      liveFeedback.textContent = '⚠️ Speech recognition not supported in this browser. Try Chrome.';
      return;
    }
    liveFeedback.style.display = 'none';

    rec.onresult = (e) => {
      const said = e.results[0][0].transcript;
      const spelled = parseSpelling(said);
      const correct = spelled === w.toLowerCase();

      liveFeedback.style.display = 'block';
      liveFeedback.className = `feedback ${correct?'correct':'incorrect'}`;
      liveFeedback.innerHTML = correct
        ? `✅ Correct: <b>${w}</b>`
        : `❌ Heard: <code>${spelled || said}</code> • ✔ Correct: <b>${w}</b>`;

      if (!correct) incorrect.push(w);
      idx += 1;
      setTimeout(startWord, 900);
    };
    rec.onerror = () => {
      liveFeedback.style.display = 'block';
      liveFeedback.className = 'feedback incorrect';
      liveFeedback.textContent = 'Couldn’t hear you. Tap “Hear Again” and try spelling the letters clearly.';
    };
    rec.onend = () => {};
    rec.start();
  }

  function showSummary() {
    beeArea.classList.add('hidden');
    results.classList.remove('hidden');
    const score = Math.round(((words.length - incorrect.length)/Math.max(1,words.length))*100);
    results.innerHTML = `
      <div class="summary-header">
        <h2>Session Complete</h2>
        <div class="score-display">${score}</div>
        <div class="score-percent">${words.length - incorrect.length}/${words.length} correct</div>
      </div>
      <div class="results-grid">
        <div class="results-card correct">
          <h3><i class="fa fa-check"></i> Flagged Words</h3>
          <ul class="word-list">${flagged.map(w=>`<li class="word-item">${w}</li>`).join('') || '<li class="word-item">– None –</li>'}</ul>
        </div>
        <div class="results-card incorrect">
          <h3><i class="fa fa-xmark"></i> Incorrect Words</h3>
          <ul class="word-list">${incorrect.map(w=>`<li class="word-item">${w}</li>`).join('') || '<li class="word-item">– None –</li>'}</ul>
        </div>
      </div>
      <div class="summary-actions">
        <button id="restart" class="btn-secondary"><i class="fa fa-redo"></i> Restart</button>
        <a class="btn-primary" href="/premium.html"><i class="fa fa-crown"></i> Go Premium</a>
      </div>
    `;
    document.getElementById('restart').addEventListener('click', () => {
      results.classList.add('hidden');
      idx = 0; incorrect = []; flagged = [];
      beeArea.classList.remove('hidden');
      startWord();
    });
  }

  // UI events
  startBtn.addEventListener('click', () => {
    idx = 0; incorrect = []; flagged = [];
    results.classList.add('hidden');
    beeArea.classList.remove('hidden');
    startWord();
  });

  repeatBtn.addEventListener('click', () => {
    if (idx < words.length) speak(words[idx]);
  });
  skipBtn.addEventListener('click', () => {
    incorrect.push(words[idx]); idx += 1; startWord();
  });
  flagBtn.addEventListener('click', () => {
    if (idx < words.length) flagged.push(words[idx]);
    flagBtn.classList.add('active');
    setTimeout(()=>flagBtn.classList.remove('active'),600);
  });
  endBtn.addEventListener('click', showSummary);

  // custom words
  function parseWords(text) {
    return text
      .split(/[\n,]+| {2,}/g)
      .map(s=>s.trim())
      .filter(Boolean)
      .slice(0, 200); // safety
  }
  applyBtn.addEventListener('click', () => {
    if (!canApplyCustom()) {
      cwNote.textContent = 'Limit reached: you can apply one list per day on Bee (freemium).';
      return;
    }
    const list = parseWords(ta.value);
    if (!list.length) { cwNote.textContent = 'Please paste or upload words first.'; return; }
    words = list; markApplied();
    cwNote.textContent = `Custom list applied with ${words.length} words.`;
  });
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const txt = await f.text();
    ta.value = txt;
  });
})();
