"use client";

import { useEffect, useRef } from 'react';
import { isInIframe } from '@/lib/api-client';

/**
 * This component fixes scrolling issues in RAGEMP iframe environments.
 * It applies a combination of techniques to ensure scrolling continues to work
 * even after extended interaction.
 */
export default function GameFrameScrollFix() {
  const fixAppliedRef = useRef(false);

  useEffect(() => {
    // Only apply in iframe contexts
    if (!isInIframe() || fixAppliedRef.current) return;

    console.log('[ScrollFix] Applying RAGEMP scrolling fixes');
    fixAppliedRef.current = true;

    // 1. Fix for overflow issues that can cause scrolling to stop working
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = '100%';
    document.documentElement.style.height = '100%';

    // 2. Periodically check and reset overflow values if needed
    const overflowInterval = setInterval(() => {
      if (document.documentElement.style.overflow !== 'auto' || 
          document.body.style.overflow !== 'auto') {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        console.log('[ScrollFix] Reset overflow styles');
      }
    }, 2000);

    // 3. Use wheel event to ensure scrolling keeps working
    const handleWheel = (e: WheelEvent) => {
      // Only intercept if scrolling seems broken (hasn't changed recently)
      const scrollPos = window.scrollY;
      
      // Get the target element
      const target = e.target as HTMLElement;
      if (!target) return;

      // Find the closest scrollable parent
      let scrollable = findScrollableParent(target);
      
      // If we found a scrollable element that isn't the document, let it scroll naturally
      if (scrollable && scrollable !== document.documentElement && scrollable !== document.body) {
        return;
      }

      // Otherwise, handle the scroll ourselves
      window.scrollTo({
        top: scrollPos + e.deltaY,
        behavior: 'auto' // Use 'auto' for consistent behavior
      });
    };

    // Find the closest scrollable parent of an element
    const findScrollableParent = (element: HTMLElement): HTMLElement | null => {
      if (!element) return document.documentElement;
      
      // Check if element can scroll
      const style = window.getComputedStyle(element);
      const overflowY = style.getPropertyValue('overflow-y');
      
      if (
        overflowY === 'auto' || 
        overflowY === 'scroll' || 
        (element.scrollHeight > element.clientHeight && overflowY !== 'hidden')
      ) {
        return element;
      }
      
      // Check parent
      return element.parentElement ? findScrollableParent(element.parentElement) : document.documentElement;
    };

    // 4. Touch events for mobile
    let lastTouchY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = lastTouchY - currentY;
      lastTouchY = currentY;
      
      // Check if we need to handle this touch move
      const target = e.target as HTMLElement;
      const scrollable = findScrollableParent(target);
      
      if (scrollable && scrollable !== document.documentElement && scrollable !== document.body) {
        // Natural scrolling for elements that can scroll
        return;
      }
      
      // Manual scroll
      window.scrollBy(0, deltaY);
    };

    // Add event listeners
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      // Clean up
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      clearInterval(overflowInterval);
    };
  }, []);

  // Component doesn't render anything visible
  return null;
} 