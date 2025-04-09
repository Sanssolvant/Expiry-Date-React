'use client';

import { AppShell, Burger, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ColorSchemeToggle } from './General/ColorSchemeToggle';
import DndGrid from './General/DndGrid';
import { Logo } from './General/Logo';
import { SignOutButton } from './General/SignOutButton';

export function Dashboard() {
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell header={{ height: { base: 60, md: 70, lg: 80 } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Logo />
          <SignOutButton />
        </Group>
      </AppShell.Header>
      <ColorSchemeToggle />
      <AppShell.Main>
        <DndGrid />
      </AppShell.Main>
    </AppShell>
  );
}
