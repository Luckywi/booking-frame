// 1. D'abord, créons un hook personnalisé amélioré (src/lib/hooks/useIframeResize.ts)
import { useEffect, useCallback, useRef } from 'react';

export const useIframeResize = () => {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const previousHeightRef = useRef<number>(0);
  const isResizingRef = useRef(false);

  const sendResizeMessage = useCallback((height: number) => {
    if (height !== previousHeightRef.current && !isResizingRef.current) {
      isResizingRef.current = true;
      previousHeightRef.current = height;
      window.parent.postMessage({ type: 'iframeResize', height }, '*');
      
      // Réinitialiser le verrou après un court délai
      setTimeout(() => {
        isResizingRef.current = false;
      }, 100);
    }
  }, []);

  const calculateHeight = useCallback(() => {
    // Obtenir tous les éléments qui peuvent affecter la hauteur
    const elements = [
      document.documentElement,
      document.body,
      ...Array.from(document.querySelectorAll('main, .booking-container, .client-form, .date-selector'))
    ];

    // Calculer la hauteur maximale
    const maxHeight = Math.max(
      ...elements.map(el => {
        if (!el) return 0;
        const styles = window.getComputedStyle(el);
        const margin = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
        return Math.ceil(el.getBoundingClientRect().height + margin);
      })
    );

    if (maxHeight > 0) {
      sendResizeMessage(maxHeight);
    }
  }, [sendResizeMessage]);

  useEffect(() => {
    // Configuration initiale
    calculateHeight();

    // Observer les changements de taille
    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(calculateHeight);
      });
    }

    // Observer le body et les éléments importants
    const elementsToObserve = [
      document.body,
      document.querySelector('.booking-container'),
      document.querySelector('.client-form'),
      document.querySelector('.date-selector')
    ].filter(Boolean);

    elementsToObserve.forEach(element => {
      resizeObserverRef.current?.observe(element as Element);
    });

    // Observer les mutations du DOM
    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(calculateHeight);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Écouter les événements spécifiques
    const events = ['load', 'resize', 'transitionend', 'animationend'];
    events.forEach(event => {
      window.addEventListener(event, calculateHeight);
    });

    // Écouter les messages du parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'requestHeight') {
        calculateHeight();
      }
    };
    window.addEventListener('message', handleMessage);

    // Nettoyage
    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserver.disconnect();
      events.forEach(event => {
        window.removeEventListener(event, calculateHeight);
      });
      window.removeEventListener('message', handleMessage);
    };
  }, [calculateHeight]);

  return calculateHeight;
};