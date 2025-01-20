// src/lib/hooks/useTemplateResize.ts
import { useEffect, useCallback, useRef } from 'react';

export const useTemplateResize = () => {
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousHeightRef = useRef<number>(0);

  const calculateHeight = useCallback(() => {
    const rootElement = document.documentElement;
    const bodyElement = document.body;
    
    const heights = [
      rootElement.scrollHeight,
      rootElement.offsetHeight,
      bodyElement.scrollHeight,
      bodyElement.offsetHeight,
      ...Array.from(bodyElement.children).map(el => el.scrollHeight),
    ];

    const maxHeight = Math.max(...heights.filter(h => h > 0));
    
    if (maxHeight !== previousHeightRef.current) {
      previousHeightRef.current = maxHeight;
      window.parent.postMessage({ 
        type: 'resize',
        height: maxHeight
      }, '*');
    }
  }, []);

  useEffect(() => {
    calculateHeight();

    const resizeObserver = new ResizeObserver(calculateHeight);
    resizeObserver.observe(document.body);

    const mutationObserver = new MutationObserver(calculateHeight);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener('popstate', calculateHeight);
    document.addEventListener('load', calculateHeight, true);

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('popstate', calculateHeight);
      document.removeEventListener('load', calculateHeight, true);
    };
  }, [calculateHeight]);

  return calculateHeight;
};

export default useTemplateResize;