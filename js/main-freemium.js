/* ==========================================================================
   SpellRightPro – Unified Freemium Modes (Bee / School / OET)
   - One script for all freemium pages
   - Robust scope (no global name clashes)
   - Audio safety guards, end-session summary, enter-to-submit, auto-advance
   - Bee uses data/word-lists/spelling-bee.json
   - OET uses data/word-lists/oet.json (Practice=full, Exam=24 random)
   - School uses user's custom list (textarea/file); 1 list/day limit UX held in UI
   ========================================================================== */
(() => {
  "use strict";

  // ---- Mode detection ------------------------------------------------------
  const MODE =
    (document.body && document.body.dataset.mode) ||
    (location.pathname.includes("bee") ? "bee" :
     location.pathname.includes("school") ? "school" :
     location.pathname.includes("oet") ? "oet" : "school");

  // ---- Element picks (robust to various markup variants) -------------------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    // Inputs / controls
    input: $('#answer, #input, .form-control, textarea[name="answer"], input[type="text"].form-control'),
    start: $('#start, #btnStart, .btn-start, [data-action="start"]'),
    submit: $('#submit, #btnSubmit, button[data-action="submit"]'),
    next: $('#next, #btnNext, button[data-action="next"]'),
    prev: $('#prev, #btnPrev, button[data-action="prev"]'),
    flag: $('#flag, #btnFlag, button[data-action="flag"]'),
    end: $('#end, #btnEnd, .end-session, button[data-action="end-session"]'),
    // Tabs (for OET)
    practiceTab: $('#tabPractice, [data-mode-tab="practice"], .tab-practice'),
    examTab: $('#tabExam, [data-mode-tab="exam"], .tab-exam'),
    // Custom words
    customText: $('#customWords, textarea[name="customWords"], .custom-words textarea, textarea'),
    fileInput: $('#fileInput, #file-input, input[type="file"]'),
    // UI display
    progress: $('#wordProgress, #progress, .word-progress, [data-role="progress"]'),
    feedback: $('#feedback, .feedback, [data-role="feedback"]'),
    trainer: $('.trainer-area, #game-page, main .training-card, .practice-card'),
    summary: $('.summary-area, #results, #results-page'),
  };

  // ---- State ---------------------------------------------------------------
  let masterList = [];     // full list for mode
  let sessionList = [];    // current run words
  let idx = 0;             // current index
  let correct = 0;
  let attempts = 0;
  const incorrectWords = [];
  const flaggedWords = new Set();
  let isExam = false;      // only for OET
  let recognition = null;  // Web Speech API (Bee)
  let listening = false;

  // ---- Helper Functions ----------------------------------------------------
  const sanitizeWord = (w) => (w || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, ""); // remove trailing punctuation

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  };

  const safeStopRecognition = (rec) => {
    try {
      if (rec) rec.stop();
    } catch (e) {
      // Ignore errors from already stopped recognition
    }
  };

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.96;
      u.pitch = 1;
      stopSpeech();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const updateProgress = () => {
    if (!els.progress) return;
    els.progress.textContent = `Word ${idx + 1} of ${sessionList.length}`;
  };

  const setFeedback = (type, msg) => {
    if (!els.feedback) return;
    els.feedback.classList.remove("correct", "incorrect");
    if (type) els.feedback.classList.add(type);
    els.feedback.textContent = msg || "";
  };

  const showLoading = () => {
    document.body.classList.add('loading');
  };

  const hideLoading = () => {
    document.body.classList.remove('loading');
  };

  // ---- Session Summary -----------------------------------------------------
  const endSession = () => {
    stopSpeech();
    safeStopRecognition(recognition);
    listening = false;

    // Build summary if container missing
    let container = els.summary;
    if (!container) {
      container = document.createElement("section");
      container.className = "summary-area";
      document.body.appendChild(container);
    }
    const scorePct = sessionList.length ? Math.round((correct / sessionList.length) * 100) : 0;

    const incorrectHTML = incorrectWords.length
      ? `<div class="results-card incorrect">
           <h3>Incorrect</h3>
           <div class="word-list">${incorrectWords.map(w=>`<div class="word-item">${w}</div>`).join("")}</div>
         </div>`
      : `<div class="results-card incorrect"><h3>Incorrect</h3><p>None 🎉</p></div>`;

    const flaggedArr = Array.from(flaggedWords);
    const flaggedHTML = flaggedArr.length
      ? `<div class="results-card">
           <h3>Flagged</h3>
           <div class="word-list">${flaggedArr.map(w=>`<div class="word-item">${w}</div>`).join("")}</div>
         </div>`
      : `<div class="results-card"><h3>Flagged</h3><p>None</p></div>`;

    container.innerHTML = `
      <div class="summary-header">
        <h2>Session Complete</h2>
        <div class="score-display">${correct}/${sessionList.length}</div>
        <div class="score-percent">${scorePct}%</div>
      </div>
      <div class="results-grid">
        <div class="results-card correct">
          <h3>Correct</h3>
          <div class="score-number">${correct}</div>
        </div>
        ${incorrectHTML}
        ${flaggedHTML}
      </div>
      <div class="summary-actions">
        <a href="index.html" class="btn btn-secondary">Back Home</a>
        <button class="btn btn-primary" id="restart">Restart</button>
      </div>
    `;
    container.classList.remove("hidden");
    
    // Restart handler
    container.querySelector("#restart")?.addEventListener("click", () => {
      startSession(); // same config again
      container.classList.add("hidden");
      setFeedback("", "");
    });
  };

  // ---- Word list loading per mode -----------------------------------------
  async function loadModeList() {
    showLoading();
    try {
      if (MODE === "bee") {
        masterList = await fetchList("data/word-lists/spelling-bee.json");
      } else if (MODE === "oet") {
        masterList = await fetchList("data/word-lists/oet.json");
      } else {
        masterList = []; // school uses only custom
      }
    } catch (error) {
      console.error("Failed to load word list:", error);
      setFeedback("incorrect", "Failed to load word list. Using fallback words.");
      masterList = ["example", "practice", "spelling", "words", "education"];
    } finally {
      hideLoading();
    }
  }

  async function fetchList(path) {
    try {
      const res = await fetch(path, { cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) return data.map(sanitizeWord).filter(Boolean);
      if (data && Array.isArray(data.words)) return data.words.map(sanitizeWord).filter(Boolean);
      return [];
    } catch (e) {
      console.warn("Failed to load list:", path, e);
      return [];
    }
  }

  // ---- Custom list parsing (School / optional Bee & OET) -------------------
  function parseCustomText() {
    const raw = (els.customText?.value || "").trim();
    if (!raw) return [];
    return raw
      .split(/[\n,]+/)
      .map(sanitizeWord)
      .filter(Boolean)
      .slice(0, 20); // Limit to 20 words for freemium
  }

  async function parseCustomFile(file) {
    const text = await file.text();
    return text
      .split(/[\n,]+/)
      .map(sanitizeWord)
      .filter(Boolean)
      .slice(0, 20); // Limit to 20 words for freemium
  }

  // ---- OET Practice / Exam toggle -----------------------------------------
  function applyOETMode() {
    if (MODE !== "oet") return;
    
    els.practiceTab?.addEventListener("click", (e) => {
      e.preventDefault();
      isExam = false;
      setFeedback("", "Practice mode (full list).");
    });
    
    els.examTab?.addEventListener("click", (e) => {
      e.preventDefault();
      isExam = true;
      setFeedback("", "Exam mode (24 random).");
    });
  }

  // ---- Session build -------------------------------------------------------
  function buildSessionList() {
    if (MODE === "school") {
      const custom = parseCustomText();
      sessionList = custom.length ? custom : [];
    } else if (MODE === "oet") {
      if (isExam) {
        const arr = [...masterList];
        shuffle(arr);
        sessionList = arr.slice(0, 24);
      } else {
        sessionList = [...masterList];
      }
    } else {
      // bee
      sessionList = masterList.length ? [...masterList] : parseCustomText();
    }
    
    if (sessionList.length === 0) {
      setFeedback("incorrect", "No words available. Please add custom words or check word list.");
      return false;
    }
    
    idx = 0;
    correct = 0;
    attempts = 0;
    incorrectWords.length = 0;
    flaggedWords.clear();
    return true;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // ---- Bee: Speech recognition (spell-by-letter) --------------------------
  function ensureRecognition() {
    if (window.AudioGuards && window.AudioGuards.getRecognition) {
      return window.AudioGuards.getRecognition();
    }
    
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    return r;
  }

  function startBeeRecognition(targetWord) {
    if (listening) return;
    
    recognition = ensureRecognition();
    if (!recognition) {
      setFeedback("incorrect", "Your browser doesn't support speech recognition. Please type instead.");
      return;
    }
    
    listening = true;
    let heard = "";

    recognition.onresult = (ev) => {
      let transcript = "";
      for (const res of ev.results) {
        transcript += res[0].transcript + " ";
      }
      
      // Convert to letters: remove spaces/punct; map common letter words to letters
      const letterMap = {
        "a": "a","ay":"a","hey":"a",
        "b":"b","bee":"b","be":"b",
        "c":"c","see":"c",
        "d":"d","dee":"d",
        "e":"e",
        "f":"f","eff":"f",
        "g":"g","gee":"g",
        "h":"h","aitch":"h",
        "i":"i","eye":"i",
        "j":"j","jay":"j",
        "k":"k","kay":"k",
        "l":"l","el":"l",
        "m":"m","em":"m",
        "n":"n","en":"n",
        "o":"o","oh":"o",
        "p":"p","pee":"p",
        "q":"q","cue":"q","queue":"q",
        "r":"r","ar":"r",
        "s":"s","ess":"s",
        "t":"t","tee":"t",
        "u":"u","you":"u",
        "v":"v","vee":"v",
        "w":"w","double you":"w",
        "x":"x","ex":"x",
        "y":"y","why":"y",
        "z":"z","zee":"z","zed":"z"
      };
      
      // Break transcript into tokens and map to letters
      const tokens = transcript.toLowerCase().replace(/[.,!?]/g," ").split(/\s+/).filter(Boolean);
      const letters = tokens.map(t => letterMap[t] || (t.length === 1 ? t : "")).join("");
      heard = letters;
      
      // Optional show live in input if present
      if (els.input) els.input.value = letters;
    };

    recognition.onend = () => {
      listening = false;
      // compare
      checkAnswer(targetWord, els.input ? els.input.value : heard, /*voice*/ true);
    };

    recognition.onerror = () => {
      listening = false;
      setFeedback("incorrect", "Couldn't hear that. Try again.");
    };

    try { 
      recognition.start(); 
    } catch (error) {
      listening = false;
      setFeedback("incorrect", "Speech recognition failed. Please try again.");
    }
  }

  // ---- Check answer (all modes) -------------------------------------------
  function checkAnswer(targetWord, userValueRaw, cameFromVoice = false) {
    attempts++;
    const answer = sanitizeWord(userValueRaw || "");
    const target = sanitizeWord(targetWord);

    if (answer && answer === target) {
      correct++;
      setFeedback("correct", `Correct: ${targetWord}`);
      if (els.input) {
        els.input.classList.remove("incorrect-answer");
        els.input.classList.add("correct-answer");
      }
      setTimeout(nextWord, 700);
    } else {
      incorrectWords.push(targetWord);
      setFeedback("incorrect", `Incorrect: ${userValueRaw || "(blank)"} • Answer: ${targetWord}`);
      if (els.input) {
        els.input.classList.remove("correct-answer");
        els.input.classList.add("incorrect-answer");
      }
      // keep focus for typing modes
      if (!cameFromVoice && els.input) els.input.focus();
    }
  }

  // ---- Navigation ----------------------------------------------------------
  function presentWord() {
    if (!sessionList.length) {
      setFeedback("incorrect", MODE === "school"
        ? "Add a custom list to start."
        : "No words available. Please try again.");
      return;
    }
    
    if (idx >= sessionList.length) {
      endSession();
      return;
    }
    
    const word = sessionList[idx];
    updateProgress();
    setFeedback("", "");
    
    if (els.input) {
      els.input.value = "";
      els.input.classList.remove("correct-answer","incorrect-answer");
      if (MODE !== "bee") els.input.focus();
    }
    
    // Speak the word (prompt) for all modes
    speak(word);
    
    if (MODE === "bee") {
      // start recognition right away
      setTimeout(() => startBeeRecognition(word), 1000);
    }
  }

  function prevWord() {
    if (idx > 0) idx--;
    presentWord();
  }

  function nextWord() {
    idx++;
    presentWord();
  }

  // ---- Session start -------------------------------------------------------
  function startSession() {
    if (!buildSessionList()) {
      return;
    }
    
    if (els.trainer) els.trainer.classList.remove("hidden");
    if (els.summary) els.summary.classList.add("hidden");
    
    presentWord();
  }

  // ---- Event bindings ------------------------------------------------------
  function bindEvents() {
    // Start
    els.start?.addEventListener("click", (e) => { 
      e.preventDefault(); 
      startSession(); 
    });

    // Submit (typing modes + Bee fallback if user types)
    els.submit?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!sessionList.length || idx >= sessionList.length) return;
      const word = sessionList[idx];
      checkAnswer(word, els.input ? els.input.value : "");
    });

    // Enter-to-submit
    if (els.input) {
      els.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!sessionList.length || idx >= sessionList.length) return;
          const word = sessionList[idx];
          checkAnswer(word, els.input.value || "");
        }
      });
    }

    // Prev / Next
    els.prev?.addEventListener("click", (e) => { e.preventDefault(); prevWord(); });
    els.next?.addEventListener("click", (e) => { e.preventDefault(); nextWord(); });

    // Flag
    els.flag?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!sessionList.length || idx >= sessionList.length) return;
      const w = sessionList[idx];
      if (flaggedWords.has(w)) {
        flaggedWords.delete(w);
        els.flag.classList.remove("active");
      } else {
        flaggedWords.add(w);
        els.flag.classList.add("active");
      }
    });

    // End Session (direct button)
    els.end?.addEventListener("click", (e) => {
      e.preventDefault();
      endSession();
    });

    // File upload for custom
    els.fileInput?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      
      try {
        const list = await parseCustomFile(f);
        if (els.customText) els.customText.value = list.join("\n");
        setFeedback("", `Loaded ${list.length} words from file.`);
      } catch (error) {
        setFeedback("incorrect", "Failed to read file. Please try again.");
      }
    });

    // OET tabs
    applyOETMode();
  }

  // ---- Audio safety guards -------------------------------------------------
  window.addEventListener("beforeunload", () => {
    stopSpeech();
    safeStopRecognition(recognition);
  });
  
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSpeech();
      safeStopRecognition(recognition);
    }
  });

  // ---- Init ---------------------------------------------------------------
  (async function init() {
    console.log(`🚀 Initializing SpellRightPro - Mode: ${MODE}`);
    
    // Initialize audio guards if available
    if (window.AudioGuards && window.AudioGuards.primeAudio) {
      await window.AudioGuards.primeAudio();
    }
    
    await loadModeList();
    bindEvents();
    
    // Auto-start for modes that don't require custom input
    if (!els.start && MODE !== "school" && masterList.length > 0) {
      startSession();
    }
    
    console.log(`✅ Freemium unified script ready. Mode=${MODE}, words=${masterList.length}`);
  })();
})();
