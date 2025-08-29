// /js/config.js
// Frontend runtime configuration (Firebase + app settings)

(function (w) {
  // --- Your Firebase project config (public; safe to ship) ---
  // (values copied from your working premium page)
  const firebaseConfig = {
    apiKey: "AIzaSyCz-rAPnRgVjSRFOfvbqibloWEd63ARVVwo",
    authDomain: "spellrightpro-firebase.firebaseapp.com",
    projectId: "spellrightpro-firebase",
    // storageBucket is not used by the app; keep if you need Storage later.
    storageBucket: "spellrightpro-firebase.appspot.com",
    messagingSenderId: "798456641137",
    appId: "1:798456641137:web:5c6d79db55bf49d04928dd",
    measurementId: "G-H09MF13297"
  };

  // Expose so other scripts can see it
  w.firebaseConfig = firebaseConfig;

  // Initialize Firebase exactly once.
  function initFirebaseOnce() {
    try {
      if (w.firebase && !firebase.apps?.length) {
        firebase.initializeApp(firebaseConfig);
        try { firebase.analytics && firebase.analytics(); } catch (_) {}
      }
    } catch (e) {
      // Do not crash the page if analytics or anything else throws
      console.warn("[config] Firebase init failed:", e);
    }
  }

  // Run immediately if Firebase SDK is already on the page;
  // otherwise common.js will call it.
  if (w.firebase) initFirebaseOnce();
  w.__initFirebaseOnce = initFirebaseOnce;

  // ---- App settings your pages already read ----
  w.appConfig = {
    // Your Cloud Run backend (no trailing slash)
    apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",

    // AdSense client (used only for freemium)
    adClient: "ca-pub-7632930282249669",

    // Stripe publishable key is loaded elsewhere; keeping slot if needed
    stripe: {
      publishableKey: (w.stripeConfig && w.stripeConfig.publicKey) || ""
    }
  };
})(window);
