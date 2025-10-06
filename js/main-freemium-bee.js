// =======================================================
// Freemium Bee — add "⋯ More" (End/Restart) when custom words are used
// (rest of logic from your latest working Bee remains as-is)
// =======================================================
(() => {
  // assume your existing Bee code is present; we append minimal changes safely

  // --- Detect elements from your current Bee page ---
  const setupSection   = document.getElementById("bee-setup");
  const gameSection    = document.getElementById("bee-game");
  const resultsSection = document.getElementById("bee-results");

  const startBtn       = document.getElementById("start-bee-btn");
  const addWordsBtn    = document.getElementById("add-words-btn");
  const feedback       = document.getElementById("feedback-area");
  const scoreSummary   = document.getElementById("score-summary");
  const reviewList     = document.getElementById("review-list");
  const wordCount      = document.getElementById("word-count");
  const wordTotal      = document.getElementById("word-total");

  const prevBtn        = document.getElementById("prev-btn");
  const nextBtn        = document.getElementById("next-btn");
  const submitBtn      = document.getElementById("submit-btn");
  const speakBtn       = document.getElementById("speak-btn");
  const flagBtn        = document.getElementById("flag-btn");

  // --- State mirrors your existing variables (keep your originals if present) ---
  let words = window.__beeWords || [];        // hook into existing
  let idx = 0, score = 0;
  const flagged = new Set();
  const incorrect = [];
  let usingCustom = false;

  // --- Add a "More" button dynamically inside controls row ---
  let moreBtn, moreMenu, endBtn, restartBtn;
  function ensureMoreUI() {
    if (moreBtn) return;
    const controlsRow = (prevBtn && prevBtn.parentElement) || document.querySelector(".controls-row") || gameSection;
    moreBtn = document.createElement("button");
    moreBtn.id = "bee-more";
    moreBtn.className = "btn-icon";
    moreBtn.title = "More";
    moreBtn.innerHTML = `<i class="fa fa-ellipsis-h"></i>`;
    controlsRow.insertBefore(moreBtn, submitBtn);

    moreMenu = document.createElement("div");
    moreMenu.id = "bee-more-menu";
    moreMenu.className = "training-card";
    moreMenu.style.cssText = "display:none; position:absolute; right:8px; top:64px; width:220px; padding:12px; z-index:5;";
    moreMenu.innerHTML = `
      <button id="bee-end" class="btn-secondary" style="width:100%; margin-bottom:10px;">🏁 End Session</button>
      <button id="bee-restart" class="btn-secondary" style="width:100%;">🔁 Restart Session</button>
    `;
    controlsRow.style.position = "relative";
    controlsRow.appendChild(moreMenu);

    endBtn = moreMenu.querySelector("#bee-end");
    restartBtn = moreMenu.querySelector("#bee-restart");

    moreBtn.addEventListener("click", () => {
      moreMenu.style.display = moreMenu.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", (e) => {
      if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
        moreMenu.style.display = "none";
      }
    });

    endBtn.addEventListener("click", () => endSession(true));
    restartBtn.addEventListener("click", () => {
      idx = 0; score = 0; incorrect.length = 0; flagged.clear();
      moreMenu.style.display = "none";
      startWord();
    });
  }

  // Hook into your add-words to mark custom list usage and show More
  if (addWordsBtn) {
    addWordsBtn.addEventListener("click", () => {
      usingCustom = true;
      ensureMoreUI();
    });
  }

  // Also ensure More UI becomes available after session starts if custom words already present
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (usingCustom) ensureMoreUI();
    });
  }

  // ---- glue functions; use your existing implementations if already defined ----
  const synth = window.speechSynthesis;
  function normalize(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function speak(word) {
    try { synth && synth.cancel(); const u = new SpeechSynthesisUtterance(word); u.lang = "en-US"; synth.speak(u); } catch {}
  }

  function startWord() {
    if (!words || !words.length) return;
    if (wordCount) wordCount.textContent = String(idx + 1);
    if (wordTotal) wordTotal.textContent = String(words.length);
    feedback && (feedback.textContent = "");
    speak(words[idx]);
  }

  function endSession(early=false) {
    if (!gameSection || !resultsSection) return;
    gameSection.style.display = "none";
    resultsSection.style.display = "block";

    const total = words.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    scoreSummary && (scoreSummary.innerHTML = `You spelled <strong>${score}</strong> of <strong>${total}</strong> correctly${early ? " (ended early)" : ""}.`);

    const reviewMap = new Map();
    incorrect.forEach(i => { const k = String(i.word); const p = reviewMap.get(k)||{}; p.incorrect = i.attempt; reviewMap.set(k,p); });
    Array.from(flagged).forEach(i => { const k = String(words[i]); const p = reviewMap.get(k)||{}; p.flagged = true; reviewMap.set(k,p); });

    if (reviewList) {
      if (!reviewMap.size) { reviewList.innerHTML = `<p class="muted">🎉 Nothing to review. Great job!</p>`; return; }
      const items = [];
      reviewMap.forEach((val, key) => {
        const badges = [];
        if (val.incorrect !== undefined) badges.push(`<span class="badge incorrect">incorrect</span>`);
        if (val.flagged) badges.push(`<span class="badge flagged">flagged</span>`);
        const attempt = val.incorrect !== undefined ? `<small class="muted"> (you: ${(val.incorrect||"").replace(/[^\p{L}\p{N} ]+/gu,"") || "—"})</small>` : "";
        items.push(`<div class="word-item"><strong>${key}</strong> ${badges.join(" ")} ${attempt}</div>`);
      });
      reviewList.innerHTML = items.join("");
    }
  }

  // expose a tiny API so your existing code can call endSession if needed
  window.__beeEndSession = endSession;
})();
