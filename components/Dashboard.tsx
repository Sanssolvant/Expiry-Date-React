'use client';

import { AppShell, Badge, Button, Group, Text } from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import DndGrid from './General/DndGrid';
import { Logo } from './General/Logo';
import { UserProfileMenu } from './General/UserProfileMenu';
import Link from 'next/link';
import { useWarnSettings } from './hooks/useWarnSettings';
import { useAdminAccess } from '@/app/lib/use-admin-access';


export function Dashboard() {
  const { warnBaldAb, warnAbgelaufenAb, setWarnBaldAb, setWarnAbgelaufenAb } = useWarnSettings();
  const { canAccess: isAdmin } = useAdminAccess();

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
          <Group gap="sm">
            {isAdmin ? (
              <Badge
                color="teal"
                variant="light"
                leftSection={<IconShieldLock size={12} />}
              >
                Admin-Modus aktiv
              </Badge>
            ) : null}
            <Button component={Link} href="/shopping-list" variant="light">
              Einkaufszettel
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
        <DndGrid warnBaldAb={warnBaldAb} warnAbgelaufenAb={warnAbgelaufenAb} />
      </AppShell.Main>
    </AppShell>
  );
}
