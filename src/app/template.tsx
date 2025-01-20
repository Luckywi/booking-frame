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
    // Calculer la hauteur après le rendu initial
    const timeoutId = setTimeout(calculateHeight, 0);
    return () => clearTimeout(timeoutId);
  }, [businessId, calculateHeight]);

  // Recalculer la hauteur après chaque changement de route
  useEffect(() => {
    calculateHeight();
  }, [searchParams, calculateHeight]);

  return null;
}

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <TemplateContent />
      </Suspense>
      {children}
    </>
  );
}