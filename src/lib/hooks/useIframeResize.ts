import { useEffect, useCallback, useRef } from 'react';

export const useIframeResize = (currentStep: number) => {
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousHeightRef = useRef<number>(0);

  const calculateHeight = useCallback(() => {
    const rootElement = document.documentElement;
    const bodyElement = document.body;
    
    // Get all possible height measurements
    const heights = [
      rootElement.scrollHeight,
      rootElement.offsetHeight,
      bodyElement.scrollHeight,
      bodyElement.offsetHeight,
      // Get heights of all direct children of body
      ...Array.from(bodyElement.children).map(el => el.scrollHeight),
    ];

    // Filter out 0 and get the maximum height
    const maxHeight = Math.max(...heights.filter(h => h > 0));
    
    // Only update if height has changed
    if (maxHeight !== previousHeightRef.current) {
      previousHeightRef.current = maxHeight;
      window.parent.postMessage({ 
        type: 'resize',
        height: maxHeight,
        step: currentStep
      }, '*');
    }
  }, [currentStep]);

  const debouncedResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      calculateHeight();
    }, 50);
  }, [calculateHeight]);

  useEffect(() => {
    // Initial calculation
    calculateHeight();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(document.body);

    // Set up MutationObserver for DOM changes
    const mutationObserver = new MutationObserver(debouncedResize);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Handle back/forward navigation
    window.addEventListener('popstate', calculateHeight);

    // Handle dynamic content loading
    document.addEventListener('load', calculateHeight, true);

    // Cleanup
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('popstate', calculateHeight);
      document.removeEventListener('load', calculateHeight, true);
    };
  }, [calculateHeight, debouncedResize]);

  // Ajout d'un listener pour les messages de recalcul
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'recalculateHeight') {
        calculateHeight();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [calculateHeight]);

  return calculateHeight;
};

export default useIframeResize;