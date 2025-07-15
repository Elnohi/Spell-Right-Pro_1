function speakWord() {
  const utterance = new SpeechSynthesisUtterance(currentWord);
  const lang = document.getElementById("accent-select")?.value || "en-US";
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
}
