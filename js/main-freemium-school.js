// =======================================================
// SpellRightPro — Freemium School (Modern, no lifetime stats)
// Typing-based trainer with TTS, clear marking, and summary
// =======================================================
(() => {
  // ------------- State -------------
  let words = [];
  let idx = 0;
  let accent = "en-US";

  // results
  const correct = [];                   // strings
  const incorrect = [];                 // { word, attempt }
  const flagged = new Set();            // indexes

  // ------------- Speech (TTS only) -------------
  const synth = window.speechSynthesis;

  // ------------- DOM -------------
  const startBtn      = document.getElementById("start-btn");
  const trainerArea   = document.getElementById("trainer-area");
  const summaryArea   = document.getElementById("summary-area");

  const customWordsTA = document.getElementById("custom-words");
  const addWordsBtn   = document.getElementById("add-words-btn");

  const wordProgress  = document.getElementById("word-progress");
  const micStatus     = document.getElementById("mic-status"); // kept for UI parity
  const spellingInput = document.getElementById("spelling-input");
  const feedback      = document.getElementById("feedback");

  const prevBtn       = document.getElementById("prev-btn");
  const submitBtn     = document.getElementById("submit-btn");
  const nextBtn       = document.getElementById("next-btn");
  const flagBtn       = document.getElementById("flag-btn");

  const correctList   = document.getElementById("correct-list");
  const incorrectList = document.getElementById("incorrect-list");
  const flaggedList   = document.getElementById("flagged-list");
  const retryBtn      = document.getElementById("retry-btn");
  const newListBtn    = document.getElementById("new-list-btn");

  // ------------- Accent picker -------------
  document.querySelectorAll(".accent-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".accent-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      accent = btn.dataset.accent || "en-US";
    });
  });

  // ------------- Helpers -------------
  const normalize = (s) =>
    (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""); // drop punctuation & spaces

  const stripPunct = (s) => (s || "").replace(/[^\p{L}\p{N} ]+/gu, "").trim();

  const escapeHTML = (s) =>
    (s || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const show = (el, on = true) => { if (el) el.classList[on ? "remove" : "add"]("hidden"); };

  const speak = (text) => {
    try {
      if (!text) return;
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const updateProgress = () => {
    wordProgress.textContent = `Word ${idx + 1} of ${words.length}`;
    flagBtn.classList.toggle("active", flagged.has(idx));
  };

  const resetSession = () => {
    idx = 0;
    correct.length = 0;
    incorrect.length = 0;
    flagged.clear();
    feedback.className = "feedback";
    feedback.textContent = "";
    spellingInput.value = "";
  };

  // ------------- Load words if user didn't add any -------------
  async function ensureWordsLoaded() {
    if (words.length > 0) return;
    try {
      const r = await fetch("/data/school-words.json", { cache: "no-cache" });
      const data = await r.json();
      words = Array.isArray(data?.words) ? data.words : Array.isArray(data) ? data : [];
    } catch {
      // fallback small sample
      words = [
        "chalkboard", "library", "teacher", "student", "pencil",
        "notebook", "science", "history", "geography", "playground"
      ];
    }
  }

  // ------------- Custom words -------------
  addWordsBtn.addEventListener("click", () => {
    const raw = (customWordsTA.value || "").trim();
    if (!raw) { alert("Enter one or more words first."); return; }
    const added = raw.split(/[\s,;|\n\r]+/).map(w => w.trim()).filter(Boolean);
    if (!added.length) { alert("No valid words found."); return; }
    words = Array.from(new Set([ ...added ])); // for freemium: replace with the new list
    alert(`Loaded ${words.length} words for this session.`);
    customWordsTA.value = "";
  });

  // ------------- Start -------------
  startBtn.addEventListener("click", async () => {
    await ensureWordsLoaded();
    if (!words.length) { alert("No words available."); return; }

    resetSession();
    show(trainerArea, true);
    show(summaryArea, false);

    updateProgress();
    speak(words[idx]);
    spellingInput.focus();
  });

  // ------------- Navigation -------------
  prevBtn.addEventListener("click", () => {
    if (idx > 0) { idx--; onNavigate(); }
  });

  nextBtn.addEventListener("click", () => {
    if (idx < words.length - 1) { idx++; onNavigate(); }
    else endSession();
  });

  function onNavigate() {
    feedback.className = "feedback";
    feedback.textContent = "";
    spellingInput.value = "";
    updateProgress();
    speak(words[idx]);
    spellingInput.focus();
  }

  // Flag current word (session only)
  flagBtn.addEventListener("click", () => {
    if (flagged.has(idx)) flagged.delete(idx); else flagged.add(idx);
    flagBtn.classList.toggle("active", flagged.has(idx));
  });

  // ------------- Submit / Check -------------
  submitBtn.addEventListener("click", handleSubmit);
  spellingInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  });

  function handleSubmit() {
    const attemptRaw = spellingInput.value.trim();
    const attempt = normalize(attemptRaw);
    const targetRaw = String(words[idx] || "");
    const target = normalize(targetRaw);

    if (!attempt) {
      feedback.className = "feedback incorrect";
      feedback.innerHTML = `❌ (no input) → ${escapeHTML(targetRaw)}`;
      postCheckAdvance();
      return;
    }

    if (attempt === target) {
      feedback.className = "feedback correct";
      feedback.innerHTML = `✅ Correct: ${escapeHTML(targetRaw)}`;
      correct.push(targetRaw);
    } else {
      feedback.className = "feedback incorrect";
      feedback.innerHTML = `❌ ${escapeHTML(stripPunct(attemptRaw))} → ${escapeHTML(targetRaw)}`;
      incorrect.push({ word: targetRaw, attempt: attemptRaw });
    }

    postCheckAdvance();
  }

  function postCheckAdvance() {
    feedback.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      if (idx < words.length - 1) {
        idx++;
        onNavigate();
      } else {
        endSession();
      }
    }, 900);
  }

  // ------------- End / Summary -------------
  function endSession() {
    show(trainerArea, false);
    buildSummary();
    show(summaryArea, true);
  }

  function buildSummary() {
    // Correct words
    if (correct.length) {
      correctList.innerHTML = correct
        .map(w => `<div class="word-item"><strong>${escapeHTML(w)}</strong> <span class="badge correct">correct</span></div>`)
        .join("");
    } else {
      correctList.innerHTML = `<p class="muted">No correct words recorded this round.</p>`;
    }

    // Incorrect words
    if (incorrect.length) {
      incorrectList.innerHTML = incorrect
        .map(x => `
          <div class="word-item">
            <strong>${escapeHTML(x.word)}</strong>
            <span class="badge incorrect">incorrect</span>
            <small class="muted"> (you: ${escapeHTML(stripPunct(x.attempt)) || "—"})</small>
          </div>
        `)
        .join("");
    } else {
      incorrectList.innerHTML = `<p class="muted">No mistakes. Great job!</p>`;
    }

    // Flagged words (avoid duplicates)
    const flaggedWords = Array.from(flagged).map(i => words[i]).filter(Boolean);
    if (flaggedWords.length) {
      flaggedList.innerHTML = flaggedWords
        .map(w => `<div class="word-item"><strong>${escapeHTML(w)}</strong> <span class="badge flagged">flagged</span></div>`)
        .join("");
    } else {
      flaggedList.innerHTML = `<p class="muted">No flagged words.</p>`;
    }
  }

  // ------------- Summary actions -------------
  retryBtn.addEventListener("click", () => {
    // Retry on incorrect + flagged only, if any; otherwise retry entire list
    const reviewSet = new Set();
    incorrect.forEach(x => reviewSet.add(x.word));
    flagged.forEach(i => reviewSet.add(words[i]));

    const reviewWords = Array.from(reviewSet);
    if (reviewWords.length) {
      words = reviewWords;
    }
    resetSession();
    show(summaryArea, false);
    show(trainerArea, true);
    updateProgress();
    speak(words[idx]);
    spellingInput.focus();
  });

  newListBtn.addEventListener("click", () => {
    // Clear and return to top where user can paste new list
    words = [];
    resetSession();
    show(summaryArea, false);
    // keep trainer hidden until user presses Start again
  });

})();
