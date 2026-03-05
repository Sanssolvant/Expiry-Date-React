'use client';

import { useEffect, useState } from 'react';
import { USER_SETTINGS_DEFAULTS } from '@/app/lib/user-settings';

export function useWarnSettings() {
  const [warnBaldAb, setWarnBaldAb] = useState(USER_SETTINGS_DEFAULTS.warnLevelBald);
  const [warnAbgelaufenAb, setWarnAbgelaufenAb] = useState(USER_SETTINGS_DEFAULTS.warnLevelExpired);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/user-settings', { method: 'GET', credentials: 'include' });
        if (!res.ok) {
          return;
        }

        const settings = await res.json();
        if (settings.warnLevelBald != null) {
          setWarnBaldAb(Number(settings.warnLevelBald));
        }
        if (settings.warnLevelExpired != null) {
          setWarnAbgelaufenAb(Number(settings.warnLevelExpired));
        }
      } catch {
        // use defaults
      }
    };

    loadSettings();
  }, []);

  return {
    warnBaldAb,
    warnAbgelaufenAb,
    setWarnBaldAb,
    setWarnAbgelaufenAb,
  };
}
