/* ============================================================
   SpellRightPro Premium - Auth + Core Logic
   Firebase Project: spellrightpro-firebase
   Last Updated: Oct 2025
============================================================ */

// Firebase initialization (from config.js)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

/* ============================================================
   AUTH OVERLAY LOGIC
============================================================ */
const overlay = document.getElementById("authOverlay");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const resetBtn = document.getElementById("resetBtn");
const googleBtn = document.getElementById("googleBtn");
const verifyBtn = document.getElementById("verifyBtn");
const backHome = document.getElementById("backHome");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const statusText = document.getElementById("statusText");

// Helper to show messages in overlay
function showStatus(msg, color = "#fff") {
  if (statusText) {
    statusText.textContent = msg;
    statusText.style.color = color;
  }
}

/* ============================================================
   EMAIL/PASSWORD REGISTRATION + LOGIN
============================================================ */
registerBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert("Enter both email and password.");

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Send verification only for email/password users
    if (user && !user.emailVerified) {
      await user.sendEmailVerification();
      showStatus("Verification email sent. Please check your inbox.", "gold");
      verifyBtn.style.display = "block";
    }
  } catch (err) {
    console.error("Registration failed:", err);
    alert(err.message);
  }
});

loginBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert("Enter both email and password.");

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    if (!user.emailVerified) {
      showStatus("Please verify your email before proceeding.", "orange");
      verifyBtn.style.display = "block";
    } else {
      proceedToPremium(user);
    }
  } catch (err) {
    console.error("Login failed:", err);
    alert("Sign-in failed. Try again.");
  }
});

/* ============================================================
   GOOGLE SIGN-IN (No verification required)
============================================================ */
googleBtn?.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    if (user) {
      console.log("Google user logged in:", user.displayName);
      showStatus(`Welcome ${user.displayName}! Redirecting...`, "lightgreen");
      proceedToPremium(user);
    }
  } catch (err) {
    console.error("Google sign-in failed:", err);
    alert("Sign-in failed. Try again.");
  }
});

/* ============================================================
   PASSWORD RESET
============================================================ */
resetBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) return alert("Enter your email first.");
  try {
    await auth.sendPasswordResetEmail(email);
    showStatus("Password reset email sent.", "gold");
  } catch (err) {
    console.error("Reset failed:", err);
    alert(err.message);
  }
});

/* ============================================================
   VERIFY BUTTON
============================================================ */
verifyBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  await user.reload();

  if (user.emailVerified) {
    showStatus("Email verified! Redirecting...", "lightgreen");
    proceedToPremium(user);
  } else {
    showStatus("Still not verified. Please check inbox.", "red");
  }
});

/* ============================================================
   AUTH STATE OBSERVER
============================================================ */
auth.onAuthStateChanged((user) => {
  if (user) {
    const provider = user.providerData[0]?.providerId;

    // Allow Google users instantly, email users only if verified
    if (provider === "google.com" || user.emailVerified) {
      proceedToPremium(user);
    } else {
      overlay.style.display = "flex";
      showStatus("Please verify your email to continue.", "orange");
    }
  } else {
    overlay.style.display = "flex";
  }
});

/* ============================================================
   PREMIUM MAIN APP LOGIC
============================================================ */
function proceedToPremium(user) {
  currentUser = user;
  overlay.style.display = "none";
  document.body.classList.add("authenticated");

  // Load user-specific data (custom words, stats, etc.)
  console.log("Logged in:", user.email);

  // Example: Load welcome message
  const welcome = document.getElementById("welcomeUser");
  if (welcome) welcome.textContent = `Welcome, ${user.displayName || user.email}`;
}

/* ============================================================
   BACK TO HOME
============================================================ */
backHome?.addEventListener("click", () => {
  window.location.href = "index.html";
});
