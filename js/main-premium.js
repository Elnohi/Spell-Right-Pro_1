/* SpellRightPro Premium – Progress Tracking + Smart Review
   - Requires: firebase compat SDKs + config.js (db, auth)
   - Uses: users/{uid}/wordStats/{word} docs to store per-word stats
*/
(function () {
  'use strict';

  // ===== Globals =====
  let currentUser = null;
  let isPremium = false;

  // training state
  let examType = 'OET';     // OET | Bee | Custom | Smart
  let sessionMode = 'practice';
  let accent = 'en-US';
  let words = [];
  let idx = 0;
  let score = 0;
  let answers = [];

  // DOM
  const authArea    = document.getElementById('auth-area');
  const premiumApp  = document.getElementById('premium-app');
  const appTitle    = document.getElementById('app-title');
  const examUI      = document.getElementById('exam-ui');
  const trainer     = document.getElementById('trainer-area');
  const summary     = document.getElementById('summary-area');
  const darkToggle  = document.getElementById('dark-mode-toggle');

  const tabTrain    = document.getElementById('tab-train');
  const tabProgress = document.getElementById('tab-progress');
  const paneTrain   = document.getElementById('pane-train');
  const paneProg    = document.getElementById('pane-progress');

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    initDark();
    initAuth();
    window.speechSynthesis?.getVoices(); // warm voices
  });

  function initDark() {
    const saved = localStorage.getItem('premium_darkMode') === 'true';
    document.body.classList.toggle('dark-mode', saved);
    const icon = darkToggle?.querySelector('i');
    if (icon) icon.className = saved ? 'fas fa-sun' : 'fas fa-moon';
    darkToggle?.addEventListener('click', () => {
      const on = document.body.classList.toggle('dark-mode');
      localStorage.setItem('premium_darkMode', on);
      const i = darkToggle.querySelector('i');
      if (i) i.className = on ? 'fas fa-sun' : 'fas fa-moon';
    });
  }

  function initAuth() {
    firebase.auth().onAuthStateChanged(async (u) => {
      currentUser = u;
      if (!u) {
        renderLoggedOut();
        return;
      }
      await ensureUserDoc(u);
      isPremium = await readPremiumFlag(u.uid);
      renderLoggedIn();
      bindTabs();
      if (isPremium) renderTrainUI(); else showUpsell();
    });
  }

  function renderLoggedOut() {
    authArea.innerHTML = `
      <div class="auth-form">
        <input id="email" class="form-control" type="email" placeholder="Email">
        <input id="password" class="form-control" type="password" placeholder="Password">
        <button id="login-btn"  class="btn btn-primary">Login</button>
        <button id="signup-btn" class="btn btn-outline">Sign Up</button>
        <p style="margin-top:.5rem;color:#777">Premium access requires an account.</p>
      </div>`;
    document.getElementById('login-btn').onclick = async () => {
      const e = document.getElementById('email').value.trim();
      const p = document.getElementById('password').value;
      try { await firebase.auth().signInWithEmailAndPassword(e, p); }
      catch (err) { alert(err.message); }
    };
    document.getElementById('signup-btn').onclick = async () => {
      const e = document.getElementById('email').value.trim();
      const p = document.getElementById('password').value;
      try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(e, p);
        await ensureUserDoc(cred.user);
        alert('Account created. Ask support to enable Premium after payment.');
      } catch (err) { alert(err.message); }
    };
    premiumApp.classList.add('hidden');
    document.body.classList.remove('logged-in');
  }

  function renderLoggedIn() {
    document.body.classList.add('logged-in');
    premiumApp.classList.remove('hidden');
    authArea.innerHTML = `
      <div class="user-info">
        <span>${currentUser?.email || ''}</span>
        ${isPremium ? '<span class="premium-badge"><i class="fas fa-crown"></i> Premium</span>' : ''}
        <button id="logout-btn" class="btn btn-sm btn-outline"><i class="fas fa-sign-out-alt"></i> Logout</button>
      </div>`;
    document.getElementById('logout-btn').onclick = () => firebase.auth().signOut();
  }

  async function ensureUserDoc(user) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        email: user.email || '',
        isPremium: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
  async function readPremiumFlag(uid) {
    try {
      const snap = await db.collection('users').doc(uid).get();
      return !!snap.data()?.isPremium;
    } catch { return false; }
  }

  // ===== Tabs =====
  function bindTabs() {
    tabTrain.onclick = () => {
      tabTrain.classList.add('active'); tabProgress.classList.remove('active');
      paneTrain.classList.remove('hidden'); paneProg.classList.add('hidden');
    };
    tabProgress.onclick = async () => {
      tabProgress.classList.add('active'); tabTrain.classList.remove('active');
      paneProg.classList.remove('hidden'); paneTrain.classList.add('hidden');
      await loadProgress();
    };
  }

  // ===== Upsell for non-premium =====
  function showUpsell() {
    appTitle.textContent = 'Premium Required';
    examUI.innerHTML = `
      <div class="premium-upsell">
        <h3><i class="fas fa-crown"></i> Upgrade to Premium</h3>
        <p>Track your progress, get smart review lists, remove limits & ads.</p>
        <p><a class="btn btn-primary" href="pricing.html">Upgrade Now</a></p>
      </div>`;
    trainer.innerHTML = '';
    summary.innerHTML = '';
  }

  // ===== TRAIN UI =====
  function renderTrainUI() {
    appTitle.textContent = 'Premium Trainer';
    examUI.innerHTML = `
      <div class="mode-selector" style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button id="btn-oet"     class="btn btn-secondary">OET Practice</button>
        <button id="btn-bee"     class="btn btn-secondary">Spelling Bee</button>
        <button id="btn-custom"  class="btn btn-secondary">Custom List</button>
        <button id="btn-smart"   class="btn btn-primary"><i class="fas fa-bolt"></i> Smart Review</button>
      </div>

      <div style="margin-top:10px;display:flex;gap:.5rem;flex-wrap:wrap">
        <select id="accent" class="form-control" style="max-width:180px">
          <option value="en-US">American</option>
          <option value="en-GB">British</option>
          <option value="en-AU">Australian</option>
        </select>
        <select id="mode" class="form-control" style="max-width:180px">
          <option value="practice">Practice</option>
          <option value="test">Test</option>
        </select>
      </div>

      <div id="custom-wrap" style="margin-top:10px">
        <textarea id="custom-words" class="form-control" rows="3" placeholder="Custom words (comma/newline separated)"></textarea>
      </div>
    `;

    document.getElementById('accent').value = accent;
    document.getElementById('mode').value = sessionMode;

    document.getElementById('accent').onchange = (e)=> accent = e.target.value;
    document.getElementById('mode').onchange   = (e)=> sessionMode = e.target.value;

    document.getElementById('btn-oet').onclick = startOET;
    document.getElementById('btn-bee').onclick = startBee;
    document.getElementById('btn-custom').onclick = startCustom;
    document.getElementById('btn-smart').onclick  = startSmartReview;
  }

  // ====== SPEECH ======
  function speak(text, rate=0.95, cb) {
    if (!('speechSynthesis' in window)) return cb?.();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = accent; u.rate = rate;
    const vs = window.speechSynthesis.getVoices();
    const v = vs.find(x=>x.lang===accent) || vs.find(x=>x.lang?.startsWith(accent.split('-')[0]));
    if (v) u.voice = v;
    u.onend = ()=> cb?.();
    window.speechSynthesis.speak(u);
  }

  // ====== WORD STATS (Firestore) ======
  async function recordResult(word, correct) {
    if (!currentUser || !word) return;
    const ref = db.collection('users').doc(currentUser.uid)
                 .collection('wordStats').doc(word.toLowerCase());
    await db.runTransaction(async (tr) => {
      const snap = await tr.get(ref);
      const now = Date.now();
      if (!snap.exists) {
        tr.set(ref, {
          word: word.toLowerCase(),
          seen: 1,
          correct: correct ? 1 : 0,
          lastSeen: now,
          streak: correct ? 1 : 0,
          wrongStreak: correct ? 0 : 1,
          accuracy: correct ? 100 : 0
        });
      } else {
        const d = snap.data();
        const seen = (d.seen||0)+1;
        const corr = (d.correct||0) + (correct?1:0);
        const streak = correct ? (d.streak||0)+1 : 0;
        const wrongStreak = correct ? 0 : (d.wrongStreak||0)+1;
        const acc = Math.round((corr/seen)*100);
        tr.update(ref, { seen, correct: corr, lastSeen: now, streak, wrongStreak, accuracy: acc });
      }
    });
  }

  async function fetchWeakWords(limit=25) {
    if (!currentUser) return [];
    // grab lowest-accuracy words first; then those not seen recently
    const q = await db.collection('users').doc(currentUser.uid)
      .collection('wordStats').orderBy('accuracy', 'asc').limit(limit*2).get();
    const rows = q.docs.map(d => d.data());
    // Lightweight score: lower accuracy + long time since seen
    const now = Date.now();
    rows.forEach(r => r._score = (100 - (r.accuracy||0)) + Math.min(50, Math.floor((now - (r.lastSeen||0))/86400000)));
    rows.sort((a,b)=> b._score - a._score);
    const out = rows.slice(0, limit).map(r => r.word);
    return out;
  }

  // ====== TRAINERS (typed & voice) ======
  function startOET() {
    examType = 'OET'; answers=[]; score=0; idx=0;
    words = Array.isArray(window.oetWords) ? window.oetWords.slice() : [];
    if (!words.length) { alert('OET list missing.'); return; }
    if (sessionMode==='test') shuffleInPlace(words, 24);
    appTitle.textContent = 'OET Spelling Practice';
    showTypedWord();
  }

  function startCustom() {
    examType = 'Custom'; answers=[]; score=0; idx=0;
    const raw = document.getElementById('custom-words').value || '';
    words = splitWords(raw);
    if (!words.length) { alert('Enter custom words first.'); return; }
    if (sessionMode==='test') shuffleInPlace(words, 24);
    appTitle.textContent = 'Custom Spelling Practice';
    showTypedWord();
  }

  const BEE_WORDS = ["accommodate","belligerent","conscientious","disastrous","embarrass","foreign","guarantee","harass","interrupt","jealous","knowledge","liaison","millennium","necessary","occasionally","possession","questionnaire","rhythm","separate","tomorrow","unforeseen","vacuum","withhold","yacht"];
  let recog=null, autoNext=null;

  function startBee() {
    examType = 'Bee'; answers=[]; score=0; idx=0;
    words = BEE_WORDS.slice();
    if (sessionMode==='test') shuffleInPlace(words, 24);
    appTitle.textContent = 'Spelling Bee (Voice)';
    showBeeWord();
    setTimeout(()=> speak(words[idx], 0.9, startRecognition), 250);
  }

  // ====== Smart Review ======
  async function startSmartReview() {
    examType = 'Smart'; answers=[]; score=0; idx=0;
    const pool = await fetchWeakWords(25);
    if (!pool.length) { alert('No practice history yet. Train first!'); return; }
    words = pool;
    appTitle.textContent = 'Smart Review';
    showTypedWord();
  }

  // ====== Typed UI (OET/Custom/Smart) ======
  function showTypedWord() {
    if (idx >= words.length) return finishSession();
    const w = words[idx];

    trainer.innerHTML = `
      <div class="word-progress">Word ${idx+1} of ${words.length}</div>
      <div class="word-audio-feedback"><button id="btn-repeat" class="btn btn-icon"><i class="fas fa-volume-up"></i></button></div>
      <div class="input-wrapper"><input id="answer" class="form-control" placeholder="Type what you heard…" autocomplete="off"></div>
      <div class="button-group" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:8px">
        <button id="btn-prev" class="btn btn-secondary" ${idx===0?'disabled':''}><i class="fas fa-arrow-left"></i> Prev</button>
        <button id="btn-next" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Skip</button>
        <button id="btn-check" class="btn btn-primary"><i class="fas fa-check"></i> Check</button>
      </div>
      <div id="fb" class="feedback" aria-live="polite"></div>
    `;

    document.getElementById('btn-repeat').onclick = ()=> speak(w, 0.95, focusAnswer);
    document.getElementById('btn-prev').onclick   = ()=> { if (idx>0){ idx--; showTypedWord(); } };
    document.getElementById('btn-next').onclick   = ()=> { idx++; showTypedWord(); };
    document.getElementById('btn-check').onclick  = ()=> checkTyped(w);

    const input = document.getElementById('answer');
    input.addEventListener('keydown', (e)=> { if (e.key==='Enter') checkTyped(w); });
    speak(w, 0.95, focusAnswer);
  }
  function focusAnswer(){ const el=document.getElementById('answer'); if(el){ el.focus(); el.select(); } }

  function checkTyped(correct) {
    const val = (document.getElementById('answer').value || '').trim();
    if (!val) return;
    answers[idx] = val;
    const ok = val.toLowerCase() === correct.toLowerCase();
    const fb  = document.getElementById('fb');
    fb.textContent = ok ? '✓ Correct!' : `✗ Incorrect. Answer: ${correct}`;
    fb.className   = `feedback ${ok?'correct':'incorrect'}`;
    if (ok) score++;
    recordResult(correct, ok).catch(()=>{});
    setTimeout(()=> { idx++; (idx>=words.length) ? finishSession() : showTypedWord(); }, 900);
  }

  // ====== Bee (voice) ======
  function showBeeWord(){
    if (idx>=words.length) return finishSession();
    const w = words[idx];
    trainer.innerHTML = `
      <div class="word-progress">Word ${idx+1} of ${words.length}</div>
      <div id="spelling-visual" class="badge" style="margin-bottom:8px">Say letters clearly after the word</div>
      <div class="button-group" style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button id="btn-prev" class="btn btn-secondary" ${idx===0?'disabled':''}><i class="fas fa-arrow-left"></i> Prev</button>
        <button id="btn-repeat" class="btn btn-secondary"><i class="fas fa-redo"></i> Repeat</button>
        <button id="btn-skip" class="btn btn-secondary"><i class="fas fa-arrow-right"></i> Skip</button>
      </div>
      <div id="micfb" class="feedback" aria-live="polite"></div>
    `;
    document.getElementById('btn-prev').onclick   = ()=> { if(idx>0){ idx--; showBeeWord(); setTimeout(()=> speak(words[idx],0.9,startRecognition),150); } };
    document.getElementById('btn-repeat').onclick = ()=> speak(w, 0.9, startRecognition);
    document.getElementById('btn-skip').onclick   = ()=> { idx++; showBeeWord(); setTimeout(()=> speak(words[idx]||'',0.9,startRecognition),150); };
  }

  function startRecognition(){
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const el = document.getElementById('micfb'); if (el){ el.textContent='Speech recognition not supported.'; el.className='feedback incorrect'; }
      return;
    }
    stopRecognition();
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    recog = new SR(); recog.lang=accent; recog.interimResults=false; recog.maxAlternatives=5;
    let got=false;
    recog.onresult = (e)=>{
      got=true;
      const best = e.results[0][0]?.transcript || '';
      handleBee(best, words[idx]);
    };
    recog.onerror = (e)=> { setMic(`Mic error: ${e.error}`, true); scheduleNext(); };
    recog.onend   = ()=> { if(!got){ setMic('No speech detected. Try again or tap Repeat.', true); scheduleNext(); } };
    try { recog.start(); setMic('Listening…'); } catch {}
  }
  function stopRecognition(){ try{ recog?.abort(); }catch{} recog=null; clearTimeout(autoNext); }
  function setMic(msg, err=false){ const m=document.getElementById('micfb'); if(!m) return; m.textContent=msg; m.className=`feedback ${err?'incorrect':''}`; }
  function scheduleNext(ms=1200){ clearTimeout(autoNext); autoNext=setTimeout(()=>{ idx++; (idx>=words.length)?finishSession(): (showBeeWord(), setTimeout(()=> speak(words[idx],0.9,startRecognition),150)); }, ms); }

  function handleBee(raw, target){
    const said = normalizeSpelling(raw);
    const ok = said === target.toLowerCase();
    if (ok) score++;
    recordResult(target, ok).catch(()=>{});
    setMic(ok ? '✓ Correct!' : `✗ You said “${said}”. Correct: ${target}`, !ok);
    scheduleNext();
  }
  function normalizeSpelling(s){
    let t = (s||'').toLowerCase().replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
    const tokens = t.split(' ');
    if (tokens.length>1) { return tokens.map(x=>x[0]).join(''); }
    return t.replace(/\s/g,'');
  }

  // ====== Summary ======
  function finishSession(){
    trainer.innerHTML = '';
    const pct = words.length ? Math.round((score/words.length)*100) : 0;
    const wrong = words.filter((w,i)=> (answers[i]||'').toLowerCase() !== w.toLowerCase());
    const right = words.filter((w,i)=> (answers[i]||'').toLowerCase() === w.toLowerCase());
    summary.innerHTML = `
      <div class="card-header"><h3>Results</h3><div class="score-display">${score}/${words.length} (${pct}%)</div></div>
      <div class="results-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        <div class="card"><h4>Correct</h4>${list(right)}</div>
        <div class="card"><h4>Needs Practice</h4>${list(wrong)}</div>
      </div>
      <div style="margin-top:10px;display:flex;gap:.5rem;flex-wrap:wrap">
        <button id="btn-review-wrong" class="btn btn-primary" ${wrong.length?'':'disabled'}>Review Incorrect</button>
        <button id="btn-new" class="btn btn-secondary">New Session</button>
      </div>`;
    document.getElementById('btn-review-wrong').onclick = ()=> { if (!wrong.length) return; words = wrong.slice(); idx=0; score=0; answers=[]; examType==='Bee' ? (showBeeWord(), setTimeout(()=> speak(words[idx],0.9,startRecognition),150)) : showTypedWord(); };
    document.getElementById('btn-new').onclick = ()=> renderTrainUI();
  }
  function list(arr){ return arr.length ? `<ul>${arr.map(w=>`<li>${w}</li>`).join('')}</ul>` : '<em>None</em>'; }

  // ====== Progress Pane ======
  async function loadProgress(){
    if (!currentUser) return;

    // KPIs
    const statsSnap = await db.collection('users').doc(currentUser.uid).collection('wordStats').get();
    const rows = statsSnap.docs.map(d=>d.data());
    const totalSeen = rows.reduce((s,r)=> s + (r.seen||0), 0);
    const totalCorrect = rows.reduce((s,r)=> s + (r.correct||0), 0);
    const overallAcc = totalSeen ? Math.round((totalCorrect/totalSeen)*100) : 0;
    const lastSeen = rows.reduce((m,r)=> Math.max(m, r.lastSeen||0), 0);
    const longestStreak = rows.reduce((m,r)=> Math.max(m, r.streak||0), 0);

    document.getElementById('kpi-total').textContent  = totalSeen || '0';
    document.getElementById('kpi-acc').textContent    = totalSeen ? (overallAcc + '%') : '—';
    document.getElementById('kpi-streak').textContent = longestStreak || 0;
    document.getElementById('kpi-last').textContent   = lastSeen ? new Date(lastSeen).toLocaleString() : '—';

    // Weak words table (smart list)
    const weak = await fetchWeakWords(15);
    const map = Object.fromEntries(rows.map(r=>[r.word, r]));
    const tbody = document.getElementById('weak-tbody');
    if (!weak.length) {
      tbody.innerHTML = `<tr><td colspan="4">No history yet. Do a training session first.</td></tr>`;
      document.getElementById('btn-start-smart').onclick = ()=> alert('Practice first to build a smart list.');
      return;
    }
    tbody.innerHTML = weak.map(w=>{
      const r = map[w] || {};
      return `<tr>
        <td>${w}</td>
        <td>${(r.accuracy ?? 0)}%</td>
        <td>${r.seen ?? 0}</td>
        <td>${r.lastSeen ? new Date(r.lastSeen).toLocaleDateString() : '—'}</td>
      </tr>`;
    }).join('');

    // Start Smart Review button
    document.getElementById('btn-start-smart').onclick = startSmartReview;
  }

  // ===== Helpers =====
  function splitWords(text){
    return [...new Set(String(text||'').replace(/\r/g,'').split(/[\n,;,|\/\t,\s]+/).map(w=>w.trim()).filter(w=>w.length>1))];
  }
  function shuffleInPlace(arr, takeCount){
    // Fisher-Yates
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    if (takeCount && arr.length>takeCount) arr.length = takeCount;
  }

})();
