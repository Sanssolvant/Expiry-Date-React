'use client';

import React from 'react';
import { IconMoonStars, IconSun } from '@tabler/icons-react';
import { Group, Switch, useMantineColorScheme } from '@mantine/core';

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Group pr={50}>
      <Switch
        checked={colorScheme === 'dark'}
        onClick={() => toggleColorScheme()}
        size="lg"
        color={dark ? 'blue' : 'dark'}
        onLabel={<IconSun size="1rem" stroke={2.5} color="yellow" />}
        offLabel={<IconMoonStars size="1rem" stroke={2.5} color="blue" />}
      />
    </Group>
  );
}
