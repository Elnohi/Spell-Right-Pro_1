// ======================
// SpellRightPro — Bee FM
// ======================
(() => {
  // State
  let words = [];
  let idx = 0;
  let score = 0;
  let accent = "en-US";
  let flagged = new Set();

  // Speech
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = SR ? new SR() : null;

  // DOM
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

  // Accent picker
  document.querySelectorAll(".accent-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".accent-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      accent = btn.dataset.accent || "en-US";
      if (recognition) recognition.lang = accent;
    });
  });

  // Add words
  document.getElementById("add-words-btn").addEventListener("click", () => {
    const raw = (document.getElementById("words-textarea").value || "").trim();
    if (!raw) return alert("Enter some words first.");
    const added = raw.split(/[\s,;|\n\r]+/).map(w => w.trim()).filter(Boolean);
    words = unique(words.concat(added));
    alert(`Added ${added.length} words. Total: ${words.length}`);
    document.getElementById("words-textarea").value = "";
  });

  // Enable typing (optional)
  enableTypingLink.addEventListener("click", (e) => {
    e.preventDefault();
    typingArea.classList.toggle("hidden");
    if (!typingArea.classList.contains("hidden")) {
      spellingInput.focus();
    }
  });

  // Start
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

    score = 0; idx = 0; flagged.clear();
    wordTotalSpan.textContent = String(words.length);
    show(setupSection, false); show(gameSection, true); show(resultsSection, false);

    initRecognition();
    playWord();
  });

  // Buttons
  document.getElementById("repeat-btn").addEventListener("click", speakCurrent);
  document.getElementById("prev-btn").addEventListener("click", () => { if (idx>0){ idx--; playWord(); } });
  document.getElementById("next-btn").addEventListener("click", () => { if (idx<words.length-1){ idx++; playWord(); } else endSession(); });
  document.getElementById("flag-btn").addEventListener("click", () => {
    if (flagged.has(idx)) flagged.delete(idx); else flagged.add(idx);
    updateFlagPill();
  });

  document.getElementById("submit-btn").addEventListener("click", () => {
    // If typing is enabled, use typed value; otherwise, treat as "repeat & listen"
    if (!typingArea.classList.contains("hidden")) {
      const typed = (spellingInput.value || "").trim();
      if (typed) evaluate(typed);
      else speakAndListen();
    } else {
      // hands-free path: just replay and listen again
      speakAndListen();
    }
  });

  // Enter key support (only when typing is visible)
  document.addEventListener("keydown", (e) => {
    if (typingArea.classList.contains("hidden")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const typed = (spellingInput.value || "").trim();
      if (typed) evaluate(typed);
    }
  });

  // ===== Core flow =====
  function playWord() {
    wordIndexSpan.textContent = String(idx + 1);
    feedbackArea.innerHTML = "";
    spellingInput && (spellingInput.value = "");
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
      u.onend = () => {
        if (recognition) startListening();
      };
    } catch (e) {
      if (recognition) startListening();
    }
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
      // choose the best alternative after normalization
      const alts = Array.from(e.results[0]).map(r => normalize(r.transcript));
      const best = (alts[0] || "").trim();
      evaluate(best, /*alreadyNormalized*/true);
    };

    recognition.onerror = (e) => {
      micStatus.style.display = "none";
      // If user denied mic or error, keep UI functional: allow typing or repeat
      console.warn("SpeechRecognition error:", e);
    };

    recognition.onend = () => {
      micStatus.style.display = "none";
    };
  }

  function evaluate(answer, alreadyNormalized=false) {
    const target = normalize(words[idx] || "");
    const guess  = alreadyNormalized ? answer : normalize(answer);

    if (!guess) {
      feedbackArea.innerHTML = `<p class="incorrect">❌ (No input detected) → ${displayWord(target)}</p>`;
      afterMark();
      return;
    }

    if (guess === target) {
      score++;
      feedbackArea.innerHTML = `<p class="correct">✅ Correct: ${displayWord(target)}</p>`;
    } else {
      feedbackArea.innerHTML = `<p class="incorrect">❌ ${displayWord(guess)} → ${displayWord(target)}</p>`;
    }
    feedbackArea.scrollIntoView({ behavior: "smooth", block: "center" });
    afterMark();
  }

  function afterMark() {
    // Auto advance after short delay
    setTimeout(() => {
      if (idx < words.length - 1) { idx++; playWord(); }
      else { endSession(); }
    }, 1200);
  }

  function endSession() {
    show(gameSection, false); show(resultsSection, true);
    const total = words.length;
    const pct = total ? Math.round((score/total)*100) : 0;
    const flaggedList = Array.from(flagged).map(i => words[i]).filter(Boolean);

    document.getElementById("summary-area").innerHTML = `
      <div class="card">
        <p><strong>Score:</strong> ${score}/${total} (${pct}%)</p>
        ${flaggedList.length ? `
          <p><strong>Flagged (${flaggedList.length}):</strong> ${flaggedList.join(", ")}</p>
        ` : `<p>No flagged words this session.</p>`}
      </div>
    `;
  }

  document.getElementById("restart-btn").addEventListener("click", () => {
    show(resultsSection, false); show(setupSection, true);
    idx = 0; score = 0; flagged.clear();
  });

  // ===== Helpers =====
  function normalize(s) {
    return (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");                        // drop punctuation, spaces, dots, hyphens, etc.
  }

  function displayWord(s) {
    // For display only; keep as-is when possible
    return (s || "").toString();
  }

  function show(el, on){ el && (el.classList[on ? "remove" : "add"]("hidden")); }
  function unique(arr){ return Array.from(new Set(arr)); }

  function speakCurrent(){ speakAndListen(); }
  function updateFlagPill(){
    if (!flagIndicator) return;
    if (flagged.has(idx)) flagIndicator.classList.remove("hidden");
    else flagIndicator.classList.add("hidden");
  }
})();
