<!-- Make sure this loads BEFORE main-premium.js and other app scripts -->
<script>
// ===== js/config.js (clean) =====

// 1) Firebase web config (public)
window.firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.appspot.com",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// Backend + Stripe config (NO placeholders)
window.appConfig = {
  apiBaseUrl: "https://spellrightpro-api-<your-id>-uc.a.run.app", // your Cloud Run URL, no trailing slash
  trialDays: 0, // you said no trial
  adClient: "ca-pub-7632930282249669"
};

// 3) Stripe publishable key (safe to expose on the frontend)
window.stripeConfig = {
  // Use pk_test_... while testing; switch to pk_live_... for production
  publicKey: "pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRaV0GPvg004IIcPfC8"
};

// 4) Initialize Firebase (compat) once and expose handy globals
(function initFirebase() {
  try {
    if (firebase?.apps?.length) {
      window.firebaseApp = firebase.app();
    } else {
      window.firebaseApp = firebase.initializeApp(window.firebaseConfig);
    }
    window.auth = firebase.auth();
    window.db   = firebase.firestore();
    try { window.analytics = firebase.analytics(); } catch (_) {}
  } catch (e) {
    console.error("[config] Firebase init failed:", e);
  }
})();
</script>
