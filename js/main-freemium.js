// Simple Login/Logout
function loginUser() {
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => document.getElementById('loginStatus').textContent = 'Logged in!')
    .catch(err => alert(err.message));
}

function signUpUser() {
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => document.getElementById('loginStatus').textContent = 'Signed up and logged in!')
    .catch(err => alert(err.message));
}

function logoutUser() {
  auth.signOut().then(() => {
    document.getElementById('loginStatus').textContent = 'Logged out.';
  });
}

// Dark/Light mode
document.getElementById('modeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const icon = document.getElementById('modeIcon');
  icon.classList.toggle('fa-moon');
  icon.classList.toggle('fa-sun');
});

// File upload handler
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const content = e.target.result;
    // Basic plain text parsing only in freemium
    const words = content.split(/\\r?\\n/).map(w => w.trim()).filter(Boolean);
    window.wordList = words;
    alert(`${words.length} words loaded.`);
  };
  reader.readAsText(file);
}

// Practice and Test starters
function startPractice() {
  if (!window.wordList || window.wordList.length === 0) {
    alert(\"Please load an OET word list first.\");
    return;
  }
  alert(\"Practice started (not implemented here)\");
}

function startTest() {
  if (!window.wordList || window.wordList.length === 0) {
    alert(\"Please load an OET word list first.\");
    return;
  }
  alert(\"Test started (not implemented here)\");
}

function saveWordList() {
  alert(\"Saving words is disabled in freemium version.\");
}

function addCustomWords() {
  alert(\"Custom word entry is disabled in freemium version.\");
}

function clearWordList() {
  window.wordList = [];
  alert(\"Word list cleared.\");
}

function loadWordList() {
  window.wordList = oetWordList.slice(0, 50); // Load sample in freemium
  alert(\"OET word list loaded.\");
}
