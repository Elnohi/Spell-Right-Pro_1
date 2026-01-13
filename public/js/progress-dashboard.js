// js/progress-dashboard.js - Premium Progress Dashboard
class ProgressDashboard {
  constructor() {
    this.userId = null;
    this.stats = {
      streak: 0,
      totalWords: 0,
      accuracy: 0,
      byCategory: {},
      lastSync: null
    };
    
    this.init();
  }
  
  init() {
    // Check if user is premium
    if (window.tierManager?.currentTier !== 'premium') {
      console.log('🔒 Progress Dashboard requires premium');
      return;
    }
    
    this.userId = this.getUserId();
    this.loadStats();
    this.createDashboardUI();
    this.startSyncIndicator();
  }
  
  getUserId() {
    // Get from Firebase auth or localStorage
    const user = window.firebaseUtils?.getCurrentUser();
    return user ? user.uid : 'guest_' + Date.now();
  }
  
  async loadStats() {
    try {
      // Try to load from Firestore
      if (window.firebaseUtils?.db) {
        const statsDoc = await window.firebaseUtils.db
          .collection('userProgress')
          .doc(this.userId)
          .get();
          
        if (statsDoc.exists) {
          this.stats = { ...this.stats, ...statsDoc.data() };
        }
      }
      
      // Fallback to localStorage
      const localStats = localStorage.getItem(`progress_${this.userId}`);
      if (localStats) {
        this.stats = { ...this.stats, ...JSON.parse(localStats) };
      }
      
      this.updateStreak();
      this.updateDashboard();
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }
  
  createDashboardUI() {
    // Check if dashboard already exists
    if (document.querySelector('.progress-dashboard')) return;
    
    const dashboardHTML = `
      <div class="progress-dashboard" style="
        background: rgba(255,255,255,0.1);
        border-radius: var(--radius);
        padding: 25px;
        margin: 20px 0;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
      ">
        <h3><i class="fa fa-chart-line"></i> Your Learning Progress <span class="premium-badge">PRO</span></h3>
        
        <!-- Sync Status -->
        <div class="sync-status" id="syncStatus" style="
          background: rgba(76, 175, 80, 0.15);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 8px;
          padding: 10px 15px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <i class="fa fa-sync"></i>
          <span id="syncStatusText">Syncing across devices...</span>
        </div>
        
        <!-- Stats Grid -->
        <div class="stats-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        ">
          <!-- Streak Card -->
          <div class="stat-card" style="
            background: rgba(255,193,7,0.1);
            border: 1px solid rgba(255,193,7,0.3);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
          ">
            <div class="stat-value" id="streakValue" style="
              font-size: 2rem;
              font-weight: bold;
              color: #FFC107;
            ">0</div>
            <div class="stat-label" style="
              font-size: 0.9rem;
              opacity: 0.9;
            ">Day Streak</div>
            <div class="streak-calendar" id="streakCalendar" style="
              margin-top: 10px;
              display: flex;
              justify-content: center;
              gap: 4px;
              flex-wrap: wrap;
            ">
              <!-- Calendar dots will be generated here -->
            </div>
          </div>
          
          <!-- Accuracy Card -->
          <div class="stat-card" style="
            background: rgba(76,175,80,0.1);
            border: 1px solid rgba(76,175,80,0.3);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
          ">
            <div class="stat-value" id="accuracyValue" style="
              font-size: 2rem;
              font-weight: bold;
              color: #4CAF50;
            ">0%</div>
            <div class="stat-label" style="
              font-size: 0.9rem;
              opacity: 0.9;
            ">Overall Accuracy</div>
            <div class="accuracy-trend" style="margin-top: 10px;">
              <canvas id="accuracyChart" width="100" height="40"></canvas>
            </div>
          </div>
          
          <!-- Words Mastered Card -->
          <div class="stat-card" style="
            background: rgba(123,47,247,0.1);
            border: 1px solid rgba(123,47,247,0.3);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
          ">
            <div class="stat-value" id="wordsMasteredValue" style="
              font-size: 2rem;
              font-weight: bold;
              color: #7b2ff7;
            ">0</div>
            <div class="stat-label" style="
              font-size: 0.9rem;
              opacity: 0.9;
            ">Words Mastered</div>
            <div class="mastery-timeline" style="
              margin-top: 10px;
              font-size: 0.8rem;
              opacity: 0.8;
            ">
              <i class="fa fa-arrow-up"></i> <span id="masteryTrend">0 this week</span>
            </div>
          </div>
        </div>
        
        <!-- Category Accuracy -->
        <div class="category-accuracy" style="margin-top: 20px;">
          <h4 style="margin-bottom: 15px;">
            <i class="fa fa-list-alt"></i> Accuracy by Category
          </h4>
          <div id="categoryBars" style="
            display: flex;
            flex-direction: column;
            gap: 8px;
          ">
            <!-- Category bars will be generated here -->
          </div>
        </div>
      </div>
    `;
    
    // Insert dashboard at the beginning of main content
    const main = document.querySelector('main');
    if (main) {
      main.insertAdjacentHTML('afterbegin', dashboardHTML);
    }
  }
  
  updateStreak() {
    const lastPractice = localStorage.getItem(`last_practice_${this.userId}`);
    if (!lastPractice) {
      this.stats.streak = 0;
      return;
    }
    
    const lastDate = new Date(lastPractice);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if practiced today or yesterday
    if (this.isSameDay(lastDate, today)) {
      // Already practiced today
    } else if (this.isSameDay(lastDate, yesterday)) {
      // Practiced yesterday, increment streak
      this.stats.streak++;
    } else {
      // Broken streak
      this.stats.streak = 1;
    }
    
    // Save today's practice
    localStorage.setItem(`last_practice_${this.userId}`, today.toISOString());
  }
  
  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
  
  updateDashboard() {
    // Update streak
    document.getElementById('streakValue').textContent = this.stats.streak;
    
    // Update accuracy
    const accuracy = this.calculateOverallAccuracy();
    document.getElementById('accuracyValue').textContent = `${accuracy}%`;
    
    // Update words mastered
    const mastered = this.calculateWordsMastered();
    document.getElementById('wordsMasteredValue').textContent = mastered;
    
    // Update category bars
    this.updateCategoryBars();
    
    // Update streak calendar
    this.updateStreakCalendar();
  }
  
  calculateOverallAccuracy() {
    const attempts = JSON.parse(localStorage.getItem(`attempts_${this.userId}`) || '[]');
    if (attempts.length === 0) return 0;
    
    const correct = attempts.filter(a => a.correct).length;
    return Math.round((correct / attempts.length) * 100);
  }
  
  calculateWordsMastered() {
    const attempts = JSON.parse(localStorage.getItem(`attempts_${this.userId}`) || '[]');
    const masteredWords = new Set();
    
    attempts.forEach(attempt => {
      if (attempt.correct) {
        masteredWords.add(attempt.word);
      }
    });
    
    return masteredWords.size;
  }
  
  updateCategoryBars() {
    const container = document.getElementById('categoryBars');
    if (!container) return;
    
    const categories = {
      'oet': 'Medical Terms',
      'school': 'Academic',
      'bee': 'Spelling Bee',
      'custom': 'Custom Lists'
    };
    
    container.innerHTML = '';
    
    Object.entries(categories).forEach(([key, label]) => {
      const accuracy = this.getCategoryAccuracy(key);
      const barHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
          <span style="min-width: 120px; font-size: 0.9rem;">${label}</span>
          <div style="flex: 1; height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
            <div style="
              width: ${accuracy}%;
              height: 100%;
              background: ${this.getAccuracyColor(accuracy)};
              transition: width 0.5s ease;
              border-radius: 10px;
            "></div>
          </div>
          <span style="min-width: 40px; text-align: right; font-weight: bold;">${accuracy}%</span>
        </div>
      `;
      container.innerHTML += barHTML;
    });
  }
  
  getCategoryAccuracy(category) {
    const attempts = JSON.parse(localStorage.getItem(`attempts_${this.userId}`) || '[]');
    const categoryAttempts = attempts.filter(a => a.category === category);
    
    if (categoryAttempts.length === 0) return 0;
    
    const correct = categoryAttempts.filter(a => a.correct).length;
    return Math.round((correct / categoryAttempts.length) * 100);
  }
  
  getAccuracyColor(accuracy) {
    if (accuracy >= 80) return '#4CAF50';
    if (accuracy >= 60) return '#FFC107';
    return '#f44336';
  }
  
  updateStreakCalendar() {
    const container = document.getElementById('streakCalendar');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Show last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dateKey = date.toISOString().split('T')[0];
      const practiced = localStorage.getItem(`practice_${dateKey}_${this.userId}`);
      
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${practiced ? '#4CAF50' : 'rgba(255,255,255,0.1)'};
        border: 1px solid ${practiced ? '#4CAF50' : 'rgba(255,255,255,0.2)'};
      `;
      dot.title = `${dateKey}: ${practiced ? 'Practiced' : 'No practice'}`;
      
      container.appendChild(dot);
    }
  }
  
  startSyncIndicator() {
    const syncText = document.getElementById('syncStatusText');
    if (!syncText) return;
    
    // Simulate sync status
    setInterval(() => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      syncText.textContent = `Last synced: ${time}`;
      
      // Add visual indicator
      const syncIcon = document.querySelector('#syncStatus i');
      syncIcon.style.animation = 'spin 2s linear';
      
      setTimeout(() => {
        syncIcon.style.animation = '';
      }, 2000);
    }, 30000); // Update every 30 seconds
  }
  
  // Call this after each practice session
  recordSession(mode, correct, total, words) {
    const sessionData = {
      date: new Date().toISOString(),
      mode: mode,
      correct: correct,
      total: total,
      accuracy: Math.round((correct / total) * 100),
      words: words
    };
    
    // Save to localStorage
    const attempts = JSON.parse(localStorage.getItem(`attempts_${this.userId}`) || '[]');
    
    words.forEach(word => {
      attempts.push({
        word: word,
        category: mode,
        correct: correctWords.includes(word),
        timestamp: new Date().toISOString()
      });
    });
    
    localStorage.setItem(`attempts_${this.userId}`, JSON.stringify(attempts));
    
    // Mark today as practiced
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`practice_${today}_${this.userId}`, 'true');
    
    // Save to Firestore if available
    if (window.firebaseUtils?.saveUserProgress) {
      window.firebaseUtils.saveUserProgress(this.userId, {
        lastSession: sessionData,
        totalSessions: (this.stats.totalSessions || 0) + 1,
        totalWordsAttempted: (this.stats.totalWordsAttempted || 0) + total,
        totalWordsCorrect: (this.stats.totalWordsCorrect || 0) + correct
      });
    }
    
    // Update dashboard
    this.loadStats();
  }
}

// Initialize dashboard when premium is loaded
window.ProgressDashboard = ProgressDashboard;

// Add to premium initialization in main-premium.js
// In the initializePremiumFeatures() function, add:
// window.progressDashboard = new ProgressDashboard();
