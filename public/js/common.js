// Add to common.js after existing code

// ========================================================
// TIER MANAGEMENT SYSTEM
// ========================================================

window.tierManager = {
  // Current user tier
  currentTier: 'free', // 'free', 'premium', 'trial'
  
  // Feature gates
  featureLimits: {
    free: {
      customLists: 3,
      practiceHistory: 5, // last 5 sessions
      sessionHistory: 24, // hours
      customWordsPerDay: 1,
      oetCategories: 1,
      mistakeReview: 'last-session',
      progressDashboard: false,
      realTimeFeedback: false,
      spacedRepetition: false,
      crossDeviceSync: false,
      premiumContent: false,
      ads: true
    },
    premium: {
      customLists: null, // unlimited
      practiceHistory: null, // unlimited
      sessionHistory: null, // unlimited
      customWordsPerDay: null, // unlimited
      oetCategories: null, // all
      mistakeReview: 'all-time',
      progressDashboard: true,
      realTimeFeedback: true,
      spacedRepetition: true,
      crossDeviceSync: true,
      premiumContent: true,
      ads: false
    }
  },

  // Initialize tier from localStorage or auth
  init: function() {
    const savedTier = localStorage.getItem('userTier');
    const premiumData = localStorage.getItem('premiumUser');
    
    if (premiumData) {
      try {
        const data = JSON.parse(premiumData);
        if (data.active && new Date(data.expiryDate) > new Date()) {
          this.currentTier = 'premium';
        }
      } catch (e) {
        console.warn('Invalid premium data:', e);
      }
    } else if (savedTier && ['free', 'premium', 'trial'].includes(savedTier)) {
      this.currentTier = savedTier;
    }
    
    console.log(`🎯 Tier initialized: ${this.currentTier}`);
    return this.currentTier;
  },

  // Check if user can access a feature
  canAccess: function(feature) {
    const limits = this.featureLimits[this.currentTier] || this.featureLimits.free;
    
    switch(feature) {
      case 'customLists':
        return this.checkCustomListLimit();
      case 'practiceHistory':
        return this.checkHistoryLimit();
      case 'realTimeFeedback':
        return limits.realTimeFeedback;
      case 'progressDashboard':
        return limits.progressDashboard;
      case 'spacedRepetition':
        return limits.spacedRepetition;
      case 'crossDeviceSync':
        return limits.crossDeviceSync;
      case 'premiumContent':
        return limits.premiumContent;
      case 'mistakeReview':
        return limits.mistakeReview;
      default:
        return true;
    }
  },

  // Check custom list limit
  checkCustomListLimit: function() {
    if (this.currentTier === 'premium') return true;
    
    const savedLists = JSON.parse(localStorage.getItem('userCustomLists') || '{}');
    const listCount = Object.keys(savedLists).length;
    const limit = this.featureLimits.free.customLists;
    
    return listCount < limit;
  },

  // Check practice history limit
  checkHistoryLimit: function() {
    if (this.currentTier === 'premium') return true;
    
    const history = JSON.parse(localStorage.getItem('practiceHistory') || '[]');
    const limit = this.featureLimits.free.practiceHistory;
    
    return history.length < limit;
  },

  // Get current limit for a feature
  getLimit: function(feature) {
    const limits = this.featureLimits[this.currentTier] || this.featureLimits.free;
    return limits[feature];
  },

  // Set user tier
  setTier: function(tier, data = null) {
    if (!['free', 'premium', 'trial'].includes(tier)) {
      console.error('Invalid tier:', tier);
      return false;
    }
    
    this.currentTier = tier;
    localStorage.setItem('userTier', tier);
    
    if (tier === 'premium' && data) {
      localStorage.setItem('premiumUser', JSON.stringify(data));
    } else if (tier === 'free') {
      localStorage.removeItem('premiumUser');
    }
    
    console.log(`🔄 Tier updated to: ${tier}`);
    this.dispatchTierChange();
    return true;
  },

  // Dispatch event when tier changes
  dispatchTierChange: function() {
    const event = new CustomEvent('tierChange', {
      detail: { tier: this.currentTier }
    });
    document.dispatchEvent(event);
  },

  // Show upgrade prompt
  showUpgradePrompt: function(feature, context = '') {
    const messages = {
      customLists: `You've reached the free limit of ${this.featureLimits.free.customLists} custom lists.`,
      practiceHistory: `Free users can only see last ${this.featureLimits.free.practiceHistory} sessions.`,
      realTimeFeedback: 'Real-time spelling feedback is a Premium feature.',
      progressDashboard: 'Progress tracking dashboard is a Premium feature.',
      spacedRepetition: 'Spaced repetition system is a Premium feature.',
      crossDeviceSync: 'Cross-device sync is a Premium feature.',
      premiumContent: 'Premium content packs require Premium access.',
      mistakeReview: 'Full mistake history requires Premium access.'
    };

    const message = messages[feature] || 'This feature requires Premium access.';
    
    // Create upgrade modal
    const modal = document.createElement('div');
    modal.className = 'upgrade-modal';
    modal.innerHTML = `
      <div class="upgrade-modal-content">
        <h3>💎 Upgrade to Premium</h3>
        <p>${message}</p>
        ${context ? `<p><small>${context}</small></p>` : ''}
        <div class="upgrade-features">
          <div class="feature-item">✓ Unlimited custom lists</div>
          <div class="feature-item">✓ Full practice history</div>
          <div class="feature-item">✓ Progress dashboard</div>
          <div class="feature-item">✓ Spaced repetition</div>
          <div class="feature-item">✓ Cross-device sync</div>
          <div class="feature-item">✓ Premium content</div>
        </div>
        <div class="upgrade-actions">
          <button class="btn-secondary" onclick="this.closest('.upgrade-modal').remove()">Maybe Later</button>
          <button class="btn-premium" onclick="window.location.href='/pricing.html'">View Plans</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add CSS if not already present
    if (!document.querySelector('#upgrade-modal-styles')) {
      const styles = document.createElement('style');
      styles.id = 'upgrade-modal-styles';
      styles.textContent = `
        .upgrade-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }
        
        .upgrade-modal-content {
          background: white;
          border-radius: 16px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
        }
        
        .dark-mode .upgrade-modal-content {
          background: #1a1a2e;
          color: white;
        }
        
        .upgrade-modal h3 {
          color: #7b2ff7;
          margin-top: 0;
          text-align: center;
        }
        
        .upgrade-features {
          background: rgba(123, 47, 247, 0.05);
          border-radius: 10px;
          padding: 15px;
          margin: 20px 0;
        }
        
        .dark-mode .upgrade-features {
          background: rgba(123, 47, 247, 0.1);
        }
        
        .feature-item {
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        
        .dark-mode .feature-item {
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .feature-item:last-child {
          border-bottom: none;
        }
        
        .upgrade-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .upgrade-actions button {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(styles);
    }
  }
};

// Initialize tier manager on load
document.addEventListener('DOMContentLoaded', function() {
  window.tierManager.init();
  
  // Listen for tier changes
  document.addEventListener('tierChange', function(e) {
    console.log('Tier changed to:', e.detail.tier);
    // Update UI based on tier
    updateUIForTier(e.detail.tier);
  });
});

// Update UI based on tier
function updateUIForTier(tier) {
  // Update any tier indicators in the UI
  const tierIndicators = document.querySelectorAll('[data-tier-indicator]');
  tierIndicators.forEach(el => {
    el.textContent = tier === 'premium' ? 'Premium User' : 'Free User';
    el.className = tier === 'premium' ? 'premium-badge' : 'free-badge';
  });
  
  // Update feature visibility
  if (tier === 'free') {
    // Hide premium-only features
    document.querySelectorAll('[data-premium-only]').forEach(el => {
      el.style.display = 'none';
    });
  } else {
    // Show premium features
    document.querySelectorAll('[data-premium-only]').forEach(el => {
      el.style.display = '';
    });
  }
}
