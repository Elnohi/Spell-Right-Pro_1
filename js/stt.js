function startListening() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Speech recognition not supported in this browser.");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    console.log("Listening...");
  };

  recognition.onresult = (event) => {
    let transcript = event.results[0][0].transcript;
    const lettersOnly = transcript.replace(/[^a-zA-Z]/g, "").toLowerCase().split('').join('');
    const targetSpelled = currentWord.toLowerCase().split('').join('');
    console.log(`User: ${lettersOnly}, Expected: ${targetSpelled}`);

    if (lettersOnly === targetSpelled) {
      correct++;
      alert("✅ Correct spelling!");
    } else {
      wrong++;
      alert(`❌ Incorrect. Word was: ${currentWord}`);
    }

    document.getElementById("correct-count").textContent = correct;
    document.getElementById("wrong-count").textContent = wrong;
    nextWord();
  };

  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    alert("Speech recognition failed. Try again.");
  };

  recognition.start();
}
