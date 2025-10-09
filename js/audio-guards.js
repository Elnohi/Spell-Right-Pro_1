/* ==========================================================
   SpellRightPro — audio-guards.js
   Global utility for safer audio (TTS + speech recognition)
   ========================================================== */

/**
 * Cancels any ongoing speech synthesis safely.
 */
export function stopSpeech() {
  try {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn('Speech cancel failed:', e);
  }
}

/**
 * Ensures Web Speech recognition doesn’t hang forever.
 * @param {SpeechRecognition} recognition - the active SpeechRecognition instance
 */
export function safeStopRecognition(recognition) {
  try {
    if (recognition && typeof recognition.stop === 'function') {
      recognition.onend = null;
      recognition.stop();
    }
  } catch (e) {
    console.warn('Recognition stop failed:', e);
  }
}

/**
 * Automatically attaches event listeners that prevent common
 * “audio hanging” behaviors when user leaves or hides the page.
 */
export function initAudioGuards(recognitionInstance = null) {
  // Cancel TTS if the user switches tab or closes window
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopSpeech();
      if (recognitionInstance) safeStopRecognition(recognitionInstance);
    }
  });

  // Cancel speech on unload
  window.addEventListener('beforeunload', () => {
    stopSpeech();
    if (recognitionInstance) safeStopRecognition(recognitionInstance);
  });

  // Catch unhandled rejections (speech API sometimes throws them)
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise (speech?):', event.reason);
    event.preventDefault(); // Prevent silent UI freeze
  });

  console.log('🔊 Audio guards active');
}
