import { firebaseConfig, accentOptions } from './config.js';

// Initialize Firebase if not already initialized
let firebaseInitialized = false;

export function initializeFirebase() {
  if (!firebaseInitialized && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    firebaseInitialized = true;
  }
  return firebase;
}

// --- Theme/Dark Mode ---
export function initThemeToggle(toggleBtnId = "modeToggle", iconId = "modeIcon") {
  const modeToggle = document.getElementById(toggleBtnId);
  const modeIcon = document.getElementById(iconId);
  
  if (!modeToggle || !modeIcon) return;

  const applyDarkMode = (darkMode) => {
    document.body.classList.toggle("dark-mode", darkMode);
    modeIcon.classList.toggle("fa-moon", !darkMode);
    modeIcon.classList.toggle("fa-sun", darkMode);
    localStorage.setItem('darkMode', darkMode ? 'on' : 'off');
  };

  modeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-mode");
    applyDarkMode(!isDark);
  });

  // Restore from storage
  const savedMode = localStorage.getItem('darkMode') === 'on';
  applyDarkMode(savedMode);
}

// --- Auth Utilities ---
export function initAuth(firebase, loginStatusId = "loginStatus", hiddenEmailId = "formHiddenEmail") {
  const auth = firebase.auth();
  
  auth.onAuthStateChanged(user => {
    const loginStatus = document.getElementById(loginStatusId);
    const hiddenEmail = document.getElementById(hiddenEmailId);
    
    if (user) {
      if (hiddenEmail) hiddenEmail.value = user.email;
      if (loginStatus) {
        loginStatus.innerText = `Logged in as ${user.email}`;
        loginStatus.className = "auth-status logged-in";
      }
    } else {
      if (loginStatus) {
        loginStatus.innerText = "Not logged in";
        loginStatus.className = "auth-status not-logged";
      }
      if (hiddenEmail) hiddenEmail.value = "";
    }
  });
  
  return auth;
}

export function addAuthListeners(auth, loginId, signupId, logoutId, emailInputId, pwInputId) {
  const loginBtn = document.getElementById(loginId);
  const signupBtn = document.getElementById(signupId);
  const logoutBtn = document.getElementById(logoutId);

  const handleAuth = async (authFunction, successMessage) => {
    const email = document.getElementById(emailInputId)?.value.trim();
    const pw = document.getElementById(pwInputId)?.value;
    
    if (!email || !pw) {
      return showNotification("Email and password required", "error");
    }

    try {
      await authFunction(email, pw);
      showNotification(successMessage, "success");
    } catch (e) {
      showNotification(e.message, "error");
    }
  };

  if (loginBtn) {
    loginBtn.addEventListener("click", () => 
      handleAuth(auth.signInWithEmailAndPassword.bind(auth), "Logged in successfully")
    );
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => 
      handleAuth(auth.createUserWithEmailAndPassword.bind(auth), "Account created successfully")
    );
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut();
      showNotification("Logged out", "info");
    });
  }
}

// --- Notification System ---
export function showNotification(msg, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute("role", "alert");
  notification.setAttribute("aria-live", "assertive");
  notification.innerHTML = `
    <span class="notification-icon">
      ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
    </span>
    <span class="notification-message">${msg}</span>
  `;

  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add("show"), 10);
  setTimeout(() => notification.classList.remove("show"), 2900);
  setTimeout(() => notification.remove(), 3200);
}

// --- File Handling ---
export async function loadWordsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const words = e.target.result.split(/\r?\n/)
        .map(w => w.trim())
        .filter(w => w);
      resolve(words);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function setupFileUpload(inputId, callback) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const words = await loadWordsFromFile(file);
      callback(words);
      showNotification(`Loaded ${words.length} words from ${file.name}`, "success");
    } catch (error) {
      showNotification("Failed to load words", "error");
      console.error(error);
    }
  });
}

// --- Speech Utilities ---
export async function speak(text, lang = 'en-US', rate = 0.9) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.volume = 1;

    utterance.onend = resolve;
    utterance.onerror = (event) => {
      reject(new Error(`Speech error: ${event.error}`));
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function setupSpeechRecognition(lang, onResult, onError) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    throw new Error("Speech recognition not supported in this browser");
  }

  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    onError(event.error);
  };

  return recognition;
}

// --- UI Components ---
export function createWordBox(word, current, total) {
  const box = document.createElement('div');
  box.className = 'word-box';
  box.innerHTML = `
    <h3>Word ${current} of ${total}</h3>
    <div class="progress-container">
      <div class="progress-bar" style="width:${((current-1)/total)*100}%"></div>
    </div>
    <button class="btn btn-info" id="speakBtn" aria-label="Speak word">
      <i class="fas fa-volume-up"></i> Speak
    </button>
    <input type="text" id="userInput" 
           placeholder="Type what you heard..." 
           aria-label="Type the word you heard"
           autofocus>
    <button class="btn btn-success" id="checkBtn">Check</button>
    <div id="status" role="alert" aria-live="polite"></div>
  `;
  return box;
}

export function showScore(container, correctCount, total, incorrectWords) {
  const percent = Math.round((correctCount / total) * 100);
  let scoreColor = "#28a745";
  if (percent < 50) scoreColor = "#dc3545";
  else if (percent < 75) scoreColor = "#ffc107";

  container.innerHTML = `
    <div class="word-box" aria-live="polite">
      <h2 style="color: ${scoreColor}">Test Complete</h2>
      <p>You scored <strong style="color: ${scoreColor}">${correctCount}</strong> 
         out of ${total} (<strong style="color: ${scoreColor}">${percent}%</strong>)</p>
      ${incorrectWords.length
        ? `<div class="incorrect-words">
             <h3>Incorrect Words</h3>
             <ul>${incorrectWords.map(w => 
               `<li><strong>${w.word}</strong> – You typed: <em>${w.typed || w.heard}</em></li>`
             ).join('')}</ul>
           </div>`
        : `<p class="perfect-score">🎉 No mistakes. Excellent work!</p>`
      }
      <button onclick="location.reload()" class="btn btn-info">
        <i class="fas fa-redo"></i> Start New Session
      </button>
    </div>
  `;
}
