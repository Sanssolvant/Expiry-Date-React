'use client';

import { ActionIcon, AppShell, Badge, Group, Text, Tooltip } from '@mantine/core';
import {
  IconCalendar,
  IconChartBar,
  IconChartPie,
  IconChefHat,
  IconShieldLock,
  IconShoppingCart,
} from '@tabler/icons-react';
import DndGrid from './General/DndGrid';
import { Logo } from './General/Logo';
import { UserProfileMenu } from './General/UserProfileMenu';
import Link from 'next/link';
import { useWarnSettings } from './hooks/useWarnSettings';
import { useAdminAccess } from '@/app/lib/use-admin-access';


export function Dashboard() {
  const { warnBaldAb, warnAbgelaufenAb, setWarnBaldAb, setWarnAbgelaufenAb } = useWarnSettings();
  const { canAccess: isAdmin } = useAdminAccess();
  const openStatistik = () => window.dispatchEvent(new Event('open-inventory-stats'));

  return (
    <AppShell header={{ height: { base: 68, md: 70, lg: 80 } }} padding={{ base: 'xs', sm: 'md' }}>
      <AppShell.Header>
        <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
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
          <Group
            gap="xs"
            wrap="nowrap"
            style={{ flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '62%', paddingBottom: 2 }}
          >
            {isAdmin ? (
              <Badge
                color="teal"
                variant="light"
                leftSection={<IconShieldLock size={12} />}
                visibleFrom="sm"
              >
                Admin-Modus aktiv
              </Badge>
            ) : null}
            <Tooltip label="Einkaufszettel">
              <ActionIcon
                component={Link}
                href="/shopping-list"
                variant="light"
                size="lg"
                aria-label="Einkaufszettel"
              >
                <IconShoppingCart size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Kalender">
              <ActionIcon
                component={Link}
                href="/expiry-calendar"
                variant="light"
                size="lg"
                aria-label="Kalender"
              >
                <IconCalendar size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Rezepte">
              <ActionIcon
                component={Link}
                href="/recipes"
                variant="light"
                size="lg"
                aria-label="Rezepte"
              >
                <IconChefHat size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Statistik">
              <ActionIcon variant="light" size="lg" aria-label="Statistik" onClick={openStatistik}>
                <IconChartBar size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Nährwertblick">
              <ActionIcon
                component={Link}
                href="/nutrition"
                variant="light"
                size="lg"
                aria-label="Nährwertblick"
              >
                <IconChartPie size={18} />
              </ActionIcon>
            </Tooltip>
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
