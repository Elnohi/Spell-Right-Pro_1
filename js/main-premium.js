/* ==================== SpellRightPro Premium — streamlined, patched ==================== */
(function () {
  'use strict';

  /* ==================== GLOBAL STATE ==================== */
  let currentUser = null;
  let premiumUser = false;

  let examType = "OET";          // "OET" | "Bee" | "Custom"
  let accent   = "en-US";        // "en-US" | "en-GB" | "en-AU"
  let sessionMode = "practice";  // "practice" | "test"

  let words = [];                // per-session working list
  let currentIndex = 0;
  let score = 0;
  let userAnswers = [];

  const sessionId = 'sess_' + Math.random().toString(36).slice(2, 9);

  // per-device flagged store
  const flaggedWordsStore = JSON.parse(localStorage.getItem('flaggedWords') || '[]');

  // Separate non-medical sample list for Bee mode
  const DEFAULT_BEE_WORDS = [
    "accommodate","belligerent","conscientious","disastrous","embarrass","foreign","guarantee",
    "harass","interrupt","jealous","knowledge","liaison","millennium","necessary","occasionally",
    "possession","questionnaire","rhythm","separate","tomorrow","unforeseen","vacuum","withhold","yacht"
  ];

  // DOM refs
  const authArea       = document.getElementById('auth-area');
  const premiumApp     = document.getElementById('premium-app');
  const examUI         = document.getElementById('exam-ui');
  const trainerArea    = document.getElementById('trainer-area');
  const summaryArea    = document.getElementById('summary-area');
  const appTitle       = document.getElementById('app-title');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  // Stripe instance (optional)
  let stripe = null;

  // Price IDs for your Stripe products (keep them here)
  window.priceMap = {
    monthly: 'price_1RxJvfEl99zwdEZrdDtZ5q3t',
    annual:  'price_1RxK5tEl99zwdEZrNGVlVhYH'
  };

  // Caches for display prices (optional pretty labels)
  let cachedDisplayPrices = null;

  /* ==================== INIT ==================== */
  document.addEventListener('DOMContentLoaded', () => {
    initStripe();
    initDarkMode();
    initAuthState();
    initSpeech();
    checkUrlForPaymentStatus();
  });

  /* ==================== STRIPE ==================== */
  function initStripe() {
    if (!window.Stripe) { console.warn('Stripe.js not loaded'); return; }
    const key = (window.stripeConfig && window.stripeConfig.publicKey) || '';
    if (!/^pk_(test|live)_/.test(key)) { console.warn('Stripe publishable key missing/invalid'); return; }
    stripe = Stripe(key);
  }

  /* ==================== ADS: hide when premium ==================== */
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
    try { window.adsbygoogle = window.adsbygoogle || []; window.adsbygoogle.pauseAdRequests = 1; } catch(_) {}
    if (!document.getElementById('premium-no-ads-style')) {
      const st = document.createElement('style');
      st.id = 'premium-no-ads-style';
      st.textContent = `
        .google-auto-placed, ins.adsbygoogle, .ad-container { display:none!important; }
        [id^="google_ads_iframe_"], #google_vignette, #google_anchor_container { display:none!important; visibility:hidden!important; }
      `;
      document.head.appendChild(st);
    }
    document.querySelectorAll('.ad-container').forEach(el => el.style.display = 'none');
  }

  /* ==================== THEME ==================== */
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

  /* ==================== SPEECH (TTS) ==================== */
  function initSpeech() {
    if (!('speechSynthesis' in window)) return;
    const onReady = () => { window.speechSynthesis.onvoiceschanged = null; };
    if (window.speechSynthesis.getVoices().length) onReady();
    else window.speechSynthesis.onvoiceschanged = onReady;
  }
  function speak(text, rate = 0.95, onEnd) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text || ''));
    u.lang = accent; u.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(x => x.lang === accent) || voices.find(x => x.lang.startsWith(accent.split('-')[0]));
    if (v) u.voice = v;
    if (typeof onEnd === 'function') u.onend = onEnd;
    window.speechSynthesis.speak(u);
  }
  function stopSpeech() { try { window.speechSynthesis?.cancel(); } catch(_) {} }

  /* ==================== URL payment flag ==================== */
  function checkUrlForPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('payment_success')) {
      try { disableAutoAdsNow(); } catch(_) {}
      toast('🎉 Premium subscription activated!', 'success');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => location.reload(), 300);
    }
  }

  /* ==================== FIREBASE: auth + premium gating ==================== */
  async function ensureUserDoc(user) {
    const ref = firebase.firestore().collection('users').doc(user.uid);
    const snap = await ref.get().catch((e) => { console.error(e); return null; });
    if (!snap) return;
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
      const data = snap.exists ? snap.data() : {};
      premiumUser = !!data?.isPremium;
      if (premiumUser) disableAutoAdsNow(); else loadAutoAdsOnce();
      return premiumUser;
    } catch (e) {
      console.error('Premium check error:', e);
      return false;
    }
  }

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
      </div>`;
    document.getElementById('login-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('email')?.value || '';
      const pass  = document.getElementById('password')?.value || '';
      try { await firebase.auth().signInWithEmailAndPassword(email, pass); }
      catch (e) { toast(e.message, 'error'); }
    });
    document.getElementById('signup-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('email')?.value || '';
      const pass  = document.getElementById('password')?.value || '';
      try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        await ensureUserDoc(cred.user);
        toast('Account created. You can upgrade to Premium any time.', 'success');
      } catch (e) { toast(e.message, 'error'); }
    });
    premiumApp.classList.add('hidden');
  }

  function renderAuthLoggedIn() {
    authArea.innerHTML = `
      <div class="user-info">
        <span>${currentUser?.email || ''}</span>
        ${premiumUser ? '<span class="premium-badge"><i class="fas fa-crown"></i> Premium</span>' : ''}
        <button id="logout-btn" class="btn btn-sm btn-outline"><i class="fas fa-sign-out-alt"></i> Logout</button>
      </div>`;
    document.getElementById('logout-btn')?.addEventListener('click', () => firebase.auth().signOut());
    premiumApp.classList.remove('hidden');
  }

  /* ==================== Prices & promo ==================== */
  function formatAmount(cents, currency = 'CAD', locale = 'en-CA') {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format((cents || 0) / 100);
    } catch {
      return `$${((cents || 0) / 100).toFixed(2)}`;
    }
  }

  async function fetchDisplayPrices() {
    if (cachedDisplayPrices) return cachedDisplayPrices;
    const base = (window.appConfig && window.appConfig.apiBaseUrl) || '';
    if (base) {
      try {
        const res = await fetch(`${base}/prices`);
        if (res.ok) {
          const data = await res.json();
          if (data?.monthly?.unit_amount != null && data?.annual?.unit_amount != null) {
            cachedDisplayPrices = data; return cachedDisplayPrices;
          }
        }
      } catch (_) {}
    }
    // fallback: label placeholders
    cachedDisplayPrices = {
      monthly: { unit_amount: null, currency: 'CAD', interval: 'month' },
      annual:  { unit_amount: null, currency: 'CAD', interval: 'year' }
    };
    return cachedDisplayPrices;
  }

  async function paintPriceLabels() {
    const p = await fetchDisplayPrices();
    const m = document.getElementById('price-monthly-amt');
    const a = document.getElementById('price-annual-amt');
    if (m) m.textContent = p.monthly.unit_amount != null ? `${formatAmount(p.monthly.unit_amount, p.monthly.currency)}/mo` : '—/mo';
    if (a) a.textContent = p.annual.unit_amount  != null ? `${formatAmount(p.annual.unit_amount,  p.annual.currency)}/yr` : '—/yr';
  }

  async function validatePromoInline(code) {
    const base = (window.appConfig && window.appConfig.apiBaseUrl) || '';
    if (!base || !code) return { valid: false, message: 'Enter a promo code (optional)' };
    try {
      const r = await fetch(`${base}/validate-promo?code=${encodeURIComponent(code)}`);
      if (!r.ok) return { valid: false, message: 'Promo not recognized' };
      const j = await r.json();
      // expected: { valid:bool, percent_off?:number, amount_off?:number, currency?:string, message?:string }
      return j;
    } catch { return { valid: false, message: 'Network error while validating' }; }
  }

  function showPromoMessage(msg, ok = true) {
    const el = document.getElementById('promo-help');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = ok ? 'var(--success,#198754)' : 'var(--danger,#dc3545)';
    el.style.fontWeight = ok ? 'normal' : 'bold';
  }

  async function initiatePayment(planType, opts = {}) {
    if (!currentUser) { toast('Please log in first.', 'error'); return; }

    const plan = String(planType || '').toLowerCase();
    const priceId = window.priceMap[plan];
    if (!priceId) { toast(`Unknown plan: ${plan}`, 'error'); return; }

    const base = (window.appConfig && window.appConfig.apiBaseUrl) || '';
    if (!base) { toast('Backend URL missing in config.js (window.appConfig.apiBaseUrl)', 'error'); return; }

    const promoInput = document.getElementById('promoInput');
    const promoCode  = (opts.promoCode || promoInput?.value || '').trim();

    // Prefer: warn user if invalid, but still let backend decide
    if (promoCode) {
      const v = await validatePromoInline(promoCode);
      if (!v.valid) showPromoMessage(v.message || 'Invalid promo code', false);
      else {
        const desc = v.percent_off ? `${v.percent_off}% off will apply`
                 : v.amount_off  ? `${formatAmount(v.amount_off, v.currency||'CAD')} off will apply`
                 : 'Discount will apply at checkout';
        showPromoMessage(desc, true);
      }
    }

    const triggerBtn = opts.trigger || null;
    const prevHTML   = triggerBtn ? triggerBtn.innerHTML : '';
    if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.innerHTML = 'Redirecting…'; }

    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`${base}/create-checkout-session`, {
        method : 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${idToken}` },
        body   : JSON.stringify({
          plan,
          priceId,
          userId: currentUser.uid,
          sessionId,
          promoCode: promoCode || undefined,
          allowPromotionCodes: promoCode ? undefined : true
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
      throw new Error('Invalid response from server');
    } catch (err) {
      console.error(err);
      toast(`Payment failed: ${err.message}`, 'error', 6000);
    } finally {
      if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.innerHTML = prevHTML; }
    }
  }

  /* ==================== UPSELL ==================== */
  async function showPremiumUpsell() {
    resetEnvironment(); // kill any leftover listeners/audio/recognition
    trainerArea.classList.add('hidden');
    summaryArea.classList.add('hidden');

    examUI.innerHTML = `
      <div class="premium-upsell">
        <div class="premium-header">
          <i class="fas fa-crown"></i>
          <h2>Upgrade to Premium</h2>
          <p>Unlock OET, Bee, Custom lists, history & more.</p>
        </div>

        <div class="pricing-options">
          <div class="pricing-option">
            <h3>Monthly</h3>
            <div class="price"><span id="price-monthly-amt">—/mo</span></div>
            <button id="monthly-btn" class="btn btn-primary" disabled>Subscribe</button>
          </div>
          <div class="pricing-option recommended">
            <div class="badge">Best Value</div>
            <h3>Annual</h3>
            <div class="price"><span id="price-annual-amt">—/yr</span></div>
            <button id="annual-btn" class="btn btn-primary" disabled>Subscribe</button>
          </div>
        </div>

        <div class="promo-row" style="margin-top:10px;">
          <input id="promoInput" class="form-control" placeholder="Enter promo code (optional)" autocomplete="off">
        </div>
        <small id="promo-help" class="promo-help" aria-live="polite"></small>

        <p style="margin-top:.5rem;color:var(--gray)">You’ll be redirected to secure Stripe Checkout.</p>
      </div>
    `;

    try { await paintPriceLabels(); } catch {}
    const monthlyBtn = document.getElementById('monthly-btn');
    const annualBtn  = document.getElementById('annual-btn');
    [monthlyBtn, annualBtn].forEach(b => b && (b.disabled = false));

    const promoInput = document.getElementById('promoInput');
    let promoTimer = null;
    promoInput?.addEventListener('input', () => {
      clearTimeout(promoTimer);
      const code = promoInput.value.trim();
      if (!code) { showPromoMessage(''); return; }
      promoTimer = setTimeout(async () => {
        const r = await validatePromoInline(code);
        if (r.valid) {
          const msg = r.percent_off ? `${r.percent_off}% discount will apply`
                   : r.amount_off  ? `${formatAmount(r.amount_off, r.currency||'CAD')} off will apply`
                   : 'Discount will apply at checkout';
          showPromoMessage(msg, true);
        } else {
          showPromoMessage(r.message || 'Invalid promo code', false);
        }
      }, 300);
    });

    promoInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); monthlyBtn?.click(); }
    });

    monthlyBtn?.addEventListener('click', (e) => initiatePayment('monthly', { trigger: e.currentTarget }));
    annualBtn ?.addEventListener('click', (e) => initiatePayment('annual',  { trigger: e.currentTarget }));
  }

  /* ==================== Utilities ==================== */
  function toast(message, type='error', dur=2600) {
    // minimal fallback
    console[type === 'error' ? 'error' : 'log'](message);
    // (If you have a nice UI alert, call it here.)
  }
  function processWordList(text) {
    return [...new Set(String(text||'').replace(/\r/g,'').split(/[\n,;|\/\-–—\t]+/).map(w=>w.trim()).filter(w=>w && w.length>1))];
  }
  function toggleFlagWord(word) {
    if (!word) return;
    const idx = flaggedWordsStore.indexOf(word);
    if (idx === -1) flaggedWordsStore.push(word); else flaggedWordsStore.splice(idx,1);
    localStorage.setItem('flaggedWords', JSON.stringify(flaggedWordsStore));
  }
  function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  /* ==================== GLOBAL LISTENERS CLEANUP ==================== */
  let typedShortcutHandler = null;
  let beeShortcutHandler   = null;
  let recognition = null;
  let autoAdvanceTimer = null;

  function stopRecognition() {
    if (recognition) {
      try { recognition.onresult=null; recognition.onerror=null; recognition.onend=null; recognition.abort(); } catch(_) {}
      recognition = null;
    }
    clearTimeout(autoAdvanceTimer);
  }

  function resetEnvironment() {
    // stop tts + recognition
    stopSpeech();
    stopRecognition();

    // remove global key listeners
    if (typedShortcutHandler) {
      document.removeEventListener('keydown', typedShortcutHandler);
      typedShortcutHandler = null;
    }
    if (beeShortcutHandler) {
      document.removeEventListener('keydown', beeShortcutHandler);
      beeShortcutHandler = null;
    }
  }

  /* ==================== Exam UI scaffold ==================== */
  function renderExamUI() {
    resetEnvironment();
    summaryArea.innerHTML = '';
    trainerArea.innerHTML = '';
    trainerArea.classList.add('hidden');
    summaryArea.classList.add('hidden');

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
          <option value="Bee">Spelling Bee (Voice)</option>
          <option value="Custom">Custom Words</option>
        </select>
        <select id="accent-select" class="form-control" style="max-width:150px;">
          <option value="en-US">American English</option>
          <option value="en-GB">British English</option>
          <option value="en-AU">Australian English</option>
        </select>
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
    document.getElementById('test-mode-btn').onclick    = () => { sessionMode = 'test';     renderExamUI(); };

    // Custom list inputs
    document.getElementById('word-file')?.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const list = processWordList(String(evt.target.result||'')); words = list.slice();
        document.getElementById('upload-info').textContent = `Loaded ${list.length} words from file.`;
      };
      reader.readAsText(file);
    });
    document.getElementById('add-custom-btn')?.addEventListener('click', () => {
      const list = processWordList(document.getElementById('custom-words')?.value || '');
      if (!list.length) { toast("Please enter some words first!", 'error'); return; }
      words = list.slice();
      document.getElementById('upload-info').textContent = `Using ${list.length} custom words.`;
    });

    document.getElementById('start-btn').onclick = () => {
      summaryArea.innerHTML = "";
      trainerArea.classList.remove('hidden');
      summaryArea.classList.add('hidden');

      // Always reset environment when starting a mode
      resetEnvironment();

      if (examType === "OET") startOET();
      else if (examType === "Bee") startBee();
      else startCustomPractice();
    };
  }

  /* ==================== OET (typed) ==================== */
  function startOET() {
    resetEnvironment();
    // Always pull a fresh list from the official OET words
    const baseList = Array.isArray(window.oetWords) ? window.oetWords.slice() : [];
    if (!baseList.length) { toast("OET word list is empty.", 'error'); return; }
    words = sessionMode === 'test' ? shuffle(baseList).slice(0, 24) : baseList.slice();

    currentIndex = 0; score = 0; userAnswers = [];
    appTitle.textContent = "OET Spelling Practice";
    showTypedWord();
    // Speak once per word, not on a loop
    setTimeout(() => speak(words[currentIndex], 0.95, focusAnswer), 200);
  }

  function showTypedWord() {
    if (currentIndex >= words.length) return endSessionTyped();
    const w = words[currentIndex];
    trainerArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div class="word-audio-feedback">
        <button id="repeat-btn" class="btn btn-icon" title="Repeat word"><i class="fas fa-redo"></i></button>
      </div>
      <div class="input-wrapper">
        <input type="text" id="user-input" class="form-control"
          placeholder="Type what you heard..." autofocus value="${userAnswers[currentIndex] || ''}">
      </div>
      <div class="button-group">
        <button id="prev-btn" class="btn btn-secondary" ${currentIndex===0?"disabled":""}><i class="fas fa-arrow-left"></i> Previous</button>
        <button id="next-btn" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Next</button>
        <button id="check-btn" class="btn btn-primary"><i class="fas fa-check"></i> Check</button>
        <button id="flag-btn" class="btn btn-outline btn-sm"><i class="far fa-flag"></i> Flag</button>
      </div>
      <div id="feedback" class="feedback" aria-live="assertive"></div>
    `;

    document.getElementById('repeat-btn')?.addEventListener('click', () => speak(w, 0.95, focusAnswer));
    document.getElementById('prev-btn')?.addEventListener('click', prevTyped);
    document.getElementById('next-btn')?.addEventListener('click', nextTyped);
    document.getElementById('check-btn')?.addEventListener('click', () => checkTypedAnswer(w));
    document.getElementById('flag-btn') ?.addEventListener('click', () => toggleFlagWord(w));

    const input = document.getElementById('user-input');
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); checkTypedAnswer(w); } });

    // Attach ONE global shortcut set; remove any previous first
    if (typedShortcutHandler) document.removeEventListener('keydown', typedShortcutHandler);
    typedShortcutHandler = (e) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); speak(w, 0.95, focusAnswer); }
      if (e.key === 'ArrowLeft' && currentIndex > 0) prevTyped();
      if (e.key === 'ArrowRight') nextTyped();
    };
    document.addEventListener('keydown', typedShortcutHandler);

    focusAnswer();
  }

  function focusAnswer(){ const input=document.getElementById('user-input'); if (input){ input.focus(); input.select(); } }

  function checkTypedAnswer(correctWord){
    const input = document.getElementById('user-input');
    const ans = (input?.value || '').trim();
    if (!ans) { toast("Please type the word first!", 'error'); return; }
    userAnswers[currentIndex] = ans;
    const fb = document.getElementById('feedback');
    if (ans.toLowerCase() === correctWord.toLowerCase()) { fb.textContent="✓ Correct!"; fb.className="feedback correct"; score++; }
    else { fb.textContent=`✗ Incorrect. The correct spelling was: ${correctWord}`; fb.className="feedback incorrect"; }
    setTimeout(nextTyped, 900);
  }

  function nextTyped(){ 
    if (currentIndex < words.length - 1) { currentIndex++; showTypedWord(); setTimeout(()=>speak(words[currentIndex],0.95,focusAnswer), 150); }
    else endSessionTyped();
  }
  function prevTyped(){ 
    if (currentIndex > 0) { currentIndex--; showTypedWord(); setTimeout(()=>speak(words[currentIndex],0.95,focusAnswer), 150); }
  }
  function endSessionTyped(){ summaryFor(words, userAnswers, score); }

  /* ==================== Custom (typed) ==================== */
  function startCustomPractice(){
    resetEnvironment();
    // only use the user's custom list (from textarea/file)
    if (!words || !words.length) {
      const list = processWordList(document.getElementById('custom-words')?.value || '');
      words = list.slice();
    }
    if (!words.length) { toast("No custom words loaded.", 'error'); return; }
    if (sessionMode === 'test') words = shuffle(words).slice(0, 24);

    currentIndex = 0; score = 0; userAnswers = [];
    appTitle.textContent = "Custom Spelling Practice";
    showTypedWord();
    setTimeout(()=>speak(words[currentIndex],0.95,focusAnswer),150);
  }

  /* ==================== Bee (voice) ==================== */

  // robust mapping for spoken letter names -> letters (handles en-US/en-GB variants)
  const LETTER_ALIASES = {
    a:['a','ay','eh','ae'], b:['b','bee','be'], c:['c','see','sea','cee'],
    d:['d','dee','de'], e:['e','ee'], f:['f','ef','eff'],
    g:['g','gee','ji'], h:['h','aitch'],
    i:['i','eye','aye'],
    j:['j','jay'], k:['k','kay'], l:['l','el','ell'], m:['m','em','emm'],
    n:['n','en','enn'], o:['o','oh'], p:['p','pee','pea'],
    q:['q','cue','queue'], r:['r','ar'], s:['s','es','ess'],
    t:['t','tee','tea'], u:['u','you','yew'], v:['v','vee'],
    w:['w','doubleu'], x:['x','ex'], y:['y','why','wye'],
    z:['z','zee','zed']
  };
  const ALIAS_TO_LETTER = new Map();
  Object.entries(LETTER_ALIASES).forEach(([letter, aliases]) => aliases.forEach(a => ALIAS_TO_LETTER.set(a, letter)));

  function startBee(){
    resetEnvironment();
    // Bee must use *non-medical* default list unless user loaded a custom list explicitly
    const baseList = (words && words.length) ? words.slice() : DEFAULT_BEE_WORDS.slice();
    words = sessionMode === 'test' ? shuffle(baseList).slice(0, 24) : baseList.slice();

    currentIndex = 0; score = 0; userAnswers = [];
    appTitle.textContent="Spelling Bee (Voice)";
    showBeeWord();
    setTimeout(()=>playBeePrompt(), 150);
  }

  function playBeePrompt(){
    if (currentIndex>=words.length) return endSessionBee();
    const w = words[currentIndex];
    stopRecognition();
    speak(w, 0.9, () => setTimeout(()=>startRecognition(w), 200));
  }

  function showBeeWord(){
    if (currentIndex>=words.length) return endSessionBee();
    const w=words[currentIndex];
    trainerArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div id="spelling-visual" aria-live="polite"></div>
      <div id="auto-recording-info"><i class="fas fa-info-circle"></i> Speak the spelling after the word is pronounced</div>
      <div class="button-group">
        <button id="prev-btn" class="btn btn-secondary" ${currentIndex===0?'disabled':''}><i class="fas fa-arrow-left"></i> Previous</button>
        <button id="repeat-btn" class="btn btn-secondary"><i class="fas fa-redo"></i> Repeat Word</button>
        <button id="next-btn" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Skip</button>
        <button id="flag-btn" class="btn btn-outline btn-sm"><i class="far fa-flag"></i> Flag</button>
      </div>
      <div id="mic-feedback" class="feedback" aria-live="assertive"></div>
    `;
    document.getElementById('prev-btn') ?.addEventListener('click', ()=>{ if (currentIndex>0){ currentIndex--; showBeeWord(); playBeePrompt(); }});
    document.getElementById('repeat-btn')?.addEventListener('click', playBeePrompt);
    document.getElementById('next-btn')  ?.addEventListener('click', ()=>{ currentIndex++; showBeeWord(); playBeePrompt(); });
    document.getElementById('flag-btn')  ?.addEventListener('click', ()=>toggleFlagWord(w));

    // one global shortcut set for Bee
    if (beeShortcutHandler) document.removeEventListener('keydown', beeShortcutHandler);
    beeShortcutHandler = (e) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); playBeePrompt(); }
      if (e.key === 'ArrowLeft' && currentIndex>0) { currentIndex--; showBeeWord(); playBeePrompt(); }
      if (e.key === 'ArrowRight') { currentIndex++; showBeeWord(); playBeePrompt(); }
    };
    document.addEventListener('keydown', beeShortcutHandler);

    setMicFeedback("");
    updateSpellingVisual("● ● ●");
  }

  function startRecognition(targetWord){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!SR) { setMicFeedback("Speech recognition not supported in this browser.","error"); return; }
    stopRecognition();
    recognition = new SR(); recognition.lang=accent; recognition.interimResults=false; recognition.maxAlternatives=5;
    let gotResult=false;
    recognition.onresult=e=>{ 
      gotResult=true; 
      const best = e.results[0][0]?.transcript || '';
      handleBeeResult(best,targetWord); 
    };
    recognition.onerror=e=>{ setMicFeedback(`Mic error: ${e.error}`,'error'); scheduleAutoAdvance(); };
    recognition.onend=()=>{ if (!gotResult){ setMicFeedback("No speech detected. Try again or press Repeat.", 'error'); scheduleAutoAdvance(); } };
    try { recognition.start(); setMicFeedback("Listening... spell the letters clearly.", 'info'); updateSpellingVisual("● ● ●"); }
    catch(e){ scheduleAutoAdvance(); }
  }

  function scheduleAutoAdvance(ms=1400){
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer=setTimeout(()=>{ 
      currentIndex++; 
      if (currentIndex>=words.length) endSessionBee(); 
      else { showBeeWord(); playBeePrompt(); } 
    }, ms);
  }

  function handleBeeResult(transcript,targetWord){
    const normalized = normalizeSpelling(transcript);
    userAnswers[currentIndex] = normalized;
    const correct=targetWord.toLowerCase();
    if (normalized===correct){ setMicFeedback("✓ Correct!", 'success'); score++; }
    else { setMicFeedback(`✗ Incorrect. You said: "${normalized}" — Correct: ${targetWord}`, 'error'); }
    scheduleAutoAdvance();
  }

  function normalizeSpelling(s){ 
    if(!s) return "";
    // normalize
    let t = s.toLowerCase().trim()
      .replace(/[^a-z\s-]/g,' ')     // remove punctuation/numbers
      .replace(/-/g,' ')             // treat hyphens as spaces
      .replace(/\s+/g,' ').trim();

    const tokens = t.split(' ');
    let out = '';

    for (let i=0; i<tokens.length; i++){
      const tok = tokens[i];

      // special case: "double you"/"double u" => 'w'
      const next = tokens[i+1] || '';
      if (tok === 'double' && (next === 'you' || next === 'yew' || next === 'u')){
        out += 'w'; i++; continue;
      }

      // direct alias mapping
      const mapped = ALIAS_TO_LETTER.get(tok);
      if (mapped) { out += mapped; continue; }

      // single letters spoken as characters
      if (tok.length === 1 && /[a-z]/.test(tok)) { out += tok; continue; }

      // ignore fillers like "the", "letter"
      if (tok === 'the' || tok === 'letter') continue;

      // as a last resort, keep first char if word looks like a letter-name ("cee", "dee", etc.)
      if (tok.length >= 2 && ALIAS_TO_LETTER.has(tok)) { out += ALIAS_TO_LETTER.get(tok); }
    }

    // fallback to the raw compacted text if mapping produced nothing
    if (!out && t) out = t.replace(/\s/g,'');
    return out;
  }

  function updateSpellingVisual(t=""){ const el=document.getElementById('spelling-visual'); if(el) el.textContent=t; }
  function setMicFeedback(msg,type='info'){ 
    const el=document.getElementById('mic-feedback'); if(!el) return; 
    el.textContent=msg; 
    el.className=`feedback ${type==='error'?'incorrect':(type==='success'?'correct':'')}`; 
  }
  function endSessionBee(){ stopRecognition(); summaryFor(words,userAnswers,score); }

  /* ==================== Summary ==================== */
  function summaryFor(listWords, answers, scoreVal){
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');

    const correct = listWords.filter((w,i)=>(answers[i]||'').toLowerCase()===String(w).toLowerCase());
    const wrong   = listWords.filter((w,i)=>(answers[i]||'').toLowerCase()!==String(w).toLowerCase());
    const flagged = listWords.filter(w=>flaggedWordsStore.includes(w));
    const percent = listWords.length? Math.round((scoreVal/listWords.length)*100) : 0;
    const list = (arr)=> arr.length ? `<ul>${arr.map(w=>`<li>${w}</li>`).join('')}</ul>` : '<em>None</em>';

    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${scoreVal}/${listWords.length} (${percent}%)</div>
      </div>
      <div class="results-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:10px;">
        <div class="results-card correct"><h3><i class="fas fa-check-circle"></i> Correct</h3>${list(correct)}</div>
        <div class="results-card incorrect"><h3><i class="fas fa-times-circle"></i> Needs Practice</h3>${list(wrong)}</div>
        <div class="results-card"><h3><i class="far fa-flag"></i> Flagged</h3>${list(flagged)}</div>
      </div>
      <div class="summary-actions" style="margin-top:12px;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button id="review-wrong-btn" class="btn btn-primary" ${wrong.length?'':'disabled'}><i class="fas fa-undo"></i> Review Incorrect</button>
        <button id="review-flagged-btn" class="btn btn-secondary" ${flagged.length?'':'disabled'}><i class="fas fa-flag"></i> Review Flagged</button>
        <button id="restart-btn" class="btn btn-secondary"><i class="fas fa-sync-alt"></i> Restart Session</button>
        <button id="new-list-btn" class="btn btn-secondary"><i class="fas fa-list"></i> Change Word List</button>
      </div>`;

    document.getElementById('review-wrong-btn') ?.addEventListener('click', ()=>{ if(!wrong.length) return; words=wrong.slice(); restartTypedOrBee(); });
    document.getElementById('review-flagged-btn')?.addEventListener('click', ()=>{ if(!flagged.length) return; words=flagged.slice(); restartTypedOrBee(); });
    document.getElementById('restart-btn')       ?.addEventListener('click', ()=>{ words=listWords.slice(); restartTypedOrBee(); });
    document.getElementById('new-list-btn')      ?.addEventListener('click', ()=>{ summaryArea.classList.add('hidden'); trainerArea.classList.add('hidden'); });

    function restartTypedOrBee(){
      currentIndex=0; score=0; userAnswers=[];
      summaryArea.classList.add('hidden'); trainerArea.classList.remove('hidden');
      if (examType==='Bee') { showBeeWord(); setTimeout(()=>playBeePrompt(),200); }
      else { showTypedWord(); setTimeout(()=>speak(words[currentIndex],0.95,focusAnswer),200); }
    }
  }

})();
