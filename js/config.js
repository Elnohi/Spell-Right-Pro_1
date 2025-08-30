// /js/config.js
// Frontend runtime configuration (Firebase + app settings)

(function (w) {
  // --- Your Firebase project config (public; safe to ship) ---
  const firebaseConfig = {
    apiKey: "AIzaSyCz-rAPnRgVjSRFOfvbqibloWEd63ARVVwo",
    authDomain: "spellrightpro-firebase.firebaseapp.com",
    projectId: "spellrightpro-firebase",
    storageBucket: "spellrightpro-firebase.appspot.com",
    messagingSenderId: "798456641137",
    appId: "1:798456641137:web:5c6d79db55bf49d04928dd",
    measurementId: "G-H09MF13297"
  };

  // Expose firebaseConfig for scripts that read it directly
  w.firebaseConfig = firebaseConfig;

  // Initialize Firebase exactly once (used by common.js or pages that don't inline-init)
  function initFirebaseOnce() {
    try {
      if (w.firebase && !firebase.apps?.length) {
        firebase.initializeApp(firebaseConfig);
        try { firebase.analytics && firebase.analytics(); } catch (_) {}
      }
    } catch (e) {
      console.warn("[config] Firebase init failed:", e);
    }
  }

  // Run immediately if Firebase SDK already loaded; otherwise common.js will call it
  if (w.firebase) initFirebaseOnce();
  w.__initFirebaseOnce = initFirebaseOnce;

  // ---- App settings your pages read ----
  w.appConfig = {
    // Make firebaseConfig available under appConfig for pages that expect this path
    firebaseConfig,

    // Your Cloud Run backend (no trailing slash)
    apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",

    // AdSense client (freemium only)
    adClient: "ca-pub-7632930282249669",

    // Stripe (slot preserved if you set it elsewhere)
    stripe: {
      publishableKey: (w.stripeConfig && w.stripeConfig.publicKey) || ""
    }
  };
})(window);
