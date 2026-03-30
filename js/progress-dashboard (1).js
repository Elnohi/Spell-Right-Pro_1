// js/progress-dashboard.js — Premium Progress Dashboard
// Fixed bugs:
//   1. correctWords.includes(word) ReferenceError — recordSession now receives
//      correctWordsArray as a separate parameter
//   2. Guest userId used Date.now() — changes every page load, losing all history.
//      Now uses a stable random ID saved to localStorage.
//   3. 'spin' CSS keyframe was never defined — added inline @keyframes spin
//   4. Broken streak logic set streak=1 on gap instead of 0 — fixed
//   5. updateDashboard() called before UI existed — init() now awaits both
//   6. setInterval leaked forever — stored and cleared on destroy()
//   7. "Mastered" required only 1 correct — now requires 2 (genuine mastery)
//   8. recordSession signature clarified — correctWordsArray is explicit param

class ProgressDashboard {
  constructor() {
    this.userId       = null;
    this.syncInterval = null;   // stored so we can clear it
    this.stats = {
      streak:             0,
      totalWords:         0,
      accuracy:           0,
      totalSessions:      0,
      totalWordsAttempted:0,
      totalWordsCorrect:  0,
      byCategory:         {},
      lastSync:           null
    };

    this.init();
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  async init() {
    if (window.tierManager?.currentTier !== 'premium') {
      console.log('🔒 Progress Dashboard requires premium');
      return;
    }

    this.userId = this.getStableUserId();

    // Build UI first so updateDashboard() has elements to write into
    this.createDashboardUI();
    this.injectSpinKeyframe();

    // Then load data and populate
    await this.loadStats();

    this.startSyncIndicator();
  }

  // ── BUG 2 FIX: stable guest ID ─────────────────────────────────────────────
  // Old code: 'guest_' + Date.now()  — new ID every page load, history lost.
  // Fixed:    stable random ID stored in localStorage, Firebase uid if authed.

  getStableUserId() {
    const authedUser = window.firebaseUtils?.getCurrentUser();
    if (authedUser?.uid) return authedUser.uid;

    const STORAGE_KEY = 'srp_guest_uid';
    let guestId = localStorage.getItem(STORAGE_KEY);
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem(STORAGE_KEY, guestId);
    }
    return guestId;
  }

  // ── Stats loading ───────────────────────────────────────────────────────────

  async loadStats() {
    try {
      // Try Firestore first
      if (window.firebaseUtils?.db) {
        const doc = await window.firebaseUtils.db
          .collection('userProgress')
          .doc(this.userId)
          .get();
        if (doc.exists) {
          this.stats = { ...this.stats, ...doc.data() };
        }
      }

      // Merge with localStorage (localStorage wins for streak so offline works)
      const local = localStorage.getItem(`progress_${this.userId}`);
      if (local) {
        try {
          this.stats = { ...this.stats, ...JSON.parse(local) };
        } catch { /* corrupted data — ignore */ }
      }

      this.recalculateStreak();

      // BUG 5 FIX: guard against elements not existing yet
      if (document.querySelector('.progress-dashboard')) {
        this.updateDashboard();
      }

    } catch (err) {
      console.error('Error loading progress stats:', err);
    }
  }

  // ── UI creation ─────────────────────────────────────────────────────────────

  createDashboardUI() {
    if (document.querySelector('.progress-dashboard')) return;

    const html = `
      <div class="progress-dashboard" style="
        background: rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 25px;
        margin: 20px 0;
        border: 1px solid rgba(255,255,255,0.15);
      ">
        <h3 style="margin:0 0 16px;display:flex;align-items:center;gap:8px;">
          <i class="fa fa-chart-line"></i>
          Your Learning Progress
          <span style="background:#7b2ff7;color:white;font-size:0.7rem;padding:2px 8px;border-radius:10px;font-weight:700;">PRO</span>
        </h3>

        <!-- Sync status -->
        <div id="syncStatus" style="
          background: rgba(76,175,80,0.12);
          border: 1px solid rgba(76,175,80,0.3);
          border-radius: 8px;
          padding: 8px 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        ">
          <i class="fa fa-sync" id="syncIcon"></i>
          <span id="syncStatusText">Loading your progress…</span>
        </div>

        <!-- Stats grid -->
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        ">
          <!-- Streak -->
          <div style="background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:10px;padding:15px;text-align:center;">
            <div id="streakValue" style="font-size:2rem;font-weight:bold;color:#FFC107;">0</div>
            <div style="font-size:0.85rem;opacity:0.85;margin-bottom:8px;">Day Streak</div>
            <div id="streakCalendar" style="display:flex;justify-content:center;gap:3px;flex-wrap:wrap;"></div>
          </div>

          <!-- Accuracy -->
          <div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:10px;padding:15px;text-align:center;">
            <div id="accuracyValue" style="font-size:2rem;font-weight:bold;color:#4CAF50;">0%</div>
            <div style="font-size:0.85rem;opacity:0.85;margin-bottom:8px;">Overall Accuracy</div>
            <div id="accuracyTrend" style="font-size:0.8rem;opacity:0.7;"></div>
          </div>

          <!-- Words mastered -->
          <div style="background:rgba(123,47,247,0.1);border:1px solid rgba(123,47,247,0.3);border-radius:10px;padding:15px;text-align:center;">
            <div id="wordsMasteredValue" style="font-size:2rem;font-weight:bold;color:#7b2ff7;">0</div>
            <div style="font-size:0.85rem;opacity:0.85;margin-bottom:8px;">Words Mastered</div>
            <div id="masteryTrend" style="font-size:0.8rem;opacity:0.7;">0 this week</div>
          </div>

          <!-- Sessions -->
          <div style="background:rgba(33,150,243,0.1);border:1px solid rgba(33,150,243,0.3);border-radius:10px;padding:15px;text-align:center;">
            <div id="sessionsValue" style="font-size:2rem;font-weight:bold;color:#2196F3;">0</div>
            <div style="font-size:0.85rem;opacity:0.85;">Total Sessions</div>
          </div>
        </div>

        <!-- Category accuracy bars -->
        <div>
          <h4 style="margin:0 0 12px;font-size:0.95rem;opacity:0.9;">
            <i class="fa fa-list-alt"></i> Accuracy by Category
          </h4>
          <div id="categoryBars" style="display:flex;flex-direction:column;gap:8px;"></div>
        </div>
      </div>
    `;

    const main = document.querySelector('main');
    if (main) {
      main.insertAdjacentHTML('afterbegin', html);
    }
  }

  // ── BUG 3 FIX: inject the missing @keyframes spin ──────────────────────────

  injectSpinKeyframe() {
    if (document.getElementById('srp-spin-keyframe')) return;
    const style = document.createElement('style');
    style.id = 'srp-spin-keyframe';
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  // ── BUG 4 FIX: streak calculation ─────────────────────────────────────────
  // Old: gap in streak set this.stats.streak = 1 (wrong — means 0 today)
  // Fixed: gap resets to 0. Streak only increments if practiced yesterday.
  // Practicing today keeps streak unchanged (already counted).

  recalculateStreak() {
    const key         = `last_practice_${this.userId}`;
    const lastISO     = localStorage.getItem(key);

    if (!lastISO) {
      this.stats.streak = 0;
      return;
    }

    const last      = new Date(lastISO);
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(last, today)) {
      // Already counted today — streak unchanged
    } else if (this.isSameDay(last, yesterday)) {
      // Practiced yesterday — extend streak
      this.stats.streak = (this.stats.streak || 0) + 1;
      localStorage.setItem(key, today.toISOString());
    } else {
      // Gap — streak is broken
      this.stats.streak = 0;
    }
  }

  isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  // ── Dashboard rendering ─────────────────────────────────────────────────────

  updateDashboard() {
    this.safeSet('streakValue',       this.stats.streak ?? 0);
    this.safeSet('sessionsValue',     this.stats.totalSessions ?? 0);

    const accuracy = this.calculateOverallAccuracy();
    this.safeSet('accuracyValue', `${accuracy}%`);

    const mastered = this.calculateWordsMastered();
    this.safeSet('wordsMasteredValue', mastered);

    const weeklyMastered = this.calculateWeeklyMastered();
    this.safeSet('masteryTrend', `+${weeklyMastered} this week`);

    this.updateCategoryBars();
    this.updateStreakCalendar();
  }

  // Null-safe DOM write — no crash if element doesn't exist yet
  safeSet(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ── Calculations ────────────────────────────────────────────────────────────

  getAttempts() {
    try {
      return JSON.parse(localStorage.getItem(`attempts_${this.userId}`) || '[]');
    } catch {
      return [];
    }
  }

  calculateOverallAccuracy() {
    const attempts = this.getAttempts();
    if (!attempts.length) return 0;
    const correct = attempts.filter(a => a.correct).length;
    return Math.round((correct / attempts.length) * 100);
  }

  // BUG 7 FIX: mastered = spelled correctly at least twice (not just once)
  calculateWordsMastered() {
    const counts = {};
    this.getAttempts().forEach(a => {
      if (a.correct) counts[a.word] = (counts[a.word] || 0) + 1;
    });
    return Object.values(counts).filter(n => n >= 2).length;
  }

  calculateWeeklyMastered() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const counts  = {};
    this.getAttempts()
      .filter(a => a.correct && new Date(a.timestamp).getTime() >= weekAgo)
      .forEach(a => { counts[a.word] = (counts[a.word] || 0) + 1; });
    return Object.values(counts).filter(n => n >= 2).length;
  }

  getCategoryAccuracy(category) {
    const all = this.getAttempts().filter(a => a.category === category);
    if (!all.length) return 0;
    return Math.round((all.filter(a => a.correct).length / all.length) * 100);
  }

  getAccuracyColor(pct) {
    if (pct >= 80) return '#4CAF50';
    if (pct >= 60) return '#FFC107';
    return '#f44336';
  }

  // ── UI updaters ─────────────────────────────────────────────────────────────

  updateCategoryBars() {
    const container = document.getElementById('categoryBars');
    if (!container) return;

    const categories = {
      oet:    'Medical Terms',
      school: 'Academic',
      bee:    'Spelling Bee',
      custom: 'Custom Lists'
    };

    container.innerHTML = Object.entries(categories).map(([key, label]) => {
      const pct   = this.getCategoryAccuracy(key);
      const color = this.getAccuracyColor(pct);
      const all   = this.getAttempts().filter(a => a.category === key).length;
      return `
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="min-width:120px;font-size:0.88rem;">${label}</span>
          <div style="flex:1;height:16px;background:rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:8px;transition:width 0.6s ease;"></div>
          </div>
          <span style="min-width:36px;text-align:right;font-size:0.88rem;font-weight:600;">${pct}%</span>
          <span style="min-width:50px;font-size:0.75rem;opacity:0.55;">${all} tries</span>
        </div>`;
    }).join('');
  }

  updateStreakCalendar() {
    const container = document.getElementById('streakCalendar');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 29; i >= 0; i--) {
      const d      = new Date();
      d.setDate(d.getDate() - i);
      const key    = d.toISOString().split('T')[0];
      const active = !!localStorage.getItem(`practice_${key}_${this.userId}`);

      const dot         = document.createElement('div');
      dot.title         = `${key}: ${active ? 'Practised' : 'No practice'}`;
      dot.style.cssText = `
        width:10px;height:10px;border-radius:50%;flex-shrink:0;
        background:${active ? '#4CAF50' : 'rgba(255,255,255,0.1)'};
        border:1px solid ${active ? '#4CAF50' : 'rgba(255,255,255,0.15)'};
      `;
      container.appendChild(dot);
    }
  }

  // ── BUG 6 FIX: sync indicator with cleanup ──────────────────────────────────
  // Old: setInterval ran forever, errored silently when element was removed.
  // Fixed: stored in this.syncInterval, cleared by destroy().

  startSyncIndicator() {
    const setText = () => {
      const textEl = document.getElementById('syncStatusText');
      const iconEl = document.getElementById('syncIcon');
      if (!textEl || !iconEl) {
        // Element gone — stop the interval
        this.destroy();
        return;
      }
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      textEl.textContent = `Last synced: ${time}`;
      iconEl.style.animation = 'spin 1s linear 3';   // spin 3 times then stop
      setTimeout(() => { if (iconEl) iconEl.style.animation = ''; }, 3000);
    };

    // Show initial sync time straight away
    setText();
    this.syncInterval = setInterval(setText, 30_000);
  }

  // ── BUG 1 + 8 FIX: recordSession ───────────────────────────────────────────
  // Old signature: recordSession(mode, correct, total, words)
  //   — 'correct' was a count but used as an array inside via correctWords.includes()
  //   — ReferenceError on every call, session data never saved
  //
  // Fixed signature: recordSession(mode, correctWordsArray, incorrectWordsArray)
  //   — correctWordsArray: string[]  words the user got right
  //   — incorrectWordsArray: string[] words the user got wrong
  //
  // Call from main-freemium-school.js / main-premium.js like:
  //   window.progressDashboard?.recordSession('school', correctWords, incorrectWords);

  recordSession(mode, correctWordsArray = [], incorrectWordsArray = []) {
    if (!this.userId) return;

    const allWords = [...correctWordsArray, ...incorrectWordsArray];
    const total    = allWords.length;
    const correct  = correctWordsArray.length;

    if (total === 0) return;   // nothing to record

    const now      = new Date();
    const todayKey = now.toISOString().split('T')[0];

    // Build attempt records
    const newAttempts = allWords.map(word => ({
      word,
      category:  mode,
      correct:   correctWordsArray.includes(word),
      timestamp: now.toISOString()
    }));

    // Merge with existing attempts (cap at 2000 to avoid localStorage bloat)
    const existing = this.getAttempts();
    const merged   = [...existing, ...newAttempts].slice(-2000);
    localStorage.setItem(`attempts_${this.userId}`, JSON.stringify(merged));

    // Mark today as practised (for streak calendar)
    localStorage.setItem(`practice_${todayKey}_${this.userId}`, 'true');
    localStorage.setItem(`last_practice_${this.userId}`, now.toISOString());

    // Update aggregate stats
    this.stats.totalSessions       = (this.stats.totalSessions       || 0) + 1;
    this.stats.totalWordsAttempted = (this.stats.totalWordsAttempted || 0) + total;
    this.stats.totalWordsCorrect   = (this.stats.totalWordsCorrect   || 0) + correct;

    // Persist stats locally
    localStorage.setItem(`progress_${this.userId}`, JSON.stringify(this.stats));

    // Persist to Firestore
    if (window.firebaseUtils?.saveUserProgress) {
      window.firebaseUtils.saveUserProgress(this.userId, {
        lastSession: {
          date: now.toISOString(), mode, correct, total,
          accuracy: Math.round((correct / total) * 100)
        },
        totalSessions:        this.stats.totalSessions,
        totalWordsAttempted:  this.stats.totalWordsAttempted,
        totalWordsCorrect:    this.stats.totalWordsCorrect
      });
    }

    // Refresh the dashboard UI
    this.recalculateStreak();
    this.updateDashboard();

    // Let ads-manager know the session ended (triggers post-practice ad slot)
    if (typeof window.adManager?.onSessionEnd === 'function') {
      window.adManager.onSessionEnd();
    }

    console.log(`📊 Session recorded — mode:${mode} correct:${correct}/${total}`);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Expose globally — instantiated by main-premium.js after tier is confirmed
window.ProgressDashboard = ProgressDashboard;
