// src/app/template.tsx
'use client';

import { useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { applyTheme } from '@/lib/theme';

function TemplateContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');

  useEffect(() => {
    if (businessId) {
      applyTheme(businessId);
    }

    const updateHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'resize', height }, '*');
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(document.body);

    const mutationObserver = new MutationObserver(updateHeight);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    updateHeight();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [businessId]);

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