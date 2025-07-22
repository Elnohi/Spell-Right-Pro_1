// Import OET word list (make sure js/oet_word_list.js exists and exports oetWords)
import { oetWords } from './oet_word_list.js';

// --- SVG flag support ---
const flagSVGs = {
  "en-US": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect fill="#b22234" width="60" height="40"/><g fill="#fff"><rect y="4" width="60" height="4"/><rect y="12" width="60" height="4"/><rect y="20" width="60" height="4"/><rect y="28" width="60" height="4"/><rect y="36" width="60" height="4"/></g><rect width="24" height="16" fill="#3c3b6e"/><g fill="#fff"><g id="s18"><g id="s9"><polygon points="2.5,2.1 3.0,3.5 4.3,3.5 3.2,4.3 3.7,5.7 2.5,4.8 1.3,5.7 1.8,4.3 0.7,3.5 2.0,3.5"/></g><use href="#s9" x="6"/><use href="#s9" x="12"/><use href="#s9" x="18"/><use href="#s9" y="4"/><use href="#s9" x="6" y="4"/><use href="#s9" x="12" y="4"/><use href="#s9" x="18" y="4"/><use href="#s9" y="8"/><use href="#s9" x="6" y="8"/><use href="#s9" x="12" y="8"/><use href="#s9" x="18" y="8"/><use href="#s9" y="12"/><use href="#s9" x="6" y="12"/><use href="#s9" x="12" y="12"/><use href="#s9" x="18" y="12"/></g><use href="#s18" y="2"/></g></svg>`,
  "en-GB": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><path stroke="#fff" stroke-width="6" d="M0,0 L60,40 M60,0 L0,40"/><path stroke="#cf142b" stroke-width="4" d="M0,0 L60,40 M60,0 L0,40"/><rect x="25" width="10" height="40" fill="#fff"/><rect y="15" width="60" height="10" fill="#fff"/><rect x="27" width="6" height="40" fill="#cf142b"/><rect y="17" width="60" height="6" fill="#cf142b"/></svg>`,
  "en-AU": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><polygon fill="#fff" points="6,6 8,12 2,9 10,9 4,12"/><polygon fill="#fff" points="54,10 56,12 58,10 56,14 54,10"/><polygon fill="#fff" points="50,32 53,34 55,32 53,36 50,32"/><polygon fill="#fff" points="36,28 39,29 40,26 38,32 36,28"/><polygon fill="#fff" points="47,20 49,22 51,20 49,24 47,20"/><rect x="0" y="0" width="24" height="16" fill="#fff"/><rect x="2" y="0" width="20" height="16" fill="#00247d"/><path stroke="#fff" stroke-width="2" d="M2,0 L22,16 M22,0 L2,16"/><rect x="10" y="0" width="4" height="16" fill="#fff"/><rect x="0" y="6" width="24" height="4" fill="#fff"/><rect x="11" y="0" width="2" height="16" fill="#cf142b"/><rect y="7" width="24" height="2" fill="#cf142b"/></svg>`
};

// --- Firebase Auth (user state) ---
let currentUser = null;
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const authContainer = document.getElementById('firebase-auth-container');
const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logoutBtn');

function setupFirebaseUI() {
  if (!window.firebaseui) {
    const script = document.createElement('script');
    script.src = "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.js";
    script.onload = runUI;
    document.body.appendChild(script);
    const style = document.createElement('link');
    style.rel = "stylesheet";
    style.href = "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.css";
    document.head.appendChild(style);
  } else {
    runUI();
  }
  function runUI() {
    const ui = new firebaseui.auth.AuthUI(auth);
    ui.start(authContainer, {
      signInOptions: [
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
      ],
      callbacks: {
        signInSuccessWithAuthResult: function(authResult, redirectUrl) {
          authContainer.style.display = "none";
          userInfoDiv.style.display = "block";
          userEmailSpan.textContent = authResult.user.email;
          currentUser = authResult.user;
          return false;
        }
      }
    });
  }
}
auth.onAuthStateChanged(function(user) {
  if (user) {
    currentUser = user;
    authContainer.style.display = "none";
    userInfoDiv.style.display = "block";
    userEmailSpan.textContent = user.email;
  } else {
    currentUser = null;
    authContainer.style.display = "block";
    userInfoDiv.style.display = "none";
    userEmailSpan.textContent = '';
    setupFirebaseUI();
  }
});
if (logoutBtn) {
  logoutBtn.onclick = function() {
    auth.signOut();
  };
}

// --- DOM elements ---
const accentSelect = document.getElementById('accentSelect');
const accentFlagSVG = document.getElementById('accentFlagSVG');
const examType = document.getElementById('examType');
const examArea = document.getElementById('examArea');
const trainerDiv = document.getElementById('trainer');
const scoreDiv = document.getElementById('scoreDisplay');
const feedbackArea = document.getElementById('feedbackArea');

// --- Flags ---
function updateFlagSVG() {
  accentFlagSVG.innerHTML = flagSVGs[accentSelect.value] || "";
}
accentSelect.onchange = updateFlagSVG;
updateFlagSVG();

// --- Exam Type Switching ---
examType.onchange = renderExamArea;
renderExamArea();

// --- State ---
let words = [];
let currentIndex = 0;
let flaggedWords = [];
let score = 0;
let userAnswers = [];
let useCustomWords = false;
let modeBee = false;
let modeOET = false;
let modeCustom = false;

// --- Exam Area UI ---
function renderExamArea() {
  trainerDiv.innerHTML = "";
  scoreDiv.innerHTML = "";
  feedbackArea.innerHTML = "";
  words = [];
  flaggedWords = [];
  currentIndex = 0;
  score = 0;
  userAnswers = [];
  useCustomWords = false;
  modeBee = false;
  modeOET = false;
  modeCustom = false;

  let html = "";
  if (examType.value === "oet") {
    html += `
      <div style="margin-bottom:0.7em;">
        <button id="startOET" class="btn btn-success"><i class="fas fa-play"></i> Start OET Practice</button>
      </div>
    `;
    modeOET = true;
  }
  if (examType.value === "bee") {
    html += `
      <div id="beeWordArea" style="margin:1em 0;">
        <span class="field-label">Custom Words:</span>
        <textarea id="customWordsInput" class="form-control" rows="2" placeholder="Paste or type your words..."></textarea>
        <input type="file" id="customWordsFile" accept=".txt,.pdf,.docx,.doc" style="margin-top:0.5em;">
        <button id="addCustomWordsBtn" class="btn btn-info" style="margin-top:0.5em;">
          <i class="fa-solid fa-plus"></i> Add Custom Words
        </button>
        <button id="useSampleWordsBtn" class="btn btn-secondary" style="margin-top:0.5em;">
          <i class="fa-solid fa-lightbulb"></i> Use Sample Words
        </button>
        <div id="customWordFeedback" style="color:#dc3545; margin-top:0.5em;"></div>
      </div>
      <div style="margin-bottom:0.7em;">
        <button id="startBee" class="btn btn-success"><i class="fas fa-play"></i> Start Spelling Bee</button>
      </div>
    `;
    modeBee = true;
  }
  if (examType.value === "custom") {
    html += `
      <div id="customWordArea" style="margin:1em 0;">
        <span class="field-label">Custom Words:</span>
        <textarea id="customWordsInput" class="form-control" rows="2" placeholder="Paste or type your words..."></textarea>
        <input type="file" id="customWordsFile" accept=".txt,.pdf,.docx,.doc" style="margin-top:0.5em;">
        <button id="addCustomWordsBtn" class="btn btn-info" style="margin-top:0.5em;">
          <i class="fa-solid fa-plus"></i> Add Custom Words
        </button>
        <div id="customWordFeedback" style="color:#dc3545; margin-top:0.5em;"></div>
      </div>
      <div style="margin-bottom:0.7em;">
        <button id="startCustom" class="btn btn-success"><i class="fas fa-play"></i> Start Custom Practice</button>
      </div>
    `;
    modeCustom = true;
  }
  examArea.innerHTML = html;

  if (modeOET) {
    document.getElementById('startOET').onclick = startOETSession;
  }
  if (modeBee) {
    setupBeeCustom();
    document.getElementById('startBee').onclick = startBeeSession;
  }
  if (modeCustom) {
    setupCustomUpload();
    document.getElementById('startCustom').onclick = startCustomSession;
  }
}

// --- Utility ---
function extractWords(str) {
  return str
    .split(/[\s,;]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

// --- OET ---
function startOETSession() {
  words = [...oetWords];
  flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsOETPREMIUM') || "[]");
  currentIndex = 0; score = 0; userAnswers = [];
  showOETWord();
}

function showOETWord() {
  if (currentIndex >= words.length) {
    endSession('OET');
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
  document.getElementById('speakBtn').onclick = () => speakWord(word);
  document.getElementById('checkBtn').onclick = () => {
    const userInput = document.getElementById('userInput').value.trim();
    userAnswers[currentIndex] = userInput;
    const feedback = document.getElementById('feedback');
    if (userInput.toLowerCase() === word.toLowerCase()) {
      feedback.textContent = "Correct!";
      feedback.style.color = "#28a745";
      score++;
    } else {
      feedback.textContent = `Incorrect. Correct spelling: "${word}"`;
      feedback.style.color = "#dc3545";
    }
  };
  document.getElementById('prevBtn').onclick = () => { if (currentIndex > 0) { currentIndex--; showOETWord(); }};
  document.getElementById('nextBtn').onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showOETWord(); }};
  document.getElementById('flagBtn').onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    localStorage.setItem('flaggedWordsOETPREMIUM', JSON.stringify(flaggedWords));
    showOETWord();
  };
}

// --- Spelling Bee ---
function setupBeeCustom() {
  const addCustomWordsBtn = document.getElementById('addCustomWordsBtn');
  const customWordsInput = document.getElementById('customWordsInput');
  const customWordsFile = document.getElementById('customWordsFile');
  const customWordFeedback = document.getElementById('customWordFeedback');
  const useSampleWordsBtn = document.getElementById('useSampleWordsBtn');

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
  };

  customWordsFile.onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    let text = "";
    if (file.type === "text/plain") {
      text = await file.text();
      processCustomWordsBee(text);
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
        processCustomWordsBee(fullText);
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const reader = new FileReader();
      reader.onload = async function() {
        const arrayBuffer = reader.result;
        const result = await mammoth.extractRawText({arrayBuffer});
        processCustomWordsBee(result.value);
      };
      reader.readAsArrayBuffer(file);
    } else {
      customWordFeedback.textContent = "Unsupported file type!";
      customWordFeedback.style.color = "#dc3545";
      return;
    }
  };

  function processCustomWordsBee(text) {
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
  }

  useSampleWordsBtn.onclick = () => {
    words = ["banana", "elephant", "computer", "umbrella", "giraffe"];
    useCustomWords = false;
    customWordFeedback.style.color = "#28a745";
    customWordFeedback.textContent = "Sample words loaded. Start your session!";
    setTimeout(() => customWordFeedback.textContent = "", 2000);
  };
}

function startBeeSession() {
  flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsBEEPREMIUM') || "[]");
  currentIndex = 0; score = 0; userAnswers = [];
  if (!words || words.length === 0) {
    alert("No words loaded! Add custom words or use sample words.");
    return;
  }
  showBeeWord();
}

// Like the freemium Bee, but with premium flag key!
function showBeeWord() {
  if (currentIndex >= words.length) {
    endSession('BEE');
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
  document.getElementById('flagBtn').onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    localStorage.setItem('flaggedWordsBEEPREMIUM', JSON.stringify(flaggedWords));
    showBeeWord();
  };

  setTimeout(() => {
    speakWord(word, () => {
      document.getElementById('word-status').textContent =
        "Spell the word, letter by letter (e.g. B A N A N A)...";
      startLetterByLetterRecognition(word, showBeeWord);
    });
  }, 500);
}

// --- Custom Exam (like OET but user words) ---
function setupCustomUpload() {
  const addCustomWordsBtn = document.getElementById('addCustomWordsBtn');
  const customWordsInput = document.getElementById('customWordsInput');
  const customWordsFile = document.getElementById('customWordsFile');
  const customWordFeedback = document.getElementById('customWordFeedback');

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
  }
}

function startCustomSession() {
  flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsCUSTOMPREMIUM') || "[]");
  currentIndex = 0; score = 0; userAnswers = [];
  if (!words || words.length === 0) {
    alert("No words loaded! Add custom words or upload a file.");
    return;
  }
  showCustomWord();
}

function showCustomWord() {
  if (currentIndex >= words.length) {
    endSession('CUSTOM');
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
  document.getElementById('speakBtn').onclick = () => speakWord(word);
  document.getElementById('checkBtn').onclick = () => {
    const userInput = document.getElementById('userInput').value.trim();
    userAnswers[currentIndex] = userInput;
    const feedback = document.getElementById('feedback');
    if (userInput.toLowerCase() === word.toLowerCase()) {
      feedback.textContent = "Correct!";
      feedback.style.color = "#28a745";
      score++;
    } else {
      feedback.textContent = `Incorrect. Correct spelling: "${word}"`;
      feedback.style.color = "#dc3545";
    }
  };
  document.getElementById('prevBtn').onclick = () => { if (currentIndex > 0) { currentIndex--; showCustomWord(); }};
  document.getElementById('nextBtn').onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showCustomWord(); }};
  document.getElementById('flagBtn').onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    localStorage.setItem('flaggedWordsCUSTOMPREMIUM', JSON.stringify(flaggedWords));
    showCustomWord();
  };
}

// ---- Shared (Bee & OET) helpers ----
function speakWord(word, callback) {
  if (!window.speechSynthesis) return callback && callback();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value || 'en-US';
  utter.onend = function() {
    if (callback) callback();
  };
  window.speechSynthesis.speak(utter);
}

function startLetterByLetterRecognition(correctWord, nextWordFn) {
  const statusDiv = document.getElementById('word-status');
  let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    statusDiv.textContent = "Speech recognition not supported.";
    statusDiv.style.color = "#dc3545";
    return;
  }
  let recognition = new SpeechRecognition();
  recognition.lang = accentSelect.value || 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let timeout = setTimeout(() => {
    recognition.abort();
    statusDiv.textContent = "No response detected. Moving to next word.";
    statusDiv.style.color = "#dc3545";
    setTimeout(() => { currentIndex++; nextWordFn(); }, 1200);
  }, 9000);

  recognition.onresult = function(event) {
    clearTimeout(timeout);
    let spokenRaw = event.results[0][0].transcript.trim();
    let spoken = spokenRaw.toUpperCase().replace(/[^A-Z]/g, '');
    let correct = correctWord.toUpperCase().replace(/[^A-Z]/g, '');
    userAnswers[currentIndex] = spoken;
    if (spoken === correct) {
      statusDiv.textContent = "Correct!";
      statusDiv.style.color = "#28a745";
      score++;
    } else {
      statusDiv.textContent = `Incorrect. You spelled: "${spokenRaw}"`;
      statusDiv.style.color = "#dc3545";
    }
    setTimeout(() => {
      currentIndex++;
      nextWordFn();
    }, 1500);
  };

  recognition.onerror = function() {
    clearTimeout(timeout);
    statusDiv.textContent = "Could not recognize. Moving to next word.";
    statusDiv.style.color = "#dc3545";
    setTimeout(() => { currentIndex++; nextWordFn(); }, 1200);
  };

  recognition.start();
}

// --- Session End & Feedback ---
function endSession(type) {
  trainerDiv.innerHTML = "";
  const percent = Math.round((score / words.length) * 100);
  let wrongWords = [];
  words.forEach((word, idx) => {
    if (userAnswers[idx] !== undefined && userAnswers[idx].replace(/\s+/g, '').toLowerCase() !== word.replace(/\s+/g, '').toLowerCase()) {
      wrongWords.push(word);
    }
  });
  let wrongList = "";
  if (wrongWords.length > 0) {
    wrongList = `<div style="margin-top:1em;"><b>Wrong Words:</b><ul style="margin:0 0 0 1.5em;">${wrongWords.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
  }
  let flagKey = "flaggedWordsOETPREMIUM";
  if (type === "BEE") flagKey = "flaggedWordsBEEPREMIUM";
  if (type === "CUSTOM") flagKey = "flaggedWordsCUSTOMPREMIUM";

  scoreDiv.innerHTML = `<h3>Session Complete!</h3>
    <p>Your score: <b>${score}</b> / ${words.length} (<b>${percent}%</b>)</p>
    ${wrongList}
    ${flaggedWords.length ? `<button id="practiceFlaggedBtn" class="btn btn-info" style="margin-top:1em;">Practice Flagged Words (${flaggedWords.length})</button>` : ""}
    <div style="margin-top:2em;">
      <b>Send us your feedback!</b>
      <textarea id="userFeedbackText" class="form-control" rows="2" placeholder="Write your feedback or suggestions here..."></textarea>
      <button id="sendFeedbackBtn" class="btn btn-outline-primary" style="margin-top:0.5em;">Send Feedback</button>
      <span id="feedbackMsg" style="margin-left:1em; color:#3c0;"></span>
    </div>
  `;
  if (flaggedWords.length) {
    document.getElementById('practiceFlaggedBtn').onclick = () => {
      words = [...flaggedWords];
      currentIndex = 0; score = 0; userAnswers = [];
      if (type === "BEE") showBeeWord();
      if (type === "OET") showOETWord();
      if (type === "CUSTOM") showCustomWord();
      scoreDiv.innerHTML = '';
    };
  }
  document.getElementById('sendFeedbackBtn').onclick = () => {
    sendUserFeedback();
  };
}

// --- Feedback send (demo, replace with your backend/email integration) ---
function sendUserFeedback() {
  const feedbackText = document.getElementById('userFeedbackText').value.trim();
  const feedbackMsg = document.getElementById('feedbackMsg');
  if (!feedbackText) {
    feedbackMsg.textContent = "Please enter your feedback first.";
    feedbackMsg.style.color = "#dc3545";
    return;
  }
  // Example: send to Firestore
  if (currentUser) {
    firebase.firestore().collection("feedback").add({
      user: currentUser.email,
      feedback: feedbackText,
      timestamp: new Date()
    }).then(() => {
      feedbackMsg.textContent = "Feedback sent. Thank you!";
      feedbackMsg.style.color = "#28a745";
      document.getElementById('userFeedbackText').value = "";
    }).catch(() => {
      feedbackMsg.textContent = "Could not send feedback. Try again.";
      feedbackMsg.style.color = "#dc3545";
    });
  } else {
    feedbackMsg.textContent = "You must be logged in to send feedback.";
    feedbackMsg.style.color = "#dc3545";
  }
}
