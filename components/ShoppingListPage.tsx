'use client';

import React from 'react';
import { AppShell, Button, Group, Text } from '@mantine/core';
import Link from 'next/link';
import ShoppingList from './General/ShoppingList';
import { SignOutButton } from './General/SignOutButton';
import { Logo } from './General/Logo';

// Optional: wenn du einen SignOutButton hast, importiere ihn
// import SignOutButton from '@/components/SignOutButton';

export function ShoppingListPage() {
  return (
    <AppShell header={{ height: { base: 60, md: 70, lg: 80 } }} padding="md">
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between">
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
              Einkaufszettel
            </Text>
          </Group>

          <Group gap="sm">
            <Button component={Link} href="/dashboard" variant="light">
              Dashboard
            </Button>
            <SignOutButton />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <ShoppingList />
      </AppShell.Main>
    </AppShell>
  );
}
