function checkSpelling() {
  const input = document.getElementById("user-input").value.trim().toLowerCase();
  if (!currentWord) return;

  if (input === currentWord.toLowerCase()) {
    correct++;
  } else {
    wrong++;
  }

  document.getElementById("correct-count").textContent = correct;
  document.getElementById("wrong-count").textContent = wrong;

  document.getElementById("user-input").value = "";
  nextWord();
}
