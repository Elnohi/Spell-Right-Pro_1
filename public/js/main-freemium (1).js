// Freemium Spelling Trainer - FIXED VERSION
let wordList = [];
let currentIndex = 0;
let score = 0;
let correctWords = [];
let incorrectWords = [];
let flaggedWords = new Set();

// School words
const schoolWords = ["example", "language", "grammar", "knowledge", "science", "mathematics", "history", "geography", "literature", "chemistry"];

// OET medical words  
const oetWords = ["abdomen", "anemia", "antibiotic", "artery", "asthma", "biopsy", "catheter", "diagnosis", "embolism", "fracture"];

function loadWordList(type) {
    resetTraining();
    
    if (type === 'school') {
        wordList = schoolWords;
        document.getElementById('feedback').textContent = "School words loaded!";
    } else if (type === 'oet') {
        wordList = oetWords;
        document.getElementById('feedback').textContent = "OET medical words loaded!";
    }
    
    document.getElementById('wordProgress').textContent = `Words: ${wordList.length}`;
    document.getElementById('btnStart').disabled = false;
}

function startTraining() {
    if (currentIndex >= wordList.length) {
        showSummary();
        return;
    }
    
    const currentWord = wordList[currentIndex];
    document.getElementById('currentWord').textContent = `Word ${currentIndex + 1} of ${wordList.length}`;
    document.getElementById('userInput').value = '';
    document.getElementById('feedback').textContent = "Listen carefully...";
    document.getElementById('feedback').style.color = '#ffffff';
    
    // Reset input styling
    const inputElement = document.getElementById('userInput');
    inputElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    inputElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    
    // Speak the word with delay
    setTimeout(() => {
        speakWord(currentWord);
    }, 500);
}

function speakWord(word) {
    if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        document.getElementById('feedback').textContent = "Text-to-speech not supported";
        return;
    }
    
    try {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        // Get selected accent for OET
        const accentSelect = document.getElementById('oetAccent');
        if (accentSelect) {
            utterance.lang = accentSelect.value;
        } else {
            utterance.lang = 'en-US';
        }
        
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
        
        document.getElementById('feedback').textContent = "Speaking word...";
        document.getElementById('feedback').style.color = '#4CAF50';
    } catch (error) {
        console.error('Speech error:', error);
        document.getElementById('feedback').textContent = "Error speaking word";
    }
}

function checkSpelling() {
    const userInput = document.getElementById('userInput').value.trim();
    const currentWord = wordList[currentIndex];
    
    if (!userInput) {
        document.getElementById('feedback').textContent = "Please type the word first";
        document.getElementById('feedback').style.color = '#f44336';
        return;
    }
    
    // Real-time feedback
    const inputElement = document.getElementById('userInput');
    if (userInput.toLowerCase() === currentWord.toLowerCase()) {
        score++;
        correctWords.push(currentWord);
        document.getElementById('feedback').textContent = "✅ Correct!";
        document.getElementById('feedback').style.color = '#4CAF50';
        inputElement.style.borderColor = '#4CAF50';
        inputElement.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
    } else {
        incorrectWords.push({
            word: currentWord,
            userAnswer: userInput
        });
        document.getElementById('feedback').textContent = `❌ Incorrect! Correct: ${currentWord}`;
        document.getElementById('feedback').style.color = '#f44336';
        inputElement.style.borderColor = '#f44336';
        inputElement.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
    }
    
    currentIndex++;
    
    // AUTO-ADVANCE: Wait 1.5 seconds then go to next word
    setTimeout(() => {
        if (currentIndex < wordList.length) {
            startTraining();
        } else {
            showSummary();
        }
    }, 1500);
}

function showSummary() {
    const summaryElement = document.getElementById('summary');
    if (!summaryElement) return;
    
    let summaryHTML = `
        <div class="summary-header">
            <h3>Training Complete! 🎉</h3>
            <div class="score" style="font-size: 1.5em; color: #7b2ff7; font-weight: bold;">
                Score: ${score}/${wordList.length}
            </div>
        </div>
    `;
    
    // Show incorrect words
    if (incorrectWords.length > 0) {
        summaryHTML += `
            <div class="incorrect-words" style="margin: 20px 0; padding: 15px; background: rgba(244, 67, 54, 0.1); border-radius: 10px;">
                <h4 style="color: #f44336; margin-bottom: 10px;">
                    ❌ Incorrect Words (${incorrectWords.length})
                </h4>
                <div class="word-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
        `;
        
        incorrectWords.forEach(item => {
            summaryHTML += `
                <div class="word-item" style="background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px; border-left: 4px solid #f44336;">
                    <strong>${item.word}</strong><br>
                    <small>You typed: "${item.userAnswer}"</small>
                </div>
            `;
        });
        
        summaryHTML += `</div></div>`;
    }
    
    // Show flagged words
    if (flaggedWords.size > 0) {
        summaryHTML += `
            <div class="flagged-words" style="margin: 20px 0; padding: 15px; background: rgba(255, 193, 7, 0.1); border-radius: 10px;">
                <h4 style="color: #FFC107; margin-bottom: 10px;">
                    🚩 Flagged Words (${flaggedWords.size})
                </h4>
                <div class="word-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
        `;
        
        flaggedWords.forEach(word => {
            summaryHTML += `
                <div class="word-item" style="background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px; border-left: 4px solid #FFC107;">
                    ${word}
                </div>
            `;
        });
        
        summaryHTML += `</div></div>`;
    }
    
    // Show perfect score message
    if (incorrectWords.length === 0 && score > 0) {
        summaryHTML += `
            <div class="correct-words" style="margin: 20px 0; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 10px;">
                <h4 style="color: #4CAF50; margin-bottom: 10px;">
                    ✅ Perfect! All ${score} words correct!
                </h4>
            </div>
        `;
    }
    
    // Restart button
    summaryHTML += `
        <div style="text-align: center; margin-top: 25px;">
            <button onclick="restartTraining()" style="background: #7b2ff7; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                🔄 Start New Session
            </button>
        </div>
    `;
    
    summaryElement.innerHTML = summaryHTML;
    summaryElement.style.display = 'block';
}

function flagWord() {
    if (currentIndex >= wordList.length) return;
    
    const currentWord = wordList[currentIndex];
    if (flaggedWords.has(currentWord)) {
        flaggedWords.delete(currentWord);
        document.getElementById('feedback').textContent = `🚩 Removed flag from "${currentWord}"`;
    } else {
        flaggedWords.add(currentWord);
        document.getElementById('feedback').textContent = `🚩 Flagged "${currentWord}" for review`;
    }
    document.getElementById('feedback').style.color = '#FFC107';
}

function resetTraining() {
    currentIndex = 0;
    score = 0;
    correctWords = [];
    incorrectWords = [];
    flaggedWords = new Set();
    document.getElementById('summary').style.display = 'none';
    document.getElementById('feedback').textContent = 'Select word list and click Start';
    document.getElementById('feedback').style.color = '#ffffff';
}

function restartTraining() {
    resetTraining();
    startTraining();
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnStart').addEventListener('click', startTraining);
    document.getElementById('userInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkSpelling();
        }
    });
    
    // Real-time input validation
    document.getElementById('userInput').addEventListener('input', function() {
        if (currentIndex >= wordList.length) return;
        
        const currentWord = wordList[currentIndex];
        const userInput = this.value.trim().toLowerCase();
        const correctWord = currentWord.toLowerCase();
        
        if (userInput === correctWord) {
            this.style.borderColor = '#4CAF50';
            this.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        } else if (userInput && correctWord.startsWith(userInput)) {
            this.style.borderColor = '#FFC107';
            this.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        } else if (userInput) {
            this.style.borderColor = '#f44336';
            this.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
        } else {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }
    });
});
