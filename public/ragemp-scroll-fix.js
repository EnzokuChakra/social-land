/**
 * RAGEMP Scroll Fix Script
 * 
 * This script fixes common scrolling issues in RAGEMP iframe environments.
 * It should be included in pages where scrolling might break after extended use.
 */
(function() {
  // Only run in iframe contexts
  if (window === window.parent) return;
  
  console.log('[RAGEMP] Scroll fix script initialized');
  
  // Force correct overflow and height settings
  document.documentElement.style.height = '100%';
  document.documentElement.style.overflowY = 'auto';
  document.body.style.height = '100%';
  document.body.style.overflowY = 'auto';
  
  // Periodic check to ensure scroll properties don't get changed
  setInterval(function() {
    // Reset if something changed our overflow settings
    if (document.documentElement.style.overflowY !== 'auto' ||
        document.body.style.overflowY !== 'auto') {
      document.documentElement.style.overflowY = 'auto';
      document.body.style.overflowY = 'auto';
    }
  }, 1000);

  // Handle wheel events directly
  let lastScrollTop = 0;
  let scrollStuckCounter = 0;

  // Check if scrolling is stuck
  setInterval(function() {
    const currentScrollTop = window.scrollY;
    
    // If scroll position hasn't changed after user interaction, it might be stuck
    if (currentScrollTop === lastScrollTop && document.hasFocus()) {
      scrollStuckCounter++;
      if (scrollStuckCounter > 5) {
        // Try to "unstick" scrolling by forcing a small scroll
        window.scrollBy(0, 1);
        window.scrollBy(0, -1);
        console.log('[RAGEMP] Attempted to unstick scrolling');
        scrollStuckCounter = 0;
      }
    } else {
      scrollStuckCounter = 0;
      lastScrollTop = currentScrollTop;
    }
  }, 1000);

  // Passive scroll handler
  window.addEventListener('wheel', function(e) {
    lastScrollTop = window.scrollY;
  }, { passive: true });
  
  // Improve touch scrolling
  document.addEventListener('touchmove', function() {
    lastScrollTop = window.scrollY;
  }, { passive: true });
  
  // Reset on window resize
  window.addEventListener('resize', function() {
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflowY = 'auto';
    document.body.style.height = '100%';
    document.body.style.overflowY = 'auto';
  });
  
  console.log('[RAGEMP] Scroll fix script complete');
})(); 