// ============================
// SpellRightPro — Bee Freemium
// Modern layout + robust logic
// ============================
(() => {
  // ---------- State ----------
  let words = [];
  let idx = 0;
  let score = 0;
  let accent = "en-US";

  // local-only flags + incorrect log
  const flagged = new Set();                   // stores indexes for this session
  const incorrect = [];                        // { word, guess } for this session

  // ---------- Speech ----------
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = SR ? new SR() : null;

  // ---------- DOM ----------
  const setupSection   = document.getElementById("setup-section");
  const gameSection    = document.getElementById("game-section");
  const resultsSection = document.getElementById("results-section");

  const enableTypingLink = document.getElementById("enable-typing-link");
  const typingArea    = document.getElementById("typing-area");
  const spellingInput = document.getElementById("spelling-input");

  const feedbackArea  = document.getElementById("feedback-area");
  const micStatus     = document.getElementById("mic-status");
  const wordIndexSpan = document.getElementById("word-index");
  const wordTotalSpan = document.getElementById("word-total");
  const flagIndicator = document.getElementById("flag-indicator");

  // ---------- Accent ----------
  document.querySelectorAll(".accent-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".accent-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      accent = btn.dataset.accent || "en-US";
      if (recognition) recognition.lang = accent;
    });
  });

  // ---------- Custom words ----------
  document.getElementById("add-words-btn").addEventListener("click", () => {
    const raw = (document.getElementById("words-textarea").value || "").trim();
    if (!raw) return alert("Enter some words first.");
    const added = raw.split(/[\s,;|\n\r]+/).map(w => w.trim()).filter(Boolean);
    words = unique(words.concat(added));
    alert(`Added ${added.length} words. Total: ${words.length}`);
    document.getElementById("words-textarea").value = "";
  });

  // Optional typing (off by default)
  enableTypingLink.addEventListener("click", (e) => {
    e.preventDefault();
    typingArea.classList.toggle("hidden");
    if (!typingArea.classList.contains("hidden")) {
      spellingInput.focus();
    }
  });

  // ---------- Start ----------
  document.getElementById("start-button").addEventListener("click", async () => {
    if (words.length === 0) {
      try {
        const r = await fetch("/data/spelling-bee.json", { cache: "no-cache" });
        const data = await r.json();
        words = Array.isArray(data?.words) ? data.words : Array.isArray(data) ? data : [];
      } catch {
        words = ["apple","banana","cherry","doctor","energy","family"];
      }
    }
    if (words.length === 0) return alert("No words available. Please add words.");

    // reset session
    score = 0; idx = 0; flagged.clear(); incorrect.length = 0;

    wordTotalSpan.textContent = String(words.length);
    show(setupSection, false); show(gameSection, true); show(resultsSection, false);

    initRecognition();
    playWord();
  });

  // ---------- Controls ----------
  document.getElementById("repeat-btn").addEventListener("click", speakCurrent);
  document.getElementById("prev-btn").addEventListener("click", () => {
    if (idx > 0) { idx--; playWord(); }
  });
  document.getElementById("next-btn").addEventListener("click", () => {
    if (idx < words.length - 1) { idx++; playWord(); }
    else endSession();
  });
  document.getElementById("flag-btn").addEventListener("click", () => {
    if (flagged.has(idx)) flagged.delete(idx); else flagged.add(idx);
    updateFlagPill();
  });
  document.getElementById("submit-btn").addEventListener("click", () => {
    if (!typingArea.classList.contains("hidden")) {
      const typed = (spellingInput.value || "").trim();
      if (typed) evaluate(typed);
      else speakAndListen();
    } else {
      speakAndListen();
    }
  });

  // Enter submits only if typing is enabled
  document.addEventListener("keydown", (e) => {
    if (typingArea.classList.contains("hidden")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const typed = (spellingInput.value || "").trim();
      if (typed) evaluate(typed);
    }
  });

  // ---------- Core flow ----------
  function playWord() {
    wordIndexSpan.textContent = String(idx + 1);
    feedbackArea.innerHTML = "";
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
      micStatus.style.display = "none";
      const alts = Array.from(e.results[0]).map(r => normalize(r.transcript));
      const best = (alts[0] || "").trim();
      evaluate(best, true);
    };
    recognition.onerror = () => { micStatus.style.display = "none"; };
    recognition.onend =    () => { micStatus.style.display = "none"; };
  }

  function startListening() {
    if (!recognition) return;
    try {
      micStatus.style.display = "block";
      recognition.abort(); // ensure fresh session
      recognition.lang = accent;
      recognition.start();
    } catch {}
  }

  // ---------- Checking ----------
  function evaluate(answer, alreadyNormalized=false) {
    const targetRaw = (words[idx] || "");
    const target = normalize(targetRaw);
    const guess  = alreadyNormalized ? answer : normalize(answer);

    const isCorrect = guess && guess === target;

    if (isCorrect) {
      score++;
      feedbackArea.innerHTML = `<p class="correct">✅ Correct: ${escapeHTML(String(targetRaw))}</p>`;
    } else {
      // store incorrect (for summary)
      incorrect.push({ word: String(targetRaw), guess: String(answer || "") });
      const dispGuess = escapeHTML(stripPunct(answer || ""));
      const dispTarget = escapeHTML(String(targetRaw));
      feedbackArea.innerHTML = `<p class="incorrect">❌ ${dispGuess || "(no input)"} → ${dispTarget}</p>`;
    }
    feedbackArea.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      if (idx < words.length - 1) { idx++; playWord(); }
      else { endSession(); }
    }, 1100);
  }

  // ---------- Results ----------
  function endSession() {
    show(gameSection, false); show(resultsSection, true);

    const total = words.length;
    const pct = total ? Math.round((score / total) * 100) : 0;

    const flaggedList = Array.from(flagged).map(i => String(words[i])).filter(Boolean);
    const incorrectList = incorrect.slice(); // [{word, guess}]

    const incHTML = incorrectList.length
      ? `<h3>Words to Review</h3>
         <ol class="summary-list">
           ${incorrectList.map(it => `
             <li>❌ <strong>${escapeHTML(it.word)}</strong>
             <small class="muted"> (you: ${escapeHTML(stripPunct(it.guess)) || "—"})</small></li>
           `).join("")}
         </ol>`
      : `<p class="muted">No incorrect words. Great job!</p>`;

    const flagHTML = flaggedList.length
      ? `<h3>Flagged Words</h3>
         <p>${flaggedList.map(escapeHTML).join(", ")}</p>`
      : `<p class="muted">No flagged words.</p>`;

    document.getElementById("summary-area").innerHTML = `
      <div class="card" style="border-radius:12px">
        <p><strong>Score:</strong> ${score}/${total} • ${pct}%</p>
        ${incHTML}
        ${flagHTML}
      </div>
    `;
  }

  document.getElementById("restart-btn").addEventListener("click", () => {
    show(resultsSection, false); show(setupSection, true);
    idx = 0; score = 0; flagged.clear(); incorrect.length = 0;
  });

  // ---------- Helpers ----------
  function normalize(s) {
    return (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""); // remove punctuation/spaces/dots/hyphens
  }
  function stripPunct(s){
    return (s || "").replace(/[^\p{L}\p{N} ]+/gu, "").trim();
  }
  function escapeHTML(s){
    return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function show(el, on){ el && (el.classList[on ? "remove" : "add"]("hidden")); }
  function unique(arr){ return Array.from(new Set(arr)); }
})();
