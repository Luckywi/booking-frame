'use client';

import { useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { applyTheme } from '@/lib/theme';
import { useTemplateResize } from '@/lib/hooks/useTemplateResize';

function TemplateContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');
  const calculateHeight = useTemplateResize();

  useEffect(() => {
    if (businessId) {
      applyTheme(businessId);
    }
    const timeoutId = setTimeout(calculateHeight, 0);
    
    return () => clearTimeout(timeoutId);
  }, [businessId, calculateHeight]);

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