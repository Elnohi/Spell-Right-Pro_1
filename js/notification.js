// notification.js - Enhanced notification system
(function() {
  'use strict';

  function showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotes = document.querySelectorAll('.spellright-notification');
    existingNotes.forEach(note => note.remove());

    const note = document.createElement("div");
    note.className = `spellright-notification notification-${type}`;
    note.setAttribute('role', 'alert');
    note.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 16px 20px;
      border-radius: 12px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 12px;
      backdrop-filter: blur(10px);
    `;

    if (type === 'error') {
      note.style.background = 'linear-gradient(135deg, rgba(247, 37, 133, 0.95), rgba(181, 23, 158, 0.95))';
    } else if (type === 'success') {
      note.style.background = 'linear-gradient(135deg, rgba(76, 201, 240, 0.95), rgba(72, 149, 239, 0.95))';
    } else {
      note.style.background = 'linear-gradient(135deg, rgba(67, 97, 238, 0.95), rgba(58, 86, 212, 0.95))';
    }

    note.innerHTML = `
      <i class="fas ${
        type === 'error' ? 'fa-exclamation-circle' : 
        type === 'success' ? 'fa-check-circle' : 
        'fa-info-circle'
      }" style="font-size: 1.2rem;"></i> 
      <span>${message}</span>
    `;

    document.body.appendChild(note);

    // Animate in
    setTimeout(() => {
      note.style.transform = 'translateY(0)';
      note.style.opacity = '1';
    }, 100);

    // Auto remove
    setTimeout(() => {
      note.style.transform = 'translateY(100px)';
      note.style.opacity = '0';
      setTimeout(() => note.remove(), 300);
    }, 5000);

    // Track analytics if available
    if (window.SpellRightAnalytics) {
      window.SpellRightAnalytics.trackEvent('notification_shown', 'ui', type);
    }
  }

  // Export to global scope
  window.SpellRightNotification = {
    show: showNotification
  };

  console.log('✅ Notification system loaded');
})();
