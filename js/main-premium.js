/* ==================== PREMIUM APP (frontend) ==================== */
(function () {
  'use strict';

  // ------- Global state -------
  let currentUser = null;
  let premiumUser = false;
  let stripe = null;

  // Trainer state
  let examType = "OET";          // "OET" | "Bee" | "Custom"
  let accent = "en-US";          // "en-US" | "en-GB" | "en-AU"
  let sessionMode = "practice";  // "practice" | "test"
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let userAnswers = [];
  const sessionId = 'sess_' + Math.random().toString(36).slice(2, 9);

  // Keep flagged words in localStorage
  const flaggedKey = 'flaggedWords';
  const flaggedWords = JSON.parse(localStorage.getItem(flaggedKey) || '[]');

  // Pricing map (in case you override)
  window.priceMap = {
    monthly: (window.appConfig?.monthlyPriceId) || 'price_1RxJvfEl99zwdEZrdDtZ5q3t',
    annual:  (window.appConfig?.annualPriceId)  || 'price_1RxK5tEl99zwdEZrNGVlVhYH'
  };

  // ------- DOM -------
  const authArea       = document.getElementById('auth-area');
  const premiumApp     = document.getElementById('premium-app');
  const examUI         = document.getElementById('exam-ui');
  const trainerArea    = document.getElementById('trainer-area');
  const summaryArea    = document.getElementById('summary-area');
  const appTitle       = document.getElementById('app-title');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  // ------- Init -------
  document.addEventListener('DOMContentLoaded', () => {
    initStripe();
    initDarkMode();
    initAuth();
    initVoices();
    handlePaymentReturn();
  });

  function initStripe() {
    if (!window.Stripe) return;
    const key = window.stripeConfig?.publicKey || '';
    if (!/^pk_(test|live)_/.test(key)) {
      console.warn('Stripe publishable key missing/invalid.');
      return;
    }
    stripe = Stripe(key);
  }

  /* ==================== Ads ==================== */
  function loadAutoAds() {
    if (window.__adsLoaded) return;
    const client = window.appConfig?.adClient || 'ca-pub-7632930282249669';
    const s = document.createElement('script');
    s.async = true; s.id = 'auto-ads-script';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    window.__adsLoaded = true;
  }
  function hideAds() {
    try { window.adsbygoogle = window.adsbygoogle || []; window.adsbygoogle.pauseAdRequests = 1; } catch(_){}
    const st = document.createElement('style');
    st.textContent = `.google-auto-placed, ins.adsbygoogle, .ad-container, #google_vignette, #google_anchor_container {display:none!important;visibility:hidden!important}`;
    document.head.appendChild(st);
    document.querySelectorAll('.ad-container').forEach(n => n.style.display = 'none');
  }

  /* ==================== Dark mode ==================== */
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

  /* ==================== Speech ==================== */
  let voicesReady = false;
  function initVoices() {
    const on = () => { voicesReady = true; window.speechSynthesis.onvoiceschanged = null; };
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.getVoices().length) on();
      else window.speechSynthesis.onvoiceschanged = on;
    }
  }
  function speak(text, rate=0.95, onEnd) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = accent; u.rate = rate;
    const v = window.speechSynthesis.getVoices().find(x => x.lang === accent)
           || window.speechSynthesis.getVoices().find(x => x.lang.startsWith(accent.split('-')[0]));
    if (v) u.voice = v;
    if (typeof onEnd === 'function') u.onend = onEnd;
    window.speechSynthesis.speak(u);
  }

  /* ==================== Auth & premium gating ==================== */
  function initAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
      currentUser = user;
      if (!user) {
        renderLoggedOut();
        loadAutoAds();
        return;
      }
      // Ensure doc and read premium
      await ensureUserDoc(user);
      premiumUser = await getIsPremium(user.uid);
      renderLoggedIn();

      if (premiumUser) {
        hideAds();
        renderExamUI();
      } else {
        loadAutoAds();
        showUpsell();
      }
    });
  }

  async function ensureUserDoc(user) {
    const ref = firebase.firestore().collection('users').doc(user.uid);
    const snap = await ref.get().catch(() => null);
    if (!snap || !snap.exists) {
      await ref.set({
        email: user.email || '',
        isPremium: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }
  async function getIsPremium(uid) {
    try {
      const snap = await firebase.firestore().collection('users').doc(uid).get();
      return !!(snap.exists && snap.data().isPremium === true);
    } catch (e) {
      console.warn('premium check failed', e);
      return false;
    }
  }

  function renderLoggedOut() {
    authArea.innerHTML = `
      <div class="auth-form">
        <input type="email" id="email" placeholder="Email" class="form-control">
        <input type="password" id="password" placeholder="Password" class="form-control">
        <button id="login-btn"  class="btn btn-primary">Login</button>
        <button id="signup-btn" class="btn btn-outline">Sign Up</button>
      </div>
    `;
    premiumApp.classList.add('hidden');
    document.getElementById('login-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const pass  = document.getElementById('password').value;
      try { await firebase.auth().signInWithEmailAndPassword(email, pass); }
      catch (e) { alert(e.message); }
    });
    document.getElementById('signup-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const pass  = document.getElementById('password').value;
      try { await firebase.auth().createUserWithEmailAndPassword(email, pass); }
      catch (e) { alert(e.message); }
    });
  }

  function renderLoggedIn() {
    authArea.innerHTML = `
      <div class="user-info">
        <span>${currentUser?.email || ''}</span>
        ${premiumUser ? '<span class="premium-badge"><i class="fas fa-crown"></i> Premium</span>' : ''}
        <button id="logout-btn" class="btn btn-sm btn-outline"><i class="fas fa-sign-out-alt"></i> Logout</button>
      </div>`;
    premiumApp.classList.remove('hidden');
    document.getElementById('logout-btn')?.addEventListener('click', () => firebase.auth().signOut());
  }

  /* ==================== Payment return ==================== */
  function handlePaymentReturn() {
    const u = new URL(location.href);
    if (u.searchParams.get('payment_success')) {
      hideAds();
      alert('🎉 Premium subscription activated!');
      history.replaceState({}, '', location.pathname);
      setTimeout(() => location.reload(), 350);
    }
  }

  /* ==================== Upsell (with promo) ==================== */
  function currencyFmt(cents, currency='CAD', locale='en-CA') {
    if (typeof cents !== 'number') return '—';
    try { return new Intl.NumberFormat(locale, { style:'currency', currency }).format(cents/100); }
    catch { return `$${(cents/100).toFixed(2)}`; }
  }

  async function fetchPrices() {
    const base = window.appConfig?.apiBaseUrl || '';
    if (!base) return null;
    try {
      const r = await fetch(`${base}/prices`, { method:'GET', credentials:'omit' });
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    } catch (e) {
      console.warn('price fetch failed', e);
      return null;
    }
  }

  async function showUpsell() {
    trainerArea.classList.add('hidden');
    summaryArea.classList.add('hidden');

    examUI.innerHTML = `
      <div class="premium-upsell">
        <div class="premium-header">
          <i class="fas fa-crown"></i>
          <h2>Upgrade to Premium</h2>
          <p>Unlock all features and unlimited practice</p>
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

        <p style="margin-top:.5rem;color:var(--gray)">You'll be redirected to secure Stripe Checkout.</p>
      </div>
    `;

    // Fill price labels
    const prices = await fetchPrices();
    if (prices?.monthly?.unit_amount) {
      document.getElementById('price-monthly-amt').textContent =
        `${currencyFmt(prices.monthly.unit_amount, prices.monthly.currency)}/mo`;
    }
    if (prices?.annual?.unit_amount) {
      document.getElementById('price-annual-amt').textContent =
        `${currencyFmt(prices.annual.unit_amount, prices.annual.currency)}/yr`;
    }
    document.getElementById('monthly-btn').disabled = false;
    document.getElementById('annual-btn').disabled  = false;

    // Promo inline validation
    const promoInput = document.getElementById('promoInput');
    const promoHelp  = document.getElementById('promo-help');
    let t = null;

    function paintPromo(msg, ok) {
      promoHelp.textContent = msg || '';
      promoHelp.style.color = ok ? 'var(--success,#198754)' : 'var(--danger,#dc3545)';
      promoHelp.style.fontWeight = ok ? 'normal' : 'bold';
    }

    promoInput?.addEventListener('input', () => {
      clearTimeout(t);
      const code = promoInput.value.trim();
      if (!code) { paintPromo('', true); return; }
      t = setTimeout(async () => {
        const base = window.appConfig?.apiBaseUrl || '';
        try {
          // try canonical route; backend also mounted aliases
          const r = await fetch(`${base}/validate-promo?code=${encodeURIComponent(code)}`, { method:'GET' });
          const j = await r.json().catch(() => ({}));
          if (j.valid) {
            const msg = j.percent_off ? `${j.percent_off}% discount will apply`
                      : j.amount_off ? `${currencyFmt(j.amount_off, j.currency || 'CAD')} off at checkout`
                      : 'Discount will apply at checkout';
            paintPromo(msg, true);
          } else {
            paintPromo(j.message || 'Invalid promo code', false);
          }
        } catch {
          paintPromo('Error validating code', false);
        }
      }, 350);
    });

    promoInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('monthly-btn')?.click(); }
    });

    document.getElementById('monthly-btn')?.addEventListener('click', (e) => startCheckout('monthly', e.currentTarget));
    document.getElementById('annual-btn')?.addEventListener('click',  (e) => startCheckout('annual',  e.currentTarget));
  }

  async function startCheckout(plan, btn) {
    if (!currentUser) { alert('Please log in first.'); return; }
    const base = window.appConfig?.apiBaseUrl || '';
    if (!base) { alert('Backend URL missing in config.js'); return; }

    const promoCode = document.getElementById('promoInput')?.value.trim() || '';
    const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Redirecting…';

    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`${base}/create-checkout-session`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${idToken}` },
        body: JSON.stringify({
          plan: plan.toLowerCase(),
          priceId: window.priceMap[plan.toLowerCase()],
          userId: currentUser.uid,
          sessionId,
          promoCode: promoCode || undefined,
          allowPromotionCodes: promoCode ? undefined : true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      // Prefer sessionId redirect (Stripe best practice)
      if (data.sessionId) {
        if (!stripe) initStripe();
        const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (error) throw error;
        return;
      }
      // Fallback: URL
      if (data.url) { location.href = data.url; return; }

      throw new Error('Invalid server response (expected sessionId or url).');
    } catch (e) {
      console.error(e);
      alert(`Payment failed: ${e.message}`);
    } finally {
      btn.disabled = false; btn.innerHTML = orig;
    }
  }

  /* ==================== Minimal trainer (existing logic preserved) ==================== */
  function renderExamUI() {
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
      </div>

      <textarea id="custom-words" class="form-control" rows="3"
        placeholder="Enter words (comma/newline separated), or leave blank to use default list."></textarea>

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

    document.getElementById('start-btn').onclick = () => {
      summaryArea.innerHTML = "";
      trainerArea.classList.remove('hidden');
      summaryArea.classList.add('hidden');

      if (examType === "OET") startOET();
      else if (examType === "Bee") startBee();
      else startCustom();
    };
  }

  function startOET() {
    const list = (Array.isArray(window.oetWords) ? window.oetWords.slice() : []);
    words = list.length ? list : [];
    if (!words.length) { alert('OET word list is empty.'); return; }
    if (sessionMode === 'test') words = shuffle(words).slice(0, 24);
    currentIndex = 0; score = 0; userAnswers = [];
    appTitle.textContent = "OET Spelling Practice";
    showTyped();
    setTimeout(() => speak(words[currentIndex], 0.95, focusInput), 200);
  }
  function startCustom() {
    const raw = document.getElementById('custom-words').value || '';
    words = raw.split(/[\n,;|/–—\t]+/).map(s=>s.trim()).filter(Boolean);
    if (!words.length) { alert('No custom words loaded.'); return; }
    if (sessionMode === 'test') words = shuffle(words).slice(0, 24);
    currentIndex = 0; score = 0; userAnswers = [];
    appTitle.textContent = "Custom Spelling Practice";
    showTyped();
    setTimeout(() => speak(words[currentIndex], 0.95, focusInput), 200);
  }

  function showTyped() {
    if (currentIndex >= words.length) return showSummary();
    const w = words[currentIndex];
    trainerArea.innerHTML = `
      <div class="word-progress">Word ${currentIndex + 1} of ${words.length}</div>
      <div class="word-audio-feedback">
        <button id="repeat-btn" class="btn btn-icon" title="Repeat word"><i class="fas fa-redo"></i></button>
      </div>
      <div class="input-wrapper">
        <input type="text" id="user-input" class="form-control" placeholder="Type what you heard..." autofocus>
      </div>
      <div class="button-group">
        <button id="prev-btn" class="btn btn-secondary" ${currentIndex===0?'disabled':''}>
          <i class="fas fa-arrow-left"></i> Previous
        </button>
        <button id="next-btn" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Next</button>
        <button id="check-btn" class="btn btn-primary"><i class="fas fa-check"></i> Check</button>
      </div>
      <div id="feedback" class="feedback" aria-live="assertive"></div>
    `;
    document.getElementById('repeat-btn')?.addEventListener('click', () => speak(w, 0.95, focusInput));
    document.getElementById('prev-btn')?.addEventListener('click', () => { if (currentIndex>0){ currentIndex--; showTyped(); }});
    document.getElementById('next-btn')?.addEventListener('click', () => { currentIndex++; currentIndex<words.length ? showTyped() : showSummary(); });
    document.getElementById('check-btn')?.addEventListener('click', () => checkTyped(w));
    const input = document.getElementById('user-input');
    input?.addEventListener('keypress', e => { if (e.key === 'Enter') checkTyped(w); });
    input?.focus();
  }
  function focusInput(){ const i=document.getElementById('user-input'); i?.focus(); i?.select(); }
  function checkTyped(correct) {
    const input = document.getElementById('user-input');
    const ans = (input?.value || '').trim();
    if (!ans) { alert('Please type the word first!'); return; }
    userAnswers[currentIndex] = ans;
    const fb = document.getElementById('feedback');
    if (ans.toLowerCase() === correct.toLowerCase()) { fb.textContent = '✓ Correct!'; fb.className='feedback correct'; score++; }
    else { fb.textContent = `✗ Incorrect. The correct spelling was: ${correct}`; fb.className='feedback incorrect'; }
    setTimeout(() => { currentIndex++; currentIndex<words.length ? showTyped() : showSummary(); }, 900);
  }
  function showSummary() {
    const total = words.length || 1;
    const pct = Math.round((score/total)*100);
    trainerArea.classList.add('hidden');
    summaryArea.classList.remove('hidden');
    summaryArea.innerHTML = `
      <div class="summary-header">
        <h2>Session Results</h2>
        <div class="score-display">${score}/${total} (${pct}%)</div>
      </div>
      <div class="summary-actions" style="margin-top:12px;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button id="restart-btn" class="btn btn-secondary"><i class="fas fa-sync-alt"></i> Restart</button>
      </div>`;
    document.getElementById('restart-btn')?.addEventListener('click', () => { currentIndex=0; score=0; userAnswers=[]; summaryArea.classList.add('hidden'); trainerArea.classList.remove('hidden'); showTyped(); });
  }

  /* ==================== Helpers ==================== */
  function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }

})();
