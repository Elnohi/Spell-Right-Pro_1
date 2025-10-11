/*!
 * audio-guards.js
 * Lightweight cross-browser wrapper for SpeechRecognition
 * Used by all freemium and premium SpellRightPro modes.
 */

window.AudioGuards = (function () {
  const guards = {};
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  let activeRecognition = null;

  function primeAudio() {
    console.log("Audio guards active");
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }
    // Preload a silent utterance to activate audio permissions (Chrome fix)
    const utter = new SpeechSynthesisUtterance("Ready");
    utter.volume = 0;
    try {
      speechSynthesis.speak(utter);
    } catch (_) {}
  }

  function getRecognition() {
    if (!SpeechRecognition) return null;
    if (activeRecognition) return activeRecognition;
    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      activeRecognition = rec;
      return rec;
    } catch (err) {
      console.error("Failed to create recognition:", err);
      return null;
    }
  }

  function stopAll() {
    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch (_) {}
      activeRecognition = null;
    }
  }

  return { primeAudio, getRecognition, stopAll };
})();
