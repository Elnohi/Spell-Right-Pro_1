// ==========================================================
// SpellRightPro - main-premium.js
// Enforces login before access
// ==========================================================

// ==== Initialize Firebase (from config.js) ====
if (typeof firebase === "undefined") {
  console.error("Firebase not loaded. Check script order in premium.html");
}

let auth;
try {
  const app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
} catch (e) {
  console.log("Firebase already initialized or unavailable", e);
  auth = firebase.auth();
}

// ==== DOM Elements ====
const upgradeMonthlyBtn = document.getElementById("upgrade-monthly");
const upgradeAnnualBtn = document.getElementById("upgrade-annual");
const helpBtn = document.getElementById("help-btn");

// ==== Stripe Payment Links (Live URLs) ====
const STRIPE_MONTHLY = "https://buy.stripe.com/cNi6oHbXE34ybVE4uq83C03";
const STRIPE_ANNUAL = "https://buy.stripe.com/cNieVd9PwbB42l4aSO83C04";

// ==== Require Login ====
auth.onAuthStateChanged((user) => {
  if (!user) {
    // Not logged in → redirect
    alert("🔒 Please log in to access Premium features.");
    window.location.href = "index.html?login=required";
  } else {
    console.log(`✅ Logged in as: ${user.email}`);
  }
});

// ==== Stripe Buttons ====
upgradeMonthlyBtn?.addEventListener("click", () => {
  window.location.href = STRIPE_MONTHLY;
});

upgradeAnnualBtn?.addEventListener("click", () => {
  window.location.href = STRIPE_ANNUAL;
});

helpBtn?.addEventListener("click", () => {
  window.location.href = "mailto:support@spellrightpro.org?subject=Premium%20Support";
});

// ==== Audio Safety Guards ====
window.addEventListener("beforeunload", () => {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
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

console.log("✅ Premium JS loaded successfully with login protection");
