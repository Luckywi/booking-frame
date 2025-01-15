'use client';

import { useSearchParams } from 'next/navigation';
import BookingWidget from '@/components/booking/BookingWidget';

export default function Home() {
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