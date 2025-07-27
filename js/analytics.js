// analytics.js
import { analytics } from './firebase-config.js';

const startTime = Date.now();
let sessionWords = [];
let performanceMetrics = {
  timePerWord: [],
  retriesPerWord: []
};

export function trackEvent(eventName, params = {}) {
  try {
    if (!analytics) {
      console.warn('Analytics not available:', eventName, params);
      return;
    }

    const enhancedParams = {
      ...params,
      sessionDuration: Math.round((Date.now() - startTime) / 1000),
      darkMode: document.body.classList.contains('dark-mode'),
      userAgent: navigator.userAgent.substring(0, 50) // Truncate long UA strings
    };

    // Send to Firebase Analytics
    analytics.logEvent(eventName, enhancedParams);
    
    // Local tracking logic
    if (eventName === 'word_answered') {
      sessionWords.push(params.word);
      if (params.status === 'incorrect') {
        performanceMetrics.retriesPerWord.push({
          word: params.word,
          attempts: params.attempts || 1
        });
      }
    }

    if (eventName === 'session_completed') {
      const duration = enhancedParams.sessionDuration;
      const wordCount = sessionWords.length;
      
      analytics.logEvent('session_summary', {
        duration,
        wordCount,
        accuracy: wordCount > 0 ? Math.round((params.correctAnswers / wordCount) * 100) : 0,
        flaggedWords: params.flaggedWords || 0
      });

      // Reset session tracking
      sessionWords = [];
      performanceMetrics = { timePerWord: [], retriesPerWord: [] };
    }

  } catch (error) {
    console.error('Analytics error:', error);
  }
}

export function trackError(error, context = {}) {
  trackEvent('error_occurred', {
    error: error.message.substring(0, 100),
    stack: error.stack ? error.stack.substring(0, 200) : '',
    ...context
  });
}
