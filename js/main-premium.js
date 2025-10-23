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
      alert("Passwords don't match");
      return;
    }

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
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
  feedback.style.padding = "8px";
  feedback.style.borderRadius = "4px";
  feedback.style.background = type === "success" ? "#d4edda" : "#f8d7da";
  feedback.style.color = type === "success" ? "#155724" : "#721c24";
  feedback.style.border = type === "success" ? "1px solid #c3e6cb" : "1px solid #f5c6cb";

  const card = document.querySelector(".glass-card");
  if (card) card.appendChild(feedback);

  setTimeout(() => {
    if (feedback.parentNode) feedback.remove();
  }, 5000);
}

// --- Premium Access Verification ---
async function verifyPremiumAccess(user) {
  try {
    const ref = db.collection("subscribers").doc(user.uid);
    const docSnap = await ref.get();

    let active = false;
    if (docSnap.exists && docSnap.data().active) {
      active = true;
    } else {
      // check backend (Stripe)
      const res = await fetch(
        "https://spellrightpro-api-798456641137.us-central1.run.app/check-subscription",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid })
        }
      );
      const data = await res.json();
      active = data.active || false;
    }

    if (!active) {
      alert("You need a Premium subscription to continue.");
      await auth.signOut();
      window.location.href = "/pricing.html";
      return;
    }

    console.log("✅ Premium verified for:", user.email);
    hideOverlay();
  } catch (err) {
    console.error("Error verifying premium:", err);
    alert("Could not verify your Premium access. Please try again.");
    showOverlay();
  }
}

// --- Logout ---
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      showOverlay();
      alert("Logged out successfully.");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  });
}

// --- Auth State Watcher ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    await verifyPremiumAccess(user);
  } else {
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
