/*!
 * main-freemium.js
 * Unified Freemium logic for Bee, OET, and School modes
 * Auto-advance after correct response (2s delay)
 */

(function () {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    start: $("#btnStart"),
    next: $("#btnNext"),
    prev: $("#btnPrev"),
    flag: $("#btnFlag"),
    end: $("#btnEnd"),
    say: $("#btnSayAgain"),
    progress: $("#wordProgress"),
    feedback: $("#feedback"),
    textarea: $("#customWords"),
    input: $("#userInput"), // for OET/School typing
  };

  const state = {
    mode: document.body.dataset.mode || "bee",
    words: [],
    i: 0,
    active: false,
    recognizing: false,
    correct: [],
    incorrect: [],
    flags: new Set(),
  };

  const listPaths = {
    bee: "/data/word-lists/spelling-bee.json",
    oet: "/data/word-lists/oet.json",
    school: "/data/word-lists/school.json",
  };

  async function loadWords() {
    let custom = els.textarea?.value.trim();
    if (custom) {
      const list = custom
        .split(/[\n,]+/)
        .map((w) => w.trim())
        .filter(Boolean);
      if (list.length) return list;
    }

    const path = listPaths[state.mode] || listPaths.bee;
    try {
      const res = await fetch(path, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.words)) return data.words;
      throw new Error("Invalid JSON");
    } catch (err) {
      console.warn("Word list failed to load:", err);
      return ["example", "testing", "practice"];
    }
  }

  function updateProgress() {
    const total = state.words.length || 0;
    const idx = state.i + 1;
    els.progress.textContent = `Word ${idx} of ${total}`;
  }

  function speakWord(word) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      const utter = new SpeechSynthesisUtterance(word);
      utter.rate = 0.9;
      utter.lang = "en-US";
      utter.onend = () => resolve();
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    });
  }

  async function recognizeSpeech(targetWord) {
    const rec = window.AudioGuards?.getRecognition();
    if (!rec) return false;

    return new Promise((resolve) => {
      rec.onresult = (evt) => {
        const said = evt.results[0][0].transcript.toLowerCase().trim();
        const normalized = said.replace(/[^\p{L}]+/gu, "");
        const target = targetWord.toLowerCase().replace(/[^\p{L}]+/gu, "");
        const ok = normalized === target;

        els.feedback.textContent = ok
          ? "✅ Correct (voice)"
          : `❌ Incorrect — ${targetWord}`;
        (ok ? state.correct : state.incorrect).push(targetWord);

        // auto-advance after 2s if correct
        if (ok && (state.mode === "oet" || state.mode === "school")) {
          setTimeout(next, 2000);
        }

        resolve(ok);
      };

      rec.onerror = (e) => {
        console.warn("Speech error:", e);
        els.feedback.textContent = "⚠️ Mic error or no speech.";
        resolve(false);
      };

      try {
        rec.start();
      } catch (err) {
        console.warn("Recognition start failed:", err);
        resolve(false);
      }
    });
  }

  function handleFlag() {
    const word = state.words[state.i];
    if (!word) return;
    if (state.flags.has(word)) {
      state.flags.delete(word);
      els.feedback.textContent = `🚩 Unflagged “${word}”`;
    } else {
      state.flags.add(word);
      els.feedback.textContent = `🚩 Flagged “${word}”`;
    }
  }

  async function playCurrent() {
    if (!state.words[state.i]) return;
    updateProgress();
    const word = state.words[state.i];
    els.feedback.textContent = "🎧 Listen carefully...";
    await speakWord(word);

    if (state.mode === "bee") {
      await recognizeSpeech(word);
      next();
    } else if (state.mode === "oet" || state.mode === "school") {
      els.feedback.textContent =
        "Type the spelling or speak it aloud, then press Enter.";
      els.input.value = "";
      els.input.focus();

      els.input.onkeydown = async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const typed = els.input.value.trim().toLowerCase();
          const target = word.toLowerCase();
          const ok = typed === target;
          els.feedback.textContent = ok
            ? "✅ Correct (typed)"
            : `❌ Incorrect — ${word}`;
          (ok ? state.correct : state.incorrect).push(word);
          if (ok) setTimeout(next, 2000); // auto-advance after 2s
          else next();
        }
      };

      await recognizeSpeech(word);
    }
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

  function endSession() {
    state.active = false;
    window.AudioGuards.stopAll();
    const summary = [
      `✅ Correct: ${state.correct.length}`,
      `❌ Incorrect: ${state.incorrect.length}`,
      `🚩 Flagged: ${[...state.flags].length}`,
    ].join(" • ");
    els.feedback.textContent = "Session complete — " + summary;
  }

  async function startSession() {
    if (state.active) return;
    state.active = true;
    state.words = await loadWords();
    state.i = 0;
    state.correct = [];
    state.incorrect = [];
    state.flags.clear();
    updateProgress();
    await playCurrent();
  }

  function init() {
    console.log(
      `Freemium unified script ready. Mode=${state.mode}, words=${state.words.length}`
    );
    window.AudioGuards?.primeAudio();

    els.start?.addEventListener("click", startSession);
    els.say?.addEventListener("click", playCurrent);
    els.next?.addEventListener("click", next);
    els.prev?.addEventListener("click", prev);
    els.flag?.addEventListener("click", handleFlag);
    els.end?.addEventListener("click", endSession);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
