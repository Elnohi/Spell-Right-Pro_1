// js/config.js - No module syntax
const firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.appspot.com",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// Application Configuration
const appConfig = {
  trialDays: 7,
  defaultTheme: 'light',
  adClient: 'ca-pub-7632930282249669'
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let analytics;
try {
  analytics = firebase.analytics();
} catch (e) {
  console.warn("Analytics init failed", e);
}

// Stripe Configuration
const stripeConfig = {
  publicKey: "pk_live_your_key_here",
  monthlyPlanId: "price_monthly_plan_id",
  annualPlanId: "price_annual_plan_id"
};
