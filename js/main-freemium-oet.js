// =======================================================
// SpellRightPro — Freemium OET (Modern + 24 random words)
// - Loads from js/oet-words.js (window.OET_WORDS)
// - Auto-focus input after TTS speaks
// - Enter submits (no clicking required)
// - Summary shows incorrect + flagged (combined)
// =======================================================
(() => {
  // ---------- State ----------
  let WORDS = Array.isArray(window.OET_WORDS) ? window.OET_WORDS.slice() : [];
  let setSize = 24;
  let words = [];
  let idx = 0;
  let score = 0;
  let accent = "en-US";
  const flagged = new Set();  // indexes of current set
  const incorrect = [];       // { word, attempt }

  // ---------- Speech ----------
  const synth = window.speechSynthesis;

  // ---------- DOM ----------
  const setup   = document.getElementById("oet-setup");
  const game    = document.getElementById("oet-game");
  const results = document.getElementById("oet-results");

  const modePractice = document.getElementById("mode-practice");
  const modeExam     = document.getElementById("mode-exam");
  const startBtn     = document.getElementById("start-oet-btn");

  const progressLbl  = document.getElementById("oet-progress");
  const input        = document.getElementById("oet-input");
  const feedback     = document.getElementById("oet-feedback");

  const btnRepeat    = document.getElementById("oet-repeat");
  const btnPrev      = document.getElementById("oet-prev");
  const btnNext      = document.getElementById("oet-next");
  const btnFlag      = document.getElementById("oet-flag");
  const btnSubmit    = document.getElementById("oet-submit");

  const scoreLbl     = document.getElementById("oet-score");
  const percentLbl   = document.getElementById("oet-percent");
  const reviewList   = document.getElementById("oet-review");
  const btnRetry     = document.getElementById("oet-retry");
  const btnNew       = document.getElementById("oet-new");

  // ---------- Fallback words if js file missing ----------
  if (!WORDS.length) {
    WORDS = [
      "abdomen","analgesic","anaphylaxis","anemia","antibiotic","appendicitis","arrhythmia","arthritis",
      "asthma","atherosclerosis","auscultation","biopsy","bronchitis","cardiology","catheter","charts",
      "cholesterol","cirrhosis","coagulation","compression","consent","contagious","contraindication",
      "dehydration","dermatology","diagnosis","diarrhea","dilation","dysfunction","edema","embolism",
      "endoscopy","epidural","epilepsy","femur","fever","fracture","gallbladder","glucose","hematology",
      "hemoglobin","hepatitis","hernia","hydration","hypertension","hypotension","immunization",
      "incision","infection","inflammation","insulin","intubation","ischemia","jaundice","laryngitis",
      "lesion","leukemia","liver","lumbar","malignant","metastasis","migraine","nausea","nebulizer",
      "neurology","neutrophil","nursing","obesity","obstetrics","orthopedic","oxygen","palpation",
      "palliative","pancreas","pathology","pediatrics","pelvis","pharmacy","physiotherapy","plasma",
      "pneumonia","potassium","pressure","prognosis","psychiatry","pulse","radiology","recovery",
      "rehabilitation","respiration","sepsis","suture","symptom","syringe","thyroid","trachea",
      "transfusion","trauma","ulcer","ultrasound","urology","vaccination","vascular","vertigo","wound"
    ];
  }

  // ---------- Accent ----------
  document.querySelectorAll(".accent-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".accent-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      accent = btn.dataset.accent || "en-US";
    });
  });

  // ---------- Mode toggle (buttons, no file input) ----------
  let mode = "practice";
  modePractice.addEventListener("click", () => {
    mode = "practice";
    modePractice.classList.add("active");
    modeExam.classList.remove("active");
  });
  modeExam.addEventListener("click", () => {
    mode = "exam";
    modeExam.classList.add("active");
    modePractice.classList.remove("active");
  });

  // ---------- Start ----------
  startBtn.addEventListener("click", () => {
    if (!WORDS.length) return alert("OET word list not found.");
    words = pickRandom(WORDS, setSize);
    idx = 0; score = 0; incorrect.length = 0; flagged.clear();

    setup.style.display   = "none";
    game.style.display    = "block";
    results.style.display = "none";

    updateProgress();
    speakCurrentThenFocus();
  });

  // ---------- Controls ----------
  btnRepeat.addEventListener("click", speakCurrentThenFocus);
  btnPrev.addEventListener("click", () => { if (idx > 0) { idx--; onNavigate(); } });
  btnNext.addEventListener("click", () => { if (idx < words.length - 1) { idx++; onNavigate(); } else endSession(); });
  btnFlag.addEventListener("click", () => {
    if (flagged.has(idx)) flagged.delete(idx); else flagged.add(idx);
    btnFlag.classList.toggle("active", flagged.has(idx));
  });
  btnSubmit.addEventListener("click", handleSubmit);

  // Enter submits (no mouse needed)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  });

  // ---------- Core flow ----------
  function onNavigate() {
    feedback.className = "feedback";
    feedback.textContent = "";
    input.value = "";
    updateProgress();
    speakCurrentThenFocus();
  }

  function updateProgress() {
    progressLbl.textContent = `Word ${idx + 1} of ${words.length}`;
    btnFlag.classList.toggle("active", flagged.has(idx));
  }

  function speakCurrentThenFocus() {
    const w = String(words[idx] || "");
    try {
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(w);
      u.lang = accent;
      u.onend = () => {
        // auto-focus typing box when the word is spoken (as requested)
        input.focus();
        // put cursor at end for mobile keyboards
        const val = input.value; input.value = ""; input.value = val;
      };
      window.speechSynthesis.speak(u);
    } catch {
      // even if TTS fails, focus the input
      input.focus();
    }
  }

  // ---------- Submit / Check ----------
  function handleSubmit() {
    const attemptRaw = (input.value || "").trim();
    const targetRaw = String(words[idx] || "");
    const attempt = normalize(attemptRaw);
    const target  = normalize(targetRaw);

    if (!attempt) {
      setFeedback(false, `❌ (no input) → ${escapeHTML(targetRaw)}`);
      afterCheck();
      return;
    }

    if (attempt === target) {
      score++;
      setFeedback(true, `✅ Correct: ${escapeHTML(targetRaw)}`);
    } else {
      incorrect.push({ word: targetRaw, attempt: attemptRaw });
      setFeedback(false, `❌ ${escapeHTML(stripPunct(attemptRaw))} → ${escapeHTML(targetRaw)}`);
    }
    afterCheck();
  }

  function setFeedback(ok, html) {
    feedback.className = "feedback " + (ok ? "correct" : "incorrect");
    feedback.innerHTML = html;
    feedback.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function afterCheck() {
    setTimeout(() => {
      if (idx < words.length - 1) { idx++; onNavigate(); }
      else { endSession(); }
    }, 900);
  }

  // ---------- End / Summary (combined list) ----------
  function endSession() {
    game.style.display = "none";
    results.style.display = "block";

    const total = words.length;
    const pct   = total ? Math.round((score / total) * 100) : 0;
    scoreLbl.textContent   = `${score}/${total}`;
    percentLbl.textContent = `${pct}%`;

    const reviewMap = new Map(); // word -> { incorrect?: attempt, flagged?: true }
    incorrect.forEach(it => {
      const key = String(it.word);
      const prev = reviewMap.get(key) || {};
      prev.incorrect = it.attempt || "";
      reviewMap.set(key, prev);
    });
    Array.from(flagged).forEach(i => {
      const key = String(words[i]);
      const prev = reviewMap.get(key) || {};
      prev.flagged = true;
      reviewMap.set(key, prev);
    });

    if (reviewMap.size === 0) {
      reviewList.innerHTML = `<p class="muted">🎉 Nothing to review. Great job!</p>`;
      return;
    }

    const items = [];
    reviewMap.forEach((val, key) => {
      const badges = [];
      if (val.incorrect !== undefined) badges.push(`<span class="badge incorrect">incorrect</span>`);
      if (val.flagged) badges.push(`<span class="badge flagged">flagged</span>`);
      const attempt = val.incorrect !== undefined
        ? `<small class="muted"> (you: ${escapeHTML(stripPunct(val.incorrect)) || "—"})</small>`
        : "";
      items.push(
        `<div class="word-item"><strong>${escapeHTML(key)}</strong> ${badges.join(" ")} ${attempt}</div>`
      );
    });
    reviewList.innerHTML = items.join("");
  }

  // Retry: review incorrect+flagged only if any, else full 24 new random
  btnRetry.addEventListener("click", () => {
    const reviewSet = new Set();
    incorrect.forEach(i => reviewSet.add(i.word));
    flagged.forEach(i => reviewSet.add(words[i]));
    const review = Array.from(reviewSet);
    if (review.length) {
      words = review;
    } else {
      words = pickRandom(WORDS, setSize);
    }
    idx = 0; score = 0; incorrect.length = 0; flagged.clear();
    results.style.display = "none";
    game.style.display = "block";
    updateProgress();
    speakCurrentThenFocus();
  });

  // New set: always pick a fresh random 24 from the master list
  btnNew.addEventListener("click", () => {
    words = pickRandom(WORDS, setSize);
    idx = 0; score = 0; incorrect.length = 0; flagged.clear();
    results.style.display = "none";
    game.style.display = "block";
    updateProgress();
    speakCurrentThenFocus();
  });

  // ---------- Helpers ----------
  function pickRandom(source, n) {
    const pool = source.slice();
    const out = [];
    const len = Math.min(n, pool.length);
    for (let i = 0; i < len; i++) {
      const j = Math.floor(Math.random() * pool.length);
      out.push(pool[j]);
      pool.splice(j, 1);
    }
    return out;
  }

  function normalize(s) {
    return (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }
  function stripPunct(s) { return (s || "").replace(/[^\p{L}\p{N} ]+/gu, "").trim(); }
  function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
})();
