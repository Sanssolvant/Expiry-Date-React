'use client';

import { useEffect, useState } from 'react';
import { AppShell, Button, Group, Text } from '@mantine/core';
import Link from 'next/link';
import ShoppingList from './General/ShoppingList';
import { Logo } from './General/Logo';
import { UserProfileMenu } from './General/UserProfileMenu';

export function ShoppingListPage() {
  const [warnBaldAb, setWarnBaldAb] = useState(3);
  const [warnAbgelaufenAb, setWarnAbgelaufenAb] = useState(0);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/user-settings', { method: 'GET', credentials: 'include' });

        if (!res.ok) {
          return;
        }

        const settings = await res.json();
        if (settings.warnLevelBald != null) setWarnBaldAb(Number(settings.warnLevelBald));
        if (settings.warnLevelExpired != null) setWarnAbgelaufenAb(Number(settings.warnLevelExpired));
      } catch {
        // use default values
      }
    };

    loadSettings();
  }, []);

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
            <UserProfileMenu
              baldAb={warnBaldAb}
              abgelaufenAb={warnAbgelaufenAb}
              setBaldAb={setWarnBaldAb}
              setAbgelaufenAb={setWarnAbgelaufenAb}
            />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <ShoppingList />
      </AppShell.Main>
    </AppShell>
  );
}
