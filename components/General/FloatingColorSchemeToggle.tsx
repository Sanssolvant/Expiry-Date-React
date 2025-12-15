'use client';

import { usePathname } from 'next/navigation';
import { ColorSchemeToggle } from '@/components/General/ColorSchemeToggle';

export function FloatingColorSchemeToggle() {
  const pathname = usePathname();

  // ✅ auf diesen Seiten soll er unten rechts bleiben
  const showFloating =
    pathname === '/' ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  if (!showFloating) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
      }}
    >
      <ColorSchemeToggle />
    </div>
  );
}
