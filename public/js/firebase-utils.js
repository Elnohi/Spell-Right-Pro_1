// js/firebase-utils.js - COMPLETE FIXED VERSION WITH ANALYTICS
class FirebaseUtils {
  constructor() {
    this.auth = null;
    this.db = null;
    this.initialized = false;
    this.initializationAttempts = 0;
    this.maxInitializationAttempts = 10;
    this.init();
  }

  init() {
    try {
      // Safety check - don't initialize too many times
      this.initializationAttempts++;
      if (this.initializationAttempts > this.maxInitializationAttempts) {
        console.error('❌ Too many initialization attempts, giving up');
        return;
      }

      // Wait for Firebase to load
      if (typeof firebase === 'undefined') {
        console.log('⏳ Waiting for Firebase SDK...');
        setTimeout(() => this.init(), 1000);
        return;
      }

      // Initialize Firebase app if not already done
      let app;
      if (!firebase.apps.length) {
        if (window.firebaseConfig) {
          app = firebase.initializeApp(window.firebaseConfig);
          console.log('✅ Firebase app initialized in utils');
        } else {
          console.error('❌ Firebase config not found');
          setTimeout(() => this.init(), 1000);
          return;
        }
      } else {
        app = firebase.apps[0];
        console.log('✅ Using existing Firebase app');
      }

      // Get auth and firestore
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      
      // Set up auth state listener for analytics
      this.setupAuthStateListener();
      
      // Enable offline persistence
      this.enablePersistence();
      
      this.initialized = true;
      console.log('✅ Firebase utils initialized successfully');

      // Test connection
      this.testConnection();

    } catch (error) {
      console.error('❌ Firebase utils init error:', error);
      // Retry after delay
      setTimeout(() => this.init(), 2000);
    }
  }

  setupAuthStateListener() {
    if (!this.auth) return;

    this.auth.onAuthStateChanged(async (user) => {
      console.log('🔐 Auth state changed:', user ? user.email : 'No user');
      
      if (user) {
        // Set user ID for analytics
        if (window.firebaseAnalytics) {
          window.firebaseAnalytics.setUserId(user.uid);
          window.trackAuthEvent('login', 'email');
        }
        
        // Check premium status
        const isPremium = await this.checkPremiumStatus(user);
        
        // Track premium status in analytics
        if (window.firebaseAnalytics) {
          window.firebaseAnalytics.setUserProperties({
            premium_user: isPremium ? 'true' : 'false'
          });
          
          if (isPremium) {
            window.trackEvent('premium_access_granted');
          }
        }
      } else {
        // User signed out
        if (window.firebaseAnalytics) {
          window.firebaseAnalytics.setUserId(null);
          window.trackAuthEvent('logout');
        }
      }
    });
  }

  enablePersistence() {
    if (this.db) {
      this.db.enablePersistence()
        .then(() => {
          console.log('✅ Firestore persistence enabled');
        })
        .catch((err) => {
          console.warn('⚠️ Firestore persistence failed:', err);
        });
    }
  }

  // Test Firestore connection
  async testConnection() {
    if (!this.initialized || !this.db) {
      console.log('⏳ Cannot test connection - not initialized');
      return false;
    }

    try {
      // Simple test query
      const testQuery = await this.db.collection('premiumUsers').limit(1).get();
      console.log('✅ Firestore connection test successful');
      return true;
    } catch (error) {
      console.warn('⚠️ Firestore connection test failed:', error);
      return false;
    }
  }

  // Check if user is premium
  async checkPremiumStatus(user) {
    if (!this.initialized || !user) {
      console.warn('Firebase not initialized or no user');
      return false;
    }

    try {
      const userDoc = await this.db.collection('premiumUsers').doc(user.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const now = new Date();
        const expiryDate = userData.expiryDate?.toDate();
        
        // Check if subscription is still valid
        if (expiryDate && expiryDate > now && userData.active !== false) {
          console.log('✅ User has active premium subscription');
          return true;
        } else {
          console.log('❌ Premium subscription expired or inactive');
          return false;
        }
      } else {
        console.log('❌ User not found in premium users');
        return false;
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      
      // Fallback to localStorage for demo/offline
      const localPremium = localStorage.getItem(`premium_${user.uid}`);
      if (localPremium === 'true') {
        console.log('✅ Using local premium status (fallback)');
        return true;
      }
      
      return false;
    }
  }

  // Save user progress with analytics
  async saveUserProgress(userId, progressData) {
    if (!this.initialized) {
      console.warn('Firebase not initialized');
      return false;
    }

    try {
      await this.db.collection('userProgress').doc(userId).set({
        ...progressData,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Progress saved successfully');
      
      // Track progress saved event
      window.trackEvent('progress_saved', {
        user_id: userId,
        mode: progressData.mode || 'unknown',
        words_learned: progressData.wordsLearned || 0
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error saving progress:', error);
      return false;
    }
  }

  // Get user progress
  async getUserProgress(userId) {
    if (!this.initialized) {
      console.warn('Firebase not initialized');
      return null;
    }

    try {
      const doc = await this.db.collection('userProgress').doc(userId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('❌ Error getting progress:', error);
      return null;
    }
  }

  // Track custom training events
  trackTrainingSession(mode, action, details = {}) {
    window.trackTrainingEvent(action, mode, details);
  }

  // Get current user
  getCurrentUser() {
    return this.auth ? this.auth.currentUser : null;
  }

  // Check if user is logged in
  isUserLoggedIn() {
    return !!this.getCurrentUser();
  }

  // Sign out user
  async signOut() {
    if (this.auth) {
      try {
        await this.auth.signOut();
        console.log('✅ User signed out successfully');
        return true;
      } catch (error) {
        console.error('❌ Sign out error:', error);
        return false;
      }
    }
    return false;
  }
}

// Create global instance with error handling
try {
  window.firebaseUtils = new FirebaseUtils();
} catch (error) {
  console.error('❌ Failed to create FirebaseUtils instance:', error);
  // Create a fallback object with basic functionality
  window.firebaseUtils = {
    initialized: false,
    init: function() { console.log('FirebaseUtils not available'); },
    checkPremiumStatus: async function() { return false; },
    isUserLoggedIn: function() { return false; }
  };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseUtils;
}
