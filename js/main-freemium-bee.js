let wordList = [];
let currentIndex = 0;
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsBee')) || [];
let score = 0;
let accent = 'en-US';

// Accent flag logic
const flagMap = { "en-US": "us", "en-GB": "gb", "en-AU": "au" };
const accentFlag = document.getElementById('accentFlag');
document.getElementById('accentSelect').onchange = e => {
  accent = e.target.value;
  accentFlag.src = `assets/flags/${flagMap[accent] || "us"}.png`;
};

// Custom word add logic
document.getElementById('addCustomBtn').onclick = () => {
  const customWords = document.getElementById('wordInput').value
    .split(/\r?\n/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
  if (customWords.length === 0) {
    alert("Please enter words first.");
    return;
  }
  wordList = [...customWords];
  document.getElementById('customInputArea').style.display = "none";
  document.getElementById('scoreDisplay').innerHTML = `<p>Custom words added. Ready to start!</p>`;
};

// Use sample words
document.getElementById('useSampleBtn').onclick = () => {
  wordList = ["banana", "elephant", "amazing", "computer", "zebra"];
  document.getElementById('customInputArea').style.display = "none";
  document.getElementById('scoreDisplay').innerHTML = `<p>Sample words loaded. Ready to start!</p>`;
};

// Start Spelling Bee session
document.getElementById('startBee').onclick = () => {
  if (wordList.length === 0) {
    alert("Please add or load words first!");
    return;
  }
  currentIndex = 0;
  score = 0;
  document.getElementById('scoreDisplay').innerHTML = '';
  startAutoBee();
};

// Trainer logic: auto flow
function startAutoBee() {
  nextBeeWord();
}

function nextBeeWord() {
  if (currentIndex >= wordList.length) {
    endSession();
    return;
  }
  const word = wordList[currentIndex];
  // Show trainer area (no word shown!)
  document.getElementById('trainer').innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${wordList.length}</h3>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <div id="feedback" style="margin-top:1em;"></div>
    </div>
  `;
  document.getElementById('flagBtn').onclick = () => toggleFlag(word);

  setTimeout(() => speakWord(word), 1200); // say word after a brief pause
  setTimeout(() => spellByMic(word), 2200); // start mic after another pause
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = accent || 'en-US';
  window.speechSynthesis.speak(utter);
}

// Speech recognition logic
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
      currentIndex++;
      nextBeeWord();
    }, 2000);
  };
  recognition.onerror = event => {
    feedbackDiv.textContent = "Mic error or no speech detected.";
    feedbackDiv.style.color = "#dc3545";
    setTimeout(() => {
      currentIndex++;
      nextBeeWord();
    }, 2000);
  };
  recognition.start();
}

function toggleFlag(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  localStorage.setItem('flaggedWordsBee', JSON.stringify(flaggedWords));
  nextBeeWord();
}

function endSession() {
  document.getElementById('trainer').innerHTML = "";
  document.getElementById('scoreDisplay').innerHTML = `<h3>Test Complete!</h3>
    <p>Your score: ${score}/${wordList.length}</p>
    ${flaggedWords.length ? `<button id="practiceFlaggedBtn" class="btn btn-info">Practice Flagged Words (${flaggedWords.length})</button>` : ""}
  `;
  if (flaggedWords.length) {
    document.getElementById('practiceFlaggedBtn').onclick = () => {
      wordList = [...flaggedWords];
      currentIndex = 0; score = 0;
      startAutoBee();
      document.getElementById('scoreDisplay').innerHTML = '';
    };
  }
}
