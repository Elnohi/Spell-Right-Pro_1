// ==================== SpellRightPro — School Freemium ====================
document.addEventListener('DOMContentLoaded', () => {
  const startBtn       = document.getElementById('start-btn');
  const startBtnDup    = document.getElementById('start-btn-dup');
  const replayBtn      = document.getElementById('replay-btn');
  const backspaceBtn   = document.getElementById('backspace-btn');
  const practice       = document.getElementById('practice-area');
  const promptEl       = document.getElementById('prompt');
  const tiles          = document.getElementById('word-tiles');
  const feedback       = document.getElementById('feedback');
  const summary        = document.getElementById('summary-area');

  const customBox      = document.getElementById('custom-words');
  const addCustomBtn   = document.getElementById('add-custom-btn');
  const fileInput      = document.getElementById('file-input');

  const lifeCorrectEl  = document.getElementById('life-correct');
  const lifeAttemptsEl = document.getElementById('life-attempts');
  const currentWordIndexEl = document.getElementById('current-word-index');
  const totalWordsEl   = document.getElementById('total-words');

  // ---------- Speech ----------
  let accent = 'en-US';
  const picker = document.querySelector('.accent-picker');
  const synth = window.speechSynthesis;

  function speak(text) {
    try {
      if (!text) return;
      synth.cancel(); // prevent overlap
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      synth.speak(u);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  picker?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-accent]');
    if (!btn) return;
    accent = btn.getAttribute('data-accent') || 'en-US';
    picker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // ---------- State ----------
  const CAP = 10;
  let words = [], idx = 0, typed = '', running = false, currentWord = '';
  let lifeCorrect = parseInt(localStorage.getItem('school_life_correct') || '0', 10);
  let lifeAttempts = parseInt(localStorage.getItem('school_life_attempts') || '0', 10);

  function saveLife() {
    localStorage.setItem('school_life_correct', lifeCorrect.toString());
    localStorage.setItem('school_life_attempts', lifeAttempts.toString());
    if (lifeCorrectEl) lifeCorrectEl.textContent = lifeCorrect.toString();
    if (lifeAttemptsEl) lifeAttemptsEl.textContent = lifeAttempts.toString();
  }
  
  saveLife();

  // ---------- Load Words ----------
  let sampleWords = [];
  (async () => {
    try {
      const res = await fetch('/data/word-lists/school.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        sampleWords = Array.isArray(data?.words) ? data.words.filter(Boolean) : [];
        console.log(`Loaded ${sampleWords.length} sample words`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.warn('Failed to load school.json, using fallback words', e);
      // Fallback words
      sampleWords = [
        'apple', 'banana', 'computer', 'dictionary', 'elephant',
        'friendly', 'garden', 'hospital', 'important', 'jungle',
        'kitchen', 'library', 'mountain', 'notebook', 'ocean',
        'pencil', 'question', 'rabbit', 'school', 'teacher'
      ];
    }
  })();

  // ---------- Custom Words ----------
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function canAddCustom() { return localStorage.getItem('school_custom_date') !== todayISO(); }
  function markCustom() { localStorage.setItem('school_custom_date', todayISO()); }

  let customWords = [];
  
  // Load custom words from localStorage on startup
  (function loadCustomWordsFromStorage() {
    try {
      const saved = localStorage.getItem('school_custom_words');
      if (saved) {
        customWords = JSON.parse(saved);
        console.log(`Loaded ${customWords.length} custom words from storage`);
      }
    } catch (e) {
      console.warn('Failed to load custom words from storage:', e);
    }
  })();

  function saveCustomWords() {
    try {
      localStorage.setItem('school_custom_words', JSON.stringify(customWords));
    } catch (e) {
      console.warn('Failed to save custom words:', e);
    }
  }

  addCustomBtn?.addEventListener('click', () => {
    if (!canAddCustom()) {
      alert('One custom list per day. Upgrade to Premium for unlimited custom words.');
      return;
    }
    
    const raw = (customBox?.value || '').trim();
    if (!raw) {
      alert('Please enter some words first.');
      return;
    }
    
    const parsed = raw.split(/[\s,;]+/).map(w => w.trim()).filter(Boolean);
    if (parsed.length === 0) {
      alert('No valid words found. Please enter words separated by spaces or commas.');
      return;
    }
    
    const beforeCount = customWords.length;
    customWords = mergeUnique(customWords, parsed);
    const addedCount = customWords.length - beforeCount;
    
    if (customBox) customBox.value = '';
    markCustom();
    saveCustomWords();
    
    alert(`Added ${addedCount} new custom words. Total custom words: ${customWords.length}`);
  });

  fileInput?.addEventListener('change', e => {
    if (!canAddCustom()) {
      alert('One custom list per day. Upgrade to Premium for unlimited custom words.');
      e.target.value = '';
      return;
    }
    
    const f = e.target.files?.[0];
    if (!f) return;
    
    const r = new FileReader();
    r.onload = () => {
      try {
        const text = String(r.result || '');
        const parsed = text.split(/\r?\n|,|;|\t/).map(w => w.trim()).filter(Boolean);
        
        if (parsed.length === 0) {
          alert('No words found in the file. Please check the file format.');
          return;
        }
        
        const beforeCount = customWords.length;
        customWords = mergeUnique(customWords, parsed);
        const addedCount = customWords.length - beforeCount;
        
        markCustom();
        saveCustomWords();
        
        alert(`Uploaded ${addedCount} new words from file. Total custom words: ${customWords.length}`);
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid text file.');
        console.error('File read error:', error);
      }
    };
    
    r.onerror = () => {
      alert('Error reading file. Please try another file.');
    };
    
    r.readAsText(f);
    e.target.value = ''; // Reset file input
  });

  // ---------- Session Management ----------
  function startSession() {
    const merged = mergeUnique(sampleWords.slice(), customWords);
    if (merged.length === 0) {
      alert('No words available. Please add some words or check if sample words loaded correctly.');
      return;
    }
    
    // Shuffle and cap words
    words = shuffleArray(merged.slice(0, CAP));
    idx = 0;
    typed = '';
    running = true;
    
    // Reset UI
    summary?.classList.add('hidden');
    practice?.classList.remove('hidden');
    
    // Update progress indicators
    if (totalWordsEl) totalWordsEl.textContent = words.length.toString();
    
    renderWord();
  }

  function renderWord() {
    if (idx >= words.length) {
      finish();
      return;
    }
    
    currentWord = words[idx];
    typed = '';

    // Update progress
    if (currentWordIndexEl) currentWordIndexEl.textContent = (idx + 1).toString();
    
    // Render blank tiles
    if (tiles) {
      tiles.innerHTML = Array.from({ length: currentWord.length })
        .map(() => `<div class="letter-tile">&nbsp;</div>`)
        .join('');
    }
    
    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'feedback';
    }
    
    if (promptEl) {
      promptEl.textContent = `Word ${idx + 1}/${words.length}: Listen and type the word.`;
    }

    // Speak the word after a small delay
    setTimeout(() => {
      if (running) {
        speak(currentWord);
      }
    }, 500);

    // Set up keyboard handler
    document.onkeydown = handleKeyDown;
    
    // Focus for mobile - trigger keyboard
    setTimeout(() => {
      // This will help mobile devices show the keyboard
      const fakeInput = document.createElement('input');
      fakeInput.setAttribute('type', 'text');
      fakeInput.setAttribute('style', 'position: absolute; left: -1000px; opacity: 0;');
      document.body.appendChild(fakeInput);
      fakeInput.focus();
      setTimeout(() => {
        document.body.removeChild(fakeInput);
      }, 100);
    }, 1000);
  }

  function handleKeyDown(e) {
    if (!running) return;
    
    switch (e.key) {
      case 'Enter':
        evaluate();
        break;
        
      case 'Backspace':
        if (typed.length > 0) {
          typed = typed.slice(0, -1);
          updateTiles();
        }
        break;
        
      case ' ':
        e.preventDefault(); // Prevent space from scrolling
        speak(currentWord);
        break;
        
      default:
        if (/^[a-zA-Z]$/.test(e.key)) {
          if (typed.length < currentWord.length) {
            typed += e.key.toLowerCase();
            updateTiles();
          }
        }
        break;
    }
  }

  function updateTiles() {
    if (!tiles) return;
    
    Array.from(tiles.children).forEach((tile, i) => {
      tile.textContent = typed[i] ? typed[i].toUpperCase() : ' ';
      tile.className = 'letter-tile';
    });
  }

  function evaluate() {
    if (!running) return;
    
    lifeAttempts++;
    const isCorrect = typed.toLowerCase() === currentWord.toLowerCase();
    
    if (isCorrect) {
      lifeCorrect++;
      if (feedback) {
        feedback.textContent = '✅ Correct!';
        feedback.className = 'feedback correct';
      }
    } else {
      if (feedback) {
        feedback.innerHTML = `❌ "${typed}" → <strong>${currentWord}</strong>`;
        feedback.className = 'feedback incorrect';
      }
    }
    
    // Update tiles with correct/incorrect styling
    if (tiles) {
      Array.from(tiles.children).forEach((tile, i) => {
        tile.textContent = currentWord[i].toUpperCase();
        tile.className = `letter-tile ${typed[i] && typed[i].toLowerCase() === currentWord[i].toLowerCase() ? 'correct' : 'incorrect'}`;
      });
    }
    
    saveLife();
    
    // Move to next word after delay
    setTimeout(() => {
      if (running) {
        idx++;
        renderWord();
      }
    }, 1500);
  }

  function finish() {
    running = false;
    document.onkeydown = null; // Remove keyboard handler
    
    const percent = lifeAttempts > 0 ? Math.round((lifeCorrect / lifeAttempts) * 100) : 0;
    
    if (summary) {
      summary.innerHTML = `
        <div class="summary-header">
          <h2>Session Summary</h2>
          <div class="score-display">${lifeCorrect}/${lifeAttempts} (${percent}%)</div>
          ${percent >= 80 ? '<div class="score-percent">🎉 Excellent work!</div>' : 
            percent >= 60 ? '<div class="score-percent">👍 Good job!</div>' : 
            '<div class="score-percent">💪 Keep practicing!</div>'}
        </div>
        <div class="results-grid">
          <div class="results-card correct">
            <h3>Words Practiced</h3>
            <div class="word-list">
              ${words.map(w => `<div class="word-item">${escapeHtml(w)}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="summary-actions">
          <button id="restart-session" class="btn-primary">
            <i class="fas fa-redo"></i> Practice Again
          </button>
        </div>
      `;
      
      // Add event listener for restart button
      document.getElementById('restart-session')?.addEventListener('click', startSession);
    }
    
    practice?.classList.add('hidden');
    summary?.classList.remove('hidden');
    
    if (window.insertSummaryAd) {
      window.insertSummaryAd();
    }
  }

  function mergeUnique(base, add) {
    const seen = new Set(base.map(w => w.toLowerCase()));
    const out = base.slice();
    
    add.forEach(w => {
      const k = w.toLowerCase();
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(w);
      }
    });
    
    return out;
  }

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---------- Button Event Listeners ----------
  startBtn?.addEventListener('click', startSession);
  startBtnDup?.addEventListener('click', startSession);
  
  replayBtn?.addEventListener('click', () => {
    if (running && currentWord) {
      speak(currentWord);
    }
  });
  
  backspaceBtn?.addEventListener('click', () => {
    if (running && typed.length > 0) {
      typed = typed.slice(0, -1);
      updateTiles();
    }
  });

  // ---------- Mobile Keyboard Support ----------
  function setupMobileKeyboard() {
    // Add touch event for mobile keyboard triggering
    if ('ontouchstart' in window) {
      // Create a hidden input that we can focus to trigger keyboard
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'text';
      hiddenInput.style.position = 'fixed';
      hiddenInput.style.top = '-100px';
      hiddenInput.style.left = '-100px';
      hiddenInput.style.opacity = '0';
      hiddenInput.style.height = '0';
      hiddenInput.style.width = '0';
      document.body.appendChild(hiddenInput);
      
      // When practice area is shown, focus the hidden input to trigger keyboard
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (!practice.classList.contains('hidden') && running) {
              setTimeout(() => {
                hiddenInput.focus();
              }, 500);
            }
          }
        });
      });
      
      if (practice) {
        observer.observe(practice, { attributes: true });
      }
      
      // Also focus when session starts
      const originalStartSession = startSession;
      startSession = function() {
        originalStartSession();
        setTimeout(() => {
          if (running) {
            hiddenInput.focus();
          }
        }, 1000);
      };
    }
  }

  // Initialize mobile keyboard support
  setupMobileKeyboard();

  // ---------- Utility Functions ----------
  function provideHapticFeedback() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch (e) {
        // Silent fail
      }
    }
  }

  // Add click feedback to buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', provideHapticFeedback);
  });

  console.log('School mode initialized successfully');
});
