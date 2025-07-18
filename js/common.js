// common.js – Shared logic for SpellRightPro

// --- Theme/Dark Mode ---
export function initThemeToggle(toggleBtnId = "modeToggle", iconId = "modeIcon") {
  const modeToggle = document.getElementById(toggleBtnId);
  const modeIcon = document.getElementById(iconId);
  if (modeToggle && modeIcon) {
    modeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      modeIcon.classList.toggle("fa-moon");
      modeIcon.classList.toggle("fa-sun");
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'on' : 'off');
    });
    // Restore from storage
    if (localStorage.getItem('darkMode') === 'on') {
      document.body.classList.add("dark-mode");
      modeIcon.classList.remove("fa-moon");
      modeIcon.classList.add("fa-sun");
    }
  }
}

// --- Firebase Auth State ---
export function initAuth(firebase, loginStatusId = "loginStatus", hiddenEmailId = "formHiddenEmail") {
  const auth = firebase.auth();
  auth.onAuthStateChanged(user => {
    const loginStatus = document.getElementById(loginStatusId);
    const hiddenEmail = document.getElementById(hiddenEmailId);
    if (user) {
      if (hiddenEmail) hiddenEmail.value = user.email;
      if (loginStatus) loginStatus.innerText = `Logged in as ${user.email}`;
    } else {
      if (loginStatus) loginStatus.innerText = "Not logged in";
      if (hiddenEmail) hiddenEmail.value = "";
    }
  });
  return auth;
}

// --- Login/Signup/Logout ---
export function addAuthListeners(auth, loginId, signupId, logoutId, emailInputId, pwInputId) {
  const loginBtn = document.getElementById(loginId);
  const signupBtn = document.getElementById(signupId);
  const logoutBtn = document.getElementById(logoutId);

  if (loginBtn) loginBtn.addEventListener("click", () => {
    const email = document.getElementById(emailInputId).value;
    const pw = document.getElementById(pwInputId).value;
    auth.signInWithEmailAndPassword(email, pw).catch(e => alert(e.message));
  });
  if (signupBtn) signupBtn.addEventListener("click", () => {
    const email = document.getElementById(emailInputId).value;
    const pw = document.getElementById(pwInputId).value;
    auth.createUserWithEmailAndPassword(email, pw).catch(e => alert(e.message));
  });
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    auth.signOut();
  });
}

// --- Notification Banner ---
export function showNotification(msg, type = 'info') {
  let c = document.createElement('div');
  c.className = `notification ${type}`;
  c.innerText = msg;
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 3000);
}

// --- Simple Google Analytics event trigger ---
export function gaEvent(category, action, label = "") {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
}
