'use client';

import { useEffect, useState } from 'react';
import {
  ActionIcon,
  alpha,
  AppShell,
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
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

type HeaderStats = {
  inventoryCount: number;
  totalUnits: number;
  expiringSoonCount: number;
  expiredCount: number;
};

const INITIAL_STATS: HeaderStats = {
  inventoryCount: 0,
  totalUnits: 0,
  expiringSoonCount: 0,
  expiredCount: 0,
};

export function Dashboard() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [headerStats, setHeaderStats] = useState<HeaderStats>(INITIAL_STATS);

  const {
    warnBaldAb,
    warnAbgelaufenAb,
    calendarUpcomingDays,
    setWarnBaldAb,
    setWarnAbgelaufenAb,
    setCalendarUpcomingDays,
  } = useWarnSettings();
  const { canAccess: isAdmin } = useAdminAccess();
  const openStatistik = () => window.dispatchEvent(new Event('open-inventory-stats'));

  useEffect(() => {
    const onStatsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<HeaderStats>>;
      const detail = customEvent.detail || {};

      setHeaderStats((prev) => ({
        inventoryCount:
          typeof detail.inventoryCount === 'number' ? detail.inventoryCount : prev.inventoryCount,
        totalUnits: typeof detail.totalUnits === 'number' ? detail.totalUnits : prev.totalUnits,
        expiringSoonCount:
          typeof detail.expiringSoonCount === 'number'
            ? detail.expiringSoonCount
            : prev.expiringSoonCount,
        expiredCount: typeof detail.expiredCount === 'number' ? detail.expiredCount : prev.expiredCount,
      }));
    };

    window.addEventListener('dashboard-stats-updated', onStatsUpdated as EventListener);
    return () => {
      window.removeEventListener('dashboard-stats-updated', onStatsUpdated as EventListener);
    };
  }, []);

  const headerBorder = isDark ? alpha(theme.colors.dark[2], 0.7) : alpha(theme.colors.gray[3], 0.95);
  const headerBackground = isDark
    ? 'linear-gradient(120deg, rgba(10,10,12,0.98) 0%, rgba(18,18,20,0.96) 50%, rgba(9,9,11,0.98) 100%)'
    : 'linear-gradient(120deg, rgba(240,245,255,0.96) 0%, rgba(227,238,255,0.95) 50%, rgba(245,248,255,0.96) 100%)';
  const navSurfaceBackground = isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.85);
  const navSurfaceBorder = isDark ? alpha(theme.colors.dark[2], 0.8) : alpha(theme.colors.gray[4], 0.7);
  const mainBackground = isDark
    ? 'radial-gradient(1200px 560px at 50% -150px, rgba(56,56,60,0.30) 0%, rgba(20,20,22,0) 62%), linear-gradient(180deg, rgba(13,13,15,1) 0%, rgba(7,7,9,1) 100%)'
    : 'radial-gradient(circle at top, rgba(219,232,255,0.8) 0%, rgba(242,246,255,0.95) 42%, rgba(249,251,255,1) 100%)';

  return (
    <AppShell header={{ height: { base: 90, sm: 126 } }} padding={0}>
      <AppShell.Header
        style={{
          borderBottom: `1px solid ${headerBorder}`,
          background: headerBackground,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box maw={1560} mx="auto" h="100%" px={{ base: 'sm', sm: 'md', md: 'lg' }}>
          <Stack h="100%" justify="center" gap={6}>
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Logo />
                <Text size="xs" c="dimmed" visibleFrom="sm" style={{ letterSpacing: 0.3 }}>
                  Dein Vorrat auf einen Blick
                </Text>
              </Stack>

              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <Paper
                  p={4}
                  radius="xl"
                  withBorder
                  visibleFrom="md"
                  style={{
                    display: 'flex',
                    gap: 6,
                    borderColor: navSurfaceBorder,
                    background: navSurfaceBackground,
                  }}
                >
                  <Tooltip label="Einkaufszettel">
                    <ActionIcon
                      component={Link}
                      href="/shopping-list"
                      variant="subtle"
                      size="lg"
                      radius="xl"
                      aria-label="Einkaufszettel"
                    >
                      <IconShoppingCart size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Kalender">
                    <ActionIcon
                      component={Link}
                      href="/expiry-calendar"
                      variant="subtle"
                      size="lg"
                      radius="xl"
                      aria-label="Kalender"
                    >
                      <IconCalendar size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Rezepte">
                    <ActionIcon
                      component={Link}
                      href="/recipes"
                      variant="subtle"
                      size="lg"
                      radius="xl"
                      aria-label="Rezepte"
                    >
                      <IconChefHat size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Statistik">
                    <ActionIcon
                      variant="subtle"
                      size="lg"
                      radius="xl"
                      aria-label="Statistik"
                      onClick={openStatistik}
                    >
                      <IconChartBar size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Nährwertblick">
                    <ActionIcon
                      component={Link}
                      href="/nutrition"
                      variant="subtle"
                      size="lg"
                      radius="xl"
                      aria-label="Nährwertblick"
                    >
                      <IconChartPie size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Paper>

                <Group gap={4} hiddenFrom="md">
                  <Tooltip label="Einkaufszettel">
                    <ActionIcon
                      component={Link}
                      href="/shopping-list"
                      variant="light"
                      size="md"
                      radius="xl"
                      aria-label="Einkaufszettel"
                    >
                      <IconShoppingCart size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Kalender">
                    <ActionIcon
                      component={Link}
                      href="/expiry-calendar"
                      variant="light"
                      size="md"
                      radius="xl"
                      aria-label="Kalender"
                    >
                      <IconCalendar size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Statistik">
                    <ActionIcon
                      variant="light"
                      size="md"
                      radius="xl"
                      aria-label="Statistik"
                      onClick={openStatistik}
                    >
                      <IconChartBar size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {isAdmin ? (
                  <Badge
                    color="teal"
                    variant="light"
                    leftSection={<IconShieldLock size={12} />}
                    visibleFrom="lg"
                  >
                    Admin
                  </Badge>
                ) : null}

                <UserProfileMenu
                  baldAb={warnBaldAb}
                  abgelaufenAb={warnAbgelaufenAb}
                  calendarUpcomingDays={calendarUpcomingDays}
                  setBaldAb={setWarnBaldAb}
                  setAbgelaufenAb={setWarnAbgelaufenAb}
                  setCalendarUpcomingDays={setCalendarUpcomingDays}
                />
              </Group>
            </Group>

            <Group justify="space-between" align="center" wrap="wrap" visibleFrom="sm">
              <Group gap={6} wrap="wrap">
                <Badge variant="light" color="blue" radius="sm">
                  Treffer: {headerStats.inventoryCount}
                </Badge>
                <Badge variant="light" color="cyan" radius="sm">
                  Menge: {headerStats.totalUnits}
                </Badge>
                <Badge variant="light" color="yellow" radius="sm">
                  Bald: {headerStats.expiringSoonCount}
                </Badge>
                <Badge variant="light" color="red" radius="sm">
                  Abgelaufen: {headerStats.expiredCount}
                </Badge>
              </Group>
            </Group>
          </Stack>
        </Box>
      </AppShell.Header>

      <AppShell.Main>
        <Box
          style={{
            minHeight: '100vh',
            background: mainBackground,
            backgroundAttachment: 'fixed',
            backgroundRepeat: 'no-repeat',
            backgroundColor: isDark ? 'rgb(7,7,9)' : 'rgb(249,251,255)',
          }}
        >
          <Box maw={1560} mx="auto" px={{ base: 'sm', sm: 'md', md: 'lg' }} py={{ base: 'sm', sm: 'md' }}>
            <DndGrid warnBaldAb={warnBaldAb} warnAbgelaufenAb={warnAbgelaufenAb} />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
