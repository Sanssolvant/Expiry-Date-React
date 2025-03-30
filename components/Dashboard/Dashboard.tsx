'use client';

import { AppShell, Burger, Group, Skeleton, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SignOutButton } from '../General/Dashboard/SignOutButton';
import { ColorSchemeToggle } from '../Toggles/ColorSchemeToggle';

export function Dashboard() {
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell
      header={{ height: { base: 60, md: 70, lg: 80 } }}
      navbar={{
        width: { base: 200, md: 300, lg: 400 },
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={1} ml="1.5rem">
            <Text inherit variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              TrackShelf
            </Text>
          </Title>
          <SignOutButton />
        </Group>
        <ColorSchemeToggle />
      </AppShell.Header>
      <AppShell.Navbar p="md">
        Navbar
        {Array(15)
          .fill(0)
          .map((_, index) => (
            <Skeleton key={index} h={28} mt="sm" animate={false} />
          ))}
      </AppShell.Navbar>
      <AppShell.Main>Main</AppShell.Main>
    </AppShell>
  );
}
