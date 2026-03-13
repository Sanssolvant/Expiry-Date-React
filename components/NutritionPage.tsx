'use client';

import { AppShell, Button, Group, Text } from '@mantine/core';
import Link from 'next/link';
import { NutritionInsights } from './General/NutritionInsights';
import { Logo } from './General/Logo';
import { UserProfileMenu } from './General/UserProfileMenu';
import { useWarnSettings } from './hooks/useWarnSettings';

export function NutritionPage() {
  const { warnBaldAb, warnAbgelaufenAb, setWarnBaldAb, setWarnAbgelaufenAb } = useWarnSettings();

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
              Nährwertblick
            </Text>
          </Group>

          <Group gap="sm">
            <Button component={Link} href="/dashboard" variant="light">
              Dashboard
            </Button>
            <Button component={Link} href="/shopping-list" variant="light">
              Einkaufszettel
            </Button>
            <Button component={Link} href="/expiry-calendar" variant="light">
              MHD Kalender
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
        <NutritionInsights />
      </AppShell.Main>
    </AppShell>
  );
}

