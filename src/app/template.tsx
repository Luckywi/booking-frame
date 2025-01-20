'use client';

import { useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { applyTheme } from '@/lib/theme';
import { useIframeResize } from '@/lib/hooks/useIframeResize';

function TemplateContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');
  const calculateHeight = useIframeResize();

  useEffect(() => {
    if (businessId) {
      applyTheme(businessId);
    }
    
    // Calculer la hauteur initiale après l'application du thème
    const timeoutId = setTimeout(calculateHeight, 0);
    
    return () => clearTimeout(timeoutId);
  }, [businessId, calculateHeight]);

  // Re-calculer la hauteur quand les paramètres changent
  useEffect(() => {
    calculateHeight();
  }, [searchParams, calculateHeight]);

  return null;
}

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div>Chargement...</div>}>
        <TemplateContent />
      </Suspense>
      {children}
    </>
  );
}