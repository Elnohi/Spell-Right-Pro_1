// /js/firebase-config.js - Single source of truth for Firebase configuration
(function() {
  'use strict';

  // Firebase Configuration - Centralized
  window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
    authDomain: "spellrightpro-firebase.firebaseapp.com",
    projectId: "spellrightpro-firebase",
    storageBucket: "spellrightpro-firebase.firebasestorage.app",
    messagingSenderId: "798456641137",
    appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
    measurementId: "G-H09MF13297"
  };

  // Firebase initialization state
  let firebaseInitialized = false;
  let firebaseApp = null;
  let firebaseAnalytics = null;

  // Initialize Firebase once
  window.initFirebaseOnce = function() {
    if (firebaseInitialized) {
      console.log('✅ Firebase already initialized');
      return firebaseApp;
    }

    try {
      if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded');
        return null;
      }

      // Check if already initialized
      if (firebase.apps.length) {
        firebaseApp = firebase.apps[0];
        firebaseInitialized = true;
        console.log('✅ Using existing Firebase app');
        return firebaseApp;
      }

      // Initialize new app
      firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
      firebaseInitialized = true;
      console.log('✅ Firebase app initialized');

      // Initialize analytics only with consent
      const consent = localStorage.getItem('cookieConsent');
      if (consent === 'true') {
        try {
          if (firebase.analytics) {
            firebaseAnalytics = firebase.analytics(firebaseApp);
            console.log('✅ Firebase Analytics initialized');
          }
        } catch (e) {
          console.warn('Analytics not available:', e);
        }
      }

      return firebaseApp;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      return null;
    }
  };

  // Get Firebase services
  window.getFirebaseAuth = function() {
    const app = window.initFirebaseOnce();
    return app ? firebase.auth() : null;
  };

  window.getFirebaseFirestore = function() {
    const app = window.initFirebaseOnce();
    return app ? firebase.firestore() : null;
  };

  window.getFirebaseAnalytics = function() {
    return firebaseAnalytics;
  };

  // Track event with consent check
  window.trackEvent = function(eventName, eventParams = {}) {
    if (localStorage.getItem('cookieConsent') !== 'true') {
      return false;
    }

    try {
      if (firebaseAnalytics) {
        firebaseAnalytics.logEvent(eventName, eventParams);
        console.log(`📊 Event: ${eventName}`, eventParams);
        return true;
      }
      
      // Fallback to Google Analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Event tracking failed:', error);
      return false;
    }
  };

  // Page view tracking
  window.trackPageView = function(pageName = null) {
    window.trackEvent('page_view', {
      page_title: pageName || document.title,
      page_location: window.location.pathname,
      page_referrer: document.referrer || 'direct'
    });
  };

  console.log('🔥 Firebase config loaded');
})();
