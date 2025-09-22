document.addEventListener("DOMContentLoaded", () => {
  const oetBtn = document.getElementById("oetMode");
  const beeBtn = document.getElementById("beeMode");
  const schoolBtn = document.getElementById("schoolMode");
  const practiceSection = document.getElementById("practiceSection");
  const uploadSection = document.getElementById("uploadSection");
  const practiceTitle = document.getElementById("practiceTitle");
  const wordInput = document.getElementById("wordInput");
  const submitBtn = document.getElementById("submitWord");
  const skipBtn = document.getElementById("skipWord");
  const summarySection = document.getElementById("summarySection");
  const summaryContent = document.getElementById("summaryContent");

  let wordList = [];
  let currentIndex = 0;
  let mode = "";

  function startPractice(words, selectedMode) {
    mode = selectedMode;
    wordList = words;
    currentIndex = 0;
    practiceTitle.textContent = `${mode} Practice`;
    practiceSection.classList.remove("hidden");
    summarySection.classList.add("hidden");
    uploadSection.classList.toggle("hidden", mode !== "School");
    speakWord(wordList[currentIndex]);
  }

  function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    speechSynthesis.speak(utterance);
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
      endSession();
    }
  }

  function endSession() {
    practiceSection.classList.add("hidden");
    summarySection.classList.remove("hidden");
    summaryContent.textContent = `You practiced ${wordList.length} words in ${mode} mode.`;
  }

  oetBtn.addEventListener("click", () => {
    fetch("oet.json")
      .then(res => res.json())
      .then(data => startPractice(data.words, "OET"));
  });

  beeBtn.addEventListener("click", () => {
    fetch("spelling-bee.json")
      .then(res => res.json())
      .then(data => startPractice(data.words, "Bee"));
  });

  schoolBtn.addEventListener("click", () => {
    fetch("school.json")
      .then(res => res.json())
      .then(data => startPractice(data.words, "School"));
  });

  submitBtn.addEventListener("click", submitAnswer);
  skipBtn.addEventListener("click", nextWord);
});
