let wordList = [];
let currentIndex = 0;
let flaggedWords = JSON.parse(localStorage.getItem('flaggedWordsBee')) || [];
let score = 0;
let accent = 'en-US';

// Helper: clean and split words by lines
function getWordsFromInput() {
  const customWords = document.getElementById('wordInput').value;
  return customWords.split(/\r?\n/).map(w => w.trim()).filter(w => w.length > 0);
}

// Use sample words
document.getElementById('useSampleBtn').onclick = () => {
  document.getElementById('wordInput').value = "banana\nelephant\namazing\ncomputer\nzebra";
};

document.getElementById('accentSelect').onchange = e => {
  accent = e.target.value;
  document.getElementById('accentFlag').src = `assets/flags/${accent.slice(-2).toLowerCase()}.png`;
};

document.getElementById('startBee').onclick = () => {
  const words = getWordsFromInput();
  if (words.length === 0) {
    alert("Please enter words (or use Sample Words)!");
    return;
  }
  wordList = [...words];
  currentIndex = 0;
  score = 0;
  document.getElementById('scoreDisplay').innerHTML = '';
  showWord();
};

function showWord() {
  const word = wordList[currentIndex];
  document.getElementById('trainer').innerHTML = `
    <div class="word-box">
      <h3>Word ${currentIndex + 1} / ${wordList.length}</h3>
      <button id="speakBtn" class="btn btn-primary"><i class="fas fa-volume-up"></i> Speak</button>
      <button id="micBtn" class="btn btn-warning"><i class="fas fa-microphone"></i> Spell (Mic)</button>
      <button id="prevBtn" class="btn btn-outline-primary" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
      <button id="nextBtn" class="btn btn-outline-primary" ${currentIndex === wordList.length-1 ? "disabled" : ""}>Next</button>
      <button id="flagBtn" class="btn btn-flag ${flaggedWords.includes(word) ? "active" : ""}">
        <i class="${flaggedWords.includes(word) ? "fas" : "far"} fa-flag"></i> ${flaggedWords.includes(word) ? "Flagged" : "Flag Word"}
      </button>
      <div id="feedback" style="margin-top:1em;"></div>
    </div>
  `;
  document.getElementById('speakBtn').onclick = () => speakWord(word);
  document.getElementById('micBtn').onclick = () => spellByMic(word);
  document.getElementById('nextBtn').onclick = () => { if (currentIndex < wordList.length-1) { currentIndex++; showWord(); }};
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
    // Clean up (remove spaces, join letters, ignore case)
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
      if (currentIndex < wordList.length-1) {
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

function toggleFlag(word) {
  const idx = flaggedWords.indexOf(word);
  if (idx === -1) flaggedWords.push(word);
  else flaggedWords.splice(idx, 1);
  localStorage.setItem('flaggedWordsBee', JSON.stringify(flaggedWords));
  showWord();
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
      showWord();
      document.getElementById('scoreDisplay').innerHTML = '';
    };
  }
}
