// API Configuration
const API_CONFIG = {
  baseUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : window.location.origin,
  endpoints: {
    sendConfirmation: '/api/send-confirmation',
    payment: '/api/create-payment',
    userStatus: '/api/user-status',
    cancelSubscription: '/api/cancel-subscription'
  }
};

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

