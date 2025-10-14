/**
 * AudioGuards – unified speech & TTS safety layer
 * Must be loaded BEFORE main-freemium.js or main-premium.js
 */
window.AudioGuards = (() => {
  const hasSR = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  let rec, speaking = false, lastStart = 0, inUse = false;

  function getRecognition() {
    if (!hasSR) return null;
    if (!rec) {
      const C = window.SpeechRecognition || window.webkitSpeechRecognition;
      rec = new C();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
    }
    return rec;
  }

  function primeAudio() {
    try { speechSynthesis.getVoices(); } catch {}
  }

  function speak(text, { rate = 0.95, lang = "en-US" } = {}) {
    return new Promise(res => {
      if (!("speechSynthesis" in window)) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate;
      const v = speechSynthesis.getVoices().find(v => /^en[-_]/i.test(v.lang));
      if (v) u.voice = v;
      speaking = true;
      u.onend = () => { speaking = false; res(); };
      try { speechSynthesis.cancel(); } catch {}
      speechSynthesis.speak(u);
    });
  }

  function stopAll() {
    try { speechSynthesis.cancel(); } catch {}
    const r = getRecognition();
    if (!r) return;
    try { r.stop(); } catch {}
    inUse = false;
  }

  function safeStart(rec, onResult, onError) {
    if (!rec || inUse) return;
    inUse = true;
    rec.onresult = ev => { inUse = false; onResult?.(ev); };
    rec.onerror = ev => { inUse = false; onError?.(ev); };
    rec.onend = () => { inUse = false; };
    const now = Date.now();
    if (now - lastStart < 300) return;
    lastStart = now;
    try { rec.start(); } catch {}
  }

  return { getRecognition, primeAudio, speak, stopAll, safeStart };
})();
