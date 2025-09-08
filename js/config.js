// js/config.js
// ------------------------------
// Frontend runtime configuration
// ------------------------------

// ===== 1) Firebase (REQUIRED) =====
// Uses your production client keys you shared earlier.
window.firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.firebasestorage.app",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// Initialize the default Firebase app once.
(function initFirebaseOnce() {
  try {
    if (window.firebase && (!firebase.apps || !firebase.apps.length)) {
      firebase.initializeApp(window.firebaseConfig);
      // Analytics is optional; ignore if not enabled
      try { firebase.analytics(); } catch (_) {}
    }
  } catch (e) {
    // Surface a console hint but don't crash the app
    console.error("Firebase init failed:", e);
  }
})();


// ===== 2) App / Ads / Stripe settings =====
window.appConfig = {
  // Cloud Run base (no trailing slash)
  apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",

  // AdSense client (freemium only; premium hides ads)
  adClient: "ca-pub-7632930282249669",

  // Optional trial days (server may ignore/override)
  trialDays: 0,

  // Reference URLs (server controls actual Checkout redirect)
  successUrl: "https://spellrightpro.org/premium.html?payment_success=1",
  cancelUrl:  "https://spellrightpro.org/premium.html"
};

// Stripe publishable key (TEST in dev, LIVE in prod)
window.stripeConfig = {
  publicKey: "pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRaV0GPvg004IIcPfC8"
};
