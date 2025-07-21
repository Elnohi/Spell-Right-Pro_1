import { oetWords } from './oet_word_list.js';

let words = [];
let currentIndex = 0;
let mode = "";
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsPremium')) || [];
let score = 0;
let accent = 'en-US';

const trainerDiv = document.getElementById('trainer');
const scoreDiv = document.getElementById('scoreDisplay');
const accentSelect = document.getElementById('accentSelect');
const examSelect = document.getElementById('examSelect');
const fileUpload = document.getElementById('fileUpload');
const customWordsTextarea = document.getElementById('customWords');
const addCustomBtn = document.getElementById('addCustomWords');
const startButton = document.getElementById('startButton');

// Accent select/flag
accentSelect.onchange = e => {
  accent = e.target.value;
  document.getElementById('accentFlag').src = `assets/flags/${accent.slice(-2).toLowerCase()}.png`;
};

// Add custom words
addCustomBtn.onclick = () => {
  const customWords = customWordsTextarea.value
    .split(/\r?\n/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
  if (customWords.length > 0) {
    words = customWords;
    alert(`Added ${words.length} custom words!`);
  } else {
    alert("Please enter words first.");
  }
};

// Upload file
fileUpload.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  words = text.split(/\r?\n/).map(w => w.trim()).filter(w => w.length > 0);
  alert(`Loaded ${words.length} words from file!`);
};

// Start session
startButton.onclick = () => {
  mode = examSelect.value;
  if (!mode) { alert("Please select an exam type!"); return; }
  if (mode === 'oet') words = [...oetWords];
  if (mode === 'spellingbee' && (!words || words.length === 0)) {
    // Sample words
    words = ["banana", "elephant", "amazing", "computer", "zebra"];
  }
  if (mode === 'custom' && (!words || words.length === 0)) {
    alert("Please upload or add custom words first!");
    return;
  }
  currentIndex = 0;
  score = 0;
  scoreDiv.innerHTML = '';
  showWord();
};

function showWord() {
  const word = words[currentIndex];
  trainerDiv.innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${words.length}</h3>
      <button id="speakBtn" class="btn btn-primary"><i class="fas fa-volume-up"></i> Speak</button>
      ${mode === 'spellingbee'
        ? `<button id="micBtn" class="btn btn-warning"><i class="fas fa-microphone"></i> Spell (Mic)</button>`
        : `<input type="text" id="userInput" class="form-control" placeholder="Type what you heard..." autofocus>
           <button id="checkBtn" class="btn btn-success">Check</button>`
      }
      <button id="prevBtn" class="btn btn-outline-primary" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
      <button id="nextBtn" class="btn btn-outline-primary" ${currentIndex === words.length-1 ? "disabled" : ""}>Next</button>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <div id="feedback" style="margin-top:1em;"></div>
    </div>
  `;
  document.getElementById('speakBtn').onclick = () => speakWord(word);
  if (mode === 'spellingbee') document.getElementById('micBtn').onclick = () => spellByMic(word);
  if (mode !== 'spellingbee') {
    document.getElementById('checkBtn').onclick = () => checkWord(word);
    document.getElementById('userInput').onkeypress = (e) => { if (e.key === "Enter") checkWord(word); };
  }
  document.getElementById('nextBtn').onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showWord(); }};
  document.getElementById('prevBtn').onclick = () => { if (currentIndex > 0) { currentIndex--; showWord(); }};
  document.getElementById('flagBtn').onclick = () => toggleFlag(word);
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent || 'en-US';
  window.speechSynthesis.speak(utter);
}

function spellByMic(word) {
  let feedbackDiv = document.getElementById('feedback');
  feedbackDiv.textContent = "Listening... Spell the word letter by letter.";
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    feedbackDiv.textContent = "Sorry, speech recognition is not supported on this browser.";
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = accent || 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = event => {
    let transcript = event.results[0][0].transcript;
    let userSpelling = transcript.replace(/[^a-zA-Z]/g, '').toLowerCase();
    let correctSpelling = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (userSpelling === correctSpelling) {
      feedbackDiv.textContent = "Correct!";
      feedbackDiv.style.color = "#28a745";
      score++;
    } else {
      feedbackDiv.textContent = `Incorrect. The word is: ${word}`;
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
  };
  recognition.onerror = event => {
    feedbackDiv.textContent = "Mic error or no speech detected.";
    feedbackDiv.style.color = "#dc3545";
  };
  recognition.start();
}

function checkWord(word) {
  const input = document.getElementById('userInput').value.trim();
  const feedbackDiv = document.getElementById('feedback');
  if (!input) {
    feedbackDiv.textContent = "Please enter your answer!";
    feedbackDiv.style.color = "#dc3545";
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
  }, 1100);
}

function toggleFlag(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  localStorage.setItem('flaggedWordsPremium', JSON.stringify(flaggedWords));
  showWord();
}

function endSession() {
  trainerDiv.innerHTML = "";
  scoreDiv.innerHTML = `<h3>Session Complete!</h3>
    <p>Your score: ${score}/${words.length}</p>
    ${flaggedWords.length ? `<button id="practiceFlaggedBtn" class="btn btn-info">Practice Flagged Words (${flaggedWords.length})</button>` : ""}
  `;
  if (flaggedWords.length) {
    document.getElementById('practiceFlaggedBtn').onclick = () => {
      words = [...flaggedWords];
      currentIndex = 0; score = 0;
      showWord();
      scoreDiv.innerHTML = '';
    };
  }
}
