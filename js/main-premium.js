// ==========================================================
// SpellRightPro – main-premium.js
// Secure Premium Mode with Firebase Login Enforcement
// ==========================================================

// ==== Firebase Configuration ====
const firebaseConfig = {
  apiKey: "AIzaSyCZ-rAPnRgVjSRFOFvbiQlowE6A3RVvwWo",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.firebasestorage.app",
  messagingSenderId: "798456641137",
  appId: "1:798456641137:web:5c6d79db5bf49d04928dd0",
  measurementId: "G-H09MF13297"
};

// ==== Initialize Firebase ====
let auth;
try {
  if (typeof firebase === "undefined") {
    throw new Error("Firebase SDK not loaded");
  }
  
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  console.log("✅ Firebase initialized successfully");
} catch (e) {
  console.error("❌ Firebase initialization failed:", e);
  // Show user-friendly error
  document.body.innerHTML = `
    <div style="padding: 2rem; text-align: center; font-family: system-ui; background: white; min-height: 100vh;">
      <div style="max-width: 500px; margin: 2rem auto; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h2 style="color: #dc3545; margin-bottom: 1rem;">⚠️ Configuration Error</h2>
        <p style="margin-bottom: 1.5rem; color: #666;">Firebase is not properly configured. Please check your browser console for details.</p>
        <a href="index.html" style="display: inline-block; padding: 12px 24px; background: #4361ee; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Return to Home</a>
      </div>
    </div>
  `;
  throw e;
}

// ==== Stripe Payment URLs (LIVE) ====
const STRIPE_MONTHLY = "https://buy.stripe.com/cNieVd9PwbB42l4aSO83C04";
const STRIPE_ANNUAL = "https://buy.stripe.com/cNi6oHbXE34ybVE4uq83C03";
  
// ==== DOM Elements ====
const buyMonthly = document.getElementById("buy-monthly");
const buyAnnual = document.getElementById("buy-annual");
const helpBtn = document.getElementById("help-btn");

// ==== Require Login ====
auth.onAuthStateChanged((user) => {
  if (!user) {
    console.warn("🔒 Redirecting unauthenticated user to login...");
    const currentUrl = window.location.href;
    const returnUrl = encodeURIComponent(currentUrl);
    window.location.href = `index.html?login=required&return=${returnUrl}`;
  } else {
    console.log(`✅ Logged in as: ${user.email}`);
    initPremiumUI(user);
  }
});

// ==== Initialize Premium UI ====
function initPremiumUI(user) {
  console.log("✨ Welcome Premium user:", user.email);
  
  // Add user welcome banner
  const banner = document.createElement("div");
  banner.className = "user-banner";
  banner.style.cssText = `
    text-align: center;
    padding: 14px 20px;
    background: linear-gradient(135deg, #eef2ff, #e0e7ff);
    color: #1f2937;
    font-weight: 600;
    border-bottom: 2px solid #c7d2fe;
    margin: 0;
    font-size: 1rem;
  `;
  banner.innerHTML = `🎉 Welcome back, <strong>${user.email}</strong> | <span style="color: #6366f1; background: rgba(99, 102, 241, 0.1); padding: 4px 8px; border-radius: 6px;">Premium Member</span>`;
  document.body.insertBefore(banner, document.body.firstChild);

  // Enable purchase buttons with enhanced styling
  if (buyMonthly) {
    buyMonthly.disabled = false;
    buyMonthly.innerHTML = '<i class="fa fa-arrow-up-right-from-square"></i> Upgrade – Monthly Plan';
    buyMonthly.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  }
  
  if (buyAnnual) {
    buyAnnual.disabled = false;
    buyAnnual.innerHTML = '<i class="fa fa-crown"></i> Upgrade – Annual (Best Value)';
    buyAnnual.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
  }
}

// ==== Stripe Buttons ====
buyMonthly?.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("Redirecting to Stripe Monthly Checkout...");
  trackAnalytics('premium_monthly_click');
  window.location.href = STRIPE_MONTHLY;
});

buyAnnual?.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("Redirecting to Stripe Annual Checkout...");
  trackAnalytics('premium_annual_click');
  window.location.href = STRIPE_ANNUAL;
});

helpBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "mailto:support@spellrightpro.com?subject=Premium%20Support%20-%20SpellRightPro&body=Hello%20SpellRightPro%20team,%0A%0AI%20need%20help%20with:%0A%0A";
});

// ==== Analytics Tracking ====
function trackAnalytics(eventName) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      'event_category': 'premium',
      'event_label': 'upgrade_click'
    });
  }
  console.log(`📊 Analytics: ${eventName}`);
}

// ==== Safety Guards for Speech / Audio ====
window.addEventListener("beforeunload", () => {
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (e) {
    console.warn("Speech cleanup failed:", e);
  }
  if (window.currentRecognition) {
    try {
      window.currentRecognition.stop();
    } catch {}
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
});

// ==== Service Worker Safety ====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((err) =>
    console.warn("Service worker registration failed:", err)
  );
}

// ==== Performance Monitoring ====
window.addEventListener('load', () => {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'premium_page_loaded', {
      'event_category': 'engagement',
      'event_label': 'page_load'
    });
  }
});

// ==== Debug Log ====
console.log("✅ Premium JS initialized and login protection active.");
console.log("🔧 Firebase Project: spellrightpro-firebase");
