// In the OET checkOETAnswer function:
function checkOETAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const feedback = document.getElementById('feedback');

  if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
    feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    score++;
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }

  // Auto-proceed after short delay (for both correct and incorrect answers)
  setTimeout(() => {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      showOETWord();
      speakCurrentWord();
    } else {
      showSummary();
    }
  }, 1500); // 1.5 second delay
}

// In the Bee processSpellingAttempt function:
function processSpellingAttempt(attempt, correctWord) {
  const micFeedback = document.getElementById('mic-feedback');
  
  if (!attempt) {
    micFeedback.textContent = "Couldn't detect your spelling. Try again.";
    micFeedback.className = "feedback incorrect";
    return;
  }
  
  userAttempts[currentIndex] = attempt;
  
  // Update visual feedback
  updateSpellingVisual(
    correctWord.split('').map((letter, i) => ({
      letter: attempt[i] || '',
      correct: attempt[i]?.toLowerCase() === letter.toLowerCase()
    }))
  );
  
  if (attempt === correctWord.toLowerCase()) {
    micFeedback.textContent = "✓ Correct!";
    micFeedback.className = "feedback correct";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
    score++;
  } else {
    micFeedback.textContent = `✗ Incorrect. You spelled: ${attempt}. Correct: ${correctWord}`;
    micFeedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }
  
  // Auto-proceed to next word (for both correct and incorrect answers)
  setTimeout(() => {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      showBeeWord();
      speakCurrentBeeWord();
    } else {
      showBeeSummary();
    }
  }, 1500); // 1.5 second delay
}

// In the Custom checkCustomAnswer function:
function checkCustomAnswer(correctWord) {
  const userInput = document.getElementById('user-input');
  const userAnswer = userInput.value.trim();
  userAnswers[currentIndex] = userAnswer;
  const feedback = document.getElementById('feedback');
  
  if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
    feedback.textContent = "✓ Correct!";
    feedback.className = "feedback correct";
    score++;
    document.getElementById('word-status').innerHTML = '<i class="fas fa-check-circle"></i>';
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling is: ${correctWord}`;
    feedback.className = "feedback incorrect";
    document.getElementById('word-status').innerHTML = '<i class="fas fa-times-circle"></i>';
  }

  // Auto-proceed after short delay (for both correct and incorrect answers)
  setTimeout(() => {
    if (currentIndex < words.length - 1) {
      currentIndex++;
      showCustomWord();
      speakCurrentWord();
    } else {
      showSummary();
    }
  }, 1500); // 1.5 second delay
}
