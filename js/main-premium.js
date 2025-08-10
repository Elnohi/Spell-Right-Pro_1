/* main-premium.js — Premium app (classic script, no modules)
   - Creates/repairs /users/<uid> on login (ensureUserDoc)
   - Checks premium/trial status safely
   - Uses Stripe publishable key from stripeConfig.publicKey
   - Calls backend `${appConfig.apiBaseUrl}/create-checkout-session`
   - Minimal, robust practice/test flows for OET / Bee / Custom
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
let flaggedWords = [];
let sessionStartTime = null;
let wordStartTime = null;
let stripe = null;

const sessionId = 'sess_' + Math.random().toString(36).slice(2, 10);

/* ====================== DOM References ====================== */
const authArea      = document.getElementById('auth-area');
const premiumApp    = document.getElementById('premium-app');
const examUI        = document.getElementById('exam-ui');
const trainerArea   = document.getElementById('trainer-area');
const summaryArea   = document.getElementById('summary-area');
const appTitle      = document.getElementById('app-title');
const darkToggleBtn = document.getElementById('dark-mode-toggle');

/* ====================== Utilities / Guards ====================== */
function noop() {}
function logEvent(name, params) { try { (window.trackEvent || noop)(name, params || {}); } catch(_){} }
function logError(err, ctx)     { try { (window.trackError || noop)(err, ctx || {}); } catch(_){} }
function alertSafe(msg, type='error', ms=3000) {
  if (typeof window.showAlert === 'function') window.showAlert(msg, type, ms);
  else alert(msg);
}
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

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
  if (!window.Stripe) {
    console.warn('Stripe.js not loaded yet.');
    return;
  }

  // Try lexical global first, then window
  const key =
    (typeof stripeConfig !== 'undefined' && stripeConfig && stripeConfig.publicKey) ||
    (window.stripeConfig && window.stripeConfig.publicKey) ||
    '';

  if (!/^pk_(test|live)_/.test(key)) {
    console.warn('Stripe publishable key missing or invalid. Check js/config.js');
    return; // IMPORTANT: don’t call Stripe('') or you’ll get the IntegrationError
  }

  stripe = Stripe(key);
}

/* ---------- Theme ---------- */
function initDarkMode() {
  if (typeof window.initThemeToggle === 'function') {
    window.initThemeToggle();
    return;
  }
  // Fallback: simple toggle
  if (darkToggleBtn) {
    const apply = (isDark) => {
      document.body.classList.toggle('dark-mode', isDark);
      localStorage.setItem('darkMode', isDark);
      const icon = darkToggleBtn.querySelector('i');
      if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    };
    darkToggleBtn.addEventListener('click', () => {
      apply(!document.body.classList.contains('dark-mode'));
    });
    apply(localStorage.getItem('darkMode') === 'true');
  }
}

/* ---------- Voices ---------- */
let voicesReady = false;
function loadVoices() {
  function handle() {
    voicesReady = true;
    window.speechSynthesis.onvoiceschanged = null;
  }
  if ('speechSynthesis' in window) {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length) handle();
    else window.speechSynthesis.onvoiceschanged = handle;
  }
}

/* ---------- Payment success flag ---------- */
function checkUrlForPaymentStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('payment_success')) {
    alertSafe('🎉 Premium subscription activated!', 'success', 4000);
    window.history.replaceState({}, '', window.location.pathname);
    // On next initAuthState(), checkPremiumStatus will reflect premium
    setTimeout(() => location.reload(), 400);
  }
}

/* ====================== Firestore: user doc & premium ====================== */
async function ensureUserDoc(user, trialDays = 7) {
  const ref = firebase.firestore().collection('users').doc(user.uid);
  let snap;
  try {
    snap = await ref.get();
  } catch (err) {
    console.error('Failed to read user doc:', err);
    alertSafe('Could not access your profile. Check Firestore rules.', 'error', 5000);
    throw err;
  }

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

  // Backfill/repair
  const data = snap.data() || {};
  const updates = {};
  if (typeof data.isPremium !== 'boolean') updates.isPremium = false;
  const isTimestamp = data.trialEndsAt && typeof data.trialEndsAt.toDate === 'function';
  if (!isTimestamp) updates.trialEndsAt = trialEndsAtTS;
  if (!data.email) updates.email = user.email || '';
  if (Object.keys(updates).length) {
    try {
      await ref.set(updates, { merge: true });
    } catch (err) {
      console.error('Failed to update user doc:', err);
      alertSafe('Could not update your profile. Please try again.', 'error', 5000);
      throw err;
    }
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

     // === Ensure /users/<uid> exists and fields have correct types ===
async function ensureUserDoc(user, trialDays = 7) {
  const ref = firebase.firestore().collection('users').doc(user.uid);
  let snap;

  try {
    snap = await ref.get();
  } catch (err) {
    console.error('Failed to read user doc:', err);
    showAlert && showAlert('Could not access your profile. Check Firestore rules.', 'error', 5000);
    throw err;
  }

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
      showAlert && showAlert('Could not create your profile. Please try again.', 'error', 5000);
      throw err;
    }
  }

  // backfill/repair types if needed
  const data = snap.data() || {};
  const updates = {};
  if (typeof data.isPremium !== 'boolean') updates.isPremium = false;
  const isTimestamp = data.trialEndsAt && typeof data.trialEndsAt.toDate === 'function';
  if (!isTimestamp) updates.trialEndsAt = trialEndsAtTS;
  if (!data.email) updates.email = user.email || '';
  if (Object.keys(updates).length) {
    try {
      await ref.set(updates, { merge: true });
    } catch (err) {
      console.error('Failed to update user doc:', err);
      showAlert && showAlert('Could not update your profile. Please try again.', 'error', 5000);
      throw err;
    }
  }
}

    // Hide ads for premium
    if (premiumUser) {
      document.querySelectorAll('.ad-container').forEach(el => el.style.display = 'none');
    }
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

    if (!user) {
      renderAuth();         // your existing "logged out" UI
      return;
    }

    try {
      // NEW: guarantee the user document exists/types are correct
      await ensureUserDoc(user, (window.appConfig && appConfig.trialDays) || 7);

      // then your existing flow
      await checkPremiumStatus();
      renderAuth();
      if (premiumUser) {
        renderExamUI();
      } else {
        showPremiumUpsell();
      }
    } catch (err) {
      console.error('Auth init error:', err);
      showAlert && showAlert('We could not load your premium status. Please try again.', 'error', 4500);
      renderAuth(); // at least show header/logout so user isn't stuck
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
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    logEvent('login_success');
  } catch (error) {
    alertSafe(error.message, 'error');
    logError(error, { context: 'login' });
  }
}

async function handleSignup() {
  const email = $('#email')?.value || '';
  const password = $('#password')?.value || '';
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    // Seed a basic doc (ensureUserDoc will convert types)
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
    alertSafe(error.message, 'error');
    logError(error, { context: 'signup' });
  }
}

function handleLogout() {
  firebase.auth().signOut();
  logEvent('user_logout');
}

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
  // (Optional) price localization could be added here; omitted for simplicity.
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
  $('#exam-type')?.addEventListener('change', (e)=>{ examType = e.target.value; });
  $('#accent-select')?.addEventListener('change', (e)=>{ accent = e.target.value; });

  // Custom list (textarea + file)
  let customWordList = [];
  let useCustomList = false;

  $('#word-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
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

  $('#start-btn')?.addEventListener('click', () => {
    summaryArea.innerHTML = '';
    appTitle.textContent = (examType === 'OET') ? 'OET Spelling Practice'
                      : (examType === 'Bee') ? 'Spelling Bee Practice'
                      : 'Custom Spelling Practice';

    if (examType === 'Custom' && useCustomList && customWordList.length) {
      words = customWordList.slice();
      startTrainer();
      return;
    }

    if (examType === 'OET') {
      const base = Array.isArray(window.oetWords) ? window.oetWords.slice() : [];
      words = (sessionMode === 'test') ? shuffle(base).slice(0, 24) : base;
      startTrainer();
      return;
    }

    if (examType === 'Bee') {
      const beeDefaults = [
        "accommodate","belligerent","conscientious","disastrous","embarrass","foreign","guarantee","harass",
        "interrupt","jealous","knowledge","liaison","millennium","necessary","occasionally","possession",
        "questionnaire","rhythm","separate","tomorrow","unforeseen","vacuum","withhold","yacht"
      ];
      words = (sessionMode === 'test') ? shuffle(beeDefaults).slice(0, 24) : beeDefaults.slice();
      startTrainer();
      return;
    }

    alertSafe('No word list available.', 'error');
  });
}

/* ---------- Trainer core ---------- */
function startTrainer() {
  if (!trainerArea) return;
  currentIndex = 0;
  score = 0;
  userAnswers = [];
  sessionStartTime = Date.now();
  trainerArea.classList.remove('hidden');
  summaryArea?.classList.add('hidden');
  showCurrentWord();
  // slight delay before first speak
  setTimeout(() => speakCurrentWord(), 300);
}

function showCurrentWord() {
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

  $('#repeat-btn')?.addEventListener('click', speakCurrentWord);
  $('#prev-btn')?.addEventListener('click', () => { if (currentIndex>0){ currentIndex--; showCurrentWord(); setTimeout(speakCurrentWord,150);} });
  $('#next-btn')?.addEventListener('click', () => nextWord());
  $('#check-btn')?.addEventListener('click', () => checkAnswer(word));
  $('#user-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkAnswer(word); });

  $('#flagWordBtn')?.addEventListener('click', () => {
    (window.toggleFlagWord || noop)(word);
  });

  wordStartTime = Date.now();
}

function speakCurrentWord() {
  const word = words[currentIndex];
  if (!word) return;
  if (!('speechSynthesis' in window)) { alertSafe('Text-to-speech not supported in this browser.', 'error'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = accent;
  u.rate = 0.97;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(x => x.lang === accent) || voices.find(x => x.lang.startsWith(accent.split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

function checkAnswer(correctWord) {
  const inputEl = $('#user-input');
  if (!inputEl) return;
  const userVal = (inputEl.value || '').trim();
  if (!userVal) { alertSafe('Please type the word first!', 'error'); return; }

  userAnswers[currentIndex] = userVal;
  const isCorrect = userVal.toLowerCase() === String(correctWord).toLowerCase();
  const feedback = $('#feedback');

  if (isCorrect) {
    score++;
    feedback.textContent = '✓ Correct!';
    feedback.className = 'feedback correct';
    inputEl.classList.add('correct-input');
  } else {
    feedback.textContent = `✗ Incorrect. The correct spelling was: ${correctWord}`;
    feedback.className = 'feedback incorrect';
    inputEl.classList.add('incorrect-input');
  }

  const timeSpent = Date.now() - wordStartTime;
  logEvent('word_attempt', { word: correctWord, status: isCorrect ? 'correct' : 'incorrect', time_ms: timeSpent, accent, examType, mode: sessionMode });

  // Auto-next after a short delay
  setTimeout(() => nextWord(), 1100);
}

function nextWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showCurrentWord();
    setTimeout(() => speakCurrentWord(), 150);
  } else {
    showSummary();
  }
}

function showSummary() {
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

  summaryArea.innerHTML = `
    <div class="summary-card">
      <h3>Session Summary</h3>
      <p><strong>Score:</strong> ${score} / ${words.length} (${accuracy}%)</p>
      <p><strong>Duration:</strong> ${durationSec}s</p>
      <div style="margin-top:10px; display:flex; gap:.5rem; flex-wrap:wrap;">
        <button id="restart-btn" class="btn btn-primary"><i class="fas fa-redo"></i> Restart Same List</button>
        <button id="back-btn" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Back</button>
      </div>
    </div>
  `;

  $('#restart-btn')?.addEventListener('click', () => {
    currentIndex = 0; score = 0; userAnswers = [];
    trainerArea?.classList.remove('hidden');
    summaryArea?.classList.add('hidden');
    showCurrentWord();
    setTimeout(() => speakCurrentWord(), 200);
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
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


