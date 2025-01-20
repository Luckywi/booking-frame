// src/app/not-found.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function NotFoundContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--background))]">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-[hsl(var(--foreground))]">404</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          La page que vous recherchez n&apos;existe pas.
        </p>
        <div className="mt-4">
          <Link href={businessId ? `/?id=${businessId}` : '/'}>
            <Button variant="outline">
              Retourner à l&apos;accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  );
}