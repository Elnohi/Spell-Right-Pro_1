/* main-premium.js — Premium app
   - Bee: voice-only. OET/Custom: typed
   - Summary: correct / needs review / flagged + review buttons
   - Auto-focus input after TTS ends (OET/Custom)
*/

/* ====================== Global State ====================== */
let currentUser = null;
let premiumUser = false;

let examType = "OET";           // "OET" | "Bee" | "Custom"
let sessionMode = "practice";   // "practice" | "test"
let accent = "en-US";

let words = [];
let currentIndex = 0;
let score = 0;
let userAnswers = [];
let sessionStartTime = null;
let wordStartTime = null;
let stripe = null;

let recognition = null;         // Bee (SpeechRecognition)
let isListening = false;
let beeKeyHandlerRef = null;

// NEW: per-session tracking for summary
let correctWords = [];
let incorrectWords = [];
let sessionFlagged = new Set();

const sessionId = 'sess_' + Math.random().toString(36).slice(2, 10);

/* ====================== DOM References ====================== */
const authArea      = document.getElementById('auth-area');
const premiumApp    = document.getElementById('premium-app');
const examUI        = document.getElementById('exam-ui');
const trainerArea   = document.getElementById('trainer-area');
const summaryArea   = document.getElementById('summary-area');
const appTitle      = document.getElementById('app-title');
const darkToggleBtn = document.getElementById('dark-mode-toggle');

/* ====================== Utilities ====================== */
function noop() {}
function logEvent(name, params) { try { (window.trackEvent || noop)(name, params || {}); } catch(_){} }
function logError(err, ctx)     { try { (window.trackError || noop)(err, ctx || {}); } catch(_){} }
function alertSafe(msg, type='error', ms=3000) {
  if (typeof window.showAlert === 'function') window.showAlert(msg, type, ms);
  else alert(msg);
}
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function speechSupported() {
  return ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

/* ====================== Init ====================== */
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
  initStripe();
  initDarkMode();
  initAuthState();
  loadVoices();
  checkUrlForPaymentStatus();
}

/* ---------- Stripe ---------- */
function initStripe() {
  if (!window.Stripe) { console.warn('Stripe.js not loaded yet.'); return; }
  const key =
    (typeof stripeConfig !== 'undefined' && stripeConfig && stripeConfig.publicKey) ||
    (window.stripeConfig && window.stripeConfig.publicKey) ||
    '';
  if (!/^pk_(test|live)_/.test(key)) { console.warn('Stripe publishable key missing/invalid.'); return; }
  stripe = Stripe(key);
}

/* ---------- Theme ---------- */
function initDarkMode() {
  if (typeof window.initThemeToggle === 'function') { window.initThemeToggle(); return; }
  if (darkToggleBtn) {
    const apply = (isDark) => {
      document.body.classList.toggle('dark-mode', isDark);
      localStorage.setItem('darkMode', isDark);
      const icon = darkToggleBtn.querySelector('i');
      if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    };
    darkToggleBtn.addEventListener('click', () => apply(!document.body.classList.contains('dark-mode')));
    apply(localStorage.getItem('darkMode') === 'true');
  }
}

/* ---------- Voices ---------- */
let voicesReady = false;
function loadVoices() {
  function handle() { voicesReady = true; window.speechSynthesis.onvoiceschanged = null; }
  if ('speechSynthesis' in window) {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length) handle(); else window.speechSynthesis.onvoiceschanged = handle;
  }
}

/* ---------- Payment success flag ---------- */
function checkUrlForPaymentStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('payment_success')) {
    alertSafe('🎉 Premium subscription activated!', 'success', 4000);
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => location.reload(), 400);
  }
}

/* ====================== Firestore: user doc & premium ====================== */
async function ensureUserDoc(user, trialDays = 7) {
  const ref = firebase.firestore().collection('users').doc(user.uid);
  let snap;
  try { snap = await ref.get(); }
  catch (err) { console.error('Failed to read user doc:', err); alertSafe('Could not access your profile. Check Firestore rules.', 'error', 5000); throw err; }

  const future = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
  const trialEndsAtTS = firebase.firestore.Timestamp.fromDate(future);

  if (!snap.exists) {
    try {
      await ref.set({
        email: user.email || '',
        isPremium: false,
        trialEndsAt: trialEndsAtTS,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return;
    } catch (err) {
      console.error('Failed to create user doc:', err);
      alertSafe('Could not create your profile. Please try again.', 'error', 5000);
      throw err;
    }
  }

  const data = snap.data() || {};
  const updates = {};
  if (typeof data.isPremium !== 'boolean') updates.isPremium = false;
  const isTimestamp = data.trialEndsAt && typeof data.trialEndsAt.toDate === 'function';
  if (!isTimestamp) updates.trialEndsAt = trialEndsAtTS;
  if (!data.email) updates.email = user.email || '';
  if (Object.keys(updates).length) {
    try { await ref.set(updates, { merge: true }); }
    catch (err) { console.error('Failed to update user doc:', err); alertSafe('Could not update your profile. Please try again.', 'error', 5000); throw err; }
  }
}

async function checkPremiumStatus() {
  if (!currentUser) return false;
  try {
    const ref  = firebase.firestore().collection('users').doc(currentUser.uid);
    const snap = await ref.get();
    if (!snap.exists) return false;
    const data = snap.data();
    const trialEndsAt = data.trialEndsAt && typeof data.trialEndsAt.toDate === 'function'
      ? data.trialEndsAt.toDate()
      : null;
    const hasActiveTrial = trialEndsAt ? (trialEndsAt > new Date()) : false;
    premiumUser = data.isPremium === true || hasActiveTrial;
    if (premiumUser) { document.querySelectorAll('.ad-container').forEach(el => el.style.display = 'none'); }
    return premiumUser;
  } catch (error) {
    console.error('Premium check error:', error);
    alertSafe('Could not verify premium status (permissions).', 'error', 3500);
    return false;
  }
}

/* ====================== Auth UI ====================== */
function initAuthState() {
  firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (!user) { renderAuthLoggedOut(); return; }
    try {
      await ensureUserDoc(user, (window.appConfig && appConfig.trialDays) || 7);
      await checkPremiumStatus();
      renderAuthLoggedIn();
      premiumUser ? renderExamUI() : showPremiumUpsell();
    } catch (err) {
      console.error('Auth init error:', err);
      alertSafe('We could not load your premium status. Please try again.', 'error', 4500);
      renderAuthLoggedIn();
    }
  });
}

function renderAuthLoggedOut() {
  if (!authArea) return;
  authArea.innerHTML = `
    <div class="auth-form">
      <input type="email" id="email" placeholder="Email" class="form-control">
      <input type="password" id="password" placeholder="Password" class="form-control">
      <button id="login-btn" class="btn btn-primary">Login</button>
      <button id="signup-btn" class="btn btn-outline">Sign Up</button>
    </div>`;
  $('#login-btn')?.addEventListener('click', handleLogin);
  $('#signup-btn')?.addEventListener('click', handleSignup);
  premiumApp?.classList.add('hidden');
}

function renderAuthLoggedIn() {
  if (!authArea) return;
  const email = (currentUser && currentUser.email) || '';
  authArea.innerHTML = `
    <div class="user-info">
      <span>${email}</span>
      ${premiumUser ? '<span class="premium-badge"><i class="fas fa-crown"></i> Premium</span>' : ''}
      <button id="logout-btn" class="btn btn-sm btn-outline"><i class="fas fa-sign-out-alt"></i> Logout</button>
    </div>`;
  $('#logout-btn')?.addEventListener('click', handleLogout);
  premiumApp?.classList.remove('hidden');
}

async function handleLogin() {
  const email = $('#email')?.value || '';
  const password = $('#password')?.value || '';
  try { await firebase.auth().signInWithEmailAndPassword(email, password); logEvent('login_success'); }
  catch (error) { alertSafe(error.message, 'error'); logError(error, { context: 'login' }); }
}

async function handleSignup() {
  const email = $('#email')?.value || '';
  const password = $('#password')?.value || '';
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    await firebase.firestore().collection('users').doc(cred.user.uid).set({
      email,
      isPremium: false,
      trialEndsAt: new Date(Date.now() + 7*24*60*60*1000),
      createdAt: new Date()
    }, { merge: true });
    await ensureUserDoc(cred.user, (window.appConfig && appConfig.trialDays) || 7);
    alertSafe('🎉 7-day premium trial started!', 'success', 4000);
    logEvent('trial_started');
  } catch (error) {
    alertSafe(error.message, 'error'); logError(error, { context: 'signup' });
  }
}

function handleLogout() { firebase.auth().signOut(); logEvent('user_logout'); }

/* ====================== Payments ====================== */
async function initiatePayment(planType) {
  if (!currentUser) { alertSafe('Please log in first.', 'error'); return; }
  const base = (window.appConfig && appConfig.apiBaseUrl) || '';
  if (!base) { alertSafe('Backend URL missing. Set appConfig.apiBaseUrl in config.js', 'error'); return; }
  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch(`${base}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ plan: planType, userId: currentUser.uid, sessionId })
    });
    if (!res.ok) throw new Error(await res.text());
    const { sessionId: sid } = await res.json();
    if (!stripe) initStripe();
    const { error } = await stripe.redirectToCheckout({ sessionId: sid });
    if (error) throw error;
  } catch (error) {
    alertSafe(`Payment failed: ${error.message}`, 'error', 5000);
    logError(error, { context: 'payment_initiation' });
  }
}

function showPremiumUpsell() {
  if (!trainerArea) return;
  trainerArea.classList.remove('hidden');
  summaryArea?.classList.add('hidden');
  trainerArea.innerHTML = `
    <div class="premium-upsell">
      <div class="premium-header">
        <i class="fas fa-crown"></i>
        <h2>Upgrade to Premium</h2>
        <p>Unlock all features and unlimited practice</p>
      </div>
      <div class="pricing-options">
        <div class="pricing-option">
          <h3>Monthly</h3>
          <div class="price" id="monthly-price">$4.99/mo</div>
          <button id="monthly-btn" class="btn btn-primary">Subscribe</button>
        </div>
        <div class="pricing-option recommended">
          <div class="badge">Best Value</div>
          <h3>Annual</h3>
          <div class="price" id="annual-price">$49.99/yr</div>
          <div class="savings">Save 15%</div>
          <button id="annual-btn" class="btn btn-primary">Subscribe</button>
        </div>
      </div>
    </div>`;
  $('#monthly-btn')?.addEventListener('click', () => initiatePayment('monthly'));
  $('#annual-btn')?.addEventListener('click', () => initiatePayment('annual'));
}

/* ====================== Exam UI & Flows ====================== */
function renderExamUI() {
  if (!examUI) return;

  let uploadArea = `
    <textarea id="custom-words" class="form-control" rows="3"
      placeholder="Enter words (comma/newline separated), or leave empty to use defaults"></textarea>
    <input type="file" id="word-file" accept=".txt,.csv" class="form-control" style="margin-top:6px;">
    <button id="add-custom-btn" class="btn btn-info" style="margin-top: 8px;">
      <i class="fas fa-plus-circle"></i> Use This List
    </button>
    <div id="upload-info" class="upload-info" style="margin-top:6px;font-size:0.95em;color:var(--gray);"></div>
  `;

  examUI.innerHTML = `
    <div class="mode-selector">
      <button id="practice-mode-btn" class="btn-mode ${sessionMode==='practice'?'active':''}">
        <i class="fas fa-graduation-cap"></i> Practice
      </button>
      <button id="test-mode-btn" class="btn-mode ${sessionMode==='test'?'active':''}">
        <i class="fas fa-clipboard-check"></i> Test
      </button>
    </div>

    <div class="input-group" style="display:flex;gap:.5rem;align-items:center;margin-bottom:8px;">
      <select id="exam-type" class="form-control" style="flex:1;">
        <option value="OET">OET Spelling</option>
        <option value="Bee">Spelling Bee</option>
        <option value="Custom">Custom Words</option>
      </select>
      <select id="accent-select" class="form-control" style="max-width: 160px;">
        <option value="en-US">American</option>
        <option value="en-GB">British</option>
        <option value="en-AU">Australian</option>
      </select>
    </div>

    <div id="custom-upload-area">${uploadArea}</div>

    <button id="start-btn" class="btn btn-primary" style="margin-top: 12px;">
      <i class="fas fa-play"></i> Start Session
    </button>
  `;

  $('#exam-type').value = examType;
  $('#accent-select').value = accent;

  $('#practice-mode-btn')?.addEventListener('click', () => { sessionMode='practice'; renderExamUI(); });
  $('#test-mode-btn')?.addEventListener('click', () => { sessionMode='test'; renderExamUI(); });

  $('#exam-type')?.addEventListener('change', (e)=>{ examType = e.target.value; updateBeeSupportUI(); });
  $('#accent-select')?.addEventListener('change', (e)=>{ accent = e.target.value; });

  let customWordList = [];
  let useCustomList = false;

  $('#word-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target.result || '');
      customWordList = processWordList(text);
      useCustomList = true;
      $('#upload-info').textContent = `Loaded ${customWordList.length} words from file.`;
    };
    reader.readAsText(file);
  });

  $('#add-custom-btn')?.addEventListener('click', () => {
    const input = ($('#custom-words')?.value || '').trim();
    if (input.length) {
      customWordList = processWordList(input);
      useCustomList = true;
      $('#upload-info').textContent = `Added ${customWordList.length} words from textarea.`;
    } else if (customWordList.length) {
      useCustomList = true;
      $('#upload-info').textContent = `Using ${customWordList.length} words loaded from file.`;
    } else {
      useCustomList = false;
      $('#upload-info').textContent = `Using default list.`;
    }
  });

  function updateBeeSupportUI() {
    const startBtn = document.getElementById('start-btn');
    const old = document.getElementById('bee-support-notice');
    if (old) old.remove();

    if ($('#exam-type').value === 'Bee' && !speechSupported()) {
      startBtn.disabled = true;
      startBtn.setAttribute('aria-disabled', 'true');
      const notice = document.createElement('div');
      notice.id = 'bee-support-notice';
      notice.className = 'feedback incorrect';
      notice.style.marginTop = '8px';
      notice.innerHTML = '<i class="fas fa-microphone-slash"></i> Voice spelling requires a browser with SpeechRecognition (Chrome/Edge) and mic permissions.';
      startBtn.insertAdjacentElement('afterend', notice);
    } else {
      startBtn.disabled = false;
      startBtn.setAttribute('aria-disabled', 'false');
    }
  }
  updateBeeSupportUI();

  $('#start-btn')?.addEventListener('click', () => {
    summaryArea.innerHTML = '';
    examType = $('#exam-type').value;
    appTitle.textContent = (examType === 'OET') ? 'OET Spelling Practice'
                      : (examType === 'Bee') ? 'Spelling Bee (Voice)'
                      : 'Custom Spelling Practice';

    // reset per-session tracking
    correctWords = [];
    incorrectWords = [];
    sessionFlagged = new Set();

    if (examType === 'Custom') {
      if (useCustomList && customWordList.length) words = customWordList.slice();
      else words = [];
      startTypedTrainer();
      return;
    }

    if (examType === 'OET') {
      const base = Array.isArray(window.oetWords) ? window.oetWords.slice() : [];
      words = (sessionMode === 'test') ? shuffle(base).slice(0, 24) : base;
      startTypedTrainer();
      return;
    }

    if (examType === 'Bee') {
      if (!speechSupported()) {
        alertSafe('Spelling Bee requires voice input. Please use Chrome/Edge and allow mic access.', 'error', 6000);
        return;
      }
      const beeDefaults = [
        "accommodate","belligerent","conscientious","disastrous","embarrass","foreign","guarantee","harass",
        "interrupt","jealous","knowledge","liaison","millennium","necessary","occasionally","possession",
        "questionnaire","rhythm","separate","tomorrow","unforeseen","vacuum","withhold","yacht"
      ];
      words = (sessionMode === 'test') ? shuffle(beeDefaults).slice(0, 24) : beeDefaults.slice();
      startBeeVoiceTrainer();
      return;
    }

    alertSafe('No word list available.', 'error');
  });
}

/* ====================== TYPED TRAINER (OET/Custom) ====================== */
function startTypedTrainer() {
  beeCleanup();
  if (!trainerArea) return;
  currentIndex = 0; score = 0; userAnswers = [];
  sessionStartTime = Date.now();
  trainerArea.classList.remove('hidden');
  summaryArea?.classList.add('hidden');
  typedShowCurrentWord();
  setTimeout(() => typedSpeakCurrentWord(), 300);
}

function typedShowCurrentWord() {
  if (currentIndex >= words.length) { return showSummary(); }
  const word = words[currentIndex];
  const prevDisabled = currentIndex === 0 ? 'disabled' : '';
  const saved = userAnswers[currentIndex] || '';

  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-audio-feedback" style="display:flex;align-items:center;gap:.5rem;margin:.5rem 0;">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word"><i class="fas fa-redo"></i></button>
      <span id="word-status"></span>
    </div>
    <div class="input-wrapper">
      <input type="text" id="user-input" class="form-control"
        placeholder="Type what you heard..." autofocus value="${saved}">
    </div>
    <div class="button-group" style="display:flex;gap:.5rem;margin-top:.5rem;">
      <button id="prev-btn" class="btn btn-secondary" ${prevDisabled}><i class="fas fa-arrow-left"></i> Previous</button>
      <button id="check-btn" class="btn btn-primary"><i class="fas fa-check"></i> Check</button>
      <button id="next-btn" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Next</button>
      <button id="flagWordBtn" class="btn-icon" title="Flag"><i class="far fa-flag"></i></button>
    </div>
    <div id="feedback" class="feedback" style="min-height:1.25rem;margin-top:.5rem;"></div>
  `;

  $('#repeat-btn')?.addEventListener('click', typedSpeakCurrentWord);
  $('#prev-btn')?.addEventListener('click', () => { if (currentIndex>0){ currentIndex--; typedShowCurrentWord(); setTimeout(typedSpeakCurrentWord,150);} });
  $('#next-btn')?.addEventListener('click', () => typedNextWord());
  $('#check-btn')?.addEventListener('click', () => typedCheckAnswer(word));
  $('#user-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') typedCheckAnswer(word); });

  // Track per-session flagged
  $('#flagWordBtn')?.addEventListener('click', () => {
    (window.toggleFlagWord || noop)(word);
    if (sessionFlagged.has(word)) sessionFlagged.delete(word); else sessionFlagged.add(word);
  });

  wordStartTime = Date.now();
}

function typedSpeakCurrentWord() {
  const word = words[currentIndex]; if (!word) return;
  speakOut(word, accent, 0.97, () => {
    const input = $('#user-input');
    if (input) { input.focus(); input.select(); }
  });
}

function typedCheckAnswer(correctWord) {
  const inputEl = $('#user-input'); if (!inputEl) return;
  const userVal = (inputEl.value || '').trim();
  if (!userVal) { alertSafe('Please type the word first!', 'error'); return; }

  userAnswers[currentIndex] = userVal;
  const isCorrect = userVal.toLowerCase() === String(correctWord).toLowerCase();

  // Track buckets (dedup)
  const lower = String(correctWord).toLowerCase();
  const removeFrom = isCorrect ? incorrectWords : correctWords;
  const addTo = isCorrect ? correctWords : incorrectWords;
  const idx = removeFrom.findIndex(w => w.toLowerCase() === lower);
  if (idx >= 0) removeFrom.splice(idx,1);
  if (!addTo.find(w => w.toLowerCase() === lower)) addTo.push(correctWord);

  const feedback = $('#feedback');
  if (isCorrect) { score++; feedback.textContent = '✓ Correct!'; feedback.className = 'feedback correct'; inputEl.classList.add('correct-input'); }
  else { feedback.textContent = `✗ Incorrect. The correct spelling was: ${correctWord}`; feedback.className = 'feedback incorrect'; inputEl.classList.add('incorrect-input'); }

  const timeSpent = Date.now() - wordStartTime;
  logEvent('word_attempt', { word: correctWord, status: isCorrect ? 'correct' : 'incorrect', time_ms: timeSpent, accent, examType, mode: sessionMode });

  setTimeout(() => typedNextWord(), 1100);
}

function typedNextWord() {
  if (currentIndex < words.length - 1) { currentIndex++; typedShowCurrentWord(); setTimeout(() => typedSpeakCurrentWord(), 150); }
  else { showSummary(); }
}

/* ====================== BEE TRAINER (VOICE-ONLY) ====================== */
function startBeeVoiceTrainer() {
  if (!trainerArea) return;
  if (!speechSupported()) {
    alertSafe('Spelling Bee requires voice input. Please use a browser that supports SpeechRecognition (Chrome/Edge) and allow mic access.', 'error', 6000);
    return;
  }
  currentIndex = 0; score = 0; userAnswers = [];
  sessionStartTime = Date.now();
  trainerArea.classList.remove('hidden');
  summaryArea?.classList.add('hidden');
  beePlayCurrentWord();
}

function beePlayCurrentWord() {
  if (currentIndex >= words.length) { showSummary(); return; }
  beeRenderUI();
  const w = words[currentIndex];
  setTimeout(() => { speakOut(w, accent, 0.88); setTimeout(() => beeStartRecognition(), 300); }, 200);
}

function beeRenderUI() {
  const w = words[currentIndex];
  const prevDisabled = currentIndex === 0 ? 'disabled' : '';
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>

    <div id="spelling-visual" aria-live="polite" class="spelling-visual"
         style="min-height:2rem;padding:.5rem;border:1px dashed #ccc;border-radius:8px;margin:.25rem 0;">
      <em>Listening… spell the word letter by letter.</em>
    </div>

    <div id="mic-status" class="feedback" style="margin:.25rem 0; color: #6c757d;">
      <i class="fas fa-microphone"></i> Ready
    </div>

    <div class="button-group" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;">
      <button id="prev-btn" class="btn btn-secondary" ${prevDisabled}><i class="fas fa-arrow-left"></i> Previous</button>
      <button id="repeat-btn" class="btn btn-secondary"><i class="fas fa-redo"></i> Repeat Word</button>
      <button id="skip-btn" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Skip</button>
      <button id="toggle-mic-btn" class="btn btn-primary"><i class="fas fa-microphone"></i> ${isListening ? 'Stop' : 'Start'} Listening</button>
      <button id="flagWordBtn" class="btn-icon" title="Flag"><i class="far fa-flag"></i></button>
    </div>

    <div id="bee-feedback" class="feedback" style="min-height:1.25rem;margin-top:.5rem;"></div>
  `;

  $('#prev-btn')?.addEventListener('click', () => { if (currentIndex>0){ currentIndex--; beePlayCurrentWord(); }});
  $('#repeat-btn')?.addEventListener('click', () => speakOut(w, accent, 0.88));
  $('#skip-btn')?.addEventListener('click', () => beeNextWord());
  $('#toggle-mic-btn')?.addEventListener('click', () => { isListening ? beeStopRecognition() : beeStartRecognition(); });
  $('#flagWordBtn')?.addEventListener('click', () => {
    (window.toggleFlagWord || noop)(w);
    if (sessionFlagged.has(w)) sessionFlagged.delete(w); else sessionFlagged.add(w);
  });

  beeAttachKeys();
  wordStartTime = Date.now();
}

function beeAttachKeys() {
  beeDetachKeys();
  beeKeyHandlerRef = function(e) {
    if (examType !== 'Bee') return;
    if (e.key === ' ') { e.preventDefault(); speakOut(words[currentIndex], accent, 0.88); }
    if (e.key === 'ArrowRight') { beeNextWord(); }
    if (e.key === 'ArrowLeft' && currentIndex > 0) { currentIndex--; beePlayCurrentWord(); }
  };
  document.addEventListener('keydown', beeKeyHandlerRef);
}

function beeDetachKeys() {
  if (beeKeyHandlerRef) {
    document.removeEventListener('keydown', beeKeyHandlerRef);
    beeKeyHandlerRef = null;
  }
}

function beeStartRecognition() {
  try {
    beeStopRecognition(true);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = accent;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    isListening = true;
    $('#mic-status').innerHTML = `<i class="fas fa-microphone"></i> Listening…`;
    $('#toggle-mic-btn') && ($('#toggle-mic-btn').innerHTML = `<i class="fas fa-microphone-slash"></i> Stop Listening`);

    let interimLetters = '';
    recognition.onresult = (event) => {
      const transcripts = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcripts.push(event.results[i][0].transcript);
      }
      const combined = transcripts.join(' ').trim();
      interimLetters = parseSpelledLetters(combined).toUpperCase();
      $('#spelling-visual').textContent = interimLetters || combined;
    };

    recognition.onerror = (e) => {
      console.warn('Speech error:', e.error);
      $('#mic-status').innerHTML = `<i class="fas fa-microphone-slash"></i> ${e.error}`;
    };

    recognition.onend = () => {
      isListening = false;
      $('#toggle-mic-btn') && ($('#toggle-mic-btn').innerHTML = `<i class="fas fa-microphone"></i> Start Listening`);
      $('#mic-status').innerHTML = `<i class="fas fa-info-circle"></i> Processing…`;
      const attempt = (typeof interimLetters === 'string' ? interimLetters : '').trim();
      beeGradeAttempt(attempt);
    };

    recognition.start();
  } catch (err) {
    console.error('Recognition start failed:', err);
    alertSafe('Mic failed to start. Check browser permissions.', 'error', 4000);
  }
}

function beeStopRecognition(silent=false) {
  if (recognition) {
    try { recognition.onend = null; recognition.stop(); } catch(e){}
    recognition = null;
  }
  isListening = false;
  if (!silent) {
    $('#mic-status').innerHTML = `<i class="fas fa-microphone-slash"></i> Stopped`;
    $('#toggle-mic-btn') && ($('#toggle-mic-btn').innerHTML = `<i class="fas fa-microphone"></i> Start Listening`);
  }
}

function beeGradeAttempt(spelled) {
  const correct = String(words[currentIndex] || '').toLowerCase().replace(/[^a-z]/g,'');
  const normalized = (spelled || '').toLowerCase().replace(/[^a-z]/g, '');
  const isCorrect = normalized === correct;

  // Track buckets (dedup)
  const lower = String(words[currentIndex]).toLowerCase();
  const removeFrom = isCorrect ? incorrectWords : correctWords;
  const addTo = isCorrect ? correctWords : incorrectWords;
  const idx = removeFrom.findIndex(w => w.toLowerCase() === lower);
  if (idx >= 0) removeFrom.splice(idx,1);
  if (!addTo.find(w => w.toLowerCase() === lower)) addTo.push(words[currentIndex]);

  const feedback = $('#bee-feedback');
  if (isCorrect) {
    score++;
    feedback.textContent = '✓ Correct!';
    feedback.className = 'feedback correct';
  } else {
    feedback.textContent = `✗ Incorrect. You said: ${spelled || '(nothing)'} — Correct: ${words[currentIndex]}`;
    feedback.className = 'feedback incorrect';
  }

  const timeSpent = Date.now() - wordStartTime;
  logEvent('word_attempt', { word: words[currentIndex], status: isCorrect ? 'correct' : 'incorrect', time_ms: timeSpent, accent, examType, mode: sessionMode });

  setTimeout(() => beeNextWord(), 1200);
}

function beeNextWord() {
  beeStopRecognition(true);
  if (currentIndex < words.length - 1) { currentIndex++; beePlayCurrentWord(); }
  else { showSummary(); }
}

function beeCleanup() {
  beeStopRecognition(true);
  beeDetachKeys();
}

/* ---------- Spelled letter parsing ---------- */
const LETTER_SYNONYMS = {
  a:['a','ay','eh','ei'], b:['b','bee','be'], c:['c','see','sea','cee'],
  d:['d','dee'], e:['e','ee','ea'], f:['f','ef'],
  g:['g','gee','ji'], h:['h','aitch','h'],
  i:['i','eye','ai'], j:['j','jay'], k:['k','kay','kei'],
  l:['l','el'], m:['m','em'], n:['n','en'], o:['o','oh'],
  p:['p','pee','pea'], q:['q','cue','queue'], r:['r','ar'],
  s:['s','ess'], t:['t','tee','tea'], u:['u','you','yu','yew'],
  v:['v','vee'], w:['w','doubleu','double-u','double you','doubleyou'],
  x:['x','ex'], y:['y','why'], z:['z','zee','zed']
};

function normalizeToken(t){
  return t.toLowerCase().replace(/[^a-z]/g,'').trim();
}

function parseSpelledLetters(transcript) {
  if (!transcript) return '';
  const raw = transcript.toLowerCase();
  const pre = raw.replace(/\bdouble\s+you\b/g, 'doubleyou');

  const tokens = pre.split(/\s+/).map(normalizeToken).filter(Boolean);
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok === 'double' || tok === 'triple') {
      const next = tokens[i+1] || '';
      const letter = tokenToLetter(next);
      if (letter) {
        const times = tok === 'double' ? 2 : 3;
        out += letter.repeat(times);
        i++;
        continue;
      }
    }

    const letter = tokenToLetter(tok);
    if (letter) { out += letter; continue; }

    if (tok.length === 1 && tok >= 'a' && tok <= 'z') {
      out += tok;
    }
  }
  return out;
}

function tokenToLetter(tok){
  for (const [letter, names] of Object.entries(LETTER_SYNONYMS)) {
    if (tok === letter) return letter;
    if (names.includes(tok)) return letter;
  }
  return null;
}

/* ====================== Speak & Summary ====================== */
function speakOut(word, lang='en-US', rate=0.97, onEnd) {
  if (!('speechSynthesis' in window)) { alertSafe('Text-to-speech not supported in this browser.', 'error'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang; u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(x => x.lang === lang) || voices.find(x => x.lang.startsWith(lang.split('-')[0]));
  if (v) u.voice = v;
  if (typeof onEnd === 'function') u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function showSummary() {
  beeCleanup();
  trainerArea?.classList.add('hidden');
  summaryArea?.classList.remove('hidden');

  const accuracy = words.length ? Math.round((score / words.length) * 100) : 0;
  const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
  logEvent('session_completed', {
    session_id: sessionId,
    exam_type: examType,
    mode: sessionMode,
    word_count: words.length,
    score,
    accuracy,
    duration_s: durationSec
  });

  // Build lists
  const li = (w) => `<li>${w}</li>`;
  const correctList   = correctWords.length   ? `<ul>${correctWords.map(li).join('')}</ul>` : '<em>None</em>';
  const reviewList    = incorrectWords.length ? `<ul>${incorrectWords.map(li).join('')}</ul>` : '<em>None</em>';
  const flaggedArray  = Array.from(sessionFlagged);
  const flaggedList   = flaggedArray.length   ? `<ul>${flaggedArray.map(li).join('')}</ul>` : '<em>None</em>';

  summaryArea.innerHTML = `
    <div class="summary-card">
      <h3>Session Summary</h3>
      <p><strong>Score:</strong> ${score} / ${words.length} (${accuracy}%)</p>
      <p><strong>Duration:</strong> ${durationSec}s</p>

      <div class="summary-columns" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:10px;">
        <div><h4>✅ Correct</h4>${correctList}</div>
        <div><h4>🟡 Needs Review</h4>${reviewList}</div>
        <div><h4>⭐ Flagged</h4>${flaggedList}</div>
      </div>

      <div style="margin-top:12px; display:flex; gap:.5rem; flex-wrap:wrap;">
        <button id="review-incorrect-btn" class="btn btn-primary" ${incorrectWords.length? '' : 'disabled'}><i class="fas fa-redo"></i> Review Incorrect</button>
        <button id="review-flagged-btn" class="btn btn-secondary" ${flaggedArray.length? '' : 'disabled'}><i class="fas fa-flag"></i> Review Flagged</button>
        <button id="back-btn" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Back</button>
      </div>
    </div>
  `;

  $('#review-incorrect-btn')?.addEventListener('click', () => {
    if (!incorrectWords.length) return;
    words = incorrectWords.slice();
    currentIndex = 0; score = 0; userAnswers = [];
    correctWords = []; incorrectWords = []; sessionFlagged = new Set();
    summaryArea?.classList.add('hidden');
    trainerArea?.classList.remove('hidden');
    examType === 'Bee' ? beePlayCurrentWord() : (typedShowCurrentWord(), setTimeout(() => typedSpeakCurrentWord(), 150));
  });

  $('#review-flagged-btn')?.addEventListener('click', () => {
    const arr = Array.from(sessionFlagged);
    if (!arr.length) return;
    words = arr.slice();
    currentIndex = 0; score = 0; userAnswers = [];
    correctWords = []; incorrectWords = []; sessionFlagged = new Set();
    summaryArea?.classList.add('hidden');
    trainerArea?.classList.remove('hidden');
    examType === 'Bee' ? beePlayCurrentWord() : (typedShowCurrentWord(), setTimeout(() => typedSpeakCurrentWord(), 150));
  });

  $('#back-btn')?.addEventListener('click', () => {
    trainerArea?.classList.add('hidden');
    summaryArea?.classList.add('hidden');
    renderExamUI();
  });
}

/* ---------- Helpers ---------- */
function processWordList(text) {
  return [...new Set(
    String(text || '')
      .replace(/\r/g, '')
      .split(/[\n,;|\/\-–—\t]+/)
      .map(w => w.trim())
      .filter(w => w && w.length > 1)
  )];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
