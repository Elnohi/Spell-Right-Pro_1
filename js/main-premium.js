// ==========================================================
// SpellRightPro – main-premium.js
// Secure Premium Mode with Firebase Login Enforcement
// ==========================================================

// ==== Initialize Firebase (from config.js) ====
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
    <div style="padding: 2rem; text-align: center; font-family: system-ui;">
      <h2>⚠️ Configuration Error</h2>
      <p>Firebase is not properly configured. Please check your config.js file.</p>
      <a href="index.html" style="color: #4361ee;">Return to Home</a>
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
    alert("🔐 Please sign in to access SpellRightPro Premium features.");
    window.location.href = "index.html?login=required";
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
    padding: 12px 20px;
    background: linear-gradient(135deg, #eef2ff, #e0e7ff);
    color: #1f2937;
    font-weight: 600;
    border-bottom: 1px solid #c7d2fe;
    margin-bottom: 20px;
  `;
  banner.innerHTML = `👋 Welcome back, <strong>${user.email}</strong> | <span style="color: #6366f1;">Premium Member</span>`;
  document.body.insertBefore(banner, document.body.firstChild);

  // Enable purchase buttons
  if (buyMonthly) {
    buyMonthly.disabled = false;
    buyMonthly.innerHTML = '<i class="fa fa-arrow-up-right-from-square"></i> Upgrade – Monthly';
  }
  
  if (buyAnnual) {
    buyAnnual.disabled = false;
    buyAnnual.innerHTML = '<i class="fa fa-arrow-up-right-from-square"></i> Upgrade – Annual';
  }
}

// ==== Stripe Buttons ====
buyMonthly?.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("Redirecting to Stripe Monthly Checkout...");
  window.location.href = STRIPE_MONTHLY;
});

buyAnnual?.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("Redirecting to Stripe Annual Checkout...");
  window.location.href = STRIPE_ANNUAL;
});

helpBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "mailto:support@spellrightpro.com?subject=Premium%20Support&body=Hello%20SpellRightPro%20team,";
});

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

// ==== Debug Log ====
console.log("✅ Premium JS initialized and login protection active.");
