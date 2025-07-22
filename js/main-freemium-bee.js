// --- SVG flag support for en-US, en-GB, en-AU ---
const flagSVGs = {
  "en-US": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect fill="#b22234" width="60" height="40"/><g fill="#fff"><rect y="4" width="60" height="4"/><rect y="12" width="60" height="4"/><rect y="20" width="60" height="4"/><rect y="28" width="60" height="4"/><rect y="36" width="60" height="4"/></g><rect width="24" height="16" fill="#3c3b6e"/><g fill="#fff"><g id="s18"><g id="s9"><polygon points="2.5,2.1 3.0,3.5 4.3,3.5 3.2,4.3 3.7,5.7 2.5,4.8 1.3,5.7 1.8,4.3 0.7,3.5 2.0,3.5"/></g><use href="#s9" x="6"/><use href="#s9" x="12"/><use href="#s9" x="18"/><use href="#s9" y="4"/><use href="#s9" x="6" y="4"/><use href="#s9" x="12" y="4"/><use href="#s9" x="18" y="4"/><use href="#s9" y="8"/><use href="#s9" x="6" y="8"/><use href="#s9" x="12" y="8"/><use href="#s9" x="18" y="8"/><use href="#s9" y="12"/><use href="#s9" x="6" y="12"/><use href="#s9" x="12" y="12"/><use href="#s9" x="18" y="12"/></g><use href="#s18" y="2"/></g></svg>`,
  "en-GB": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><path stroke="#fff" stroke-width="6" d="M0,0 L60,40 M60,0 L0,40"/><path stroke="#cf142b" stroke-width="4" d="M0,0 L60,40 M60,0 L0,40"/><rect x="25" width="10" height="40" fill="#fff"/><rect y="15" width="60" height="10" fill="#fff"/><rect x="27" width="6" height="40" fill="#cf142b"/><rect y="17" width="60" height="6" fill="#cf142b"/></svg>`,
  "en-AU": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect fill="#00247d" width="60" height="40"/><polygon fill="#fff" points="6,6 8,12 2,9 10,9 4,12"/><polygon fill="#fff" points="54,10 56,12 58,10 56,14 54,10"/><polygon fill="#fff" points="50,32 53,34 55,32 53,36 50,32"/><polygon fill="#fff" points="36,28 39,29 40,26 38,32 36,28"/><polygon fill="#fff" points="47,20 49,22 51,20 49,24 47,20"/><rect x="0" y="0" width="24" height="16" fill="#fff"/><rect x="2" y="0" width="20" height="16" fill="#00247d"/><path stroke="#fff" stroke-width="2" d="M2,0 L22,16 M22,0 L2,16"/><rect x="10" y="0" width="4" height="16" fill="#fff"/><rect x="0" y="6" width="24" height="4" fill="#fff"/><rect x="11" y="0" width="2" height="16" fill="#cf142b"/><rect y="7" width="24" height="2" fill="#cf142b"/></svg>`
};

const sampleWords = [
  "banana", "elephant", "computer", "umbrella", "giraffe"
];

// Utility: split by space, newline, tab, comma, semicolon
function extractWords(str) {
  return str
    .split(/[\s,;]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

let words = [];
let currentIndex = 0;
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsBEE')) || [];
let score = 0;
let userAnswers = [];
let useCustomWords = false;

const trainerDiv = document.getElementById('trainer');
const scoreDiv = document.getElementById('scoreDisplay');
const accentSelect = document.getElementById('accentSelect');
const accentFlagSVG = document.getElementById('accentFlagSVG');
const customWordsInput = document.getElementById('customWordsInput');
const addCustomWordsBtn = document.getElementById('addCustomWordsBtn');
const customWordFeedback = document.getElementById('customWordFeedback');
const customWordsFile = document.getElementById('customWordsFile');
const useSampleWordsBtn = document.getElementById('useSampleWordsBtn');

function updateFlagSVG() {
  const val = accentSelect.value;
  accentFlagSVG.innerHTML = flagSVGs[val] || "";
}
accentSelect.onchange = updateFlagSVG;
updateFlagSVG();

// --- Custom words logic (only one list/day) ---
addCustomWordsBtn.onclick = () => {
  const today = new Date().toISOString().slice(0,10);
  const lastCustom = JSON.parse(localStorage.getItem('customWordsMetaBEE') || '{}');
  if (lastCustom.date === today) {
    customWordFeedback.textContent = "You can only use one custom word list per day. Try again tomorrow!";
    customWordFeedback.style.color = "#dc3545";
    return;
  }
  const inputText = customWordsInput.value;
  const inputWords = extractWords(inputText);
  if (inputWords.length === 0) {
    customWordFeedback.textContent = "Please enter at least one custom word.";
    customWordFeedback.style.color = "#dc3545";
    return;
  }
  words = [...inputWords];
  useCustomWords = true;
  localStorage.setItem('customWordsMetaBEE', JSON.stringify({ date: today }));
  customWordsInput.value = "";
  customWordFeedback.style.color = "#28a745";
  customWordFeedback.textContent = "Custom word list saved for today. Start your session!";
  setTimeout(() => customWordFeedback.textContent = "", 3000);
};

// --- Custom words file upload ---
customWordsFile.onchange = async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const today = new Date().toISOString().slice(0,10);
  const lastCustom = JSON.parse(localStorage.getItem('customWordsMetaBEE') || '{}');
  if (lastCustom.date === today) {
    customWordFeedback.textContent = "You can only use one custom word list per day. Try again tomorrow!";
    customWordFeedback.style.color = "#dc3545";
    return;
  }
  let text = "";
  if (file.type === "text/plain") {
    text = await file.text();
    processCustomWords(text);
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
      processCustomWords(fullText);
    };
    reader.readAsArrayBuffer(file);
  } else if (
    file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const reader = new FileReader();
    reader.onload = async function() {
      const arrayBuffer = reader.result;
      const result = await mammoth.extractRawText({arrayBuffer});
      processCustomWords(result.value);
    };
    reader.readAsArrayBuffer(file);
  } else {
    customWordFeedback.textContent = "Unsupported file type!";
    customWordFeedback.style.color = "#dc3545";
    return;
  }
};

function processCustomWords(text) {
  const today = new Date().toISOString().slice(0,10);
  const wordsExtracted = extractWords(text);
  if (wordsExtracted.length === 0) {
    customWordFeedback.textContent = "No valid words found in the file.";
    customWordFeedback.style.color = "#dc3545";
    return;
  }
  words = [...wordsExtracted];
  useCustomWords = true;
  localStorage.setItem('customWordsMetaBEE', JSON.stringify({ date: today }));
  customWordFeedback.style.color = "#28a745";
  customWordFeedback.textContent = "Custom word list saved from file for today. Start your session!";
  setTimeout(() => customWordFeedback.textContent = "", 3000);
}

useSampleWordsBtn.onclick = () => {
  words = [...sampleWords];
  useCustomWords = false;
  customWordFeedback.style.color = "#28a745";
  customWordFeedback.textContent = "Sample words loaded. Start your session!";
  setTimeout(() => customWordFeedback.textContent = "", 2000);
};

document.getElementById('startBee').onclick = () => {
  if (useCustomWords && (!words || words.length === 0)) {
    alert("No custom words found! Please enter or upload a custom word list.");
    return;
  }
  if (!useCustomWords && (!words || words.length === 0)) {
    alert("No words loaded! Click 'Use Sample Words' or add custom words.");
    return;
  }
  currentIndex = 0;
  score = 0;
  userAnswers = [];
  scoreDiv.innerHTML = '';
  showWord();
};

// ---- SPELLING BEE FLOW: AUTOMATIC ----
function showWord() {
  if (currentIndex >= words.length) {
    endSession();
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
  document.getElementById('flagBtn').onclick = () => toggleFlag(word);

  setTimeout(() => {
    speakWord(word, () => {
      document.getElementById('word-status').textContent = "Listening for your spelling...";
      startSpeechRecognition(word);
    });
  }, 500);
}

function speakWord(word, callback) {
  if (!window.speechSynthesis) return callback && callback();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value || 'en-US';
  utter.onend = function() {
    if (callback) callback();
  };
  window.speechSynthesis.speak(utter);
}

function startSpeechRecognition(correctWord) {
  const statusDiv = document.getElementById('word-status');
  let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    statusDiv.textContent = "Speech recognition not supported.";
    statusDiv.style.color = "#dc3545";
    return;
  }
  let recognition = new SpeechRecognition();
  recognition.lang = accentSelect.value || 'en-US';
  let timeout = setTimeout(() => {
    recognition.abort();
    statusDiv.textContent = "No response detected. Moving to next word.";
    statusDiv.style.color = "#dc3545";
    setTimeout(() => { currentIndex++; showWord(); }, 1200);
  }, 6000); // 6 seconds to respond

  recognition.onresult = function(event) {
    clearTimeout(timeout);
    let spoken = event.results[0][0].transcript.trim();
    userAnswers[currentIndex] = spoken;
    if (spoken.replace(/\s+/g, '').toLowerCase() === correctWord.replace(/\s+/g, '').toLowerCase()) {
      statusDiv.textContent = "Correct!";
      statusDiv.style.color = "#28a745";
      score++;
    } else {
      statusDiv.textContent = `Incorrect. You said: "${spoken}"`;
      statusDiv.style.color = "#dc3545";
    }
    setTimeout(() => {
      currentIndex++;
      showWord();
    }, 1200);
  };
  recognition.onerror = function() {
    clearTimeout(timeout);
    statusDiv.textContent = "Could not recognize. Moving to next word.";
    statusDiv.style.color = "#dc3545";
    setTimeout(() => { currentIndex++; showWord(); }, 1200);
  };
  recognition.start();
}

function toggleFlag(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  localStorage.setItem('flaggedWordsBEE', JSON.stringify(flaggedWords));
  showWord();
}

function endSession() {
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
  scoreDiv.innerHTML = `<h3>Session Complete!</h3>
    <p>Your score: <b>${score}</b> / ${words.length} (<b>${percent}%</b>)</p>
    ${wrongList}
    ${flaggedWords.length ? `<button id="practiceFlaggedBtn" class="btn btn-info" style="margin-top:1em;">Practice Flagged Words (${flaggedWords.length})</button>` : ""}
  `;
  if (flaggedWords.length) {
    document.getElementById('practiceFlaggedBtn').onclick = () => {
      words = [...flaggedWords];
      currentIndex = 0; score = 0;
      userAnswers = [];
      showWord();
      scoreDiv.innerHTML = '';
    };
  }
  useCustomWords = false;
}
