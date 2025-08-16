// js/config.js  (pure JS file – no <script> tags)

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

// 2) Backend + ads
window.appConfig = {
  apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",
  trialDays: 0,
  adClient: "ca-pub-7632930282249669"
};

// 3) Stripe publishable key (must match live/test of your backend)
window.stripeConfig = {
  publicKey: "pk_test_51RuKs1El99zwdEZrhrRFzKg7B0Y73rtLGHkZL20V7LHwE3jCJpnTXofp09GYg2reRdirJTXsGyvqRPixdCxraFhF00ZkCTNE4Z"
};

// 4) Initialize Firebase (compat) once
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
