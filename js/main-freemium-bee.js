// ===== SpellRightPro - Main Application JavaScript =====
// Version: 2.1.0
// Description: Comprehensive spelling bee application with mobile optimizations

'use strict';

class SpellingBeeApp {
    constructor() {
        this.currentWordIndex = 0;
        this.words = [];
        this.correctWords = [];
        this.incorrectWords = [];
        this.isInitialized = false;
        this.isListening = false;
        this.isMobile = this.detectMobile();
        this.speechSynth = window.speechSynthesis;
        this.recognition = null;
        
        // Application state
        this.state = {
            mode: 'hands-free', // 'hands-free' or 'text'
            accent: 'us',
            isDarkMode: false,
            isPremium: false,
            currentScore: 0,
            totalAttempts: 0,
            sessionStartTime: null
        };

        // DOM elements cache
        this.elements = {};
        
        // Initialize the application
        this.init();
    }

    // ===== PAGE MANAGEMENT METHODS =====

showPage(pageId) {
    console.log('📄 Showing page:', pageId);
    
    // Hide all pages
    const pages = ['home-page', 'game-page', 'results-page'];
    pages.forEach(page => {
        const element = document.getElementById(page);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('fade-in');
    }
}

showHomePage() {
    this.showPage('home-page');
    console.log('🏠 Showing home page');
}

showGamePage() {
    this.showPage('game-page');
    console.log('🎮 Showing game page');
    
    // Initialize game if not already started
    if (this.currentWordIndex === 0 && this.words.length > 0) {
        this.loadWord(0);
    }
}

showResultsPage() {
    this.showPage('results-page');
    console.log('📊 Showing results page');
    this.showResults();
}

// ===== BUTTON EVENT HANDLERS =====

initializeAllButtons() {
    console.log('🔘 Initializing all buttons...');
    
    // Start Button
    const startBtn = document.getElementById('start-button');
    if (startBtn) {
        startBtn.onclick = () => {
            console.log('🎯 Start button clicked - Starting spelling bee');
            this.processWordsFromTextarea();
            if (this.words.length > 0) {
                this.showGamePage();
                this.startSpellingBee();
            } else {
                this.showError('Please add some words first!');
            }
        };
    }
    
    // Premium Button
    const premiumBtn = document.getElementById('premium-main-btn');
    if (premiumBtn) {
        premiumBtn.onclick = () => {
            console.log('💎 Premium button clicked');
            this.handlePremiumClick();
        };
    }
    
    // Game Action Buttons
    const prevBtn = document.getElementById('prev-button');
    if (prevBtn) {
        prevBtn.onclick = () => {
            console.log('⏮️ Previous button clicked');
            this.previousWord();
        };
    }
    
    const repeatBtn = document.getElementById('repeat-button');
    if (repeatBtn) {
        repeatBtn.onclick = () => {
            console.log('🔊 Repeat button clicked');
            this.repeatCurrentWord();
        };
    }
    
    const submitBtn = document.getElementById('submit-button');
    if (submitBtn) {
        submitBtn.onclick = () => {
            console.log('✅ Submit button clicked');
            this.checkSpelling();
        };
    }
    
    // Accent Buttons
    const accentBtns = document.querySelectorAll('.accent-btn');
    accentBtns.forEach(btn => {
        btn.onclick = () => {
            const accent = btn.getAttribute('data-accent');
            console.log('🎵 Accent selected:', accent);
            this.setAccent(accent);
            
            // Update UI
            accentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
    
    console.log('✅ All buttons initialized');
}

// ===== WORD PROCESSING =====

processWordsFromTextarea() {
    const textarea = document.getElementById('words-textarea');
    if (textarea && textarea.value.trim()) {
        const text = textarea.value;
        const words = text.split(/[,\n]/)
            .map(word => word.trim())
            .filter(word => word.length > 0);
        
        if (words.length > 0) {
            this.words = words;
            console.log(`📝 Processed ${words.length} words from textarea`);
            
            // Show success message
            this.showSuccess(`Loaded ${words.length} words for practice!`);
            
            // Clear textarea
            textarea.value = '';
        }
    } else {
        // Use default words if none provided
        this.words = [
            'example', 'spelling', 'practice', 'education', 'learning',
            'knowledge', 'vocabulary', 'language', 'pronunciation', 'exercise'
        ];
        console.log('📝 Using default words:', this.words.length);
    }
}

// ===== ACCENT MANAGEMENT =====

setAccent(accent) {
    this.state.accent = accent;
    console.log('🎵 Accent set to:', accent);
    this.saveUserPreferences();
}

// ===== GAME CONTROL METHODS =====

repeatCurrentWord() {
    if (this.currentWordIndex < this.words.length) {
        const word = this.words[this.currentWordIndex];
        console.log('🔊 Repeating word:', word);
        this.speakWord(word);
    }
}

// ===== ENHANCED INITIALIZATION =====

initializeApp() {
    console.log('🔄 Starting app initialization sequence...');
    
    try {
        // Show home page first
        this.showHomePage();
        
        // Initialize all buttons
        this.initializeAllButtons();
        
        // Initialize other components
        this.initializeElements();
        this.initializeMobileApp();
        this.initializePremiumFeatures();
        this.initializeSpeechRecognition();
        this.loadUserPreferences();
        
        this.isInitialized = true;
        console.log('✅ App initialized successfully - Showing home page');
        
        this.hideLoading();
        this.showWelcomeMessage();
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        this.showError('Failed to initialize application. Please refresh the page.');
    }
}

    // ===== Initialization Methods =====
    
    init() {
        console.log('🚀 Initializing SpellRightPro Spelling Bee App...');
        
        try {
            // Set session start time
            this.state.sessionStartTime = new Date();
            
            // Wait for DOM to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
            
            // Initialize service workers if available
            this.initializeServiceWorker();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showFatalError('Failed to initialize application. Please refresh the page.');
        }
    }

    initializeApp() {
        console.log('🔄 Starting app initialization sequence...');
        
        try {
            // Phase 1: Initialize DOM elements
            this.initializeElements();
            
            // Phase 2: Initialize event listeners
            this.initializeEventListeners();
            
            // Phase 3: Initialize mobile-specific features
            this.initializeMobileApp();
            
            // Phase 4: Initialize premium features
            this.initializePremiumFeatures();
            
            // Phase 5: Initialize speech recognition
            this.initializeSpeechRecognition();
            
            // Phase 6: Load user preferences
            this.loadUserPreferences();
            
            // Phase 7: Initialize game state
            this.initializeGameState();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('✅ App initialized successfully');
            
            // Hide loading state with smooth transition
            this.hideLoading();
            
            // Show welcome message
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Application initialization failed. Some features may not work properly.');
        }
    }

    initializeElements() {
        console.log('🔧 Initializing DOM elements...');
        
        try {
            // Cache all critical DOM elements with null checks
            this.elements = {
                // Navigation and layout
                navbar: document.querySelector('.navbar'),
                brand: document.querySelector('.brand'),
                navActions: document.querySelector('.nav-actions'),
                container: document.querySelector('.container'),
                
                // Training section
                trainingCard: document.querySelector('.training-card'),
                cardTitle: document.querySelector('.card-title'),
                
                // Mode selector
                modeSelector: document.querySelector('.mode-selector'),
                modeButtons: document.querySelectorAll('.btn-mode'),
                
                // Accent picker
                accentPicker: document.querySelector('.accent-picker'),
                accentButtons: document.querySelectorAll('.accent-picker button'),
                
                // Custom words section
                customWordsSection: document.querySelector('.custom-words-section'),
                wordsTextarea: document.querySelector('textarea'),
                fileUpload: document.querySelector('.file-upload'),
                fileInput: document.querySelector('#file-input'),
                
                // Action buttons
                startBtn: document.querySelector('.btn-start'),
                premiumButtons: document.querySelectorAll('.premium-button, .upgrade-button, [class*="premium"]'),
                
                // Letters pad
                lettersPad: document.querySelector('.letters-pad'),
                letterTiles: document.querySelectorAll('.letter-tile'),
                
                // Trainer area
                trainerArea: document.querySelector('.trainer-area'),
                wordProgress: document.querySelector('.word-progress'),
                inputField: document.querySelector('.form-control'),
                buttonGroup: document.querySelector('.button-group'),
                prevButton: document.querySelector('.btn-secondary:nth-child(1)'),
                repeatButton: document.querySelector('.btn-secondary:nth-child(2)'),
                submitButton: document.querySelector('.btn-primary'),
                
                // Feedback and results
                feedbackArea: document.querySelector('.feedback'),
                summaryArea: document.querySelector('.summary-area'),
                resultsGrid: document.querySelector('.results-grid'),
                
                // Loading and modals
                loadingElement: document.querySelector('.loading'),
                premiumModal: document.getElementById('premium-modal')
            };

            // Validate critical elements
            this.validateCriticalElements();
            
            // Generate letters for letters pad if empty
            this.generateLettersPad();
            
            console.log('✅ DOM elements initialized successfully');
            
        } catch (error) {
            console.error('❌ Element initialization failed:', error);
            throw new Error('Failed to initialize DOM elements');
        }
    }

    validateCriticalElements() {
        const criticalElements = [
            'startBtn', 'lettersPad', 'trainerArea', 'inputField'
        ];
        
        const missingElements = criticalElements.filter(element => !this.elements[element]);
        
        if (missingElements.length > 0) {
            console.warn('⚠️ Missing critical elements:', missingElements);
            
            // Try to recover by creating missing elements
            missingElements.forEach(element => {
                this.recoverMissingElement(element);
            });
        }
    }

    recoverMissingElement(elementName) {
        console.log(`🛠️ Attempting to recover missing element: ${elementName}`);
        
        switch (elementName) {
            case 'startBtn':
                this.createStartButton();
                break;
            case 'lettersPad':
                this.createLettersPad();
                break;
            case 'inputField':
                this.createInputField();
                break;
        }
    }

    initializeEventListeners() {
        console.log('🎯 Initializing event listeners...');
        
        try {
            // Start button with enhanced error handling
            this.initializeStartButton();
            
            // Mode selector buttons
            this.initializeModeSelector();
            
            // Accent picker buttons
            this.initializeAccentPicker();
            
            // Letters pad interactions
            this.initializeLettersPad();
            
            // Input field handlers
            this.initializeInputHandlers();
            
            // Action buttons in trainer area
            this.initializeActionButtons();
            
            // File upload handling
            this.initializeFileUpload();
            
            // Window event listeners
            this.initializeWindowEvents();
            
            // Touch and gesture events for mobile
            this.initializeTouchEvents();
            
            console.log('✅ Event listeners initialized successfully');
            
        } catch (error) {
            console.error('❌ Event listener initialization failed:', error);
            throw new Error('Failed to initialize event listeners');
        }
    }

    initializeStartButton() {
        if (!this.elements.startBtn) {
            console.error('❌ Start button not found');
            return;
        }

        // Remove existing listeners to prevent duplicates
        const newStartBtn = this.elements.startBtn.cloneNode(true);
        this.elements.startBtn.parentNode.replaceChild(newStartBtn, this.elements.startBtn);
        this.elements.startBtn = newStartBtn;

        // Add click event with enhanced feedback
        this.elements.startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🎮 Start button clicked');
            
            // Add visual feedback
            this.addButtonFeedback(this.elements.startBtn);
            
            // Start the spelling bee
            this.startSpellingBee();
        });

        // Add keyboard accessibility
        this.elements.startBtn.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.elements.startBtn.click();
            }
        });

        console.log('✅ Start button initialized');
    }

    initializeMobileApp() {
        console.log('📱 Initializing mobile-specific features...');
        
        if (!this.isMobile) {
            console.log('ℹ️ Desktop device detected, skipping mobile optimizations');
            return;
        }

        try {
            // Mobile viewport height fix
            this.fixMobileViewport();
            
            // Touch event optimizations
            this.optimizeTouchEvents();
            
            // Keyboard handling
            this.setupKeyboardHandling();
            
            // Swipe gestures
            this.initializeSwipeGestures();
            
            // Performance optimizations for mobile
            this.optimizeMobilePerformance();
            
            console.log('✅ Mobile features initialized successfully');
            
        } catch (error) {
            console.error('❌ Mobile initialization failed:', error);
        }
    }

    initializePremiumFeatures() {
        console.log('⭐ Initializing premium features...');
        
        const premiumButtons = this.elements.premiumButtons || 
                             document.querySelectorAll('.premium-button, .upgrade-button, [class*="premium"]');
        
        if (premiumButtons.length === 0) {
            console.warn('⚠️ No premium buttons found');
            return;
        }

        premiumButtons.forEach((button, index) => {
            try {
                // Remove existing listeners
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add click listener with enhanced functionality
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log(`💎 Premium button ${index + 1} clicked`);
                    
                    // Visual feedback
                    this.addButtonFeedback(newButton);
                    
                    // Handle premium feature access
                    this.handlePremiumClick();
                });
                
                // Mobile touch feedback
                newButton.addEventListener('touchstart', () => {
                    newButton.style.transform = 'scale(0.95)';
                }, { passive: true });
                
                newButton.addEventListener('touchend', () => {
                    newButton.style.transform = 'scale(1)';
                }, { passive: true });
                
            } catch (error) {
                console.error(`❌ Failed to initialize premium button ${index + 1}:`, error);
            }
        });
        
        console.log(`✅ Initialized ${premiumButtons.length} premium buttons`);
    }

    // ===== Mobile-Specific Methods =====

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    fixMobileViewport() {
        const setVh = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVh();
        
        // Debounced resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(setVh, 250);
        });
        
        // Orientation change handler
        window.addEventListener('orientationchange', () => {
            setTimeout(setVh, 100);
        });
    }

    optimizeTouchEvents() {
        // Add passive touch listeners for better performance
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { 
            passive: true 
        });
        
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { 
            passive: true 
        });
        
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { 
            passive: true 
        });

        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        // Improve button touch feedback
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('btn') || 
                e.target.classList.contains('letter-tile') ||
                e.target.closest('.btn')) {
                e.target.style.transform = 'scale(0.95)';
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('btn') || 
                e.target.classList.contains('letter-tile') ||
                e.target.closest('.btn')) {
                e.target.style.transform = 'scale(1)';
            }
        }, { passive: true });
    }

    setupKeyboardHandling() {
        // Handle mobile keyboard appearance
        let originalHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const newHeight = window.innerHeight;
            const keyboardHeight = originalHeight - newHeight;
            
            if (keyboardHeight > 100) {
                // Keyboard is open
                document.body.classList.add('keyboard-open');
                this.scrollToActiveInput();
            } else {
                // Keyboard is closed
                document.body.classList.remove('keyboard-open');
            }
        });

        // Input focus handling
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea')) {
                setTimeout(() => {
                    this.scrollToElement(e.target);
                }, 300);
            }
        });
    }

    initializeSwipeGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Minimum swipe distance
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
                if (diffX > 0) {
                    this.handleSwipe('right');
                } else {
                    this.handleSwipe('left');
                }
            }
        }, { passive: true });
    }

    handleSwipe(direction) {
        console.log(`🔄 Swipe detected: ${direction}`);
        
        if (this.elements.trainerArea && !this.elements.trainerArea.classList.contains('hidden')) {
            if (direction === 'left') {
                this.nextWord();
            } else if (direction === 'right') {
                this.previousWord();
            }
        }
    }

    optimizeMobilePerformance() {
        // Enable hardware acceleration
        this.elements.container.style.transform = 'translateZ(0)';
        
        // Reduce animations on low-end devices
        if (this.isLowEndDevice()) {
            document.documentElement.classList.add('reduced-motion');
        }
        
        // Lazy load non-critical resources
        this.initializeLazyLoading();
    }

    isLowEndDevice() {
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        const deviceMemory = navigator.deviceMemory || 4;
        return hardwareConcurrency <= 4 || deviceMemory <= 4;
    }

    // ===== Core Application Methods =====

    startSpellingBee() {
        console.log('🎯 Starting spelling bee session...');
        
        if (!this.validateStartConditions()) {
            return;
        }

        try {
            // Update UI state
            this.updateUIForGameStart();
            
            // Show letters pad with smooth animation
            this.showLettersPad();
            
            // Initialize the first word
            this.loadWord(this.currentWordIndex);
            
            // Start hands-free mode if selected
            if (this.state.mode === 'hands-free') {
                this.startHandsFreeMode();
            }
            
            // Track analytics
            this.trackEvent('game_started', {
                wordCount: this.words.length,
                mode: this.state.mode,
                accent: this.state.accent
            });
            
            console.log('✅ Spelling bee started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start spelling bee:', error);
            this.showError('Failed to start the spelling bee. Please try again.');
        }
    }

    validateStartConditions() {
        // Check if we have words to spell
        if (this.words.length === 0) {
            this.showError('Please add some words to practice first.');
            return false;
        }
        
        // Check if letters pad is available
        if (!this.elements.lettersPad) {
            console.error('❌ Letters pad element not found');
            this.showError('Application error: User interface not loaded properly.');
            return false;
        }
        
        // Check speech synthesis for hands-free mode
        if (this.state.mode === 'hands-free' && !this.speechSynth) {
            this.showError('Speech synthesis not supported in your browser. Switching to text mode.');
            this.state.mode = 'text';
            this.updateModeUI();
            return true;
        }
        
        return true;
    }

    updateUIForGameStart() {
        // Hide start button
        if (this.elements.startBtn) {
            this.elements.startBtn.style.display = 'none';
        }
        
        // Show trainer area
        if (this.elements.trainerArea) {
            this.elements.trainerArea.classList.remove('hidden');
            this.elements.trainerArea.classList.add('fade-in');
        }
        
        // Focus on input field
        setTimeout(() => {
            if (this.elements.inputField) {
                this.elements.inputField.focus();
            }
        }, 500);
    }

    showLettersPad() {
        if (!this.elements.lettersPad) return;
        
        // Ensure letters pad has proper content
        this.generateLettersPad();
        
        // Show with animation
        this.elements.lettersPad.style.display = 'grid';
        this.elements.lettersPad.style.visibility = 'visible';
        this.elements.lettersPad.style.opacity = '0';
        this.elements.lettersPad.style.transform = 'translateY(20px)';
        
        // Animate in
        requestAnimationFrame(() => {
            this.elements.lettersPad.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            this.elements.lettersPad.style.opacity = '1';
            this.elements.lettersPad.style.transform = 'translateY(0)';
        });
        
        // Scroll to letters pad on mobile
        if (this.isMobile) {
            setTimeout(() => {
                this.scrollToElement(this.elements.lettersPad, { 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }, 400);
        }
    }

    generateLettersPad() {
        if (!this.elements.lettersPad) return;
        
        // Only generate if empty
        if (this.elements.lettersPad.children.length > 0) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const letterHTML = letters.map(letter => `
            <button class="letter-tile" data-letter="${letter}" aria-label="Letter ${letter}">
                ${letter}
            </button>
        `).join('');
        
        this.elements.lettersPad.innerHTML = letterHTML;
        
        // Re-initialize letter tile event listeners
        this.initializeLettersPad();
    }

    initializeLettersPad() {
        const letterTiles = this.elements.lettersPad ? 
            this.elements.lettersPad.querySelectorAll('.letter-tile') : [];
        
        letterTiles.forEach(tile => {
            // Remove existing listeners
            const newTile = tile.cloneNode(true);
            tile.parentNode.replaceChild(newTile, tile);
            
            // Add click event
            newTile.addEventListener('click', () => {
                this.handleLetterClick(newTile);
            });
            
            // Add touch events for mobile
            newTile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                newTile.classList.add('touched');
            }, { passive: false });
            
            newTile.addEventListener('touchend', () => {
                newTile.classList.remove('touched');
            });
        });
    }

    handleLetterClick(letterTile) {
        const letter = letterTile.getAttribute('data-letter');
        
        if (!letter || !this.elements.inputField) return;
        
        console.log(`🔤 Letter clicked: ${letter}`);
        
        // Add letter to input field
        const currentValue = this.elements.inputField.value;
        this.elements.inputField.value = currentValue + letter;
        
        // Visual feedback
        this.addLetterFeedback(letterTile);
        
        // Track analytics
        this.trackEvent('letter_clicked', { letter });
    }

    addLetterFeedback(letterTile) {
        letterTile.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)';
        letterTile.style.color = 'white';
        letterTile.style.transform = 'scale(0.9)';
        letterTile.style.boxShadow = 'var(--shadow-lg)';
        
        setTimeout(() => {
            letterTile.style.background = '';
            letterTile.style.color = '';
            letterTile.style.transform = 'scale(1)';
            letterTile.style.boxShadow = '';
        }, 200);
    }

    loadWord(index) {
        if (index < 0 || index >= this.words.length) {
            console.error('❌ Invalid word index:', index);
            return;
        }
        
        this.currentWordIndex = index;
        const word = this.words[index];
        
        console.log(`📖 Loading word ${index + 1}/${this.words.length}: ${word}`);
        
        // Update progress display
        if (this.elements.wordProgress) {
            this.elements.wordProgress.textContent = `Word ${index + 1} of ${this.words.length}`;
            this.elements.wordProgress.classList.add('pulse');
            
            setTimeout(() => {
                this.elements.wordProgress.classList.remove('pulse');
            }, 1000);
        }
        
        // Clear input field
        if (this.elements.inputField) {
            this.elements.inputField.value = '';
            this.elements.inputField.classList.remove('correct-answer', 'incorrect-answer');
        }
        
        // Clear previous feedback
        this.clearFeedback();
        
        // Speak word in hands-free mode
        if (this.state.mode === 'hands-free') {
            this.speakWord(word);
        }
        
        // Update button states
        this.updateNavigationButtons();
    }

    speakWord(word) {
        if (!this.speechSynth || this.state.mode !== 'hands-free') return;
        
        // Cancel any ongoing speech
        this.speechSynth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word);
        
        // Configure voice based on accent
        utterance.lang = this.getVoiceLang();
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
            console.log(`🎤 Speaking word: ${word}`);
            this.showMicStatus('Speaking word...');
        };
        
        utterance.onend = () => {
            console.log('✅ Finished speaking word');
            this.showMicStatus('Listening... Speak now!');
            this.startListening();
        };
        
        utterance.onerror = (event) => {
            console.error('❌ Speech synthesis error:', event.error);
            this.showMicStatus('Speech error. Please type the word.');
        };
        
        this.speechSynth.speak(utterance);
    }

    getVoiceLang() {
        const accentMap = {
            'us': 'en-US',
            'uk': 'en-GB',
            'au': 'en-AU'
        };
        
        return accentMap[this.state.accent] || 'en-US';
    }

    startListening() {
        if (!this.recognition || this.state.mode !== 'hands-free') return;
        
        try {
            this.recognition.start();
            this.isListening = true;
            console.log('🎤 Started listening for speech input');
        } catch (error) {
            console.error('❌ Failed to start speech recognition:', error);
            this.showMicStatus('Speech recognition unavailable. Please type the word.');
        }
    }

    // ===== Premium Features Methods =====

    handlePremiumClick() {
        console.log('💎 Handling premium feature request...');
        
        // Show premium modal
        this.showPremiumModal();
        
        // Track analytics
        this.trackEvent('premium_clicked', {
            location: 'main_button',
            is_mobile: this.isMobile
        });
    }

    showPremiumModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('premium-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'premium-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = this.getPremiumModalHTML();
            document.body.appendChild(modal);
            
            // Initialize modal event listeners
            this.initializePremiumModal();
        }
        
        // Show modal with animation
        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Add escape key listener
        this.addEscapeListener(modal);
    }

    getPremiumModalHTML() {
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🚀 Upgrade to SpellRightPro Premium</h2>
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="premium-features">
                        <div class="feature-item">
                            <span class="feature-icon">📚</span>
                            <div class="feature-text">
                                <h3>Unlimited Custom Word Lists</h3>
                                <p>Create as many custom word lists as you need</p>
                            </div>
                        </div>
                        
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <div class="feature-text">
                                <h3>Advanced Progress Analytics</h3>
                                <p>Track your improvement with detailed statistics</p>
                            </div>
                        </div>
                        
                        <div class="feature-item">
                            <span class="feature-icon">🎯</span>
                            <div class="feature-text">
                                <h3>Personalized Learning Path</h3>
                                <p>AI-powered recommendations based on your progress</p>
                            </div>
                        </div>
                        
                        <div class="feature-item">
                            <span class="feature-icon">🚫</span>
                            <div class="feature-text">
                                <h3>Ad-Free Experience</h3>
                                <p>Focus on learning without distractions</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pricing-options">
                        <div class="pricing-card recommended">
                            <div class="pricing-header">
                                <h3>Annual Plan</h3>
                                <div class="price">$4.99<span class="period">/month</span></div>
                                <div class="billing">Billed annually at $59.88</div>
                            </div>
                            <ul class="pricing-features">
                                <li>All premium features included</li>
                                <li>Save 50% compared to monthly</li>
                                <li>7-day money-back guarantee</li>
                            </ul>
                            <button class="btn-primary upgrade-btn" data-plan="annual">
                                Choose Annual Plan
                            </button>
                        </div>
                        
                        <div class="pricing-card">
                            <div class="pricing-header">
                                <h3>Monthly Plan</h3>
                                <div class="price">$9.99<span class="period">/month</span></div>
                                <div class="billing">Billed monthly</div>
                            </div>
                            <ul class="pricing-features">
                                <li>All premium features included</li>
                                <li>Flexible monthly billing</li>
                                <li>Cancel anytime</li>
                            </ul>
                            <button class="btn-secondary upgrade-btn" data-plan="monthly">
                                Choose Monthly Plan
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <p class="guarantee">🔒 Secure payment · 7-day money-back guarantee</p>
                    <button class="btn-text later-btn">Maybe Later</button>
                </div>
            </div>
        `;
    }

    initializePremiumModal() {
        const modal = document.getElementById('premium-modal');
        if (!modal) return;
        
        // Close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePremiumModal());
        }
        
        // Upgrade buttons
        const upgradeBtns = modal.querySelectorAll('.upgrade-btn');
        upgradeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plan = e.target.getAttribute('data-plan');
                this.upgradeToPremium(plan);
            });
        });
        
        // Later button
        const laterBtn = modal.querySelector('.later-btn');
        if (laterBtn) {
            laterBtn.addEventListener('click', () => this.closePremiumModal());
        }
        
        // Backdrop click to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePremiumModal();
            }
        });
    }

    closePremiumModal() {
        const modal = document.getElementById('premium-modal');
        if (!modal) return;
        
        modal.classList.remove('active');
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    upgradeToPremium(plan) {
        console.log(`💳 Initiating premium upgrade for plan: ${plan}`);
        
        // Show loading state
        this.showLoading('Processing upgrade...');
        
        // Simulate payment processing
        setTimeout(() => {
            this.hideLoading();
            
            // For demo purposes, just show success message
            this.showSuccess('Welcome to SpellRightPro Premium! 🎉');
            
            // Update app state
            this.state.isPremium = true;
            this.updatePremiumUI();
            
            // Close modal
            this.closePremiumModal();
            
            // Track analytics
            this.trackEvent('premium_upgraded', { plan });
            
        }, 2000);
    }

    updatePremiumUI() {
        // Update premium buttons to show activated state
        this.elements.premiumButtons.forEach(btn => {
            btn.innerHTML = '⭐ Premium Active';
            btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            btn.disabled = true;
        });
        
        // Show premium features
        this.enablePremiumFeatures();
    }

    enablePremiumFeatures() {
        // Enable unlimited word lists
        if (this.elements.wordsTextarea) {
            this.elements.wordsTextarea.placeholder = 'Add unlimited custom words...';
        }
        
        // Remove freemium restrictions
        this.removeFreemiumRestrictions();
        
        console.log('✅ Premium features enabled');
    }

    // ===== Utility Methods =====

    addButtonFeedback(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }

    scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    scrollToActiveInput() {
        if (this.elements.inputField && this.isMobile) {
            setTimeout(() => {
                this.scrollToElement(this.elements.inputField);
            }, 300);
        }
    }

    showError(message) {
        this.showFeedback(message, 'error');
    }

    showSuccess(message) {
        this.showFeedback(message, 'success');
    }

    showFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.className = `feedback ${type} fade-in`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: var(--shadow-xl);
        `;
        
        document.body.appendChild(feedback);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.style.opacity = '0';
                feedback.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    feedback.parentNode.removeChild(feedback);
                }, 300);
            }
        }, 5000);
    }

    showFatalError(message) {
        const errorHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">😔 SpellRightPro Error</h1>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">${message}</p>
                    <button onclick="window.location.reload()" style="
                        padding: 12px 24px;
                        background: white;
                        color: #667eea;
                        border: none;
                        border-radius: 8px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                    ">🔄 Refresh Application</button>
                </div>
            </div>
        `;
        
        document.body.innerHTML = errorHTML;
    }

    showWelcomeMessage() {
        if (!this.isInitialized) return;
        
        console.log('👋 Showing welcome message');
        
        // Only show on first visit or after significant updates
        const lastVisit = localStorage.getItem('spellrightpro_last_visit');
        const currentVersion = '2.1.0';
        
        if (!lastVisit || lastVisit !== currentVersion) {
            this.showSuccess('Welcome to SpellRightPro! 🐝 Start by adding words and clicking "Start Spelling Bee".');
            localStorage.setItem('spellrightpro_last_visit', currentVersion);
        }
    }

    hideLoading() {
        // Hide all loading elements
        const loadingElements = document.querySelectorAll('.loading, [class*="loading"], [class*="spinner"]');
        loadingElements.forEach(element => {
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
            }, 300);
        });
        
        // Show main content with fade-in
        const mainContent = document.querySelector('.training-card');
        if (mainContent) {
            mainContent.style.opacity = '0';
            mainContent.style.display = 'block';
            
            requestAnimationFrame(() => {
                mainContent.style.transition = 'opacity 0.5s ease';
                mainContent.style.opacity = '1';
            });
        }
    }

    showLoading(message = 'Loading...') {
        // Create or show loading overlay
        let loadingOverlay = document.getElementById('global-loading');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'global-loading';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-size: 1.2rem;
            `;
            document.body.appendChild(loadingOverlay);
        }
        
        loadingOverlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                "></div>
                <p>${message}</p>
            </div>
        `;
        
        loadingOverlay.style.display = 'flex';
    }

    trackEvent(eventName, properties = {}) {
        // Basic analytics tracking
        console.log(`📊 Event: ${eventName}`, properties);
        
        // You can integrate with your analytics service here
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
    }

    // ===== Speech Recognition Methods =====

    initializeSpeechRecognition() {
        if (this.state.mode !== 'hands-free') return;
        
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                console.warn('⚠️ Speech recognition not supported');
                return;
            }
            
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = this.getVoiceLang();
            
            this.recognition.onstart = () => {
                console.log('🎤 Speech recognition started');
                this.showMicStatus('Listening...');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('🎤 Speech recognized:', transcript);
                
                if (this.elements.inputField) {
                    this.elements.inputField.value = transcript;
                    this.checkSpelling();
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('❌ Speech recognition error:', event.error);
                this.showMicStatus('Speech recognition error. Please type the word.');
            };
            
            this.recognition.onend = () => {
                console.log('✅ Speech recognition ended');
                this.isListening = false;
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize speech recognition:', error);
        }
    }

    showMicStatus(message) {
        let statusElement = document.getElementById('mic-status');
        
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'mic-status';
            statusElement.className = 'mic-status';
            this.elements.trainerArea?.insertBefore(statusElement, this.elements.trainerArea.firstChild);
        }
        
        statusElement.textContent = message;
    }

    // ===== Additional Core Methods =====

    checkSpelling() {
        const currentWord = this.words[this.currentWordIndex];
        const userInput = this.elements.inputField?.value.trim();
        
        if (!userInput) return;
        
        console.log(`🔍 Checking spelling: "${userInput}" vs "${currentWord}"`);
        
        const isCorrect = userInput.toLowerCase() === currentWord.toLowerCase();
        
        // Visual feedback
        if (this.elements.inputField) {
            this.elements.inputField.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
        }
        
        // Show feedback message
        this.showFeedback(
            isCorrect ? '✅ Correct! Well done!' : `❌ Incorrect. The word was: ${currentWord}`,
            isCorrect ? 'success' : 'error'
        );
        
        // Track result
        if (isCorrect) {
            this.correctWords.push(currentWord);
            this.state.currentScore++;
        } else {
            this.incorrectWords.push(currentWord);
        }
        
        this.state.totalAttempts++;
        
        // Move to next word after delay
        setTimeout(() => {
            this.nextWord();
        }, 2000);
    }

    nextWord() {
        this.currentWordIndex++;
        
        if (this.currentWordIndex < this.words.length) {
            this.loadWord(this.currentWordIndex);
        } else {
            this.showResults();
        }
    }

    previousWord() {
        if (this.currentWordIndex > 0) {
            this.currentWordIndex--;
            this.loadWord(this.currentWordIndex);
        }
    }

    showResults() {
        console.log('📊 Showing results summary');
        
        // Calculate score
        const score = Math.round((this.correctWords.length / this.words.length) * 100);
        const timeSpent = Math.round((new Date() - this.state.sessionStartTime) / 1000);
        
        // Create results HTML
        const resultsHTML = `
            <div class="summary-header fade-in">
                <h2>🎉 Spelling Bee Complete!</h2>
                <div class="score-display">${score}%</div>
                <div class="score-percent">${this.correctWords.length} out of ${this.words.length} correct</div>
                <p>Time spent: ${this.formatTime(timeSpent)}</p>
            </div>
            
            <div class="results-grid">
                <div class="results-card correct">
                    <h3>✅ Correct Words</h3>
                    <div class="score-number">${this.correctWords.length}</div>
                    <div class="word-list">
                        ${this.correctWords.map(word => `<div class="word-item">${word}</div>`).join('')}
                    </div>
                </div>
                
                <div class="results-card incorrect">
                    <h3>❌ Words to Review</h3>
                    <div class="score-number">${this.incorrectWords.length}</div>
                    <div class="word-list">
                        ${this.incorrectWords.map(word => `<div class="word-item">${word}</div>`).join('')}
                    </div>
                </div>
            </div>
            
            <div class="summary-actions">
                <button class="btn-primary" onclick="app.restartSession()">🔄 Practice Again</button>
                <button class="btn-secondary" onclick="app.returnToSetup()">📝 New Word List</button>
            </div>
        `;
        
        if (this.elements.summaryArea) {
            this.elements.summaryArea.innerHTML = resultsHTML;
            this.elements.summaryArea.classList.remove('hidden');
            this.elements.summaryArea.classList.add('fade-in');
            
            // Hide trainer area
            if (this.elements.trainerArea) {
                this.elements.trainerArea.classList.add('hidden');
            }
        }
        
        // Track analytics
        this.trackEvent('session_completed', {
            score: score,
            correct_count: this.correctWords.length,
            total_words: this.words.length,
            time_spent: timeSpent
        });
    }

    restartSession() {
        this.currentWordIndex = 0;
        this.correctWords = [];
        this.incorrectWords = [];
        this.state.sessionStartTime = new Date();
        
        // Show trainer area, hide results
        if (this.elements.trainerArea) {
            this.elements.trainerArea.classList.remove('hidden');
        }
        if (this.elements.summaryArea) {
            this.elements.summaryArea.classList.add('hidden');
        }
        
        // Load first word
        this.loadWord(0);
    }

    returnToSetup() {
        this.currentWordIndex = 0;
        this.correctWords = [];
        this.incorrectWords = [];
        
        // Show start button, hide trainer and results
        if (this.elements.startBtn) {
            this.elements.startBtn.style.display = 'block';
        }
        if (this.elements.trainerArea) {
            this.elements.trainerArea.classList.add('hidden');
        }
        if (this.elements.summaryArea) {
            this.elements.summaryArea.classList.add('hidden');
        }
        if (this.elements.lettersPad) {
            this.elements.lettersPad.style.display = 'none';
        }
        
        // Clear feedback
        this.clearFeedback();
    }

    clearFeedback() {
        if (this.elements.feedbackArea) {
            this.elements.feedbackArea.className = 'feedback';
            this.elements.feedbackArea.textContent = '';
        }
        
        // Clear mic status
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            micStatus.remove();
        }
    }

    updateNavigationButtons() {
        if (!this.elements.prevButton || !this.elements.repeatButton) return;
        
        // Update previous button state
        this.elements.prevButton.disabled = this.currentWordIndex === 0;
        
        // Update repeat button text based on mode
        if (this.state.mode === 'hands-free') {
            this.elements.repeatButton.innerHTML = '🔊 Repeat Word';
        } else {
            this.elements.repeatButton.innerHTML = '👁️ Show Word';
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ===== Additional Initialization Methods =====

    initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                });
        }
    }

    initializeLazyLoading() {
        // Implement lazy loading for images and other resources
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }

    loadUserPreferences() {
        try {
            const preferences = localStorage.getItem('spellrightpro_preferences');
            if (preferences) {
                const savedState = JSON.parse(preferences);
                this.state = { ...this.state, ...savedState };
                this.applyUserPreferences();
            }
        } catch (error) {
            console.error('❌ Failed to load user preferences:', error);
        }
    }

    saveUserPreferences() {
        try {
            localStorage.setItem('spellrightpro_preferences', JSON.stringify({
                mode: this.state.mode,
                accent: this.state.accent,
                isDarkMode: this.state.isDarkMode
            }));
        } catch (error) {
            console.error('❌ Failed to save user preferences:', error);
        }
    }

    applyUserPreferences() {
        // Apply dark mode
        if (this.state.isDarkMode) {
            document.body.classList.add('dark-mode');
        }
        
        // Apply accent
        this.updateAccentUI();
        
        // Apply mode
        this.updateModeUI();
    }

    updateAccentUI() {
        this.elements.accentButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.accent === this.state.accent);
        });
    }

    updateModeUI() {
        this.elements.modeButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.state.mode);
        });
    }

    initializeGameState() {
        // Add sample words if no words are provided
        if (this.words.length === 0) {
            this.words = [
                'example', 'spelling', 'practice', 'education', 'learning',
                'knowledge', 'vocabulary', 'language', 'pronunciation', 'exercise'
            ];
            console.log('📝 Loaded sample words for demonstration');
        }
    }

    addEscapeListener(modal) {
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePremiumModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    removeFreemiumRestrictions() {
        // Remove any freemium restrictions from the UI
        const freemiumMessages = document.querySelectorAll('.info-box, .freemium-notice');
        freemiumMessages.forEach(element => {
            element.style.display = 'none';
        });
        
        // Enable all features
        console.log('🔓 Freemium restrictions removed');
    }

    // ===== Event Handler Stubs =====
    
    handleTouchStart(e) {
        // Implement touch start logic
    }
    
    handleTouchMove(e) {
        // Implement touch move logic  
    }
    
    handleTouchEnd(e) {
        // Implement touch end logic
    }
    
    initializeInputHandlers() {
        // Implement input field handlers
    }
    
    initializeActionButtons() {
        // Implement action button handlers
    }
    
    initializeFileUpload() {
        // Implement file upload handlers
    }
    
    initializeWindowEvents() {
        // Implement window event handlers
    }
    
    initializeModeSelector() {
        // Implement mode selector handlers
    }
    
    initializeAccentPicker() {
        // Implement accent picker handlers
    }

    // ===== Public Methods =====

    addWords(wordList) {
        if (Array.isArray(wordList)) {
            this.words = [...this.words, ...wordList];
        } else if (typeof wordList === 'string') {
            const words = wordList.split(/[,\n]/)
                .map(word => word.trim())
                .filter(word => word.length > 0);
            this.words = [...this.words, ...words];
        }
        
        console.log(`📝 Added words. Total: ${this.words.length}`);
        
        // Update UI if needed
        this.updateWordCountUI();
    }

    updateWordCountUI() {
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `${this.words.length} words`;
        }
    }

    resetGame() {
        this.currentWordIndex = 0;
        this.correctWords = [];
        this.incorrectWords = [];
        this.state.currentScore = 0;
        this.state.totalAttempts = 0;
        this.state.sessionStartTime = new Date();
        
        // Reset UI
        if (this.elements.startBtn) {
            this.elements.startBtn.style.display = 'block';
        }
        if (this.elements.lettersPad) {
            this.elements.lettersPad.style.display = 'none';
        }
        if (this.elements.trainerArea) {
            this.elements.trainerArea.classList.add('hidden');
        }
        if (this.elements.summaryArea) {
            this.elements.summaryArea.classList.add('hidden');
        }
        
        this.clearFeedback();
        
        console.log('🔄 Game reset successfully');
    }

    // Method to handle words from textarea
    processWordsFromTextarea() {
        if (this.elements.wordsTextarea) {
            const text = this.elements.wordsTextarea.value;
            this.addWords(text);
            this.elements.wordsTextarea.value = '';
        }
    }

    // Method to handle file upload
    processWordsFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.addWords(content);
        };
        reader.readAsText(file);
    }
}

// ===== Global Initialization =====

console.log('🚀 Loading SpellRightPro Spelling Bee Application...');

// Global error handler
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled promise rejection:', event.reason);
});

// Initialize the application
function initializeSpellingBee() {
    try {
        // Create global app instance
        window.spellingBeeApp = new SpellingBeeApp();
        
        // Make app globally available for debugging
        window.app = window.spellingBeeApp;
        
        console.log('🎉 SpellRightPro initialized successfully!');
        
    } catch (error) {
        console.error('💥 Failed to initialize Spelling Bee app:', error);
        
        // Show user-friendly error message
        showFatalError('Failed to load the application. Please refresh the page.');
    }
}

// Helper function for fatal errors
function showFatalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
    `;
    
    errorDiv.innerHTML = `
        <div>
            <h1 style="font-size: 2rem; margin-bottom: 1rem;">😔 SpellRightPro Error</h1>
            <p style="font-size: 1.2rem; margin-bottom: 2rem; max-width: 500px;">${message}</p>
            <button onclick="window.location.reload()" style="
                padding: 12px 24px;
                background: white;
                color: #ff6b6b;
                border: none;
                border-radius: 8px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
            ">🔄 Refresh Page</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSpellingBee);
} else {
    initializeSpellingBee();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpellingBeeApp;
}

console.log('📋 SpellRightPro initialization script loaded');
