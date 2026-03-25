// /js/error-tracking.js - Error logging and monitoring
(function() {
  'use strict';

  // Error tracking configuration
  const ERROR_CONFIG = {
    enabled: true,
    sampleRate: 1.0, // 100% of errors
    endpoint: '/api/log-error',
    maxErrorsPerSession: 10,
    includeStackTrace: true
  };

  let errorCount = 0;
  let sessionId = generateSessionId();

  // Generate unique session ID
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Send error to logging service
  async function logError(errorData) {
    if (!ERROR_CONFIG.enabled) return;
    if (errorCount >= ERROR_CONFIG.maxErrorsPerSession) return;

    errorCount++;

    // Add session info
    errorData.sessionId = sessionId;
    errorData.timestamp = new Date().toISOString();
    errorData.userAgent = navigator.userAgent;
    errorData.url = window.location.href;
    errorData.referrer = document.referrer;
    errorData.screenSize = `${window.innerWidth}x${window.innerHeight}`;
    errorData.darkMode = document.body.classList.contains('dark-mode');

    // Track in analytics
    if (window.trackEvent) {
      window.trackEvent('error_occurred', {
        error_type: errorData.type,
        error_message: errorData.message?.substring(0, 100),
        error_file: errorData.filename,
        error_line: errorData.lineno
      });
    }

    // Log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.error('[Error Tracking]', errorData);
      return;
    }

    // Send to server in production
    try {
      const response = await fetch(ERROR_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });
      
      if (!response.ok) {
        console.warn('Failed to log error:', response.status);
      }
    } catch (e) {
      // Silent fail - don't create infinite error loop
      console.warn('Error logging failed:', e);
    }
  }

  // Capture JavaScript errors
  window.addEventListener('error', function(event) {
    const errorData = {
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      category: 'uncaught'
    };
    
    logError(errorData);
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const errorData = {
      type: 'promise',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      category: 'unhandled_rejection'
    };
    
    logError(errorData);
  });

  // Monitor console errors (for development)
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Still call original
    originalConsoleError.apply(console, args);
    
    // Log to error tracking
    const errorData = {
      type: 'console',
      message: args.map(arg => {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
      }).join(' '),
      stack: args.find(arg => arg instanceof Error)?.stack,
      category: 'console_error'
    };
    
    logError(errorData);
  };

  // Monitor network errors
  if (window.PerformanceObserver) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          if (entry.responseStatus >= 400) {
            const errorData = {
              type: 'network',
              message: `Network request failed: ${entry.name} - Status: ${entry.responseStatus}`,
              url: entry.name,
              status: entry.responseStatus,
              category: 'network_error'
            };
            logError(errorData);
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  // Monitor page load performance
  window.addEventListener('load', function() {
    const perfData = window.performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    if (loadTime > 5000) { // > 5 seconds
      const errorData = {
        type: 'performance',
        message: `Slow page load: ${loadTime}ms`,
        loadTime: loadTime,
        category: 'performance'
      };
      logError(errorData);
    }
  });

  // Track critical user actions
  window.trackCriticalAction = function(action, details = {}) {
    if (window.trackEvent) {
      window.trackEvent('critical_action', {
        action: action,
        ...details,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Export for debugging
  if (window.location.hostname === 'localhost') {
    window.__errorTracking = {
      sessionId: sessionId,
      errorCount: () => errorCount,
      logError: logError
    };
  }

  console.log('📊 Error tracking initialized');
})();
