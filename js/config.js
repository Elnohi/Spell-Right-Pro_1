// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.appspot.com",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297" // This enables Analytics automatically
};

const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(); // Get analytics instance

// Enable debug mode during development
if (window.location.hostname === "localhost") {
  analytics.setAnalyticsCollectionEnabled(true);
}
