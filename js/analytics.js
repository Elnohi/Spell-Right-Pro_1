import { analytics } from './firebase-config.js';

const startTime = Date.now();
let sessionWords = [];
let performanceMetrics = {
  timePerWord: [],
  retriesPerWord: []
};

export function trackEvent(eventName, params = {}) {
  const enhancedParams = {
    ...params,
    sessionDuration: (Date.now() - startTime) / 1000,
    darkMode: localStorage.getItem('darkMode') === 'enabled',
    userAgent: navigator.userAgent
  };
  
  analytics.logEvent(eventName, enhancedParams);
  
  if (eventName === 'word_answered') {
    sessionWords.push(params.word);
    if (params.status === 'incorrect') {
      performanceMetrics.retriesPerWord.push({
        word: params.word,
        attempts: 1
      });
    }
  }
  
  if (eventName === 'word_spoken') {
    performanceMetrics.timePerWord.push({
      word: params.word,
      timestamp: Date.now()
    });
  }
  
  if (eventName === 'session_completed') {
    const avgTimePerWord = performanceMetrics.timePerWord.length > 1 ? 
      (performanceMetrics.timePerWord[performanceMetrics.timePerWord.length - 1].timestamp - 
       performanceMetrics.timePerWord[0].timestamp) / performanceMetrics.timePerWord.length : 0;
    
    trackEvent('session_performance', {
      avgTimePerWord,
      uniqueWords: [...new Set(sessionWords)].length,
      retries: performanceMetrics.retriesPerWord.length
    });
    
    sessionWords = [];
    performanceMetrics = {
      timePerWord: [],
      retriesPerWord: []
    };
  }
}

export function trackError(error, context = {}) {
  trackEvent('error_occurred', {
    error_message: error.message,
    error_stack: error.stack,
    ...context
  });
  
  if (window.console && console.error) {
    console.error(error);
  }
}
