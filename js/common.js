// common.js - Universal utilities for all SpellRightPro pages
(function() {
  'use strict';

  // Dark Mode Toggle
  function initDarkModeToggle() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    const icon = document.getElementById('dark-mode-icon');

    function updateIcon() {
      if (icon) {
        icon.className = document.body.classList.contains('dark-mode')
          ? 'fas fa-sun'
          : 'fas fa-moon';
      }
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'true' : 'false');
        updateIcon();
      });

      // Initial state
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
      }
      updateIcon();
    }
  }

  // Loader Functions
  function showLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.style.display = 'flex';
  }

  function hideLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.style.display = 'none';
  }

  // Flagging System
  let flaggedWords = JSON.parse(localStorage.getItem('spellrightpro_flaggedWords')) || [];

  function toggleFlagWord(currentWord) {
    if (!currentWord) return;
    const idx = flaggedWords.indexOf(currentWord);
    if (idx === -1) {
      flaggedWords.push(currentWord);
    } else {
      flaggedWords.splice(idx, 1);
    }
    localStorage.setItem('spellrightpro_flaggedWords', JSON.stringify(flaggedWords));
    return idx === -1; // returns true if word was flagged, false if unflagged
  }

  function isWordFlagged(word) {
    return flaggedWords.includes(word);
  }

  function getFlaggedWords() {
    return JSON.parse(localStorage.getItem('spellrightpro_flaggedWords')) || [];
  }

  function clearFlaggedWords() {
    flaggedWords = [];
    localStorage.removeItem('spellrightpro_flaggedWords');
  }

  // Alert System
  function showAlert(message, type = 'error') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.spellright-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `spellright-alert alert-${type}`;
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    `;
    
    if (type === 'error') {
      alert.style.background = 'linear-gradient(135deg, #f72585, #b5179e)';
    } else if (type === 'success') {
      alert.style.background = 'linear-gradient(135deg, #4cc9f0, #4895ef)';
    } else {
      alert.style.background = 'linear-gradient(135deg, #4361ee, #3a56d4)';
    }

    alert.innerHTML = `
      <i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
      ${message}
    `;

    document.body.appendChild(alert);

    // Animate in
    setTimeout(() => {
      alert.style.transform = 'translateX(0)';
      alert.style.opacity = '1';
    }, 10);

    // Remove after delay
    setTimeout(() => {
      alert.style.transform = 'translateX(100%)';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 300);
    }, 4000);
  }

  // Practice Flagged Words Handler
  function handlePracticeFlaggedWords(startPracticeCallback) {
    const flagged = getFlaggedWords();
    if (!flagged.length) {
      showAlert("No flagged words yet! Flag words during practice to review them later.", 'info');
      return;
    }
    
    if (typeof startPracticeCallback === 'function') {
      startPracticeCallback(flagged);
    } else {
      // Default behavior - redirect to OET mode with flagged words
      localStorage.setItem('spellrightpro_customSession', JSON.stringify(flagged));
      showAlert(`Starting practice with ${flagged.length} flagged words!`, 'success');
      setTimeout(() => {
        window.location.href = 'freemium-oet.html?session=flagged';
      }, 1000);
    }
  }

  // Export to global scope
  window.SpellRightCommon = {
    initDarkModeToggle,
    showLoader,
    hideLoader,
    toggleFlagWord,
    isWordFlagged,
    getFlaggedWords,
    clearFlaggedWords,
    showAlert,
    handlePracticeFlaggedWords
  };

  // Auto-initialize dark mode on DOM ready
  document.addEventListener('DOMContentLoaded', initDarkModeToggle);

  console.log('✅ Common utilities loaded');
})();
