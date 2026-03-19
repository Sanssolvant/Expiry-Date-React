'use client';

import { ActionIcon, AppShell, Group, Text, Tooltip } from '@mantine/core';
import { IconCalendar, IconChartPie, IconHome2, IconShoppingCart } from '@tabler/icons-react';
import Link from 'next/link';
import { Logo } from './General/Logo';
import { RecipeExplorer } from './General/RecipeExplorer';
import { UserProfileMenu } from './General/UserProfileMenu';
import { useWarnSettings } from './hooks/useWarnSettings';

export function RecipesPage() {
  const {
    warnBaldAb,
    warnAbgelaufenAb,
    calendarUpcomingDays,
    setWarnBaldAb,
    setWarnAbgelaufenAb,
    setCalendarUpcomingDays,
  } = useWarnSettings();

  return (
    <AppShell header={{ height: { base: 68, md: 70, lg: 80 } }} padding={{ base: 'xs', sm: 'md' }}>
      <AppShell.Header px="sm">
        <Group h="100%" justify="space-between" wrap="nowrap">
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
              Rezepte
            </Text>
          </Group>

          <Group
            gap="xs"
            wrap="nowrap"
            style={{ flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '62%', paddingBottom: 2 }}
          >
            <Tooltip label="Dashboard">
              <ActionIcon
                component={Link}
                href="/dashboard"
                variant="light"
                size="lg"
                aria-label="Dashboard"
              >
                <IconHome2 size={18} />
              </ActionIcon>
            </Tooltip>
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
              calendarUpcomingDays={calendarUpcomingDays}
              setBaldAb={setWarnBaldAb}
              setAbgelaufenAb={setWarnAbgelaufenAb}
              setCalendarUpcomingDays={setCalendarUpcomingDays}
            />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <RecipeExplorer />
      </AppShell.Main>
    </AppShell>
  );
}

