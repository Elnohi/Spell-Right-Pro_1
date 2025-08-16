// main-premium.js — Premium app (no trial) + Stripe checkout

/* ==================== GLOBAL STATE ==================== */
let currentUser = null;
let premiumUser = false;

let examType = "OET";          // "OET" | "Bee" | "Custom"
let accent = "en-US";          // "en-US" | "en-GB" | "en-AU"
let sessionMode = "practice";  // "practice" | "test"

let words = [];
let currentIndex = 0;
let score = 0;
let userAnswers = [];
let flaggedWordsStore = JSON.parse(localStorage.getItem('flaggedWords') || '[]');

const sessionId = 'sess_' + Math.random().toString(36).slice(2, 9);
let stripe = null;
let autoCheckoutAttempted = false;

/* ==================== DOM REFS ==================== */
const authArea       = document.getElementById('auth-area');
const premiumApp     = document.getElementById('premium-app');
const examUI         = document.getElementById('exam-ui');
const trainerArea    = document.getElementById('trainer-area');
const summaryArea    = document.getElementById('summary-area');
const appTitle       = document.getElementById('app-title');
const darkModeToggle = document.getElementById('dark-mode-toggle');

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
  initStripe();
  initDarkMode();
  initAuthState();
  loadVoices();
  checkUrlForPaymentStatus();
});

/* ==================== STRIPE ==================== */
function initStripe() {
  if (!window.Stripe) { console.warn('Stripe.js not loaded yet.'); return; }
  const key = (window.stripeConfig && window.stripeConfig.publicKey) || '';
  if (!/^pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRaV0GPvg004IIcPfC8) {
    console.warn('Stripe publishable key missing/invalid.');
    return;
  }
  stripe = Stripe(key);
}

/* ==================== ADS ==================== */
function loadAutoAdsOnce() {
  if (window.__adsLoaded) return;
  const client = (window.appConfig && window.appConfig.adClient) || 'ca-pub-7632930282249669';
  const s = document.createElement('script');
  s.async = true;
  s.id = 'auto-ads-script';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
  window.__adsLoaded = true;
}
function disableAutoAdsNow() {
  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.pauseAdRequests = 1;
  } catch (_) {}
  if (!document.getElementById('premium-no-ads-style')) {
    const st = document.createElement('style');
    st.id = 'premium-no-ads-style';
    st.textContent = `
      .google-auto-placed, ins.adsbygoogle, .ad-container { display:none!important; }
      [id^="google_ads_iframe_"], #google_vignette, #google_anchor_container {
        display:none!important; visibility:hidden!important;
      }
    `;
    document.head.appendChild(st);
  }
  document.querySelectorAll('.ad-container').forEach(el => el.style.display = 'none');
}

/* ==================== DARK MODE ==================== */
function initDarkMode() {
  const saved = localStorage.getItem('premium_darkMode') === 'true';
  document.body.classList.toggle('dark-mode', saved);
  const icon = darkModeToggle?.querySelector('i');
  if (icon) icon.className = saved ? 'fas fa-sun' : 'fas fa-moon';
  darkModeToggle?.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('premium_darkMode', isDark);
    const i = darkModeToggle.querySelector('i');
    if (i) i.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  });
}

/* ==================== VOICES ==================== */
let voicesReady = false;
function loadVoices() {
  function onVoices() { voicesReady = true; window.speechSynthesis.onvoiceschanged = null; }
  if ('speechSynthesis' in window) {
    if (window.speechSynthesis.getVoices().length) onVoices();
    else window.speechSynthesis.onvoiceschanged = onVoices;
  }
}
function speakOut(text, rate = 0.95, onEnd) {
  if (!('speechSynthesis' in window)) { showAlert('Text-to-speech not supported.', 'error'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = accent; u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(x => x.lang === accent) || voices.find(x => x.lang.startsWith(accent.split('-')[0]));
  if (v) u.voice = v;
  if (typeof onEnd === 'function') u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

/* ==================== URL PAYMENT FLAG ==================== */
function checkUrlForPaymentStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('payment_success')) {
    try { disableAutoAdsNow(); } catch(_) {}
    showAlert('🎉 Premium subscription activated!', 'success');
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => location.reload(), 400);
  }
}

/* ==================== FIRESTORE & PREMIUM ==================== */
async function ensureUserDoc(user) {
  const ref = firebase.firestore().collection('users').doc(user.uid);
  let snap;
  try { snap = await ref.get(); }
  catch (err) { console.error(err); showAlert('Could not access your profile.', 'error', 5000); throw err; }
  if (!snap.exists) {
    await ref.set({
      email: user.email || '',
      isPremium: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return;
  }
  const data = snap.data() || {};
  const updates = {};
  if (typeof data.isPremium !== 'boolean') updates.isPremium = false;
  if (!data.email) updates.email = user.email || '';
  if (Object.keys(updates).length) await ref.set(updates, { merge: true });
}

async function checkPremiumStatus() {
  if (!currentUser) return false;
  try {
    const snap = await firebase.firestore().collection('users').doc(currentUser.uid).get();
    if (!snap.exists) return false;
    const data = snap.data();
    premiumUser = data.isPremium === true;
    if (premiumUser) disableAutoAdsNow(); else loadAutoAdsOnce();
    return premiumUser;
  } catch (e) {
    console.error('Premium check error:', e);
    return false;
  }
}

/* ==================== AUTH ==================== */
function initAuthState() {
  firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (!user) {
      renderAuthLoggedOut();
      loadAutoAdsOnce();
      return;
    }
    await ensureUserDoc(user);
    await checkPremiumStatus();
    renderAuthLoggedIn();

    if (premiumUser) {
      renderExamUI();
    } else {
      showPremiumUpsell();
      if (!autoCheckoutAttempted) {
        autoCheckoutAttempted = true;
        setTimeout(() => initiatePayment('monthly').catch(console.error), 250);
      }
    }
  });
}

function renderAuthLoggedOut() {
  authArea.innerHTML = `
    <div class="auth-form">
      <input type="email" id="email" placeholder="Email" class="form-control">
      <input type="password" id="password" placeholder="Password" class="form-control">
      <button id="login-btn"  class="btn btn-primary">Login</button>
      <button id="signup-btn" class="btn btn-outline">Sign Up</button>
    </div>
  `;
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('signup-btn')?.addEventListener('click', handleSignup);
  premiumApp.classList.add('hidden');
}
function renderAuthLoggedIn() {
  authArea.innerHTML = `
    <div class="user-info">
      <span>${currentUser?.email || ''}</span>
      ${premiumUser ? '<span class="premium-badge"><i class="fas fa-crown"></i> Premium</span>' : ''}
      <button id="logout-btn" class="btn btn-sm btn-outline"><i class="fas fa-sign-out-alt"></i> Logout</button>
    </div>`;
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  premiumApp.classList.remove('hidden');
}

async function handleLogin() {
  const email = document.getElementById('email')?.value || '';
  const password = document.getElementById('password')?.value || '';
  try { await firebase.auth().signInWithEmailAndPassword(email, password); }
  catch (e) { showAlert(e.message, 'error'); }
}
async function handleSignup() {
  const email = document.getElementById('email')?.value || '';
  const password = document.getElementById('password')?.value || '';
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    await ensureUserDoc(cred.user);
    showAlert('Account created. Redirecting to checkout…', 'success', 2500);
  } catch (e) { showAlert(e.message, 'error'); }
}
function handleLogout() { firebase.auth().signOut(); }

/* ==================== PAYMENTS (single, correct version) ==================== */
const priceMap = {
  monthly: 'price_1RuZVNEl99zwdEZrit75tV1F', // CAD 7.99
  annual:  'price_1RuZR3El99zwdEZrgqiGz1FL'  // CAD 79.99
};

async function initiatePayment(planType) {
  if (!currentUser) { showAlert('Please log in first.', 'error'); return; }

  const normalizedPlan = (planType || '').trim().toLowerCase();
  const priceId = priceMap[normalizedPlan];
  if (!priceId) { showAlert(`Unknown plan: ${normalizedPlan}`, 'error'); return; }

  const base = (window.appConfig && window.appConfig.apiBaseUrl) || '';
  if (!base) { showAlert('Backend URL missing in config.js', 'error'); return; }

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch(`${base}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        plan: normalizedPlan,
        priceId,       // backend now accepts this too (see server.js)
        userId: currentUser.uid,
        sessionId
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);

    if (data.url) { window.location.href = data.url; return; }
    if (data.sessionId) {
      if (!stripe) initStripe();
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (error) throw error;
      return;
    }
    throw new Error('Invalid server response (expected `url` or `sessionId`).');
  } catch (err) {
    console.error('Payment initiation error:', err);
    showAlert(`Payment failed: ${err.message}`, 'error', 6000);
  }
}

/* ==================== UPSELL ==================== */
function showPremiumUpsell() {
  trainerArea.classList.remove('hidden');
  summaryArea.classList.add('hidden');
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
          <div class="price">$7.99/mo</div>
          <button id="monthly-btn" class="btn btn-primary">Subscribe</button>
        </div>
        <div class="pricing-option recommended">
          <div class="badge">Best Value</div>
          <h3>Annual</h3>
          <div class="price">$79.99/yr</div>
          <div class="savings">Save 15%</div>
          <button id="annual-btn" class="btn btn-primary">Subscribe</button>
        </div>
      </div>
      <p style="margin-top:.5rem;color:var(--gray)">You’ll be redirected to secure Stripe Checkout.</p>
    </div>`;
  document.getElementById('monthly-btn')?.addEventListener('click', () => initiatePayment('monthly'));
  document.getElementById('annual-btn')?.addEventListener('click', () => initiatePayment('annual'));
  loadAutoAdsOnce();
}

/* ==================== UTILITIES ==================== */
function isTypingField(el){ if(!el) return false; const t=(el.tagName||'').toLowerCase(); return t==='input'||t==='textarea'||el.isContentEditable===true; }
function processWordList(text){
  return [...new Set(String(text||'').replace(/\r/g,'').split(/[\n,;|\/\-–—\t]+/).map(w=>w.trim()).filter(w=>w&&w.length>1))];
}
function toggleFlagWord(word, options={}) {
  if (!word) return;
  const idx = flaggedWordsStore.indexOf(word);
  if (idx === -1) flaggedWordsStore.push(word); else flaggedWordsStore.splice(idx,1);
  localStorage.setItem('flaggedWords', JSON.stringify(flaggedWordsStore));
  if (options.updateUI !== false) {
    const flagBtn = document.getElementById('flagWordBtn');
    if (flagBtn) {
      const active = flaggedWordsStore.includes(word);
      flagBtn.classList.toggle('active', active);
      flagBtn.innerHTML = active ? '<i class="fas fa-flag"></i> Flagged' : '<i class="far fa-flag"></i> Flag';
    }
  }
}
function showAlert(message, type='error', duration=3000) {
  const fn = (window && window.showAlert) || null;
  if (fn && fn !== showAlert && typeof fn === 'function') return fn(message, type, duration);
  console[type === 'error' ? 'error' : 'log'](message);
}

/* ==================== EXAM UI (shared) ==================== */
function renderExamUI() {
  const uploadAreaHTML = `
    <textarea id="custom-words" class="form-control" rows="3"
      placeholder="Enter words (comma/newline separated), or leave blank to use default list."></textarea>
    <input type="file" id="word-file" accept=".txt,.csv" class="form-control" style="margin-top:5px;">
    <button id="add-custom-btn" class="btn btn-info" style="margin-top:7px;">
      <i class="fas fa-plus-circle"></i> Use This List
    </button>
    <div id="upload-info" class="upload-info" style="margin-top:6px;font-size:0.95em;color:var(--gray);"></div>
  `;

  examUI.innerHTML = `
    <div class="mode-selector">
      <button id="practice-mode-btn" class="mode-btn ${sessionMode==='practice'?'selected':''}">
        <i class="fas fa-graduation-cap"></i> Practice Mode
      </button>
      <button id="test-mode-btn" class="mode-btn ${sessionMode==='test'?'selected':''}">
        <i class="fas fa-clipboard-check"></i> Test Mode
      </button>
    </div>

    <div class="input-group">
      <select id="exam-type" class="form-control">
        <option value="OET">OET Spelling</option>
        <option value="Bee">Spelling Bee</option>
        <option value="Custom">Custom Words</option>
      </select>
      <select id="accent-select" class="form-control" style="max-width:150px;">
        <option value="en-US">American English</option>
        <option value="en-GB">British English</option>
        <option value="en-AU">Australian English</option>
      </select>
      <span id="flag-svg" style="display:inline-flex;align-items:center;"></span>
    </div>

    <div id="custom-upload-area">${uploadAreaHTML}</div>

    <button id="start-btn" class="btn btn-primary" style="margin-top:15px;">
      <i class="fas fa-play"></i> Start Session
    </button>
  `;

  document.getElementById('exam-type').value = examType;
  document.getElementById('accent-select').value = accent;

  document.getElementById('exam-type').onchange = e => {
    examType = e.target.value;
    appTitle.textContent = examType === 'OET' ? 'OET Spelling Practice'
                        : examType === 'Bee' ? 'Spelling Bee (Voice)'
                        : 'Custom Spelling Practice';
  };
  document.getElementById('accent-select').onchange = e => { accent = e.target.value; };

  document.getElementById('practice-mode-btn').onclick = () => { sessionMode = 'practice'; renderExamUI(); };
  document.getElementById('test-mode-btn').onclick    = () => { sessionMode = 'test'; renderExamUI(); };

  document.getElementById('word-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const list = processWordList(String(evt.target.result||''));
      words = list.slice();
      document.getElementById('upload-info').textContent = `Loaded ${list.length} words from file.`;
    };
    reader.readAsText(file);
  });

  document.getElementById('add-custom-btn').onclick = () => {
    const list = processWordList(document.getElementById('custom-words').value.trim());
    if (!list.length) { showAlert("Please enter some words first!", 'error'); return; }
    words = list.slice();
    document.getElementById('upload-info').textContent = `Using ${list.length} custom words.`;
  };

  document.getElementById('start-btn').onclick = () => {
    summaryArea.innerHTML = "";
    trainerArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    if (examType === "OET") startOET();
    else if (examType === "Bee") startBee();
    else startCustomPractice();
  };
}

/* ==================== OET (typed) ==================== */
function startOET() {
  currentIndex = 0; score = 0; userAnswers = [];
  words = (!words || !words.length)
    ? (Array.isArray(window.oetWords) ? window.oetWords.slice() : [])
    : words.slice();
  if (!words.length) { showAlert("OET word list is empty.", 'error'); return; }
  if (sessionMode === "test") words = shuffle(words).slice(0, 24);
  appTitle.textContent = "OET Spelling Practice";
  showTypedWord();
  setTimeout(() => speakOut(words[currentIndex], 0.95, focusAnswer), 250);
}
function showTypedWord() {
  if (currentIndex >= words.length) return endSessionTyped();
  const w = words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div class="word-audio-feedback">
      <button id="repeat-btn" class="btn btn-icon" title="Repeat word"><i class="fas fa-redo"></i></button>
      <span id="word-status"></span>
    </div>
    <div class="input-wrapper">
      <input type="text" id="user-input" class="form-control"
        placeholder="Type what you heard..." autofocus
        value="${userAnswers[currentIndex] || ''}">
    </div>
    <div class="button-group">
      <button id="prev-btn" class="btn btn-secondary" ${currentIndex===0?"disabled":""}>
        <i class="fas fa-arrow-left"></i> Previous
      </button>
      <button id="next-btn" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Next</button>
      <button id="check-btn" class="btn btn-primary"><i class="fas fa-check"></i> Check</button>
      <button id="flagWordBtn" class="btn-icon ${flaggedWordsStore.includes(w)?'active':''}" title="Flag">
        <i class="${flaggedWordsStore.includes(w)?'fas':'far'} fa-flag"></i>
      </button>
    </div>
    <div id="feedback" class="feedback" aria-live="assertive"></div>
  `;
  document.getElementById('repeat-btn')?.addEventListener('click', () => speakOut(w, 0.95, focusAnswer));
  document.getElementById('prev-btn')?.addEventListener('click', prevTyped);
  document.getElementById('next-btn')?.addEventListener('click', nextTyped);
  document.getElementById('check-btn')?.addEventListener('click', () => checkTypedAnswer(w));
  document.getElementById('flagWordBtn')?.addEventListener('click', () => toggleFlagWord(w));

  const input = document.getElementById('user-input');
  input?.addEventListener('keypress', e => { if (e.key === 'Enter') checkTypedAnswer(w); });
  document.addEventListener('keydown', typedShortcuts, { once:true });
  focusAnswer();
}
function typedShortcuts(e){
  if (isTypingField(document.activeElement)) return;
  if (e.code==='Space' || e.key===' ') { e.preventDefault(); speakOut(words[currentIndex],0.95,focusAnswer); }
  if (e.key==='ArrowLeft' && currentIndex>0) prevTyped();
  if (e.key==='ArrowRight') nextTyped();
}
function focusAnswer(){ const input=document.getElementById('user-input'); if (input){ input.focus(); input.select(); } }
function checkTypedAnswer(correctWord){
  const input = document.getElementById('user-input');
  const ans = (input?.value || '').trim();
  if (!ans) { showAlert("Please type the word first!", 'error'); return; }
  userAnswers[currentIndex] = ans;
  const feedback = document.getElementById('feedback');
  if (ans.toLowerCase() === correctWord.toLowerCase()) { feedback.textContent="✓ Correct!"; feedback.className="feedback correct"; score++; }
  else { feedback.textContent=`✗ Incorrect. The correct spelling was: ${correctWord}`; feedback.className="feedback incorrect"; }
  setTimeout(nextTyped, 900);
}
function nextTyped(){ if (currentIndex < words.length - 1) { currentIndex++; showTypedWord(); } else endSessionTyped(); }
function prevTyped(){ if (currentIndex > 0) { currentIndex--; showTypedWord(); } }
function endSessionTyped(){ summaryFor(words, userAnswers, score); }

/* ==================== CUSTOM (typed) ==================== */
function startCustomPractice(){
  if (!words.length) {
    const list = processWordList(document.getElementById('custom-words')?.value || '');
    words = list.slice();
  }
  if (!words.length) { showAlert("No custom words loaded.", 'error'); return; }
  if (sessionMode==="test") words = shuffle(words).slice(0,24);
  currentIndex=0; score=0; userAnswers=[];
  appTitle.textContent="Custom Spelling Practice";
  showTypedWord();
  setTimeout(()=>speakOut(words[currentIndex],0.95,focusAnswer),250);
}

/* ==================== BEE (voice) ==================== */
const DEFAULT_BEE_WORDS = ["accommodate","belligerent","conscientious","disastrous","embarrass","foreign","guarantee","harass","interrupt","jealous","knowledge","liaison","millennium","necessary","occasionally","possession","questionnaire","rhythm","separate","tomorrow","unforeseen","vacuum","withhold","yacht"];
let recognition=null, autoAdvanceTimer=null;
function startBee(){
  words = (!words||!words.length) ? DEFAULT_BEE_WORDS.slice() : words.slice();
  if (!words.length) { showAlert("No Spelling Bee words available.", 'error'); return; }
  if (sessionMode==="test") words = shuffle(words).slice(0,24);
  currentIndex=0; score=0; userAnswers=[];
  appTitle.textContent="Spelling Bee (Voice)";
  showBeeWord();
  setTimeout(()=>playBeePrompt(),250);
}
function playBeePrompt(){ if (currentIndex>=words.length) return endSessionBee(); const w=words[currentIndex]; stopRecognition(); speakOut(w,0.9,()=>setTimeout(()=>startRecognition(w),200)); }
function showBeeWord(){
  if (currentIndex>=words.length) return endSessionBee();
  const w=words[currentIndex];
  trainerArea.innerHTML = `
    <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
    <div id="spelling-visual" aria-live="polite"></div>
    <div id="auto-recording-info"><i class="fas fa-info-circle"></i> Speak the spelling after the word is pronounced</div>
    <div class="button-group">
      <button id="prev-btn" class="btn-secondary" ${currentIndex===0?'disabled':''}><i class="fas fa-arrow-left"></i> Previous</button>
      <button id="repeat-btn" class="btn-secondary"><i class="fas fa-redo"></i> Repeat Word</button>
      <button id="next-btn" class="btn-secondary"><i class="fas fa-arrow-right"></i> Skip</button>
      <button id="flag-btn" class="btn-icon ${flaggedWordsStore.includes(w)?'active':''}"><i class="fas fa-star"></i> Flag</button>
    </div>
    <div id="mic-feedback" class="feedback" aria-live="assertive"></div>
  `;
  document.getElementById('prev-btn')?.addEventListener('click', ()=>{ if (currentIndex>0){ currentIndex--; showBeeWord(); playBeePrompt(); }});
  document.getElementById('repeat-btn')?.addEventListener('click', playBeePrompt);
  document.getElementById('next-btn')?.addEventListener('click', ()=>{ currentIndex++; showBeeWord(); playBeePrompt(); });
  document.getElementById('flag-btn')?.addEventListener('click', ()=>toggleFlagWord(w));
  document.addEventListener('keydown', beeShortcuts, { once:true });
  updateSpellingVisual("● ● ●");
}
function beeShortcuts(e){ if (e.key===' ') { e.preventDefault(); playBeePrompt(); } if (e.key==='ArrowLeft'&&currentIndex>0){ currentIndex--; showBeeWord(); playBeePrompt(); } if (e.key==='ArrowRight'){ currentIndex++; showBeeWord(); playBeePrompt(); } }
function startRecognition(targetWord){
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { showAlert("Speech recognition not supported in this browser.", 'error'); return; }
  stopRecognition();
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  recognition = new SR(); recognition.lang=accent; recognition.interimResults=false; recognition.maxAlternatives=5;
  let gotResult=false;
  recognition.onresult=e=>{ gotResult=true; const best=e.results[0][0]?.transcript||''; handleBeeResult(best,targetWord); };
  recognition.onerror=e=>{ setMicFeedback(`Mic error: ${e.error}`,'error'); scheduleAutoAdvance(); };
  recognition.onend=()=>{ if (!gotResult){ setMicFeedback("No speech detected. Try again or press Repeat.", 'error'); scheduleAutoAdvance(); } };
  try { recognition.start(); setMicFeedback("Listening... spell the letters clearly.", 'info'); updateSpellingVisual("● ● ●"); }
  catch(e){ console.warn('Recognition start failed:',e); scheduleAutoAdvance(); }
}
function stopRecognition(){ if (recognition){ try{ recognition.onresult=null; recognition.onerror=null; recognition.onend=null; recognition.abort(); }catch(_){} recognition=null; } clearTimeout(autoAdvanceTimer); }
function scheduleAutoAdvance(ms=1400){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer=setTimeout(()=>{ currentIndex++; if (currentIndex>=words.length) endSessionBee(); else { showBeeWord(); playBeePrompt(); } },ms); }
function handleBeeResult(transcript,targetWord){
  const normalized = normalizeSpelling(transcript); userAnswers[currentIndex]=normalized;
  const correct=targetWord.toLowerCase(); const fb=document.getElementById('mic-feedback');
  if (normalized===correct){ score++; fb.textContent="✓ Correct!"; fb.className="feedback correct"; }
  else { fb.textContent=`✗ Incorrect. You said: "${normalized}" – Correct: ${targetWord}`; fb.className="feedback incorrect"; }
  scheduleAutoAdvance();
}
function normalizeSpelling(s){ if(!s) return ""; let t=s.toLowerCase().trim(); t=t.replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim(); const tokens=t.split(' '); if(tokens.length>1){ const letters=tokens.map(x=>x[0]).join(''); if(letters.length>1) return letters; } return t.replace(/\s/g,''); }
function setMicFeedback(msg,type='info'){ const el=document.getElementById('mic-feedback'); if(!el) return; el.textContent=msg; el.className=`feedback ${type==='error'?'incorrect':(type==='success'?'correct':'')}`; }
function updateSpellingVisual(t=""){ const el=document.getElementById('spelling-visual'); if(el) el.textContent=t; }
function endSessionBee(){ stopRecognition(); summaryFor(words,userAnswers,score); }

/* ==================== SUMMARY ==================== */
function summaryFor(listWords, answers, scoreVal){
  trainerArea.classList.add('hidden'); summaryArea.classList.remove('hidden');
  const correct = listWords.filter((w,i)=>(answers[i]||'').toLowerCase()===String(w).toLowerCase());
  const wrong   = listWords.filter((w,i)=>(answers[i]||'').toLowerCase()!==String(w).toLowerCase());
  const flagged = listWords.filter(w=>flaggedWordsStore.includes(w));
  const percent = listWords.length? Math.round((scoreVal/listWords.length)*100) : 0;
  const list = arr => arr.length ? `<ul>${arr.map(w=>`<li>${w}</li>`).join('')}</ul>` : '<em>None</em>';
  summaryArea.innerHTML = `
    <div class="summary-header">
      <h2>Session Results</h2>
      <div class="score-display">${scoreVal}/${listWords.length} (${percent}%)</div>
    </div>
    <div class="results-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:10px;">
      <div class="results-card correct"><h3><i class="fas fa-check-circle"></i> Correct</h3>${list(correct)}</div>
      <div class="results-card incorrect"><h3><i class="fas fa-times-circle"></i> Needs Practice</h3>${list(wrong)}</div>
      <div class="results-card"><h3><i class="fas fa-star"></i> Flagged</h3>${list(flagged)}</div>
    </div>
    <div class="summary-actions" style="margin-top:12px;display:flex;gap:.5rem;flex-wrap:wrap;">
      <button id="review-wrong-btn" class="btn btn-primary" ${wrong.length?'':'disabled'}><i class="fas fa-undo"></i> Review Incorrect</button>
      <button id="review-flagged-btn" class="btn btn-secondary" ${flagged.length?'':'disabled'}><i class="fas fa-flag"></i> Review Flagged</button>
      <button id="restart-btn" class="btn btn-secondary"><i class="fas fa-sync-alt"></i> Restart Session</button>
      <button id="new-list-btn" class="btn btn-secondary"><i class="fas fa-list"></i> Change Word List</button>
    </div>`;
  document.getElementById('review-wrong-btn')?.addEventListener('click', ()=>{ if(!wrong.length) return; words=wrong.slice(); restartWithCurrentWords(); });
  document.getElementById('review-flagged-btn')?.addEventListener('click', ()=>{ if(!flagged.length) return; words=flagged.slice(); restartWithCurrentWords(); });
  document.getElementById('restart-btn')?.addEventListener('click', ()=>{ words=listWords.slice(); restartWithCurrentWords(); });
  document.getElementById('new-list-btn')?.addEventListener('click', ()=>{ summaryArea.classList.add('hidden'); trainerArea.classList.add('hidden'); });

  function restartWithCurrentWords(){
    currentIndex=0; score=0; userAnswers=[];
    summaryArea.classList.add('hidden'); trainerArea.classList.remove('hidden');
    if (examType==='Bee') { showBeeWord(); setTimeout(()=>playBeePrompt(),250); }
    else { showTypedWord(); setTimeout(()=>speakOut(words[currentIndex],0.95,focusAnswer),250); }
  }
}

/* ==================== HELPERS ==================== */
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

