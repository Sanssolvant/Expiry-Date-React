'use client';

import React from 'react';
import { IconMoonStars, IconSun } from '@tabler/icons-react';
import { Group, Switch, useMantineColorScheme } from '@mantine/core';

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Group style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', zIndex: 10 }}>
      <Switch
        checked={colorScheme === 'dark'}
        onClick={() => toggleColorScheme()}
        size="lg"
        color={dark ? '#1C7ED6' : 'dark'}
        onLabel={<IconSun size="1rem" stroke={2.5} color="yellow" />}
        offLabel={<IconMoonStars size="1rem" stroke={2.5} color="#1C7ED6" />}
      />
    </Group>
  );
}
