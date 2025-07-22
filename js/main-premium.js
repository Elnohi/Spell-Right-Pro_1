// main-premium.js - Complete & working for SpellRightPro Premium
// Includes: login, accent, flag, OET, Bee, Custom upload, file read, feedback, flagging, scoring

// Firebase setup
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

// --- Globals ---
let words = [];
let oetWords = window.oetWords || []; // Provided by oet_word_list.js
let flaggedWords = [];
let currentIndex = 0, score = 0;
let userAnswers = [];
let sessionType = "OET";
let useCustomWords = false;
let currentUser = null;

// --- DOM Elements ---
const appDiv = document.getElementById("premium-app") || document.body;
const loginArea = document.getElementById("login-area");
const trainerDiv = document.getElementById("trainer-area");
const scoreDiv = document.getElementById("score-area");

// --- Helper: Flags ---
const flagSVGs = {
  "en-US": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#b22234" width="60" height="40"/><g fill="#fff"><rect y="4" width="60" height="4"/><rect y="12" width="60" height="4"/><rect y="20" width="60" height="4"/><rect y="28" width="60" height="4"/><rect y="36" width="60" height="4"/></g><rect width="24" height="16" fill="#3c3b6e"/><g fill="#fff"><g id="s18"><g id="s9"><polygon points="2.5,2.1 3.0,3.5 4.3,3.5 3.2,4.3 3.7,5.7 2.5,4.8 1.3,5.7 1.8,4.3 0.7,3.5 2.0,3.5"/></g><use href="#s9" x="6"/><use href="#s9" x="12"/><use href="#s9" x="18"/><use href="#s9" y="4"/><use href="#s9" x="6" y="4"/><use href="#s9" x="12" y="4"/><use href="#s9" x="18" y="4"/><use href="#s9" y="8"/><use href="#s9" x="6" y="8"/><use href="#s9" x="12" y="8"/><use href="#s9" x="18" y="8"/><use href="#s9" y="12"/><use href="#s9" x="6" y="12"/><use href="#s9" x="12" y="12"/><use href="#s9" x="18" y="12"/></g><use href="#s18" y="2"/></g></svg>`,
  "en-GB": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><path stroke="#fff" stroke-width="6" d="M0,0 L60,40 M60,0 L0,40"/><path stroke="#cf142b" stroke-width="4" d="M0,0 L60,40 M60,0 L0,40"/><rect x="25" width="10" height="40" fill="#fff"/><rect y="15" width="60" height="10" fill="#fff"/><rect x="27" width="6" height="40" fill="#cf142b"/><rect y="17" width="60" height="6" fill="#cf142b"/></svg>`
};

// --- Layout UI Render ---
function renderPremiumUI() {
  appDiv.innerHTML = `
    <div class="premium-card">
      <div id="login-area"></div>
      <div style="display: flex; gap: 1.2em; align-items: flex-end;">
        <div>
          <label><b>Exam Type:</b></label>
          <select id="examType">
            <option value="OET">OET</option>
            <option value="BEE">Spelling Bee</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <div>
          <label><b>Accent:</b></label>
          <select id="accentSelect">
            <option value="en-US">American</option>
            <option value="en-GB">British</option>
          </select>
          <span id="flagSVG" style="vertical-align:middle;"></span>
        </div>
      </div>
      <div id="customUploadArea" style="margin:1.2em 0;display:none;">
        <input id="customWordsInput" class="form-control" placeholder="Paste or type custom words..." style="min-width:270px;" />
        <input type="file" id="customWordsFile" accept=".txt,.pdf,.docx" style="margin-top:0.7em;" />
        <button id="addCustomWordsBtn" class="btn btn-info">+ Add Custom Words</button>
        <div id="customWordFeedback" style="margin:0.4em 0 0 0;font-size:0.98em"></div>
      </div>
      <div id="trainer-area" style="margin:1.5em 0;"></div>
      <div id="score-area" style="margin-top:2em;"></div>
    </div>
  `;
  setupLogin();
  updateFlag();
  document.getElementById("accentSelect").addEventListener("change", updateFlag);

  // Exam select handler
  document.getElementById("examType").addEventListener("change", (e) => {
    sessionType = e.target.value;
    showExamArea();
  });
  showExamArea();
}

function updateFlag() {
  const val = document.getElementById("accentSelect").value;
  document.getElementById("flagSVG").innerHTML = flagSVGs[val] || "";
}

// --- Login/Logout Logic ---
function setupLogin() {
  const loginDiv = document.getElementById("login-area");
  if (firebase.auth().currentUser) {
    currentUser = firebase.auth().currentUser;
    loginDiv.innerHTML = `<span style="margin-right:1em;">${currentUser.email}</span>
      <button id="logoutBtn" class="btn btn-outline-secondary btn-sm">Logout</button>`;
    document.getElementById("logoutBtn").onclick = () => firebase.auth().signOut().then(() => location.reload());
  } else {
    loginDiv.innerHTML = `
      <input type="email" id="loginEmail" class="form-control" placeholder="Email" style="width: 150px; display:inline-block;">
      <input type="password" id="loginPass" class="form-control" placeholder="Password" style="width: 110px; display:inline-block;">
      <button id="loginBtn" class="btn btn-primary btn-sm">Login</button>
      <button id="signupBtn" class="btn btn-link btn-sm">Sign up</button>
      <span id="loginMsg" style="margin-left:1em;color:#b00;"></span>`;
    document.getElementById("loginBtn").onclick = () => {
      const email = document.getElementById("loginEmail").value;
      const pass = document.getElementById("loginPass").value;
      firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => location.reload())
        .catch(err => { document.getElementById("loginMsg").textContent = err.message; });
    };
    document.getElementById("signupBtn").onclick = () => {
      const email = document.getElementById("loginEmail").value;
      const pass = document.getElementById("loginPass").value;
      firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then(() => location.reload())
        .catch(err => { document.getElementById("loginMsg").textContent = err.message; });
    };
  }
}

// --- Main Exam/Practice Logic ---
function showExamArea() {
  words = [];
  flaggedWords = [];
  currentIndex = 0;
  score = 0;
  userAnswers = [];
  document.getElementById("customUploadArea").style.display = (sessionType === "CUSTOM") ? "" : "none";
  document.getElementById("trainer-area").innerHTML = "";
  document.getElementById("score-area").innerHTML = "";
  if (sessionType === "OET") {
    words = window.oetWords ? [...window.oetWords] : [];
    showOETWord();
  } else if (sessionType === "BEE") {
    words = ["banana", "elephant", "umbrella", "computer", "giraffe"];
    showBeeWord();
  } else if (sessionType === "CUSTOM") {
    setupCustomUpload();
  }
}

// --- OET Practice/Exam ---
function showOETWord() {
  if (currentIndex >= words.length) {
    endSession("OET");
    return;
  }
  const word = words[currentIndex];
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${words.length}</h3>
      <input type="text" id="userInput" class="form-control" placeholder="Type what you heard..." autofocus>
      <button id="speakBtn" class="btn btn-primary"><i class="fas fa-volume-up"></i> Hear Word</button>
      <button id="checkBtn" class="btn btn-success">Check</button>
      <button id="prevBtn" class="btn btn-outline-primary" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
      <button id="nextBtn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <div id="feedback" style="margin-top:1em;"></div>
    </div>
  `;
  document.getElementById("speakBtn").onclick = () => speakWord(word);
  document.getElementById("checkBtn").onclick = () => {
    const userInput = document.getElementById("userInput").value.trim();
    userAnswers[currentIndex] = userInput;
    const feedback = document.getElementById("feedback");
    if (userInput.toLowerCase() === word.toLowerCase()) {
      feedback.textContent = "Correct!";
      feedback.style.color = "#28a745";
      score++;
    } else {
      feedback.textContent = `Incorrect. Correct spelling: "${word}"`;
      feedback.style.color = "#dc3545";
    }
  };
  document.getElementById("prevBtn").onclick = () => { if (currentIndex > 0) { currentIndex--; showOETWord(); }};
  document.getElementById("nextBtn").onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showOETWord(); }};
  document.getElementById("flagBtn").onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    showOETWord();
  };
}

// --- Spelling Bee ---
function showBeeWord() {
  if (currentIndex >= words.length) {
    endSession("BEE");
    return;
  }
  const word = words[currentIndex];
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${words.length}</h3>
      <div id="word-status" style="margin-bottom:0.7em;"></div>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
    </div>
  `;
  document.getElementById("flagBtn").onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    showBeeWord();
  };
  setTimeout(() => {
    speakWord(word, () => {
      document.getElementById("word-status").textContent = "Spell the word, letter by letter (e.g. B A N A N A)...";
      startLetterByLetterRecognition(word, showBeeWord);
    });
  }, 500);
}

// --- Custom Upload ---
function setupCustomUpload() {
  const addCustomWordsBtn = document.getElementById("addCustomWordsBtn");
  const customWordsInput = document.getElementById("customWordsInput");
  const customWordsFile = document.getElementById("customWordsFile");
  const customWordFeedback = document.getElementById("customWordFeedback");

  addCustomWordsBtn.onclick = () => {
    const inputText = customWordsInput.value;
    const inputWords = extractWords(inputText);
    if (inputWords.length === 0) {
      customWordFeedback.textContent = "Please enter at least one custom word.";
      customWordFeedback.style.color = "#dc3545";
      return;
    }
    words = [...inputWords];
    useCustomWords = true;
    customWordsInput.value = "";
    customWordFeedback.style.color = "#28a745";
    customWordFeedback.textContent = "Custom word list loaded. Start your session!";
    setTimeout(() => customWordFeedback.textContent = "", 3000);
    showCustomWord();
  };

  customWordsFile.onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    let text = "";
    if (file.type === "text/plain") {
      text = await file.text();
      processCustomWordsCustom(text);
    } else if (
      file.name.endsWith(".pdf") || file.type === "application/pdf"
    ) {
      const reader = new FileReader();
      reader.onload = async function() {
        const typedarray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument({data: typedarray}).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const txt = await page.getTextContent();
          fullText += txt.items.map(item => item.str).join(" ") + " ";
        }
        processCustomWordsCustom(fullText);
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const reader = new FileReader();
      reader.onload = async function() {
        const arrayBuffer = reader.result;
        const result = await mammoth.extractRawText({arrayBuffer});
        processCustomWordsCustom(result.value);
      };
      reader.readAsArrayBuffer(file);
    } else {
      customWordFeedback.textContent = "Unsupported file type!";
      customWordFeedback.style.color = "#dc3545";
      return;
    }
  };

  function processCustomWordsCustom(text) {
    const wordsExtracted = extractWords(text);
    if (wordsExtracted.length === 0) {
      customWordFeedback.textContent = "No valid words found in the file.";
      customWordFeedback.style.color = "#dc3545";
      return;
    }
    words = [...wordsExtracted];
    useCustomWords = true;
    customWordFeedback.style.color = "#28a745";
    customWordFeedback.textContent = "Custom word list loaded from file. Start your session!";
    setTimeout(() => customWordFeedback.textContent = "", 3000);
    showCustomWord();
  }
}

function extractWords(str) {
  return str.split(/[\s,;.\-_/\\]+/).map(w => w.trim()).filter(w => w.length > 0);
}

function showCustomWord() {
  if (currentIndex >= words.length) {
    endSession("CUSTOM");
    return;
  }
  const word = words[currentIndex];
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${words.length}</h3>
      <input type="text" id="userInput" class="form-control" placeholder="Type what you heard..." autofocus>
      <button id="speakBtn" class="btn btn-primary"><i class="fas fa-volume-up"></i> Hear Word</button>
      <button id="checkBtn" class="btn btn-success">Check</button>
      <button id="prevBtn" class="btn btn-outline-primary" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
      <button id="nextBtn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <div id="feedback" style="margin-top:1em;"></div>
    </div>
  `;
  document.getElementById("speakBtn").onclick = () => speakWord(word);
  document.getElementById("checkBtn").onclick = () => {
    const userInput = document.getElementById("userInput").value.trim();
    userAnswers[currentIndex] = userInput;
    const feedback = document.getElementById("feedback");
    if (userInput.toLowerCase() === word.toLowerCase()) {
      feedback.textContent = "Correct!";
      feedback.style.color = "#28a745";
      score++;
    } else {
      feedback.textContent = `Incorrect. Correct spelling: "${word}"`;
      feedback.style.color = "#dc3545";
    }
  };
  document.getElementById("prevBtn").onclick = () => { if (currentIndex > 0) { currentIndex--; showCustomWord(); }};
  document.getElementById("nextBtn").onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showCustomWord(); }};
  document.getElementById("flagBtn").onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    showCustomWord();
  };
}

// --- Speech Synthesis ---
function speakWord(word, cb) {
  if (!window.speechSynthesis) return;
  let utter = new SpeechSynthesisUtterance(word);
  utter.lang = document.getElementById("accentSelect").value;
  utter.onend = cb || null;
  window.speechSynthesis.speak(utter);
}

// --- Speech Recognition for Bee (spelling letter-by-letter) ---
function startLetterByLetterRecognition(targetWord, onDone) {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    document.getElementById("word-status").textContent = "Speech Recognition not supported.";
    return;
  }
  let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = new SpeechRecognition();
  recog.lang = "en-US";
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  recog.onresult = function(event) {
    let spoken = event.results[0][0].transcript.replace(/[^a-zA-Z ]/g,"").toUpperCase().replace(/\s+/g, "");
    let correct = targetWord.toUpperCase();
    userAnswers[currentIndex] = spoken;
    if (spoken === correct) score++;
    currentIndex++;
    setTimeout(onDone, 800);
  };
  recog.onerror = function(e) {
    document.getElementById("word-status").textContent = "Recognition failed. Try again.";
  };
  recog.start();
}

// --- Session Summary ---
function endSession(mode) {
  let percent = Math.round((score / words.length) * 100);
  let wrongWords = [];
  words.forEach((w, i) => {
    if ((userAnswers[i] || "").toLowerCase() !== w.toLowerCase()) wrongWords.push(w);
  });
  let summary = `
    <h3>Session Complete!</h3>
    <p>Your score: <b>${score}</b> / ${words.length} (<b>${percent}%</b>)</p>
    ${flaggedWords.length ? `<div><b>Flagged Words:</b><ul>${flaggedWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ""}
    ${wrongWords.length ? `<div><b>Wrong Words:</b><ul>${wrongWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ""}
    <button class="btn btn-secondary" onclick="location.reload()">New Session</button>
  `;
  scoreDiv.innerHTML = summary;
  trainerDiv.innerHTML = "";
}

// --- Start the app! ---
renderPremiumUI();

