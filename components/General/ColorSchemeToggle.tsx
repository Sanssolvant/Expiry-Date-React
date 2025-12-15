'use client';

import { useEffect, useState } from 'react';
import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconMoonStars, IconSun } from '@tabler/icons-react';

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Wichtig: vor Mount nichts rendern, was je nach colorScheme anders aussieht
  if (!mounted) {
    return (
      <ActionIcon variant="default" size="lg" aria-label="Toggle color scheme" />
    );
  }

  const dark = colorScheme === 'dark';

  return (
    <Tooltip label={dark ? 'Light Mode' : 'Dark Mode'}>
      <ActionIcon
        variant="default"
        size="lg"
        onClick={() => toggleColorScheme()}
        aria-label="Toggle color scheme"
      >
        {dark ? <IconSun size={18} /> : <IconMoonStars size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
