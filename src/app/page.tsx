// src/app/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingWidget from '@/components/booking/BookingWidget';

function HomeContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');

  if (!businessId) {
    return <div className="p-4">ID entreprise manquant</div>;
  }

  return (
    <main className="min-h-screen p-4 bg-[hsl(var(--background))]">
      <BookingWidget businessId={businessId} />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
