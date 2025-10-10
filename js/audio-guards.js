/*!
 * audio-guards.js
 * A tiny singleton to safely share / guard audio resources across pages.
 * Works in plain <script> (no modules). Exposes window.AudioGuards.
 */
(function (w) {
  if (w.AudioGuards) return; // already loaded

  const SUPPORTED =
    'SpeechRecognition' in w || 'webkitSpeechRecognition' in w;

  let recognition = null;
  let _primed = false;

  function primeAudio() {
    if (_primed) return Promise.resolve();
    _primed = true;
    
    // request mic permission once up-front to avoid blocked starts
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Mic API not available');
      return Promise.resolve();
    }
    
    return navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => console.log('[AudioGuards] mic primed'))
      .catch((error) => {
        _primed = false;
        console.warn('[AudioGuards] mic permission denied:', error);
        return Promise.reject(error);
      });
  }

  function getRecognition() {
    if (!SUPPORTED) return null;
    if (recognition) return recognition;

    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-US';          // can be changed by caller
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return recognition;
  }

  function stopAll() {
    try { 
      if (recognition) recognition.stop(); 
    } catch(e) {
      console.warn('Error stopping recognition:', e);
    }
    try { 
      if (window.speechSynthesis) speechSynthesis.cancel(); 
    } catch(e) {
      console.warn('Error stopping speech synthesis:', e);
    }
  }

  w.AudioGuards = {
    supported: SUPPORTED,
    primeAudio,
    getRecognition,
    stopAll
  };

  console.log('🔊 Audio guards active');
})(window);
