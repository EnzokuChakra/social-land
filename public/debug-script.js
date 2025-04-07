// Debug script for iframe and authentication issues
(function() {
  console.log('[DEBUG] Debug script loaded at', new Date().toISOString());
  
  // Detect if we're in an iframe
  const isInIframe = window !== window.parent;
  console.log('[DEBUG] Running in iframe:', isInIframe);
  
  // Original error handler
  const originalOnError = window.onerror;
  
  // Override window.onerror to log more details
  window.onerror = function(message, source, lineno, colno, error) {
    console.log('[DEBUG] Client error captured:', {
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
      time: new Date().toISOString(),
      inIframe: isInIframe,
      url: window.location.href,
      cookiesEnabled: navigator.cookieEnabled
    });
    
    // Let the original handler run
    if (originalOnError) {
      return originalOnError.apply(this, arguments);
    }
    return false;
  };
  
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    console.log('[DEBUG] Unhandled Promise Rejection:', {
      reason: event.reason,
      stack: event.reason?.stack,
      time: new Date().toISOString(),
      inIframe: isInIframe,
      url: window.location.href
    });
  });
  
  // Monitor network requests
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0]?.url || args[0];
      console.log('[DEBUG] Fetch request:', {
        url,
        method: args[1]?.method || 'GET',
        time: new Date().toISOString(),
        inIframe: isInIframe
      });
      
      return originalFetch.apply(this, args)
        .then(response => {
          console.log('[DEBUG] Fetch response:', {
            url,
            status: response.status,
            ok: response.ok,
            time: new Date().toISOString()
          });
          return response;
        })
        .catch(error => {
          console.log('[DEBUG] Fetch error:', {
            url,
            error: error.message,
            stack: error.stack,
            time: new Date().toISOString()
          });
          throw error;
        });
    };
  }
  
  // Check storage access
  try {
    localStorage.setItem('debugTest', 'true');
    const storageAccess = localStorage.getItem('debugTest') === 'true';
    console.log('[DEBUG] Local storage access:', storageAccess);
  } catch (e) {
    console.log('[DEBUG] Local storage access error:', e.message);
  }
  
  // Try to catch the specific error shown in the screenshot
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string' && 
        args[0].includes('client-side exception')) {
      console.log('[DEBUG] Client-side exception details:', {
        message: args[0],
        additionalInfo: args.slice(1),
        time: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer
      });
    }
    return originalConsoleError.apply(this, args);
  };
})(); 