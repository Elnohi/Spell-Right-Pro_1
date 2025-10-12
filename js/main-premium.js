/* /js/main-premium.js
 * SpellRightPro Premium Mode
 * Full practice logic with AudioGuards integration & Firebase logging.
 */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const els = {
    start: $("#btnStart"),
    next: $("#btnNext"),
    prev: $("#btnPrev"),
    flag: $("#btnFlag"),
    end: $("#btnEnd"),
    say: $("#btnSay"),
    input: $("#wordInput"),
    progress: document.querySelector('[data-role="progress"]'),
    feedback: document.querySelector('[data-role="feedback"]'),
  };

  const DEFAULT_LIST_PATH = "/data/word-lists/oet.json";
  const FALLBACK = [
    "accommodation",
    "anaesthesia",
    "diagnosis",
    "emergency",
    "respiration",
    "infection",
    "abdomen",
    "injection",
    "stethoscope",
    "cardiology",
  ];

  const state = {
    words: [],
    i: 0,
    flags: new Set(),
    correct: [],
    incorrect: [],
    recognizing: false,
    active: false,
  };

  function t(el, s) {
    if (el) el.textContent = s;
  }

  function norm(s) {
    return (s || "").toLowerCase().replace(/[^\p{L}]+/gu, "");
  }

  function showProgress() {
    if (!els.progress) return;
    const total = state.words.length || 0;
    const idx = Math.min(state.i + 1, total);
    t(els.progress, `Word ${idx} of ${total}`);
  }

  async function loadWords() {
    try {
      const res = await fetch(`${DEFAULT_LIST_PATH}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const arr = Array.isArray(data?.words) ? data.words : Array.isArray(data) ? data : [];
      return arr.length ? arr : FALLBACK;
    } catch (e) {
      console.warn("Premium: word list fetch failed:", e);
      return FALLBACK;
    }
  }

  async function speakWord(word) {
    await window.AudioGuards?.speakOnce(word, { rate: 0.9 });
  }

  async function hearAndGrade(currentWord) {
    const rec = window.AudioGuards?.getRecognition();
    if (!rec) {
      console.warn("SpeechRecognition not supported.");
      return;
    }
    if (state.recognizing) return;
    state.recognizing = true;

    rec.onresult = (e) => {
      const said = e.results[0][0].transcript || "";
      const heard = norm(said);
      const target = norm(currentWord);
      const ok = heard === target;
      if (ok) {
        t(els.feedback, "✅ Correct");
        state.correct.push(currentWord);
      } else {
        t(els.feedback, `❌ Incorrect — ${currentWord}`);
        state.incorrect.push(currentWord);
      }
      state.recognizing = false;
    };
    rec.onerror = (err) => {
      console.warn("Recognition error:", err.error);
      state.recognizing = false;
    };

    await window.AudioGuards.safeStart(rec);
  }

  async function playCurrent() {
    const w = state.words[state.i];
    if (!w) return;
    showProgress();
    t(els.feedback, "🎧 Listen...");
    await speakWord(w);
    await hearAndGrade(w);
  }

  function next() {
    if (state.i < state.words.length - 1) {
      state.i++;
      playCurrent();
    } else {
      endSession();
    }
  }

  function prev() {
    if (state.i > 0) {
      state.i--;
      playCurrent();
    }
  }

  function toggleFlag() {
    const w = state.words[state.i];
    if (!w) return;
    if (state.flags.has(w)) {
      state.flags.delete(w);
      t(els.feedback, `🚩 Removed flag on “${w}”`);
    } else {
      state.flags.add(w);
      t(els.feedback, `🚩 Flagged “${w}”`);
    }
  }

  function checkAnswer() {
    const target = (state.words[state.i] || "").trim();
    const ans = (els.input.value || "").trim();
    if (!target) return;

    if (norm(ans) === norm(target)) {
      t(els.feedback, "✅ Correct");
      state.correct.push(target);
    } else {
      t(els.feedback, `❌ Incorrect — ${target}`);
      state.incorrect.push(target);
    }

    els.input.value = "";
    next();
  }

  function endSession() {
    state.active = false;
    window.AudioGuards?.stopAll();

    const flagged = [...state.flags];
    const summary = [
      `Session Complete`,
      `✅ Correct: ${state.correct.length}`,
      `❌ Incorrect: ${state.incorrect.length}`,
      flagged.length ? `🚩 Flagged: ${flagged.join(", ")}` : "No flagged words",
    ].join(" • ");

    t(els.feedback, summary);

    // Optional Firebase log
    try {
      const user = firebase.auth().currentUser;
      if (user && firebase.firestore) {
        const db = firebase.firestore();
        db.collection("premium_sessions").add({
          user: user.email || user.uid,
          correct: state.correct.length,
          incorrect: state.incorrect.length,
          flagged: [...state.flags],
          timestamp: new Date(),
        });
      }
    } catch (e) {
      console.warn("Firestore logging skipped:", e);
    }
  }

  // ---- Bootstrap ----
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("Premium mode ready ✅");
    await window.AudioGuards?.primeAudio();

    els.start?.addEventListener("click", async () => {
      state.words = await loadWords();
      if (!state.words.length) {
        t(els.feedback, "No words loaded.");
        return;
      }
      state.i = 0;
      state.correct = [];
      state.incorrect = [];
      state.flags.clear();
      state.active = true;
      playCurrent();
    });

    els.next?.addEventListener("click", next);
    els.prev?.addEventListener("click", prev);
    els.flag?.addEventListener("click", toggleFlag);
    els.say?.addEventListener("click", playCurrent);
    els.end?.addEventListener("click", endSession);

    els.input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        checkAnswer();
      }
    });
  });
})();
