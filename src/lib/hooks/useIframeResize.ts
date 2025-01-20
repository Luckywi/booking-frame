// src/lib/hooks/useIframeResize.ts

import { useEffect, useCallback, useRef } from 'react';

export const useIframeResize = () => {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const previousHeightRef = useRef<number>(0);
  const isResizingRef = useRef(false);
  const defaultHeight = 300;

  const calculateHeight = useCallback(() => {
    if (isResizingRef.current) return;

    // Liste des éléments à observer pour la hauteur
    const container = document.querySelector('.booking-container');
    const currentContent = document.querySelector('.service-list, .date-selector, .client-form');

    if (!container || !currentContent) {
      window.parent.postMessage({
        type: 'resize',
        height: defaultHeight
      }, '*');
      return;
    }

    // Calculer la hauteur réelle du contenu actuel
    const contentRect = currentContent.getBoundingClientRect();
    const contentStyles = window.getComputedStyle(currentContent);
    const contentMarginTop = parseFloat(contentStyles.marginTop) || 0;
    const contentMarginBottom = parseFloat(contentStyles.marginBottom) || 0;
    const contentFullHeight = Math.ceil(contentRect.height + contentMarginTop + contentMarginBottom);

    // S'assurer que la hauteur ne soit pas inférieure à la hauteur minimale
    const newHeight = Math.max(contentFullHeight, defaultHeight);

    if (newHeight !== previousHeightRef.current) {
      isResizingRef.current = true;
      previousHeightRef.current = newHeight;

      // Envoyer la nouvelle hauteur au parent
      window.parent.postMessage({
        type: 'resize',
        height: newHeight
      }, '*');

      // Éviter les recalculs trop fréquents
      setTimeout(() => {
        isResizingRef.current = false;
      }, 50);
    }
  }, []);

  useEffect(() => {
    // Configuration de l'observateur de redimensionnement
    resizeObserverRef.current = new ResizeObserver(() => {
      requestAnimationFrame(calculateHeight);
    });

    // Observer le conteneur principal et le contenu actif
    const elementsToObserve = [
      document.querySelector('.booking-container'),
      document.querySelector('.service-list'),
      document.querySelector('.date-selector'),
      document.querySelector('.client-form')
    ].filter(Boolean) as Element[];

    elementsToObserve.forEach(element => {
      resizeObserverRef.current?.observe(element);
    });

    // Observer les mutations du DOM
    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(calculateHeight);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Écouter les messages du parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'requestHeight') {
        calculateHeight();
      }
    };

    // Écouter les événements nécessaires
    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', calculateHeight);
    document.addEventListener('DOMContentLoaded', calculateHeight);

    // Calcul initial
    calculateHeight();

    // Nettoyage
    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('resize', calculateHeight);
      document.removeEventListener('DOMContentLoaded', calculateHeight);
    };
  }, [calculateHeight]);

  return calculateHeight;
};

export default useIframeResize;