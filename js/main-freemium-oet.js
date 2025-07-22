import { oetWords } from './oet_word_list.js';

// Utility: split by space, newline, tab, comma, semicolon
function extractWords(str) {
  return str
    .split(/[\s,;]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

let words = [];
let currentIndex = 0;
let isTestMode = false;
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsOET')) || [];
let score = 0;
let userAnswers = [];
let useCustomWords = false;

const trainerDiv = document.getElementById('trainer');
const scoreDiv = document.getElementById('scoreDisplay');
const accentSelect = document.getElementById('accentSelect');
const accentFlag = document.getElementById('accentFlag');
const customWordsInput = document.getElementById('customWordsInput');
const addCustomWordsBtn = document.getElementById('addCustomWordsBtn');
const customWordFeedback = document.getElementById('customWordFeedback');
const customWordsFile = document.getElementById('customWordsFile');

document.getElementById('practiceModeBtn').onclick = () => setMode(false);
document.getElementById('testModeBtn').onclick = () => setMode(true);

function setMode(testMode) {
  isTestMode = testMode;
  document.getElementById('practiceModeBtn').classList.toggle('active-mode', !testMode);
  document.getElementById('testModeBtn').classList.toggle('active-mode', testMode);
}

// Accent flag logic
accentSelect.onchange = function() {
  const map = { "en-US": "us", "en-GB": "gb", "en-AU": "au" };
  accentFlag.src = `assets/flags/${map[accentSelect.value] || "us"}.png`;
};

// --- Custom words logic (only one list/day) ---
addCustomWordsBtn.onclick = () => {
  const today = new Date().toISOString().slice(0,10);
  const lastCustom = JSON.parse(localStorage.getItem('customWordsMetaOET') || '{}');
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
  localStorage.setItem('customWordsMetaOET', JSON.stringify({ date: today }));
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
  const lastCustom = JSON.parse(localStorage.getItem('customWordsMetaOET') || '{}');
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
    // PDF
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
    // DOCX
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
  localStorage.setItem('customWordsMetaOET', JSON.stringify({ date: today }));
  customWordFeedback.style.color = "#28a745";
  customWordFeedback.textContent = "Custom word list saved from file for today. Start your session!";
  setTimeout(() => customWordFeedback.textContent = "", 3000);
}

// --- Start session ---
document.getElementById('startOET').onclick = () => {
  const today = new Date().toISOString().slice(0,10);
  if (useCustomWords) {
    // already set by input/file and one per day
  } else {
    words = isTestMode ? getRandomWords(oetWords, 24) : [...oetWords];
  }
  if (!words.length) {
    alert("No words found!");
    return;
  }
  currentIndex = 0;
  score = 0;
  userAnswers = [];
  scoreDiv.innerHTML = '';
  showWord();
};

// --- Trainer logic ---
function showWord() {
  const word = words[currentIndex];
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${words.length}</h3>
      <input type="text" id="userInput" class="form-control" placeholder="Type what you heard..." autofocus>
      <button id="checkBtn" class="btn btn-success">Check</button>
      <button id="prevBtn" class="btn btn-outline-primary" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
      <button id="nextBtn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <div id="feedback" style="margin-top:1em;"></div>
    </div>
  `;
  setTimeout(() => speakWord(word), 350);
  setTimeout(() => {
    const input = document.getElementById('userInput');
    if (input) input.focus();
  }, 700);

  document.getElementById('checkBtn').onclick = () => checkWord(word);
  document.getElementById('userInput').onkeypress = (e) => { if (e.key === "Enter") checkWord(word); };
  document.getElementById('nextBtn').onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showWord(); }};
  document.getElementById('prevBtn').onclick = () => { if (currentIndex > 0) { currentIndex--; showWord(); }};
  document.getElementById('flagBtn').onclick = () => toggleFlag(word);
}

// --- Speech synthesis ---
function speakWord(word) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accentSelect.value || 'en-US';
  window.speechSynthesis.speak(utter);
}

// --- Check logic & feedback ---
function checkWord(word) {
  const inputElem = document.getElementById('userInput');
  if (!inputElem) return;
  const input = inputElem.value.trim();
  userAnswers[currentIndex] = input;
  const feedbackDiv = document.getElementById('feedback');
  if (!input) {
    feedbackDiv.textContent = "Please enter your answer!";
    feedbackDiv.style.color = "#dc3545";
    inputElem.focus();
    return;
  }
  if (input.toLowerCase() === word.toLowerCase()) {
    feedbackDiv.textContent = "Correct!";
    feedbackDiv.style.color = "#28a745";
    score++;
  } else {
    feedbackDiv.textContent = `Incorrect. The word was: ${word}`;
    feedbackDiv.style.color = "#dc3545";
  }
  setTimeout(() => {
    if (currentIndex < words.length-1) {
      currentIndex++;
      showWord();
    } else {
      endSession();
    }
  }, 1200);
}

// --- Flag logic ---
function toggleFlag(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  localStorage.setItem('flaggedWordsOET', JSON.stringify(flaggedWords));
  showWord();
}

// --- End session & flagged words practice ---
function endSession() {
  trainerDiv.innerHTML = "";
  const percent = Math.round((score / words.length) * 100);
  let wrongWords = [];
  words.forEach((word, idx) => {
    if (userAnswers[idx] !== undefined && userAnswers[idx].toLowerCase() !== word.toLowerCase()) {
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

function getRandomWords(list, count) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, count);
}
