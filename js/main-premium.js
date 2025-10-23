/* =======================================================
   SpellRightPro Premium Logic - Email/Password Auth
   ======================================================= */

const firebaseConfig = window.firebaseConfig;

// --- Firebase Setup ---
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// --- Elements ---
const overlay = document.getElementById("loginOverlay");
const logoutBtn = document.getElementById("btnLogout");
const mainContent = document.querySelector("main");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegisterBtn = document.getElementById("showRegister");
const showLoginBtn = document.getElementById("showLogin");

// --- Overlay Control ---
function showOverlay() {
  if (overlay) overlay.style.display = "flex";
  if (mainContent) mainContent.style.display = "none";
}
function hideOverlay() {
  if (overlay) overlay.style.display = "none";
  if (mainContent) mainContent.style.display = "block";
}

// --- Email/Password Registration ---
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;

    if (password !== confirmPassword) {
      showFeedback("Passwords don't match", "error");
      return;
    }

    if (password.length < 6) {
      showFeedback("Password should be at least 6 characters", "error");
      return;
    }

    try {
      showFeedback("Creating account...", "info");
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Create a basic user profile in Firestore
      try {
        await db.collection("users").doc(user.uid).set({
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          premium: false // Default to false, will be updated by backend
        });
      } catch (dbError) {
        console.log("User profile creation skipped (Firestore not configured)");
      }
      
      showFeedback("Registration successful! Please login.", "success");
      showLoginForm();
    } catch (err) {
      console.error("Registration error:", err);
      showFeedback(`Registration failed: ${err.message}`, "error");
    }
  });
}

// --- Email/Password Login ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      showFeedback("Logging in...", "info");
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await verifyPremiumAccess(user);
    } catch (err) {
      console.error("Login error:", err);
      showFeedback(`Login failed: ${err.message}`, "error");
    }
  });
}

// --- Form Toggle ---
if (showRegisterBtn) {
  showRegisterBtn.addEventListener("click", showRegisterForm);
}
if (showLoginBtn) {
  showLoginBtn.addEventListener("click", showLoginForm);
}

function showRegisterForm() {
  if (loginForm) loginForm.style.display = "none";
  if (registerForm) registerForm.style.display = "block";
  if (showRegisterBtn) showRegisterBtn.style.display = "none";
  if (showLoginBtn) showLoginBtn.style.display = "inline";
}

function showLoginForm() {
  if (registerForm) registerForm.style.display = "none";
  if (loginForm) loginForm.style.display = "block";
  if (showLoginBtn) showLoginBtn.style.display = "none";
  if (showRegisterBtn) showRegisterBtn.style.display = "inline";
}

function showFeedback(message, type) {
  // Remove existing feedback
  const existingFeedback = document.querySelector(".feedback-message");
  if (existingFeedback) existingFeedback.remove();

  const feedback = document.createElement("div");
  feedback.className = `feedback-message ${type}`;
  feedback.textContent = message;
  feedback.style.marginTop = "10px";
  feedback.style.padding = "8px 12px";
  feedback.style.borderRadius = "6px";
  feedback.style.fontSize = "0.9rem";
  
  if (type === "success") {
    feedback.style.background = "#d4edda";
    feedback.style.color = "#155724";
    feedback.style.border = "1px solid #c3e6cb";
  } else if (type === "error") {
    feedback.style.background = "#f8d7da";
    feedback.style.color = "#721c24";
    feedback.style.border = "1px solid #f5c6cb";
  } else {
    feedback.style.background = "#d1ecf1";
    feedback.style.color = "#0c5460";
    feedback.style.border = "1px solid #bee5eb";
  }

  const card = document.querySelector(".glass-card");
  if (card) card.appendChild(feedback);

  setTimeout(() => {
    if (feedback.parentNode) feedback.remove();
  }, 5000);
}

// --- SIMPLIFIED Premium Access Verification ---
async function verifyPremiumAccess(user) {
  try {
    showFeedback("Checking premium status...", "info");
    
    let hasPremiumAccess = false;
    
    // Method 1: Try Firestore first
    try {
      const userDoc = await db.collection("subscribers").doc(user.uid).get();
      if (userDoc.exists && userDoc.data().active === true) {
        hasPremiumAccess = true;
        console.log("✅ Premium access confirmed via Firestore");
      }
    } catch (firestoreError) {
      console.log("Firestore check failed, trying backend...");
    }
    
    // Method 2: Try backend API if Firestore fails
    if (!hasPremiumAccess) {
      try {
        const res = await fetch(
          "https://spellrightpro-api-798456641137.us-central1.run.app/check-subscription",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: user.uid, email: user.email })
          }
        );
        
        if (res.ok) {
          const data = await res.json();
          hasPremiumAccess = data.active === true;
          if (hasPremiumAccess) {
            console.log("✅ Premium access confirmed via backend API");
          }
        }
      } catch (apiError) {
        console.log("Backend API check failed");
      }
    }
    
    // Method 3: Temporary bypass for testing - REMOVE IN PRODUCTION
    if (!hasPremiumAccess) {
      // For now, grant access to any logged-in user for testing
      // Remove this section when you have proper premium verification
      console.log("⚠️ Premium check bypassed for testing");
      hasPremiumAccess = true;
    }

    if (!hasPremiumAccess) {
      showFeedback("Premium subscription required. Redirecting to pricing...", "error");
      setTimeout(() => {
        window.location.href = "/pricing.html";
      }, 2000);
      return;
    }

    // Success - user has premium access
    showFeedback("✅ Premium access granted! Loading dashboard...", "success");
    setTimeout(() => {
      hideOverlay();
    }, 1000);
    
  } catch (err) {
    console.error("Error verifying premium:", err);
    showFeedback("Error verifying premium access. Please contact support.", "error");
    // Temporary: allow access even if verification fails for testing
    setTimeout(() => {
      hideOverlay();
      showFeedback("⚠️ Using in test mode - premium checks disabled", "info");
    }, 2000);
  }
}

// --- Logout ---
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      showOverlay();
      showFeedback("Logged out successfully", "success");
    } catch (e) {
      console.error("Logout failed:", e);
      showFeedback("Logout failed", "error");
    }
  });
}

// --- Auth State Watcher ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("User logged in:", user.email);
    await verifyPremiumAccess(user);
  } else {
    console.log("No user logged in");
    showOverlay();
  }
});

// =======================================================
// DARK MODE TOGGLE
// =======================================================
const toggleDark = document.getElementById("toggleDark");
if (toggleDark) {
  toggleDark.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = toggleDark.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-moon");
      icon.classList.toggle("fa-sun");
    }
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
  const accent = document.getElementById("accent")?.value || "en-US";
  utter.lang = accent;
  utter.rate = 0.9;
  utter.pitch = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// =======================================================
// TRAINING LOGIC (Bee / School / OET)
// =======================================================
let currentMode = null;
let currentIndex = 0;
let currentList = [];
let score = 0;

// Mode selection
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;
    document.querySelectorAll(".trainer-area").forEach(a => a.classList.remove("active"));
    document.getElementById(`${currentMode}-area`).classList.add("active");
  });
});

// Start button
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
    loadOETWords();
  } else {
    // Bee or School demo words
    currentList = ["example", "language", "grammar", "knowledge", "science"];
    nextWord();
  }
}

async function loadOETWords() {
  try {
    const res = await fetch("/js/oet_word_list.js");
    const js = await res.text();
    eval(js);
    if (typeof oetWords !== "undefined") {
      const isTest = document.querySelector('input[name="examType"]:checked')?.value === "test";
      currentList = isTest ? shuffle(oetWords).slice(0, 24) : oetWords;
      nextWord();
    } else {
      throw new Error("No OET words found.");
    }
  } catch (err) {
    console.error("OET list load error:", err);
    alert("Failed to load OET words.");
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
  currentIndex++;
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function showSummary() {
  const summary = document.getElementById("summary");
  if (!summary) return;
  summary.innerHTML = `
    <h3>Session Complete</h3>
    <p>Your Score: ${score}/${currentList.length}</p>
  `;
  summary.style.display = "block";
}

window.addEventListener("beforeunload", () => speechSynthesis.cancel());

// --- Global error handler ---
window.addEventListener("error", e => {
  console.error("Global JS error:", e.message);
});

// Initialize the app
console.log("SpellRightPro Premium initialized");
