/* =======================================================
   SpellRightPro Premium Logic - Final Integrated Build
   Features: Firebase Auth, Stripe Access Check, Accent Selection
======================================================= */

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "spellrightpro-firebase.firebaseapp.com",
  projectId: "spellrightpro-firebase",
  storageBucket: "spellrightpro-firebase.appspot.com",
  messagingSenderId: "798456641137",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM Elements ---
const overlay = document.getElementById("loginOverlay");
const logoutBtn = document.getElementById("btnLogout");
const accentSelect = document.getElementById("accent");

// --- Auth Control ---
function showOverlay() {
  if (overlay) overlay.style.display = "flex";
}
function hideOverlay() {
  if (overlay) overlay.style.display = "none";
}

// Google Sign-In
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    if (user) await verifyPremiumAccess(user);
  } catch (err) {
    console.error("Google login error:", err);
    alert("Login failed, please try again.");
  }
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    showOverlay();
    alert("Logged out successfully.");
  });
}

// --- Verify Premium Access ---
async function verifyPremiumAccess(user) {
  try {
    const ref = db.collection("subscribers").doc(user.uid);
    const docSnap = await ref.get();

    if (!docSnap.exists) {
      // Optional: call backend to double-check Stripe subscription
      const res = await fetch("https://spellrightpro-api-798456641137.us-central1.run.app/check-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid })
      });
      const data = await res.json();

      if (!data.active) {
        alert("You need a Premium subscription to access this page.");
        window.location.href = "/pricing.html";
        return;
      }
    }

    console.log("✅ Premium verified for:", user.email);
    hideOverlay();
    document.querySelector("main").style.display = "block";
  } catch (error) {
    console.error("Premium verification error:", error);
    alert("Error verifying premium access.");
    showOverlay();
  }
}

// Auth State Handler
auth.onAuthStateChanged(async (user) => {
  if (user) await verifyPremiumAccess(user);
  else showOverlay();
});

// =======================================================
// DARK MODE TOGGLE
// =======================================================
const toggleDark = document.getElementById("toggleDark");
if (toggleDark) {
  toggleDark.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = toggleDark.querySelector("i");
    if (icon) icon.classList.toggle("fa-moon");
    if (icon) icon.classList.toggle("fa-sun");
  });
}

// =======================================================
// TEXT-TO-SPEECH (Accent Selection)
// =======================================================
function speakWord(word) {
  if (!window.speechSynthesis) {
    alert("SpeechSynthesis not supported in this browser.");
    return;
  }
  const utter = new SpeechSynthesisUtterance(word);
  const accentValue = document.getElementById("accent")?.value || "en-US";
  utter.lang = accentValue;
  utter.rate = 0.9;
  utter.pitch = 1;
  speechSynthesis.speak(utter);
}

// =======================================================
// MAIN TRAINING LOGIC (for Bee / School / OET modes)
// =======================================================
let currentMode = null;
let currentIndex = 0;
let currentList = [];
let score = 0;

// Load mode based on user selection
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;
    document.querySelectorAll(".trainer-area").forEach(a => a.classList.remove("active"));
    document.getElementById(`${currentMode}-area`).classList.add("active");
  });
});

// Start training
document.querySelectorAll(".start-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    startTraining(mode);
  });
});

function startTraining(mode) {
  currentList = [];
  score = 0;
  currentIndex = 0;

  if (mode === "oet") {
    // Load OET words
    fetch("/js/oet_word_list.js")
      .then(res => res.text())
      .then(js => {
        try {
          eval(js);
          if (typeof oetWords !== "undefined") {
            const isTest = document.querySelector('input[name="examType"]:checked')?.value === "test";
            currentList = isTest ? shuffle(oetWords).slice(0, 24) : oetWords;
            nextWord();
          }
        } catch (e) {
          console.error("Error loading OET words:", e);
        }
      });
  } else {
    // Placeholder for Bee / School
    currentList = ["example", "knowledge", "science", "language"];
    nextWord();
  }
}

function nextWord() {
  if (currentIndex >= currentList.length) {
    showSummary();
    return;
  }
  const word = currentList[currentIndex];
  document.getElementById("feedback").textContent = `Word ${currentIndex + 1} of ${currentList.length}`;
  speakWord(word);
}

// Shuffle helper
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// =======================================================
// SUMMARY DISPLAY
// =======================================================
function showSummary() {
  const summary = document.getElementById("summary");
  if (!summary) return;
  summary.innerHTML = `
    <h3>Session Complete</h3>
    <p>Your Score: ${score}/${currentList.length}</p>
  `;
  summary.style.display = "block";
}

// =======================================================
// UTILITIES
// =======================================================
window.addEventListener("beforeunload", () => {
  speechSynthesis.cancel();
});
