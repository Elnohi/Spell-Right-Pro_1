/* ==========================================================
   SpellRightPro — audio-guards.js (non-module version)
   ========================================================== */

window.stopSpeech = function () {
  try {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  } catch (e) {
    console.warn('Speech cancel failed:', e);
  }
};

window.safeStopRecognition = function (recognition) {
  try {
    if (recognition && typeof recognition.stop === 'function') {
      recognition.onend = null;
      recognition.stop();
    }
  } catch (e) {
    console.warn('Recognition stop failed:', e);
  }
};

window.initAudioGuards = function (recognitionInstance = null) {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      window.stopSpeech();
      if (recognitionInstance) window.safeStopRecognition(recognitionInstance);
    }
  });

  window.addEventListener('beforeunload', () => {
    window.stopSpeech();
    if (recognitionInstance) window.safeStopRecognition(recognitionInstance);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise (speech?):', event.reason);
    event.preventDefault();
  });

  console.log('🔊 Audio guards active');
};
