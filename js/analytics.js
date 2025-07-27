// analytics.js - Enhanced Version
import { analytics } from './firebase-config.js';

const sessionStart = Date.now();
const sessionEvents = [];

export function trackEvent(eventName, params = {}) {
  const eventData = {
    ...params,
    timestamp: new Date().toISOString(),
    sessionDuration: Math.round((Date.now() - sessionStart) / 1000),
    darkMode: document.body.classList.contains('dark-mode'),
    userAgent: navigator.userAgent.substring(0, 100)
  };

  // Store event locally for debugging
  sessionEvents.push({ eventName, ...eventData });
  
  try {
    if (!analytics) {
      console.warn('Firebase Analytics not available', eventName, eventData);
      return;
    }
    
    // Send to Firebase
    analytics.logEvent(eventName, eventData);
    
    // Special handling for session events
    if (eventName === 'session_end') {
      logSessionSummary(eventData);
    }
    
  } catch (error) {
    console.error('Analytics tracking failed:', error);
    // Fallback to console logging
    console.log('Analytics Event (fallback):', eventName, eventData);
  }
}

export function trackError(error, context = {}) {
  const errorData = {
    ...context,
    name: error.name,
    message: error.message.substring(0, 200),
    stack: error.stack ? error.stack.substring(0, 300) : 'none'
  };
  
  trackEvent('error_occurred', errorData);
}

function logSessionSummary(sessionData) {
  const wordEvents = sessionEvents.filter(e => 
    e.eventName === 'word_attempt'
  );
  
  const summary = {
    totalWords: wordEvents.length,
    correctAnswers: wordEvents.filter(e => e.status === 'correct').length,
    duration: sessionData.sessionDuration,
    flaggedWords: sessionData.flaggedWords || 0
  };
  
  if (analytics) {
    analytics.logEvent('session_summary', summary);
  }
  
  // Clear session data
  sessionEvents.length = 0;
}
