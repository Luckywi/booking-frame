// src/lib/hooks/useIframeResize.ts

import { useEffect, useCallback, useRef } from 'react';

export const useIframeResize = () => {
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const previousHeightRef = useRef<number>(0);
    const isResizingRef = useRef(false);
    const defaultHeight = 450;
    const bottomPadding = 80;
  
    const calculateHeight = useCallback(() => {
      if (isResizingRef.current) return;
  
      const getTotalHeight = (element: Element): number => {
        const styles = window.getComputedStyle(element);
        const marginTop = parseFloat(styles.marginTop) || 0;
        const marginBottom = parseFloat(styles.marginBottom) || 0;
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const paddingBottom = parseFloat(styles.paddingBottom) || 0;
        const borderTop = parseFloat(styles.borderTopWidth) || 0;
        const borderBottom = parseFloat(styles.borderBottomWidth) || 0;
  
        let maxChildBottom = 0;
        Array.from(element.children).forEach(child => {
          const childRect = child.getBoundingClientRect();
          const childStyles = window.getComputedStyle(child);
          const childMarginBottom = parseFloat(childStyles.marginBottom) || 0;
          const childBottom = childRect.bottom + childMarginBottom;
          maxChildBottom = Math.max(maxChildBottom, childBottom);
        });
  
        const elementRect = element.getBoundingClientRect();
        const totalHeight = Math.max(
          elementRect.height + marginTop + marginBottom + paddingTop + paddingBottom + borderTop + borderBottom,
          maxChildBottom - elementRect.top + marginBottom + paddingBottom + borderBottom
        );
  
        return totalHeight;
      };
  
      const container = document.querySelector('.booking-container');
      const serviceList = document.querySelector('.service-list');
      const dateSelector = document.querySelector('.date-selector');
      const clientForm = document.querySelector('.client-form');
      const confirmationContent = document.querySelector('.confirmation-content');
      
      if (!container) {
        return defaultHeight + bottomPadding;
      }
  
      let contentHeight = 0;
  
      // Ajout de la gestion de ConfirmationPage
      if (confirmationContent && confirmationContent.getClientRects().length > 0) {
        contentHeight = getTotalHeight(confirmationContent);
      } else if (serviceList && serviceList.getClientRects().length > 0) {
        contentHeight = getTotalHeight(serviceList);
      } else if (dateSelector && dateSelector.getClientRects().length > 0) {
        contentHeight = getTotalHeight(dateSelector);
      } else if (clientForm && clientForm.getClientRects().length > 0) {
        contentHeight = getTotalHeight(clientForm);
      }
  
      const navHeight = document.querySelector('.steps-nav')?.getBoundingClientRect().height || 0;
      const containerPadding = 32;
  
      const totalHeight = Math.max(
        contentHeight + navHeight + containerPadding + bottomPadding,
        defaultHeight + bottomPadding
      );
  
      if (totalHeight !== previousHeightRef.current) {
        isResizingRef.current = true;
        previousHeightRef.current = totalHeight;
  
        window.parent.postMessage({
          type: 'resize',
          height: totalHeight
        }, '*');
  
        setTimeout(() => {
          isResizingRef.current = false;
        }, 50);
      }
    }, []);
  
    useEffect(() => {
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(calculateHeight);
      });
  
      const elementsToObserve = [
        '.booking-container',
        '.service-list',
        '.date-selector',
        '.client-form',
        '.steps-nav',
        '.confirmation-content',
        '.confirmation-history'  // Ajout de l'observation de l'historique
      ].map(selector => document.querySelector(selector))
       .filter(Boolean) as Element[];
  
      elementsToObserve.forEach(element => {
        resizeObserverRef.current?.observe(element);
      });
  
      const mutationObserver = new MutationObserver(() => {
        requestAnimationFrame(calculateHeight);
      });
  
      mutationObserver.observe(document.body, {
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
      document.addEventListener('DOMContentLoaded', calculateHeight);
  
      setTimeout(calculateHeight, 100);
  
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