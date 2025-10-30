// js/config.js - UPDATED SECURE VERSION
// ------------------------------
// Frontend runtime configuration
// ------------------------------

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.firebasestorage.app",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// Initialize Firebase safely
(function initFirebaseOnce() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
      firebase.initializeApp(window.firebaseConfig);
      
      // Initialize Analytics only if user consents
      if (localStorage.getItem('cookieConsent') === 'true') {
        try { 
          firebase.analytics(); 
        } catch (e) {
          console.log('Analytics not available');
        }
      }
    }
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
})();

// App Configuration
window.appConfig = {
  apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",
  adClient: "ca-pub-7632930282249669",
  trialDays: 0,
  successUrl: "https://spellrightpro.org/premium.html?payment_success=1",
  cancelUrl:  "https://spellrightpro.org/premium.html"
};

// Stripe Configuration
window.stripeConfig = {
  publicKey: "pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRa0GPvg004IIcPfC8"
};

// AdSense Configuration
window.adsenseConfig = {
  enabled: false, // Set to true after AdSense approval
  client: "ca-pub-7632930282249669"
};
