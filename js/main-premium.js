/* ==================== SpellRightPro Premium — FULL ==================== */
(function () {
  'use strict';

  /* ==================== GLOBAL STATE ==================== */
  let currentUser = null;
  let premiumUser = false;

  let examType = "OET";          // "OET" | "Bee" | "School"
  let accent   = "en-US";        // "en-US" | "en-GB" | "en-AU"
  let sessionMode = "practice";  // "practice" | "test"

  let words = [];
  let originalWords = [];
  let flaggedWords = new Set();
  let correctCount = 0;
  let wrongCount = 0;
  let totalAsked = 0;
  let currentIndex = 0;
  let isSpeaking = false;
  let isListening = false;
  let listeningController = null;
  let ttsVoice = null;

  // UI refs
  let appTitle, trainerArea, summaryArea, examUIRoot;

  // Firebase
  let app, auth, db, analytics;

  /* ==================== HELPERS ==================== */
  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function nowISO() { return new Date().toISOString(); }

  function log(...args) { console.log("[SRP Premium]", ...args); }
  function warn(...args) { console.warn("[SRP Premium]", ...args); }

  function selectVoice(accent) {
    const list = speechSynthesis.getVoices() || [];
    if (!list.length) return null;
    let v = list.find(v => v.lang === accent) || list.find(v => v.lang?.startsWith(accent.split('-')[0]));
    return v || list[0] || null;
  }

  function speak(text, { rate = 1, pitch = 1, volume = 1 } = {}) {
    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (ttsVoice) u.voice = ttsVoice;
        u.rate = rate; u.pitch = pitch; u.volume = volume;
        u.onend = () => { isSpeaking = false; resolve(); };
        isSpeaking = true;
        window.speechSynthesis.speak(u);
      } catch (e) { isSpeaking = false; resolve(); }
    });
  }

  function stopSpeaking() { try { window.speechSynthesis.cancel(); } catch {} isSpeaking = false; }

  function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = accent || "en-US";
    rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 1;
    return rec;
  }

  function startListeningOnce() {
    return new Promise((resolve) => {
      const rec = createRecognition();
      if (!rec) return resolve(null);
      isListening = true; listeningController = rec;
      rec.onresult = (e) => {
        isListening = false; listeningController = null;
        const result = (e.results?.[0]?.[0]?.transcript || "").trim();
        resolve(result);
      };
      rec.onerror = () => { isListening = false; listeningController = null; resolve(null); };
      rec.onend = () => { isListening = false; listeningController = null; };
      try { rec.start(); } catch { isListening = false; listeningController = null; resolve(null); }
    });
  }

  function stopListening() { try { listeningController?.stop(); } catch {} isListening = false; }

  function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function uniqueWords(arr) {
    const s = new Set(); const out = [];
    for (const w of arr) {
      const k = (w || "").trim().toLowerCase();
      if (k && !s.has(k)) { s.add(k); out.push(w.trim()); }
    }
    return out;
  }

  /* ==================== FIREBASE INIT ==================== */
  async function initFirebase() {
    try { app = firebase.app(); } catch { app = firebase.initializeApp(window.SRP_CONFIG); }
    auth = firebase.auth();
    db = firebase.firestore();
    analytics = firebase.analytics ? firebase.analytics() : null;
  }
  function track(eventName, params = {}) { try { analytics?.logEvent?.(eventName, params); } catch {} }

  /* ==================== UI TEMPLATES ==================== */
  function premiumHeaderHTML() {
    return `
      <div class="toolbar">
        <div class="toolbar-left">
          <button id="logout-btn" class="btn danger small"><i class="fa fa-sign-out-alt"></i> Logout</button>
        </div>
        <div class="toolbar-right">
          <label class="toggle"><input type="checkbox" id="mode-toggle" /><span>Test Mode</span></label>
        </div>
      </div>
      <div class="input-group">
        <select id="exam-type" class="form-control">
          <option value="OET">OET Spelling</option>
          <option value="Bee">Spelling Bee (Voice)</option>
          <option value="School">School Lists</option>
        </select>
        <select id="accent-select" class="form-control" style="max-width:150px;">
          <option value="en-US">American English</option>
          <option value="en-GB">British English</option>
          <option value="en-AU">Australian English</option>
        </select>
        <button id="shuffle-btn" class="btn outline"><i class="fa fa-random"></i> Shuffle</button>
        <button id="repeat-btn" class="btn outline"><i class="fa fa-volume-up"></i> Repeat</button>
        <button id="flag-btn" class="btn"><i class="fa fa-flag"></i> Flag</button>
      </div>`;
  }

  function premiumBodyHTML() {
    return `
      <div class="row">
        <div class="col">
          <h2 id="app-title" class="card-title">Premium</h2>
          <div class="muted" style="margin:4px 0 14px;"><p>Unlock OET, Bee, School lists, history & more.</p></div>
          <div id="word-audio" class="muted"></div>
          <div class="input-row">
            <input id="answer-input" type="text" class="form-control" placeholder="Type the spelling and press Enter" autocomplete="off"/>
            <button id="submit-btn" class="btn success">Submit</button>
            <button id="skip-btn" class="btn">Skip</button>
          </div>
        </div>
        <div class="col">
          <div class="card">
            <h3 class="card-title">Controls</h3>
            <div class="controls-grid">
              <label>Accent</label>
              <select id="accent-select-secondary" class="form-control">
                <option value="en-US">American English</option>
                <option value="en-GB">British English</option>
                <option value="en-AU">Australian English</option>
              </select>
              <label>Mode</label>
              <select id="mode-select" class="form-control">
                <option value="practice">Practice</option>
                <option value="test">Test</option>
              </select>
              <label>Session</label>
              <div id="progress-meta">0 / 0</div>
              <div id="score-meta">Score: 0</div>
            </div>
          </div>
          <div class="card" id="custom-upload-card">
            <h3 class="card-title">School List Upload</h3>
            <p class="muted">Upload .txt or .json with one word per line (Premium only).</p>
            <input type="file" id="file-upload" accept=".txt,.json,.docx,.pdf"/>
          </div>
        </div>
      </div>`;
  }

  function summaryHTML() {
    return `
      <div class="card">
        <h3 class="card-title">Session Summary</h3>
        <div id="summary-stats"></div>
        <div id="flagged-list"></div>
        <div style="margin-top:10px;">
          <button id="retry-flagged" class="btn outline">Retry Flagged</button>
          <button id="retry-wrong" class="btn outline">Retry Wrong</button>
          <button id="new-session" class="btn primary">New Session</button>
        </div>
      </div>`;
  }

  /* ==================== DOM BUILD ==================== */
  function buildUI() {
    examUIRoot.innerHTML = premiumHeaderHTML() + premiumBodyHTML();
    appTitle = $("#app-title");
    trainerArea.innerHTML = "";
    summaryArea.innerHTML = summaryHTML();
  }

  /* ==================== DATA LOADING ==================== */
  async function loadOET() { try { const res = await fetch("/oet.json", { cache: "no-cache" }); const data = await res.json(); return uniqueWords(data?.words || []); } catch { return []; } }
  async function loadBee() { try { const res = await fetch("/spelling-bee.json", { cache: "no-cache" }); const data = await res.json(); return uniqueWords(data?.words || []); } catch { return []; } }
  async function loadSchoolFromUpload(file) { try { const text = await file.text(); if (file.name.endsWith(".json")) { const parsed = JSON.parse(text); if (Array.isArray(parsed?.words)) return uniqueWords(parsed.words); } return uniqueWords(text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)); } catch { return []; } }

  /* ==================== TRAINER ==================== */
  function resetSession() { words=[];originalWords=[];flaggedWords.clear();correctCount=0;wrongCount=0;totalAsked=0;currentIndex=0;stopSpeaking();stopListening();$("#answer-input")?.focus();updateMeta(0,0); }
  function updateMeta(cur,total){$("#progress-meta").textContent=`${cur} / ${total}`;$("#score-meta").textContent=`Score: ${correctCount}`;}
  function showWord(word){$("#word-audio").textContent=`🔊 ${word}`;speak(word);}
  function askNext(){if(currentIndex>=words.length)return endSession();showWord(words[currentIndex]);}
  function submitAnswer(val){const input=(val||$("#answer-input")?.value||"").trim();const correct=(words[currentIndex]||"").trim();totalAsked++;if(input.toLowerCase()===correct.toLowerCase()){correctCount++;currentIndex++;}else{wrongCount++;currentIndex++;}updateMeta(currentIndex,words.length);askNext();}
  function endSession(){trainerArea.innerHTML="";$("#summary-stats").innerHTML=`<p>Words attempted:<strong>${totalAsked}</strong></p><p>Correct:<strong>${correctCount}</strong></p><p>Wrong:<strong>${wrongCount}</strong></p>`;const fl=Array.from(flaggedWords);$("#flagged-list").innerHTML=fl.length?`<p>Flagged words:</p><ul>${fl.map(w=>`<li>${w}</li>`).join("")}</ul>`:`<p>No flagged words this session.</p>`;summaryArea.classList.remove("hidden");track("session_end",{mode:sessionMode,examType,totalAsked,correctCount,wrongCount,at:nowISO()});}

  function onFlag(){const w=words[currentIndex];if(w) flaggedWords.add(w); }
  function onShuffle(){words=shuffle(words);currentIndex=0;updateMeta(0,words.length);askNext();}
  function setAccent(a){accent=a;ttsVoice=selectVoice(accent);}

  /* ==================== START MODES ==================== */
  async function startOETPractice(){resetSession();appTitle.textContent="OET Spelling Practice";words=await loadOET();originalWords=words.slice();updateMeta(0,words.length);askNext();}
  async function startBeePractice(){resetSession();appTitle.textContent="Spelling Bee Practice";words=await loadBee();originalWords=words.slice();updateMeta(0,words.length);askNext();}
  function startSchoolPractice(){resetSession();appTitle.textContent="School Spelling Practice";const f=$("#file-upload");if(!f?.files?.[0]){trainerArea.innerHTML=`<div class="muted">Upload a list with <strong>School List Upload</strong>.</div>`;return;} (async()=>{words=await loadSchoolFromUpload(f.files[0]);originalWords=words.slice();updateMeta(0,words.length);askNext();})();}

  /* ==================== WIRING ==================== */
  function wireUI(){const examTypeSel=$("#exam-type");$("#submit-btn")?.addEventListener("click",()=>submitAnswer());$("#skip-btn")?.addEventListener("click",()=>{currentIndex++;updateMeta(currentIndex,words.length);askNext();});$("#repeat-btn")?.addEventListener("click",()=>{const w=words[currentIndex];if(w) speak(w);});$("#shuffle-btn")?.addEventListener("click",onShuffle);$("#flag-btn")?.addEventListener("click",onFlag);$("#retry-flagged")?.addEventListener("click",()=>{const list=Array.from(flaggedWords);if(!list.length)return;words=list.slice();currentIndex=0;correctCount=wrongCount=totalAsked=0;updateMeta(0,words.length);askNext();});$("#retry-wrong")?.addEventListener("click",()=>{const wrong=originalWords.filter(w=>!flaggedWords.has(w));if(!wrong.length)return;words=wrong.slice();currentIndex=0;correctCount=wrongCount=totalAsked=0;updateMeta(0,words.length);askNext();});$("#new-session")?.addEventListener("click",()=>{if(examType==="OET")startOETPractice();else if(examType==="Bee")startBeePractice();else startSchoolPractice();});examTypeSel?.addEventListener("change",(e)=>{examType=e.target.value;if(examType==="OET")startOETPractice();else if(examType==="Bee")startBeePractice();else startSchoolPractice();});$("#accent-select")?.addEventListener("change",(e)=>setAccent(e.target.value));$("#accent-select-secondary")?.addEventListener("change",(e)=>setAccent(e.target.value));}

  /* ==================== AUTH ==================== */
  async function signOut(){try{await auth.signOut();location.href="/";}catch(e){warn(e);}}
  function drawSignedIn(user){currentUser=user;premiumUser=true;appTitle=$("#app-title");examUIRoot=$("#exam-ui");trainerArea=$("#trainer-area");summaryArea=$("#summary-area");buildUI();wireUI();ttsVoice=selectVoice(accent);startOETPractice();track("login_success",{uid:user.uid,at:nowISO()});}
  function drawSignedOut(){location.href="/";}

  /* ==================== PROMO ==================== */
  function setupPromoUI(){const note=$("#promo-note");const code=$("#premium-code");const countdown=$("#premium-countdown");const strikeM=$("#price-monthly-strike");const strikeA=$("#price-annual-strike");const discM=$("#price-monthly-discount");const discA=$("#price-annual-discount");if(window.PROMO?.active()){if(note)note.hidden=false;if(code)code.textContent=window.PROMO.code;function tick(){const left=Math.max(0,window.PROMO.endsAt()-Date.now());const d=Math.floor(left/86400000);const h=Math.floor((left%86400000)/3600000);const m=Math.floor((left%3600000)/60000);const s=Math.floor((left%60000)/1000);countdown.textContent=`${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;if(left<=0){if(note)note.hidden=true;strikeM?.classList.add("hidden");strikeA?.classList.add("hidden");discM.textContent="$9";discA.textContent="$7";clearInterval(iv);}}tick();const iv=setInterval(tick,1000);}else{strikeM?.classList.add("hidden");strikeA?.classList.add("hidden");discM.textContent="$9";discA.textContent="$7";}}
  function upgradeToPremium(){if(window.PROMO?.active()&&window.PROMO.checkoutUrl){location.href=window.PROMO.checkoutUrl;return;}const u=new URL("https://spellrightpro.org/checkout",location.href);if(window.PROMO?.active())u.searchParams.set("promo",window.PROMO.code);location.href=u.toString();}

  /* ==================== INIT ==================== */
  async function initApp(){await initFirebase();auth.onAuthStateChanged(user=>{if(user)drawSignedIn(user);else drawSignedOut();});document.body.addEventListener("click",(e)=>{if(e.target?.id==="logout-btn")signOut();});setupPromoUI();$("#upgrade-btn")?.addEventListener("click",upgradeToPremium);try{window.speechSynthesis.onvoiceschanged=()=>{ttsVoice=selectVoice(accent);};}catch{}}
  document.addEventListener("DOMContentLoaded", initApp);
})();
