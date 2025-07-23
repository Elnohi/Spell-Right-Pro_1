// main-premium.js
let currentUser = null;
let examType = "OET";
let accent = "en-US";
let words = [];
let currentIndex = 0;
let sessionMode = "practice";
let score = 0;
let flaggedWords = [];
let userAnswers = [];
let userAttempts = [];
let usedCustomListToday = false;

const authArea = document.getElementById('auth-area');
const examUI = document.getElementById('exam-ui');
const trainerArea = document.getElementById('trainer-area');
const summaryArea = document.getElementById('summary-area');

function renderAuth() {
  if (currentUser) {
    authArea.innerHTML = `
      <div style="text-align:right;">
        <span>${currentUser.email}</span>
        <button id="logout-btn" class="btn btn-light btn-sm">Logout</button>
      </div>
    `;
    document.getElementById('logout-btn').onclick = () => auth.signOut();
    renderExamUI();
  } else {
    authArea.innerHTML = `
      <input id="email" type="email" placeholder="Email" class="form-control" style="width:180px;"/>
      <input id="password" type="password" placeholder="Password" class="form-control" style="width:120px;"/>
      <button id="login-btn" class="btn btn-primary">Login</button>
      <button id="signup-btn" class="btn btn-outline-primary">Sign up</button>
    `;
    document.getElementById('login-btn').onclick = () => {
      auth.signInWithEmailAndPassword(
        document.getElementById('email').value,
        document.getElementById('password').value
      ).catch(e => alert(e.message));
    };
    document.getElementById('signup-btn').onclick = () => {
      auth.createUserWithEmailAndPassword(
        document.getElementById('email').value,
        document.getElementById('password').value
      ).catch(e => alert(e.message));
    };
    examUI.innerHTML = "";
    trainerArea.innerHTML = "";
    summaryArea.innerHTML = "";
  }
}
auth.onAuthStateChanged(user => {
  currentUser = user;
  renderAuth();
});

function renderExamUI() {
  examUI.innerHTML = `
    <div style="margin-bottom:1em;">
      <label><b>Exam Type:</b></label>
      <select id="exam-type">
        <option value="OET">OET</option>
        <option value="Bee">Spelling Bee</option>
        <option value="Custom">Custom</option>
        <option value="Upload">Upload File</option>
      </select>
      <label style="margin-left:1em;"><b>Accent:</b></label>
      <select id="accent-select">
        <option value="en-US">American</option>
        <option value="en-GB">British</option>
      </select>
      <span id="flag-svg" style="vertical-align:middle;"></span>
    </div>
    <div id="custom-upload-area"></div>
    <div style="margin-bottom:1em;">
      <button id="practice-mode-btn" class="btn btn-outline-primary selected">Practice Mode</button>
      <button id="test-mode-btn" class="btn btn-outline-primary">Test Mode</button>
      <button id="start-btn" class="btn btn-success">Start</button>
    </div>
  `;
  document.getElementById('exam-type').value = examType;
  document.getElementById('accent-select').value = accent;
  updateFlag();

  document.getElementById('exam-type').onchange = e => {
    examType = e.target.value;
    renderExamUI();
  };
  document.getElementById('accent-select').onchange = e => {
    accent = e.target.value;
    updateFlag();
  };
  document.getElementById('practice-mode-btn').onclick = () => {
    sessionMode = "practice";
    document.getElementById('practice-mode-btn').classList.add("selected");
    document.getElementById('test-mode-btn').classList.remove("selected");
  };
  document.getElementById('test-mode-btn').onclick = () => {
    sessionMode = "test";
    document.getElementById('test-mode-btn').classList.add("selected");
    document.getElementById('practice-mode-btn').classList.remove("selected");
  };
  document.getElementById('start-btn').onclick = () => {
    summaryArea.innerHTML = "";
    if (examType === "OET") {
      words = window.oetWords.slice();
      usedCustomListToday = false;
      startOET();
    } else if (examType === "Bee") {
      words = ["banana", "elephant", "caterpillar", "giraffe", "microscope"];
      usedCustomListToday = false;
      startBee();
    } else if (examType === "Custom") {
      renderCustomInput();
    } else if (examType === "Upload") {
      renderUploadInput();
    }
  };
  if (examType === "Custom") renderCustomInput();
  if (examType === "Upload") renderUploadInput();
}

function updateFlag() {
  const flagSVGs = {
    "en-US": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#b22234" width="60" height="40"/><g fill="#fff"><rect y="4" width="60" height="4"/><rect y="12" width="60" height="4"/><rect y="20" width="60" height="4"/><rect y="28" width="60" height="4"/><rect y="36" width="60" height="4"/></g><rect width="24" height="16" fill="#3c3b6e"/><g fill="#fff"><g id="s18"><g id="s9"><polygon points="2.5,2.1 3.0,3.5 4.3,3.5 3.2,4.3 3.7,5.7 2.5,4.8 1.3,5.7 1.8,4.3 0.7,3.5 2.0,3.5"/></g><use href="#s9" x="6"/><use href="#s9" x="12"/><use href="#s9" x="18"/><use href="#s9" y="4"/><use href="#s9" x="6" y="4"/><use href="#s9" x="12" y="4"/><use href="#s9" x="18" y="4"/><use href="#s9" y="8"/><use href="#s9" x="6" y="8"/><use href="#s9" x="12" y="8"/><use href="#s9" x="18" y="8"/><use href="#s9" y="12"/><use href="#s9" x="6" y="12"/><use href="#s9" x="12" y="12"/><use href="#s9" x="18" y="12"/></g><use href="#s18" y="2"/></g></svg>`,
    "en-GB": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><path stroke="#fff" stroke-width="6" d="M0,0 L60,40 M60,0 L0,40"/><path stroke="#cf142b" stroke-width="4" d="M0,0 L60,40 M60,0 L0,40"/><rect x="25" width="10" height="40" fill="#fff"/><rect y="15" width="60" height="10" fill="#fff"/><rect x="27" width="6" height="40" fill="#cf142b"/><rect y="17" width="60" height="6" fill="#cf142b"/></svg>`
  };
  document.getElementById('flag-svg').innerHTML = flagSVGs[accent] || "";
}

function renderCustomInput() {
  document.getElementById('custom-upload-area').innerHTML = `
    <textarea id="custom-words" rows="2" placeholder="Paste or type your words..."></textarea>
    <button id="add-custom-btn" class="btn btn-info">+ Add Custom Words</button>
  `;
  document.getElementById('add-custom-btn').onclick = () => {
    let input = document.getElementById('custom-words').value.trim();
    let customWords = input.split(/[\s,;]+/).map(w => w.trim()).filter(w => w);
    if (customWords.length === 0) {
      alert("Paste or type custom words!");
      return;
    }
    words = customWords;
    usedCustomListToday = false;
    startOET();
  };
}
function renderUploadInput() {
  document.getElementById('custom-upload-area').innerHTML = `
    <input type="file" id="file-input" />
  `;
  document.getElementById('file-input').onchange = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    let text = "";
    if (file.type === "text/plain") {
      text = await file.text();
    } else {
      alert("Only .txt files supported for upload right now.");
      return;
    }
    let customWords = text.split(/[\s,;]+/).map(w => w.trim()).filter(w => w);
    words = customWords;
    usedCustomListToday = false;
    startOET();
  };
}

function startOET() {
  currentIndex = 0; score = 0; flaggedWords = []; userAnswers = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  showOETWord();
}
function showOETWord() {
  if (currentIndex >= words.length) {
    showSummary();
    return;
  }
  let word = words[currentIndex];
  trainerArea.innerHTML = `
    <h3>Word ${currentIndex + 1} / ${words.length}</h3>
    <button id="speak-btn" class="btn btn-primary">🔊 Speak</button>
    <input type="text" id="user-input" class="form-control" autofocus placeholder="Type what you heard...">
    <button id="check-btn" class="btn btn-success">Check</button>
    <button id="next-btn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
    <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
      <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
    </button>
    <div id="feedback" style="margin-top:1em;"></div>
  `;
  document.getElementById('speak-btn').onclick = () => speakWord(word);
  document.getElementById('check-btn').onclick = () => {
    let userInput = document.getElementById('user-input').value.trim();
    userAnswers[currentIndex] = userInput;
    let feedback = document.getElementById('feedback');
    if (sessionMode === "practice") {
      if (userInput.toLowerCase() === word.toLowerCase()) {
        feedback.textContent = "Correct!";
        feedback.style.color = "#28a745";
        score++;
      } else {
        feedback.textContent = `Incorrect. Correct: "${word}"`;
        feedback.style.color = "#dc3545";
      }
    }
    if (sessionMode === "test") {
      score += (userInput.toLowerCase() === word.toLowerCase()) ? 1 : 0;
      currentIndex++;
      showOETWord();
    }
  };
  document.getElementById('next-btn').onclick = () => {
    currentIndex++;
    showOETWord();
  };
  document.getElementById('flag-btn').onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    showOETWord();
  };
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  let utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent;
  window.speechSynthesis.speak(utter);
}

function showSummary() {
  let percent = Math.round((score / words.length) * 100);
  let wrongWords = [];
  words.forEach((w, i) => {
    if ((userAnswers[i] || "").toLowerCase() !== w.toLowerCase()) wrongWords.push(w);
  });
  summaryArea.innerHTML = `
    <h3>Session Complete!</h3>
    <p>Your score: <b>${score}</b> / ${words.length} (<b>${percent}%</b>)</p>
    ${flaggedWords.length ? `<div><b>Flagged Words:</b><ul>${flaggedWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
    ${wrongWords.length ? `<div><b>Wrong Words:</b><ul>${wrongWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
  `;
}

// Spelling Bee for Premium (with speech input)
function startBee() {
  currentIndex = 0; score = 0; flaggedWords = []; userAttempts = [];
  trainerArea.innerHTML = "";
  summaryArea.innerHTML = "";
  showBeeWord();
}
function showBeeWord() {
  if (currentIndex >= words.length) {
    showBeeSummary();
    return;
  }
  let word = words[currentIndex];
  trainerArea.innerHTML = `
    <h3>Word ${currentIndex + 1} / ${words.length}</h3>
    <button id="speak-btn" class="btn btn-primary">🔊 Hear Word</button>
    <button id="spell-mic-btn" class="btn btn-warning">🎤 Spell (Mic)</button>
    <button id="prev-btn" class="btn btn-outline-primary" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
    <button id="next-btn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
    <button id="flag-btn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
      <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
    </button>
    <div id="mic-feedback" style="margin-top:1em;"></div>
  `;
  document.getElementById('speak-btn').onclick = () => speakWord(word);
  document.getElementById('spell-mic-btn').onclick = () => listenForSpelling(word);
  document.getElementById('prev-btn').onclick = () => {
    if (currentIndex > 0) currentIndex--;
    showBeeWord();
  };
  document.getElementById('next-btn').onclick = () => {
    if (currentIndex < words.length - 1) currentIndex++;
    showBeeWord();
  };
  document.getElementById('flag-btn').onclick = () => {
    const idx = flaggedWords.indexOf(word);
    if (idx === -1) flaggedWords.push(word);
    else flaggedWords.splice(idx, 1);
    showBeeWord();
  };
}
function listenForSpelling(correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  micFeedback.innerHTML = "Listening... Please spell the word letter by letter.";
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    micFeedback.innerHTML = "Speech recognition not supported in this browser.";
    return;
  }
  let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = new SpeechRecognition();
  recognition.lang = accent;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let transcript = event.results[0][0].transcript;
    let spelled = transcript.replace(/[^a-zA-Z]/g, '').toLowerCase();
    let answer = correctWord.replace(/[^a-zA-Z]/g, '').toLowerCase();
    userAttempts[currentIndex] = spelled;
    if (spelled === answer) {
      micFeedback.innerHTML = `<span style="color:green;">Correct! (${transcript})</span>`;
      score++;
    } else {
      micFeedback.innerHTML = `<span style="color:red;">Incorrect: You said "${transcript}". Correct spelling: ${correctWord}</span>`;
    }
    setTimeout(() => {
      currentIndex++;
      showBeeWord();
    }, 1700);
  };
  recognition.onerror = (e) => {
    micFeedback.innerHTML = `<span style="color:red;">Error: ${e.error}</span>`;
  };
  recognition.onend = () => {};
  recognition.start();
}
function showBeeSummary() {
  let percent = Math.round((score / words.length) * 100);
  let wrongWords = [];
  words.forEach((w, i) => {
    if ((userAttempts[i] || "").toLowerCase() !== w.toLowerCase()) wrongWords.push(w);
  });
  summaryArea.innerHTML = `
    <h3>Bee Complete!</h3>
    <p>Your score: <b>${score}</b> / ${words.length} (<b>${percent}%</b>)</p>
    ${flaggedWords.length ? `<div><b>Flagged Words:</b><ul>${flaggedWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
    ${wrongWords.length ? `<div><b>Wrong Words:</b><ul>${wrongWords.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
  `;
}
