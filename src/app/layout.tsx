'use client';

import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { useSearchParams } from 'next/navigation';
import { applyTheme } from '@/lib/theme';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');

  useEffect(() => {
    if (businessId) {
      applyTheme(businessId);
    }

    // Gestion de la taille de l'iframe
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

  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}