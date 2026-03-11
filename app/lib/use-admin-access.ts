'use client';

import { useEffect, useState } from 'react';

type AdminAccessState = {
  canAccess: boolean;
  loading: boolean;
  authenticated: boolean;
};

export function useAdminAccess() {
  const [state, setState] = useState<AdminAccessState>({
    canAccess: false,
    loading: true,
    authenticated: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/access', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = await res.json().catch(() => ({}));

        if (cancelled) {
          return;
        }

        setState({
          canAccess: Boolean(payload?.canAccess),
          authenticated: payload?.authenticated !== false,
          loading: false,
        });
      } catch {
        if (cancelled) {
          return;
        }

        setState({
          canAccess: false,
          authenticated: true,
          loading: false,
        });
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
