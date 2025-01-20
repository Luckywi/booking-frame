// src/lib/hooks/useIframeResize.ts

import { useEffect, useCallback, useRef } from 'react';

export const useIframeResize = () => {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const previousHeightRef = useRef<number>(0);
  const isResizingRef = useRef(false);
  const defaultHeight = 450;
  const bottomPadding = 80; // Marge de sécurité en bas

  const calculateHeight = useCallback(() => {
    if (isResizingRef.current) return;

    // Liste des éléments à observer pour la hauteur
    const container = document.querySelector('.booking-container');
    const currentContent = document.querySelector('.service-list, .date-selector, .client-form');

    if (!container || !currentContent) {
      window.parent.postMessage({
        type: 'resize',
        height: defaultHeight + bottomPadding
      }, '*');
      return;
    }

    // Calculer la hauteur réelle du contenu actuel
    const contentRect = currentContent.getBoundingClientRect();
    const contentStyles = window.getComputedStyle(currentContent);
    const contentMarginTop = parseFloat(contentStyles.marginTop) || 0;
    const contentMarginBottom = parseFloat(contentStyles.marginBottom) || 0;
    const contentFullHeight = Math.ceil(contentRect.height + contentMarginTop + contentMarginBottom);

    // Ajouter la marge de sécurité à la hauteur minimale et à la hauteur calculée
    const newHeight = Math.max(contentFullHeight, defaultHeight) + bottomPadding;

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

    // Calcul initial après un court délai pour s'assurer que tout est chargé
    setTimeout(calculateHeight, 100);

    // Nettoyage
    return () => {
      resizeObserverRef.current?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('resize', calculateHeight);
      document.removeEventListener('DOMContentLoaded', calculateHeight);
    };
  }, [calculateHeight]);

  // Effet supplémentaire pour écouter les transitions CSS
  useEffect(() => {
    const handleTransitionEnd = () => {
      requestAnimationFrame(calculateHeight);
    };

    const transitionElements = [
      document.querySelector('.booking-container'),
      document.querySelector('.service-list'),
      document.querySelector('.date-selector'),
      document.querySelector('.client-form')
    ].filter(Boolean) as Element[];

    transitionElements.forEach(element => {
      element.addEventListener('transitionend', handleTransitionEnd);
    });

    return () => {
      transitionElements.forEach(element => {
        element.removeEventListener('transitionend', handleTransitionEnd);
      });
    };
  }, [calculateHeight]);

  // Effet pour écouter les changements de route/navigation
  useEffect(() => {
    const handleRouteChange = () => {
      // Réinitialiser la hauteur
      previousHeightRef.current = 0;
      setTimeout(calculateHeight, 100);
    };

    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [calculateHeight]);

  return calculateHeight;
};

export default useIframeResize;