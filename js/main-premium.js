import { oetWords } from './oet_word_list.js';

let words = [];
let currentIndex = 0;
let mode = "";
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsPremium')) || [];
let score = 0;
let accent = 'en-US';
let wrongWords = [];

// Accent flag logic
const flagMap = { "en-US": "us", "en-GB": "gb", "en-AU": "au", "en-CA": "ca" };
const accentFlag = document.getElementById('accentFlag');
document.getElementById('accentSelect').onchange = e => {
  accent = e.target.value;
  accentFlag.src = `assets/flags/${flagMap[accent] || "us"}.png`;
};

// Custom words add
document.getElementById('addCustomWords').onclick = () => {
  const customWords = document.getElementById('customWords').value
    .split(/\r?\n/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
  if (customWords.length > 0) {
    words = [...customWords];
    document.getElementById('customWords').value = '';
    document.getElementById('scoreDisplay').innerHTML = `<p>Custom words added. Ready to start!</p>`;
  } else {
    alert("Please enter custom words.");
  }
};

// File upload logic (plain text)
document.getElementById('fileUpload').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  words = text.split(/\r?\n/).map(w => w.trim()).filter(w => w.length > 0);
  document.getElementById('scoreDisplay').innerHTML = `<p>File loaded. Ready to start!</p>`;
};

// Start session
document.getElementById('startButton').onclick = () => {
  mode = document.getElementById('examSelect').value;
  if (!mode) { alert("Please select an exam type!"); return; }
  if (mode === 'oet') words = [...oetWords];
  if (mode === 'spellingbee' && (!words || words.length === 0)) {
    words = ["banana", "elephant", "amazing", "computer", "zebra"];
  }
  if (mode === 'custom' && (!words || words.length === 0)) {
    alert("Please upload or add custom words first!");
    return;
  }
  currentIndex = 0;
  score = 0;
  wrongWords = [];
  document.getElementById('scoreDisplay').innerHTML = '';
  document.querySelector('.main-card.premium-card').style.opacity = "0.7";
  document.querySelector('.main-card.premium-card').style.pointerEvents = "none";
  showWord();
};

// Trainer logic (mode aware)
function showWord() {
  const word = words[currentIndex];
  document.getElementById('trainer').innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${words.length}</h3>
      <button id="speakBtn" class="btn btn-primary"><i class="fas fa-volume-up"></i> Speak</button>
      ${
        mode === 'spellingbee'
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
  if (mode === 'spellingbee') {
    setTimeout(() => spellByMic(word), 600); // auto mic after 0.6s
    document.getElementById('micBtn').onclick = () => spellByMic(word);
  } else {
    document.getElementById('checkBtn').onclick = () => checkWord(word);
    document.getElementById('userInput').onkeypress = (e) => { if (e.key === "Enter") checkWord(word); };
  }
  document.getElementById('nextBtn').onclick = () => { if (currentIndex < words.length-1) { currentIndex++; showWord(); }};
  document.getElementById('prevBtn').onclick = () => { if (currentIndex > 0) { currentIndex--; showWord(); }};
  document.getElementById('flagBtn').onclick = () => toggleFlag(word);
}

// Speech synthesis
function speakWord(word) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent || 'en-US';
  window.speechSynthesis.speak(utter);
}

// Spelling Bee (mic input)
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
      wrongWords.push(word);
    }
    setTimeout(() => {
      if (currentIndex < words.length-1) {
        currentIndex++;
        showWord();
      } else {
        endSession();
      }
    }, 1600);
  };
  recognition.onerror = event => {
    feedbackDiv.textContent = "Mic error or no speech detected.";
    feedbackDiv.style.color = "#dc3545";
    wrongWords.push(word);
    setTimeout(() => {
      if (currentIndex < words.length-1) {
        currentIndex++;
        showWord();
      } else {
        endSession();
      }
    }, 1600);
  };
  recognition.start();
}

// OET/Custom input & feedback
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
    wrongWords.push(word);
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

// Flag logic
function toggleFlag(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  localStorage.setItem('flaggedWordsPremium', JSON.stringify(flaggedWords));
  showWord();
}

// End session & flagged word review
function endSession() {
  document.getElementById('trainer').innerHTML = "";
  const percent = Math.round((score / words.length) * 100);
  let wrongList = "";
  if (wrongWords.length > 0) {
    wrongList = `<div style="margin-top:1em;"><b>Wrong Words:</b><ul style="margin:0 0 0 1.5em;">${wrongWords.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
  }
  document.getElementById('scoreDisplay').innerHTML = `<h3>Session Complete!</h3>
    <p>Your score: <b>${score}</b> / ${words.length} (<b>${percent}%</b>)</p>
    ${wrongList}
    ${flaggedWords.length ? `<button id="practiceFlaggedBtn" class="btn btn-info" style="margin-top:1em;">Practice Flagged Words (${flaggedWords.length})</button>` : ""}
  `;
  if (flaggedWords.length) {
    document.getElementById('practiceFlaggedBtn').onclick = () => {
      words = [...flaggedWords];
      currentIndex = 0; score = 0; wrongWords = [];
      document.querySelector('.main-card.premium-card').style.opacity = "0.7";
      document.querySelector('.main-card.premium-card').style.pointerEvents = "none";
      document.getElementById('scoreDisplay').innerHTML = '';
      showWord();
    };
  }
  // Restore input area for new session after finishing
  setTimeout(() => {
    document.querySelector('.main-card.premium-card').style.opacity = "";
    document.querySelector('.main-card.premium-card').style.pointerEvents = "";
  }, 1000);
}
