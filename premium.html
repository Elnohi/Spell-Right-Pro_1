// main-freemium-bee.js
let words = [];
let currentIndex = 0;
let score = 0;
let flaggedWords = [];
let userAttempts = [];
let usedCustomListToday = false;

const accentSelect = document.getElementById('accent-select');
const flagSVG = document.getElementById('flag-svg');
const customInput = document.getElementById('custom-words');
const addCustomBtn = document.getElementById('add-custom-btn');
const fileInput = document.getElementById('file-input');
const useSampleBtn = document.getElementById('use-sample-btn');
const startBtn = document.getElementById('start-btn');
const beeArea = document.getElementById('bee-area');
const summaryArea = document.getElementById('summary-area');

const flagSVGs = {
  "en-US": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#b22234" width="60" height="40"/><g fill="#fff"><rect y="4" width="60" height="4"/><rect y="12" width="60" height="4"/><rect y="20" width="60" height="4"/><rect y="28" width="60" height="4"/><rect y="36" width="60" height="4"/></g><rect width="24" height="16" fill="#3c3b6e"/><g fill="#fff"><g id="s18"><g id="s9"><polygon points="2.5,2.1 3.0,3.5 4.3,3.5 3.2,4.3 3.7,5.7 2.5,4.8 1.3,5.7 1.8,4.3 0.7,3.5 2.0,3.5"/></g><use href="#s9" x="6"/><use href="#s9" x="12"/><use href="#s9" x="18"/><use href="#s9" y="4"/><use href="#s9" x="6" y="4"/><use href="#s9" x="12" y="4"/><use href="#s9" x="18" y="4"/><use href="#s9" y="8"/><use href="#s9" x="6" y="8"/><use href="#s9" x="12" y="8"/><use href="#s9" x="18" y="8"/><use href="#s9" y="12"/><use href="#s9" x="6" y="12"/><use href="#s9" x="12" y="12"/><use href="#s9" x="18" y="12"/></g><use href="#s18" y="2"/></g></svg>`,
  "en-GB": `<svg width="24" height="16" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><path stroke="#fff" stroke-width="6" d="M0,0 L60,40 M60,0 L0,40"/><path stroke="#cf142b" stroke-width="4" d="M0,0 L60,40 M60,0 L0,40"/><rect x="25" width="10" height="40" fill="#fff"/><rect y="15" width="60" height="10" fill="#fff"/><rect x="27" width="6" height="40" fill="#cf142b"/><rect y="17" width="60" height="6" fill="#cf142b"/></svg>`
};

function updateFlag() {
  flagSVG.innerHTML = flagSVGs[accentSelect.value] || "";
}
accentSelect.addEventListener('change', updateFlag);
updateFlag();

useSampleBtn.onclick = () => {
  if (usedCustomListToday) {
    alert("You have already used a custom/sample list today.");
    return;
  }
  words = ["banana", "elephant", "caterpillar", "giraffe", "microscope"];
  usedCustomListToday = true;
  beeArea.innerHTML = "";
  summaryArea.innerHTML = "";
  currentIndex = 0; score = 0; userAttempts = [];
  startBee();
};

addCustomBtn.onclick = () => {
  if (usedCustomListToday) {
    alert("You have already used a custom/sample list today.");
    return;
  }
  let input = customInput.value.trim();
  let customWords = input.split(/[\s,;]+/).map(w => w.trim()).filter(w => w);
  if (customWords.length === 0) {
    alert("Paste or type custom words!");
    return;
  }
  words = customWords;
  usedCustomListToday = true;
  beeArea.innerHTML = "";
  summaryArea.innerHTML = "";
  currentIndex = 0; score = 0; userAttempts = [];
  startBee();
};

fileInput.onchange = async (e) => {
  if (usedCustomListToday) {
    alert("You have already used a custom/sample list today.");
    return;
  }
  let file = e.target.files[0];
  if (!file) return;
  let text = "";
  if (file.type === "text/plain") {
    text = await file.text();
  } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    alert("PDF support is coming soon (Premium only for now).");
    return;
  } else {
    alert("Only .txt files supported in this version.");
    return;
  }
  let customWords = text.split(/[\s,;]+/).map(w => w.trim()).filter(w => w);
  words = customWords;
  usedCustomListToday = true;
  beeArea.innerHTML = "";
  summaryArea.innerHTML = "";
  currentIndex = 0; score = 0; userAttempts = [];
  startBee();
};

startBtn.onclick = () => {
  if (!usedCustomListToday) {
    alert("Please enter custom words or use sample list.");
    return;
  }
  beeArea.innerHTML = "";
  summaryArea.innerHTML = "";
  currentIndex = 0; score = 0; userAttempts = [];
  startBee();
};

function startBee() {
  if (!words || words.length === 0) {
    beeArea.innerHTML = "<p>No words loaded.</p>";
    return;
  }
  showBeeWord();
}

function showBeeWord() {
  if (currentIndex >= words.length) {
    showBeeSummary();
    return;
  }
  let word = words[currentIndex];
  beeArea.innerHTML = `
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

function speakWord(word) {
  if (!window.speechSynthesis) return;
  let utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value;
  window.speechSynthesis.speak(utter);
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
  recognition.lang = accentSelect.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let transcript = event.results[0][0].transcript;
    // Clean transcript: remove spaces and non-letter chars
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
