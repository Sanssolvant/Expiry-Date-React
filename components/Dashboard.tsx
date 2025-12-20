'use client';

import { AppShell, Group, Text } from '@mantine/core';
import DndGrid from './General/DndGrid';
import { Logo } from './General/Logo';
import { SignOutButton } from './General/SignOutButton';


export function Dashboard() {
  return (
    <AppShell header={{ height: { base: 60, md: 70, lg: 80 } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm" align="center" style={{ minWidth: 0 }}>
            <Logo />
            <Text
              size="sm"
              c="dimmed"
              visibleFrom="md"
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Dashboard
            </Text>
          </Group>

          <SignOutButton />
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <DndGrid />
      </AppShell.Main>
    </AppShell>
  );
}
