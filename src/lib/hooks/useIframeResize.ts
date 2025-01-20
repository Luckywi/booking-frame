// src/lib/hooks/useIframeResize.ts

import { useEffect, useCallback, useRef } from 'react';

export const useIframeResize = () => {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const previousHeightRef = useRef<number>(0);

  const calculateHeight = useCallback(() => {
    const rootElement = document.documentElement;
    const bodyElement = document.body;
    
    // Obtenir toutes les hauteurs possibles
    const heights = [
      rootElement.scrollHeight,
      rootElement.offsetHeight,
      bodyElement.scrollHeight,
      bodyElement.offsetHeight,
      ...Array.from(bodyElement.children).map(el => el.scrollHeight),
    ];

    // Filtrer les 0 et obtenir la hauteur maximale
    const maxHeight = Math.max(...heights.filter(h => h > 0));
    
    // Mettre à jour uniquement si la hauteur a changé
    if (maxHeight !== previousHeightRef.current) {
      previousHeightRef.current = maxHeight;
      window.parent.postMessage({ 
        type: 'resize',
        height: maxHeight
      }, '*');
    }
  }, []);

  useEffect(() => {
    // Configuration initiale
    calculateHeight();

    // Observer les changements de taille
    resizeObserverRef.current = new ResizeObserver(calculateHeight);
    resizeObserverRef.current.observe(document.body);

    // Observer les mutations du DOM
    const mutationObserver = new MutationObserver(calculateHeight);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Nettoyage
    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserver.disconnect();
    };
  }, [calculateHeight]);

  return calculateHeight;
};

export default useIframeResize;