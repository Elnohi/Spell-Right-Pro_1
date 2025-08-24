// js/config.js  (pure JS – include via <script src="js/config.js"></script>)

// 1) Firebase (public)
window.firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.appspot.com",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// 2) Backend + Ads
window.appConfig = {
  // Cloud Run base (no trailing slash)
  apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",
  trialDays: 0,
  adClient: "ca-pub-7632930282249669"
};

// 3) Stripe publishable key (use matching LIVE/TEST to backend)
window.stripeConfig = {
  publicKey: "pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRaV0GPvg004IIcPfC8"
};

// 4) Initialize Firebase (compat)
(function initFirebase() {
  try {
    if (!firebase?.apps?.length) firebase.initializeApp(window.firebaseConfig);
    window.auth = firebase.auth();
    window.db   = firebase.firestore();
    try { firebase.analytics(); } catch (_) {}
  } catch (e) {
    console.error("[config] Firebase init failed:", e);
  }
})();
