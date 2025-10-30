// js/config.js - FIXED ANALYTICS VERSION
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

// Initialize Firebase safely with Analytics
window.initFirebase = function() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
      const app = firebase.initializeApp(window.firebaseConfig);
      
      // Initialize Analytics with proper consent check
      if (localStorage.getItem('cookieConsent') === 'true') {
        try { 
          if (firebase.analytics) {
            const analytics = firebase.analytics(app);
            console.log('✅ Firebase Analytics initialized');
            
            // Set user properties if available
            if (firebase.auth().currentUser) {
              analytics.setUserId(firebase.auth().currentUser.uid);
              analytics.setUserProperties({
                premium_user: 'false' // Will be updated after premium check
              });
            }
            
            // Log app open event
            analytics.logEvent('app_open', {
              app_name: 'SpellRightPro',
              version: '1.0.0'
            });
          }
        } catch (e) {
          console.log('Analytics initialization warning:', e);
        }
      } else {
        console.log('🔕 Analytics disabled - no cookie consent');
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

// Analytics Event Tracking Function
window.trackEvent = function(eventName, eventParams = {}) {
  // Check cookie consent
  if (localStorage.getItem('cookieConsent') !== 'true') {
    return;
  }
  
  try {
    if (typeof firebase !== 'undefined' && firebase.analytics) {
      firebase.analytics().logEvent(eventName, eventParams);
      console.log(`📊 Analytics Event: ${eventName}`, eventParams);
    }
  } catch (error) {
    console.warn('Analytics event failed:', error);
  }
};

// Track page views
window.trackPageView = function(pageName) {
  window.trackEvent('page_view', {
    page_title: pageName,
    page_location: window.location.pathname
  });
};

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
    const app = window.initFirebase();
    if (app) {
      // Track initial page view
      const pageName = document.title || 'Unknown Page';
      window.trackPageView(pageName);
    }
  }, 1000);
});
