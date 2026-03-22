'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ActionIcon, alpha, AppShell, Box, Group, Paper, Text, Tooltip, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { IconCalendar, IconChartPie, IconChefHat, IconHome2, IconShoppingCart } from '@tabler/icons-react';
import { Logo } from './Logo';
import { UserProfileMenu } from './UserProfileMenu';

type UserMenuSettingsProps = {
  baldAb: number;
  abgelaufenAb: number;
  calendarUpcomingDays: number;
  setBaldAb: (value: number) => void;
  setAbgelaufenAb: (value: number) => void;
  setCalendarUpcomingDays: (value: number) => void;
};

type MainSectionShellProps = {
  title: string;
  children: ReactNode;
  userMenu: UserMenuSettingsProps;
};

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: IconHome2 },
  { href: '/shopping-list', label: 'Einkaufszettel', icon: IconShoppingCart },
  { href: '/expiry-calendar', label: 'Kalender', icon: IconCalendar },
  { href: '/recipes', label: 'Rezepte', icon: IconChefHat },
  { href: '/nutrition', label: 'Nährwertblick', icon: IconChartPie },
] as const;

export function MainSectionShell({ title, children, userMenu }: MainSectionShellProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const pathname = usePathname();

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
    <AppShell header={{ height: { base: 86, sm: 96 } }} padding={0}>
      <AppShell.Header
        style={{
          borderBottom: `1px solid ${headerBorder}`,
          background: headerBackground,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box maw={1560} mx="auto" h="100%" px={{ base: 'sm', sm: 'md', md: 'lg' }}>
          <Group h="100%" justify="space-between" wrap="nowrap" gap="sm">
            <Group gap="sm" align="center" style={{ minWidth: 0 }}>
              <Logo />
              <Text
                size="sm"
                c="dimmed"
                visibleFrom="sm"
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {title}
              </Text>
            </Group>

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
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Tooltip key={item.href} label={item.label}>
                      <ActionIcon
                        component={Link}
                        href={item.href}
                        variant={isActive ? 'filled' : 'subtle'}
                        size="lg"
                        radius="xl"
                        aria-label={item.label}
                      >
                        <Icon size={18} />
                      </ActionIcon>
                    </Tooltip>
                  );
                })}
              </Paper>

              <Group
                gap={4}
                hiddenFrom="md"
                wrap="nowrap"
                style={{ overflowX: 'auto', maxWidth: 160, paddingBottom: 2 }}
              >
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Tooltip key={item.href} label={item.label}>
                      <ActionIcon
                        component={Link}
                        href={item.href}
                        variant={isActive ? 'filled' : 'light'}
                        size="md"
                        radius="xl"
                        aria-label={item.label}
                      >
                        <Icon size={16} />
                      </ActionIcon>
                    </Tooltip>
                  );
                })}
              </Group>

              <UserProfileMenu
                baldAb={userMenu.baldAb}
                abgelaufenAb={userMenu.abgelaufenAb}
                calendarUpcomingDays={userMenu.calendarUpcomingDays}
                setBaldAb={userMenu.setBaldAb}
                setAbgelaufenAb={userMenu.setAbgelaufenAb}
                setCalendarUpcomingDays={userMenu.setCalendarUpcomingDays}
              />
            </Group>
          </Group>
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
            {children}
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
