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

// App config
const appConfig = {
  trialDays: 7,
  defaultTheme: 'light',
  apiBaseUrl: 'https://0fPSNrvwK0VQSYggOlpS6xxKOic2', // e.g. https://srp-backend.onrender.com
  adClient: 'ca-pub-7632930282249669'
};

// Initialize Firebase (compat)
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let analytics;
try {
  analytics = firebase.analytics();
} catch (e) {
  console.warn("Analytics init failed", e);
}

// Stripe (frontend/public) keys
const stripeConfig = {
  publicKey: "pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRaV0GPvg004IIcPfC8",
  monthlyPlanId: "price_XXXXXXXXXXXX",
  annualPlanId: "price_YYYYYYYYYYYY"
};
