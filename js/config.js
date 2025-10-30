// js/config.js - FIXED FIREBASE VERSION
// ------------------------------
// Frontend runtime configuration
// ------------------------------

// Firebase Configuration
window.firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.firebasestorage.app",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// Initialize Firebase safely
window.initFirebase = function() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
      const app = firebase.initializeApp(window.firebaseConfig);
      
      // Initialize Analytics only if user consents
      if (localStorage.getItem('cookieConsent') === 'true') {
        try { 
          if (firebase.analytics) {
            firebase.analytics();
          }
        } catch (e) {
          console.log('Analytics not available');
        }
      }
      
      console.log('Firebase initialized successfully');
      return app;
    } else if (firebase.apps.length > 0) {
      console.log('Firebase already initialized');
      return firebase.apps[0];
    }
  } catch (e) {
    console.error("Firebase init failed:", e);
    return null;
  }
};

// Make initialization function globally available
window.__initFirebaseOnce = window.initFirebase;

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
  enabled: false,
  client: "ca-pub-7632930282249669"
};

// Initialize Firebase on config load
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    window.initFirebase();
  }, 1000);
});
