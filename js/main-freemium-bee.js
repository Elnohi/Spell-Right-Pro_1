// =======================================================
// SpellRightPro — Freemium Bee (Modern, combined summary)
// =======================================================
(() => {
  // ---------- State ----------
  let words = [];
  let idx = 0;
  let score = 0;
  let accent = "en-US";
  const flagged = new Set();           // store current index numbers
  const incorrect = [];                // { word, guess }

  // ---------- Speech ----------
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = SR ? new SR() : null;

  // ---------- DOM ----------
  const setupSection   = document.getElementById("bee-setup");
  const gameSection    = document.getElementById("bee-game");
  const resultsSection = document.getElementById("bee-results");

  const addWordsBtn    = document.getElementById("add-words-btn");
  const startBtn       = document.getElementById("start-bee-btn");
  const enableTyping   = document.getElementById("enable-typing-link");

  const typingArea     = document.getElementById("typing-area");
  const spellingInput  = document.getElementById("spelling-input");

  const speakBtn       = document.getElementById("speak-btn");
  const prevBtn        = document.getElementById("prev-btn");
  const nextBtn        = document.getElementById("next-btn");
  const flagBtn        = document.getElementById("flag-btn");
  const submitBtn      = document.getElementById("submit-btn");

  const micStatus      = document.getElementById("mic-status");
  const feedbackArea   = document.getElementById("feedback-area");
  const wordCount      = document.getElementById("word-count");
  const wordTotal      = document.getElementById("word-total");
  const flagIndicator  = document.getElementById("flag-indicator");

  const scoreSummary   = document.getElementById("score-summary");
  const scorePercent   = document.getElementById("score-percent");
  const reviewList     = document.getElementById("review-list");

  // ---------- Accent ----------
  document.querySelectorAll(".accent-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".accent-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      accent = btn.dataset.accent || "en-US";
      if (recognition) recognition.lang = accent;
    });
  });

  // ---------- Add words ----------
  addWordsBtn.addEventListener("click", () => {
    const raw = (document.getElementById("words-textarea").value || "").trim();
    if (!raw) return alert("Enter some words first.");
    const added = raw.split(/[\s,;|\n\r]+/).map(w => w.trim()).filter(Boolean);
    words = unique(words.concat(added));
    alert(`Added ${added.length} words. Total: ${words.length}`);
    document.getElementById("words-textarea").value = "";
  });

  // ---------- Optional typing (off by default) ----------
  enableTyping.addEventListener("click", (e) => {
    e.preventDefault();
    typingArea.classList.toggle("d-none");
    if (!typingArea.classList.contains("d-none")) {
      spellingInput.focus();
    }
  });

  // ---------- Start ----------
  startBtn.addEventListener("click", async () => {
    if (words.length === 0) {
      try {
        const r = await fetch("/data/spelling-bee.json", { cache: "no-cache" });
        const data = await r.json();
        words = Array.isArray(data?.words) ? data.words : Array.isArray(data) ? data : [];
      } catch {
        words = ["apple", "banana", "cherry", "doctor", "energy", "family"];
      }
    }
    if (!words.length) return alert("No words available. Please add words first.");

    // Reset session
    idx = 0; score = 0; incorrect.length = 0; flagged.clear();
    wordTotal.textContent = String(words.length);
    show(setupSection, false); show(gameSection, true); show(resultsSection, false);

    initRecognition();
    playWord();
  });

  // ---------- Controls ----------
  speakBtn.addEventListener("click", speakCurrent);
  prevBtn.addEventListener("click", () => { if (idx > 0) { idx--; playWord(); } });
  nextBtn.addEventListener("click", () => { if (idx < words.length - 1) { idx++; playWord(); } else endSession(); });

  flagBtn.addEventListener("click", () => {
    if (flagged.has(idx)) flagged.delete(idx); else flagged.add(idx);
    updateFlagPill();
  });

  submitBtn.addEventListener("click", () => {
    if (!typingArea.classList.contains("d-none")) {
      const typed = (spellingInput.value || "").trim();
      if (typed) evaluate(typed);
      else speakAndListen();
    } else {
      // hands-free default: replay and listen again
      speakAndListen();
    }
  });

  // Enter submits only if typing is enabled
  document.addEventListener("keydown", (e) => {
    if (typingArea.classList.contains("d-none")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const typed = (spellingInput.value || "").trim();
      if (typed) evaluate(typed);
    }
  });

  // ---------- Core flow ----------
  function playWord() {
    wordCount.textContent = String(idx + 1);
    feedbackArea.className = "feedback"; // reset classes
    feedbackArea.textContent = "";
    if (spellingInput) spellingInput.value = "";
    updateFlagPill();
    speakAndListen();
  }

  function speakAndListen() {
    const w = (words[idx] || "").toString();
    try {
      synth && synth.cancel();
      const u = new SpeechSynthesisUtterance(w);
      u.lang = accent;
      synth.speak(u);
      u.onend = () => { if (recognition) startListening(); };
    } catch { if (recognition) startListening(); }
  }

  function speakCurrent() { speakAndListen(); }

  // ---------- Recognition ----------
  function initRecognition() {
    if (!SR) {
      alert("Speech Recognition is not supported in this browser. You can enable typing mode instead.");
      return;
    }
    recognition = new SR();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (e) => {
      hide(micStatus);
      const alts = Array.from(e.results[0]).map(r => normalize(r.transcript));
      const best = (alts[0] || "").trim();
      evaluate(best, /*alreadyNormalized*/true);
    };
    recognition.onerror = () => { hide(micStatus); };
    recognition.onend =    () => { hide(micStatus); };
  }

  function startListening() {
    if (!recognition) return;
    try {
      show(micStatus, true);
      recognition.abort(); // fresh session
      recognition.lang = accent;
      recognition.start();
    } catch {}
  }

  // ---------- Check / Mark ----------
  function evaluate(answer, alreadyNormalized = false) {
    const targetRaw = (words[idx] || "");
    const target = normalize(targetRaw);
    const guess  = alreadyNormalized ? answer : normalize(answer);

    if (guess && guess === target) {
      score++;
      setFeedback(true, `✅ Correct: ${escapeHTML(String(targetRaw))}`);
    } else {
      incorrect.push({ word: String(targetRaw), guess: String(answer || "") });
      const dispGuess  = escapeHTML(stripPunct(answer || "")) || "(no input)";
      const dispTarget = escapeHTML(String(targetRaw));
      setFeedback(false, `❌ ${dispGuess} → ${dispTarget}`);
    }

    setTimeout(() => {
      if (idx < words.length - 1) { idx++; playWord(); }
      else { endSession(); }
    }, 1100);
  }

  function setFeedback(ok, html) {
    feedbackArea.className = "feedback " + (ok ? "correct" : "incorrect");
    feedbackArea.innerHTML = html;
    feedbackArea.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---------- Results (combined list) ----------
  function endSession() {
    show(gameSection, false); show(resultsSection, true);

    const total = words.length;
    const pct = total ? Math.round((score / total) * 100) : 0;

    scoreSummary.textContent = `${score}/${total}`;
    scorePercent.textContent = `${pct}%`;

    // Build a combined list of words to review (incorrect OR flagged).
    // If a word appears in both lists, display it once with both badges.
    const reviewMap = new Map(); // word -> { incorrect?: attempt, flagged?: true }
    incorrect.forEach(item => {
      const key = String(item.word);
      const prev = reviewMap.get(key) || {};
      prev.incorrect = String(item.guess || "");
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
        `<div class="word-item">
          <strong>${escapeHTML(key)}</strong>
          ${badges.join(" ")} ${attempt}
        </div>`
      );
    });

    reviewList.innerHTML = items.join("");
  }

  document.getElementById("restart-btn").addEventListener("click", () => {
    idx = 0; score = 0; incorrect.length = 0; flagged.clear();
    show(resultsSection, false); show(setupSection, true);
  });

  // ---------- Flag indicator ----------
  function updateFlagPill() {
    // Toggle visual state on button
    if (flagged.has(idx)) {
      flagBtn.classList.add("active");
      flagIndicator.classList.remove("d-none");
    } else {
      flagBtn.classList.remove("active");
      flagIndicator.classList.add("d-none");
    }
  }

  // ---------- Helpers ----------
  function normalize(s) {
    return (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""); // remove punctuation/spaces
  }
  function stripPunct(s) {
    return (s || "").replace(/[^\p{L}\p{N} ]+/gu, "").trim();
  }
  function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function unique(arr) { return Array.from(new Set(arr)); }
  function show(el, on = true) { if (!el) return; el.style.display = on ? "" : "none"; }
  function hide(el) { if (el) el.style.display = "none"; }

})();
