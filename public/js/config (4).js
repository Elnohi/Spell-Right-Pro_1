// js/config.js - COMPLETE FIXED VERSION WITH ANALYTICS
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

// Global analytics instance
window.firebaseAnalytics = null;
window.firebaseInitialized = false;

// Initialize Firebase safely with Analytics
window.initFirebase = function() {
  // Prevent multiple initializations
  if (window.firebaseInitialized) {
    console.log('🔁 Firebase already initialized, skipping...');
    return firebase.apps[0];
  }
  
  try {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded');
      return null;
    }

    let app;
    if (!firebase.apps.length) {
      app = firebase.initializeApp(window.firebaseConfig);
      console.log('✅ Firebase app initialized');
    } else {
      app = firebase.apps[0];
      console.log('✅ Using existing Firebase app');
    }

    // Initialize Analytics only with user consent
    if (localStorage.getItem('cookieConsent') === 'true') {
      try {
        if (firebase.analytics) {
          window.firebaseAnalytics = firebase.analytics(app);
          console.log('✅ Firebase Analytics initialized');
          
          // Set user properties if user is logged in
          if (firebase.auth().currentUser) {
            window.firebaseAnalytics.setUserId(firebase.auth().currentUser.uid);
          }
          
          // Log app open event
          window.firebaseAnalytics.logEvent('app_open');
        }
      } catch (analyticsError) {
        console.warn('Analytics initialization warning:', analyticsError);
      }
    } else {
      console.log('🔕 Analytics disabled - no cookie consent');
    }

    window.firebaseInitialized = true;
    return app;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return null;
  }
};

// Analytics Event Tracking Function
window.trackEvent = function(eventName, eventParams = {}) {
  // Check cookie consent first
  if (localStorage.getItem('cookieConsent') !== 'true') {
    return false;
  }
  
  try {
    if (window.firebaseAnalytics) {
      window.firebaseAnalytics.logEvent(eventName, eventParams);
      console.log(`📊 Analytics Event: ${eventName}`, eventParams);
      return true;
    } else if (typeof firebase !== 'undefined' && firebase.analytics) {
      // Fallback: initialize analytics if not already done
      const app = firebase.apps[0];
      if (app) {
        window.firebaseAnalytics = firebase.analytics(app);
        window.firebaseAnalytics.logEvent(eventName, eventParams);
        console.log(`📊 Analytics Event (late init): ${eventName}`, eventParams);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.warn('Analytics event failed:', error);
    return false;
  }
};

// Track page views
window.trackPageView = function(pageName = null) {
  const pageTitle = pageName || document.title || 'Unknown Page';
  window.trackEvent('page_view', {
    page_title: pageTitle,
    page_location: window.location.pathname,
    page_referrer: document.referrer || 'direct'
  });
};

// =============================================================================
// ANALYTICS HELPER FUNCTIONS
// =============================================================================

// Analytics tracking for user actions
window.trackUserAction = function(action, details = {}) {
  const commonParams = {
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent
  };
  
  window.trackEvent(action, { ...commonParams, ...details });
};

// Track training sessions
window.trackTrainingStart = function(mode, wordCount) {
  window.trackUserAction('training_started', {
    training_mode: mode,
    word_count: wordCount
  });
};

window.trackTrainingComplete = function(mode, score, totalWords) {
  window.trackUserAction('training_completed', {
    training_mode: mode,
    score: score,
    total_words: totalWords,
    accuracy: totalWords > 0 ? (score / totalWords * 100).toFixed(1) : 0
  });
};

window.trackWordAttempt = function(mode, word, isCorrect) {
  window.trackUserAction('word_attempt', {
    training_mode: mode,
    word: word,
    correct: isCorrect
  });
};

// Track custom list usage
window.trackCustomListUpload = function(listName, wordCount) {
  window.trackUserAction('custom_list_upload', {
    list_name: listName,
    word_count: wordCount
  });
};

// Track UI interactions
window.trackUIInteraction = function(element, action) {
  window.trackUserAction('ui_interaction', {
    element: element,
    action: action,
    page: window.location.pathname
  });
};

// Track user authentication events
window.trackAuthEvent = function(action, method = 'email') {
  window.trackEvent('auth_' + action, {
    method: method,
    timestamp: new Date().toISOString()
  });
};

// Track training events
window.trackTrainingEvent = function(action, mode, details = {}) {
  window.trackEvent('training_' + action, {
    training_mode: mode,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// =============================================================================
// END OF ANALYTICS HELPER FUNCTIONS
// =============================================================================

// App Configuration
window.appConfig = {
  apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",
  adClient: "ca-pub-7632930282249669",
  trialDays: 0,
  successUrl: window.location.origin + "/premium.html?payment_success=1",
  cancelUrl: window.location.origin + "/premium.html"
};

// Stripe Configuration
window.stripeConfig = {
  publicKey: "pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRa0GPvg004IIcPfC8"
};

// In config.js, update the adsenseConfig:
window.adsenseConfig = {
  enabled: true, // CHANGED FROM false TO true
  client: "ca-pub-7632930282249669",
  // Only show ads to free users
  showAds: function() {
    return window.tierManager?.currentTier === 'free';
  }
};

// Add ad loading function
window.loadAds = function() {
  if (window.adsenseConfig.enabled && window.adsenseConfig.showAds()) {
    console.log('Loading ads for free user...');
    
    // Load AdSense script if not already loaded
    if (!document.querySelector('script[src*="adsbygoogle"]')) {
      const script = document.createElement('script');
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
    
    // Initialize ads
    (adsbygoogle = window.adsbygoogle || []).push({});
    
    // Track ad view
    window.trackEvent('ad_view', {
      page: window.location.pathname,
      tier: 'free'
    });
  }
};

// Initialize Firebase when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Initializing Firebase...');
  
  // Wait a bit for Firebase SDK to load
  setTimeout(() => {
    const app = window.initFirebase();
    if (app) {
      // Track initial page view
      window.trackPageView();
      
      // Set up history tracking for SPA navigation
      if (window.history && window.history.pushState) {
        const originalPushState = history.pushState;
        history.pushState = function() {
          originalPushState.apply(this, arguments);
          setTimeout(() => {
            window.trackPageView();
          }, 100);
        };
        
        window.addEventListener('popstate', function() {
          setTimeout(() => {
            window.trackPageView();
          }, 100);
        });
      }
    }
  }, 500);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig: window.firebaseConfig };
}
