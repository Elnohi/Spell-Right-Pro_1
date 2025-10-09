// ==========================================================
// SpellRightPro – main-premium.js
// Secure Premium Mode with Firebase Login Enforcement
// ==========================================================

// ==== Initialize Firebase (from config.js) ====
if (typeof firebase === "undefined") {
  console.error("❌ Firebase SDK missing. Please ensure config.js loads before this file.");
}

let auth;
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
} catch (e) {
  console.warn("⚠️ Firebase already initialized or unavailable:", e);
  auth = firebase.auth();
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
  const banner = document.createElement("div");
  banner.className = "user-banner";
  banner.style.cssText =
    "text-align:center;padding:10px;background:#eef2ff;color:#1f2937;font-weight:600;";
  banner.innerHTML = `👋 Welcome back, <strong>${user.email}</strong>`;
  document.body.prepend(banner);
}

// ==== Stripe Buttons ====
buyMonthly?.addEventListener("click", () => {
  console.log("Redirecting to Stripe Monthly Checkout...");
  window.location.href = STRIPE_MONTHLY;
});

buyAnnual?.addEventListener("click", () => {
  console.log("Redirecting to Stripe Annual Checkout...");
  window.location.href = STRIPE_ANNUAL;
});

helpBtn?.addEventListener("click", () => {
  window.location.href =
    "mailto:support@spellrightpro.org?subject=Premium%20Support";
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
