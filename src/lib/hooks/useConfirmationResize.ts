import { useEffect, useCallback } from 'react';

export const useConfirmationResize = () => {
  const calculateHeight = useCallback(() => {
    const container = document.querySelector('.confirmation-container');
    const mainContent = document.querySelector('.confirmation-content');
    const detailsSection = document.querySelector('.confirmation-details');
    const historySection = document.querySelector('.confirmation-history');

    if (!container || !mainContent) return;

    const totalHeight = mainContent.getBoundingClientRect().height;
    const minHeight = 800;
    const padding = 32;

    const finalHeight = Math.max(totalHeight + padding, minHeight);

    window.parent.postMessage({
      type: 'resize',
      height: finalHeight
    }, '*');
  }, []);

  useEffect(() => {
    window.parent.postMessage({ 
      type: 'pageChange',
      step: 4
    }, '*');

    setTimeout(calculateHeight, 0);

    const observer = new MutationObserver(() => {
      setTimeout(calculateHeight, 0);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'requestHeight') {
        calculateHeight();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', calculateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('resize', calculateHeight);
    };
  }, [calculateHeight]);

  return calculateHeight;
};