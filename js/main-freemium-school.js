// =======================================================
// Freemium School — add "⋯ More" (End/Restart) when custom list is used
// (keeps your modern School logic from earlier; only adds More UI + handlers)
// =======================================================
(() => {
  // DOM (from your modern School HTML)
  const trainerArea = document.getElementById("trainer-area");
  const summaryArea = document.getElementById("summary-area");
  const startBtn    = document.getElementById("start-btn");
  const addWordsBtn = document.getElementById("add-words-btn");
  const spellingInput = document.getElementById("spelling-input");
  const feedback    = document.getElementById("feedback");
  const wordProgress= document.getElementById("word-progress");

  const prevBtn     = document.getElementById("prev-btn");
  const submitBtn   = document.getElementById("submit-btn");
  const nextBtn     = document.getElementById("next-btn");
  const flagBtn     = document.getElementById("flag-btn");

  const correctList   = document.getElementById("correct-list");
  const incorrectList = document.getElementById("incorrect-list");
  const flaggedList   = document.getElementById("flagged-list");

  // State
  let words = window.__schoolWords || [];
  let idx = 0;
  const flagged = new Set();
  const correct = [];
  const incorrect = [];
  let usingCustom = false;

  // --- Add More UI dynamically when custom list is used ---
  let moreBtn, moreMenu, endBtn, restartBtn;
  function ensureMoreUI() {
    if (moreBtn) return;
    const controls = (nextBtn && nextBtn.parentElement) || trainerArea;
    moreBtn = document.createElement("button");
    moreBtn.id = "school-more";
    moreBtn.className = "btn-icon";
    moreBtn.title = "More";
    moreBtn.innerHTML = `<i class="fa fa-ellipsis-h"></i>`;
    controls.insertBefore(moreBtn, submitBtn.nextSibling);

    moreMenu = document.createElement("div");
    moreMenu.id = "school-more-menu";
    moreMenu.className = "training-card";
    moreMenu.style.cssText = "display:none; position:absolute; right:8px; top:64px; width:220px; padding:12px; z-index:5;";
    moreMenu.innerHTML = `
      <button id="school-end" class="btn-secondary" style="width:100%; margin-bottom:10px;">🏁 End Session</button>
      <button id="school-restart" class="btn-secondary" style="width:100%;">🔁 Restart Session</button>
    `;
    controls.style.position = "relative";
    controls.appendChild(moreMenu);

    endBtn = moreMenu.querySelector("#school-end");
    restartBtn = moreMenu.querySelector("#school-restart");

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
      idx = 0; correct.length = 0; incorrect.length = 0; flagged.clear();
      moreMenu.style.display = "none";
      onNavigate();
    });
  }

  if (addWordsBtn) {
    addWordsBtn.addEventListener("click", () => { usingCustom = true; ensureMoreUI(); });
  }
  if (startBtn) {
    startBtn.addEventListener("click", () => { if (usingCustom) ensureMoreUI(); });
  }

  // ---- minimal glue (use your existing School logic for these) ----
  const synth = window.speechSynthesis;
  function speak(text) { try { synth && synth.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; synth.speak(u);} catch{} }

  function updateProgress() {
    wordProgress && (wordProgress.textContent = `Word ${idx + 1} of ${words.length}`);
    flagBtn && flagBtn.classList.toggle("active", flagged.has(idx));
  }
  function onNavigate() {
    feedback.className = "feedback";
    feedback.textContent = "";
    spellingInput.value = "";
    updateProgress();
    if (words[idx]) speak(words[idx]);
    spellingInput.focus();
  }

  function endSession(early=false) {
    trainerArea.classList.add("hidden");
    renderSummary(early);
    summaryArea.classList.remove("hidden");
  }

  function renderSummary(early) {
    // Correct
    correctList.innerHTML = correct.length
      ? correct.map(w => `<div class="word-item"><strong>${w}</strong> <span class="badge correct">correct</span></div>`).join("")
      : `<p class="muted">No correct words this round.</p>`;

    // Incorrect
    incorrectList.innerHTML = incorrect.length
      ? incorrect.map(x => `<div class="word-item"><strong>${x.word}</strong> <span class="badge incorrect">incorrect</span><small class="muted"> (you: ${(x.attempt||"").replace(/[^\p{L}\p{N} ]+/gu,"") || "—"})</small></div>`).join("")
      : `<p class="muted">No mistakes. Great job!</p>`;

    // Flagged
    const flaggedWords = Array.from(flagged).map(i => words[i]).filter(Boolean);
    flaggedList.innerHTML = flaggedWords.length
      ? flaggedWords.map(w => `<div class="word-item"><strong>${w}</strong> <span class="badge flagged">flagged</span></div>`).join("")
      : `<p class="muted">No flagged words.</p>`;
  }

  // Expose for potential reuse
  window.__schoolEndSession = endSession;
})();
