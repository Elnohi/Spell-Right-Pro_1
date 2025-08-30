// /js/config.js
// Frontend runtime configuration (Firebase + app settings)
// NOTE: This is the *only* file you need to update for the Firebase fix.

(function (w) {
  // ---- Correct Firebase project config (from your Firebase console) ----
  // For JS SDK v7.20.0+ measurementId is optional.
  const firebaseConfig = {
    apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
    authDomain: "spellrightpro-firebase.firebaseapp.com",
    projectId: "spellrightpro-firebase",
    storageBucket: "spellrightpro-firebase.firebasestorage.app",
    messagingSenderId: "798456641137",
    appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
    measurementId: "G-H09MF13297"
  };

  // Expose config in both places your pages expect
  w.firebaseConfig = firebaseConfig;
  w.appConfig = w.appConfig || {};
  w.appConfig.firebaseConfig = firebaseConfig;

  // Initialize exactly once (used by pages that import common.js or inline-init)
  function initFirebaseOnce() {
    try {
      if (w.firebase && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        try { firebase.analytics && firebase.analytics(); } catch (_) {}
      }
    } catch (e) {
      console.warn("[config] Firebase init failed:", e);
    }
  }

  // If Firebase SDK already loaded, init now; otherwise other scripts can call it
  if (w.firebase && !firebase.apps?.length) initFirebaseOnce();
  w.__initFirebaseOnce = initFirebaseOnce;

  // ---- Other app settings you already use (unchanged) ----
  w.appConfig.apiBaseUrl = "https://spellrightpro-api-798456641137.us-central1.run.app";
  w.appConfig.adClient = "ca-pub-7632930282249669";
  w.appConfig.stripe = w.appConfig.stripe || { publishableKey: "" };
})(window);
