// Tiny shared audio guards for SpeechRecognition + TTS
window.AudioGuards = (function(){
  let recognition = null;

  function getRecognition(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (!recognition) recognition = new SR();
    return recognition;
  }

  function stopAll(){
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch {}
    try { recognition && recognition.stop(); } catch {}
  }

  async function primeAudio(){
    // noop but can be used to warm-up TTS on first interaction if needed
    return true;
  }

  return { getRecognition, stopAll, primeAudio };
})();
