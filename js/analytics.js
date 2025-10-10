// ==========================================================
// SpellRightPro – Analytics Configuration
// ==========================================================

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-H09MF13297');

// Custom event tracking
function trackEvent(eventName, eventCategory, eventLabel) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      'event_category': eventCategory,
      'event_label': eventLabel
    });
  }
  console.log(`📊 Analytics Event: ${eventCategory} - ${eventName} - ${eventLabel}`);
}

// Track page views
function trackPageView(pageTitle) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'page_view', {
      'page_title': pageTitle,
      'page_location': window.location.href
    });
  }
}

// Track mode usage
function trackModeUsage(mode, action) {
  trackEvent(action, 'mode_usage', mode);
}

// Track session events
function trackSessionEvent(sessionType, wordCount, score) {
  trackEvent('session_complete', 'training', `${sessionType}_${wordCount}_${score}`);
}

// Export for use in other scripts
window.SpellRightAnalytics = {
  trackEvent,
  trackPageView,
  trackModeUsage,
  trackSessionEvent
};

console.log("✅ Analytics configured");
