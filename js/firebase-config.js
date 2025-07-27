// firebase-config.js - Enhanced Version
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getPerformance } from 'firebase/performance';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.appspot.com",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// Initialize Firebase services with error handling
let app;
let auth;
let analytics;
let db;
let perf;

try {
  // Initialize Firebase app
  app = initializeApp(firebaseConfig);
  
  // Initialize services
  auth = getAuth(app);
  analytics = getAnalytics(app);
  db = getFirestore(app);
  
  // Initialize Performance Monitoring if supported
  if (typeof window !== 'undefined') {
    perf = getPerformance(app);
  }
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Provide fallback empty objects if initialization fails
  if (!auth) auth = { 
    signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not initialized')),
    // Add other mock methods as needed
  };
  
  if (!analytics) analytics = {
    logEvent: (name, params) => console.log('[Analytics Fallback]', name, params)
  };
}

// Configuration validation
if (!firebaseConfig.apiKey) {
  console.warn('Firebase API key is missing');
}
if (!firebaseConfig.projectId) {
  console.warn('Firebase project ID is missing');
}

// Export initialized services
export { 
  auth, 
  analytics, 
  db,
  perf 
};

// Optional: Export configuration for debugging
export const firebaseConfigExport = Object.freeze({
  ...firebaseConfig,
  // Hide sensitive parts of API key
  apiKey: firebaseConfig.apiKey 
    ? `${firebaseConfig.apiKey.substring(0, 10)}...` 
    : 'missing'
});
