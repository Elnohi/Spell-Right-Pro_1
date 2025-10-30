// js/firebase-utils.js
class FirebaseUtils {
  constructor() {
    this.auth = null;
    this.db = null;
    this.initialized = false;
    this.init();
  }

  init() {
    try {
      // Wait for Firebase to load
      if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        setTimeout(() => this.init(), 500);
        return;
      }

      // Initialize if not already done
      if (!firebase.apps.length) {
        if (window.firebaseConfig) {
          firebase.initializeApp(window.firebaseConfig);
          console.log('Firebase initialized via utils');
        } else {
          console.error('Firebase config not found');
          return;
        }
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.initialized = true;

      console.log('Firebase utils initialized successfully');

      // Enable offline persistence
      this.enablePersistence();

    } catch (error) {
      console.error('Firebase utils init error:', error);
    }
  }

  enablePersistence() {
    if (this.db) {
      this.db.enablePersistence()
        .catch((err) => {
          console.warn('Firestore persistence failed:', err);
        });
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
      
      // Fallback to localStorage for demo
      const localPremium = localStorage.getItem(`premium_${user.uid}`);
      return localPremium === 'true';
    }
  }

  // Save user progress
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
      
      console.log('Progress saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
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
      console.error('Error getting progress:', error);
      return null;
    }
  }
}

// Create global instance
window.firebaseUtils = new FirebaseUtils();
