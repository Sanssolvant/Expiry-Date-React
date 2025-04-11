'use client';

import { AppShell, Group } from '@mantine/core';
import DndGrid from './General/DndGrid';
import { Logo } from './General/Logo';
import { SignOutButton } from './General/SignOutButton';

export function Dashboard() {
  return (
    <AppShell header={{ height: { base: 60, md: 70, lg: 80 } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Logo />
          <SignOutButton />
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <DndGrid />
      </AppShell.Main>
    </AppShell>
  );
}
