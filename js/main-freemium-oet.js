document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const wordArea = document.getElementById("wordArea");
  const wordInput = document.getElementById("wordInput");
  const submitBtn = document.getElementById("submitWord");
  const skipBtn = document.getElementById("skipWord");

  let wordList = [];
  let currentIndex = 0;
  const MAX_WORDS = 10;

  function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    speechSynthesis.speak(utterance);
  }

  function startPractice(words) {
    if (words.length > MAX_WORDS) {
      words = words.slice(0, MAX_WORDS);
      alert(`Freemium mode allows only ${MAX_WORDS} words per day. Upgrade to Premium for full access!`);
    }
    wordList = words;
    currentIndex = 0;
    wordArea.classList.remove("hidden");
    speakWord(wordList[currentIndex]);
  }

  function submitAnswer() {
    const input = wordInput.value.trim().toLowerCase();
    const correct = wordList[currentIndex].toLowerCase();
    if (input === correct) {
      alert("✅ Correct!");
    } else {
      alert(`❌ Wrong. Correct spelling: ${correct}`);
    }
    nextWord();
  }

  function nextWord() {
    wordInput.value = "";
    currentIndex++;
    if (currentIndex < wordList.length) {
      speakWord(wordList[currentIndex]);
    } else {
      alert("🎉 Practice complete!");
      wordArea.classList.add("hidden");
    }
  }

  startBtn.addEventListener("click", () => {
    fetch("oet.json")
      .then(res => res.json())
      .then(data => startPractice(data.words));
  });

  submitBtn.addEventListener("click", submitAnswer);
  skipBtn.addEventListener("click", nextWord);
});
