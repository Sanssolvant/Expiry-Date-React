'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { BarChart, DonutChart, LineChart } from '@mantine/charts';
import {
  AppShell,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBan, IconRefresh, IconShieldLock } from '@tabler/icons-react';
import Link from 'next/link';
import { Logo } from '@/components/General/Logo';

type AdminOverviewResponse = {
  generatedAt: string;
  summary: {
    totalUsers: number;
    verifiedUsers: number;
    premiumUsers: number;
    activeBans: number;
    totalProducts: number;
    expiringSoonProducts: number;
    expiredProducts: number;
    remindersEnabledUsers: number;
    usersWithUrgentProducts: number;
  };
  charts: {
    userGrowth30d: Array<{ date: string; label: string; users: number }>;
    expiryNext14d: Array<{ date: string; label: string; products: number }>;
    roleDistribution: Array<{ name: string; value: number; color: string }>;
    reminderState: Array<{ name: string; value: number; color: string }>;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
    premium: boolean;
    protectedIdentity: boolean;
    createdAt: string;
    updatedAt: string;
    ban: {
      active: boolean;
      reason: string | null;
      expiresAt: string | null;
    };
    counts: {
      products: number;
      sessions: number;
      shoppingItems: number;
      soonExpiring: number;
      expired: number;
    };
    reminders: {
      enabled: boolean;
      lastSentAt: string | null;
      time: string | null;
      timeZone: string | null;
    };
  }>;
};

type UserRow = AdminOverviewResponse['users'][number];

type ModerationPayload = {
  userId: string;
  action: 'ban' | 'unban';
  reason?: string;
  durationHours?: number;
};

type Props = {
  adminDisplayName: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }
  return dayjs(value).format('DD.MM.YYYY HH:mm');
}

export function AdminDashboard({ adminDisplayName }: Props) {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);

  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDurationHours, setBanDurationHours] = useState<number | ''>(168);

  const loadOverview = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/admin/overview?usersLimit=60', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Admin-Daten konnten nicht geladen werden.');
      }

      setData(payload as AdminOverviewResponse);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Admin-Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: 'User gesamt', value: data.summary.totalUsers },
      { label: 'Verifiziert', value: data.summary.verifiedUsers },
      { label: 'Premium', value: data.summary.premiumUsers },
      { label: 'Aktive Sperren', value: data.summary.activeBans },
      { label: 'Produkte gesamt', value: data.summary.totalProducts },
      { label: 'Bald ablaufend (7 Tage)', value: data.summary.expiringSoonProducts },
      { label: 'Abgelaufen', value: data.summary.expiredProducts },
      { label: 'Erinnerung aktiv', value: data.summary.remindersEnabledUsers },
      { label: 'User mit kritischen Produkten', value: data.summary.usersWithUrgentProducts },
    ];
  }, [data]);

  const closeBanModal = () => {
    setBanTarget(null);
    setBanReason('');
    setBanDurationHours(168);
  };

  const runModerationAction = useCallback(
    async (payload: ModerationPayload) => {
      setActionLoadingUserId(payload.userId);

      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData?.error || 'Moderation fehlgeschlagen.');
        }

        notifications.show({
          title: 'Admin-Aktion gespeichert',
          message: responseData?.message || 'Änderung erfolgreich.',
          color: 'teal',
        });

        await loadOverview(true);
      } catch (err: any) {
        notifications.show({
          title: 'Admin-Aktion fehlgeschlagen',
          message: err?.message || 'Moderation fehlgeschlagen.',
          color: 'red',
        });
      } finally {
        setActionLoadingUserId(null);
      }
    },
    [loadOverview]
  );

  const handleBan = async () => {
    if (!banTarget) {
      return;
    }

    const duration =
      banDurationHours === ''
        ? 0
        : Number.isFinite(Number(banDurationHours))
          ? Math.max(0, Math.trunc(Number(banDurationHours)))
          : 0;

    await runModerationAction({
      userId: banTarget.id,
      action: 'ban',
      reason: banReason.trim() || undefined,
      durationHours: duration,
    });

    closeBanModal();
  };

  const handleUnban = async (user: UserRow) => {
    await runModerationAction({
      userId: user.id,
      action: 'unban',
    });
  };

  return (
    <AppShell header={{ height: { base: 68, md: 70 } }} padding={{ base: 'xs', sm: 'md' }}>
      <AppShell.Header>
        <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
          <Group gap="sm" align="center" style={{ minWidth: 0 }}>
            <Logo />
            <Text size="sm" c="dimmed" visibleFrom="md">
              Admin Dashboard
            </Text>
          </Group>

          <Group
            gap="xs"
            wrap="nowrap"
            style={{ flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '62%', paddingBottom: 2 }}
          >
            <Button component={Link} href="/dashboard" variant="default" size="xs">
              Dashboard
            </Button>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => loadOverview(true)}
              loading={refreshing}
              size="xs"
            >
              Aktualisieren
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Stack gap="lg">
          <div>
            <Title order={2}>Admin Control Center</Title>
            <Text size="sm" c="dimmed">
              Eingeloggt als {adminDisplayName}. Letztes Update:{' '}
              {formatDateTime(data?.generatedAt || null)}
            </Text>
          </div>

          {error ? (
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Text c="red" fw={600}>
                  {error}
                </Text>
                <Group>
                  <Button variant="light" onClick={() => loadOverview()}>
                    Erneut laden
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ) : null}

          {loading && !data ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : null}

          {data ? (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {summaryCards.map((item) => (
                  <Paper key={item.label} withBorder p="md" radius="md">
                    <Text size="xs" c="dimmed">
                      {item.label}
                    </Text>
                    <Title order={3}>{item.value}</Title>
                  </Paper>
                ))}
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Paper withBorder p="md" radius="md">
                  <Text fw={600} mb="sm">
                    Neue User (30 Tage)
                  </Text>
                  <BarChart
                    h={260}
                    data={data.charts.userGrowth30d}
                    dataKey="label"
                    series={[{ name: 'users', color: 'blue.6', label: 'Neue User' }]}
                    withLegend={false}
                    withXAxis
                    withYAxis
                  />
                </Paper>

                <Paper withBorder p="md" radius="md">
                  <Text fw={600} mb="sm">
                    Produktabläufe (nächste 14 Tage)
                  </Text>
                  <LineChart
                    h={260}
                    data={data.charts.expiryNext14d}
                    dataKey="label"
                    series={[{ name: 'products', color: 'orange.6', label: 'Produkte' }]}
                    withLegend={false}
                    withXAxis
                    withYAxis
                  />
                </Paper>

                <Paper withBorder p="md" radius="md">
                  <Text fw={600} mb="sm">
                    Rollenverteilung
                  </Text>
                  <DonutChart
                    h={260}
                    withLabels
                    labelsType="percent"
                    tooltipDataSource="segment"
                    data={data.charts.roleDistribution}
                    chartLabel={data.summary.totalUsers}
                  />
                </Paper>

                <Paper withBorder p="md" radius="md">
                  <Text fw={600} mb="sm">
                    Erinnerungsstatus
                  </Text>
                  <DonutChart
                    h={260}
                    withLabels
                    labelsType="percent"
                    tooltipDataSource="segment"
                    data={data.charts.reminderState}
                    chartLabel={data.summary.totalUsers}
                  />
                </Paper>
              </SimpleGrid>

              <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="sm">
                  <div>
                    <Text fw={700}>User Moderation</Text>
                    <Text size="xs" c="dimmed">
                      Schütz den Zugriff über Role + Allowlist. Ban/Unban direkt in der Tabelle.
                    </Text>
                  </div>
                </Group>

                <ScrollArea>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>User</Table.Th>
                        <Table.Th>Rolle</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Produkte</Table.Th>
                        <Table.Th>Kritisch</Table.Th>
                        <Table.Th>Sessions</Table.Th>
                        <Table.Th>Reminder</Table.Th>
                        <Table.Th>Registriert</Table.Th>
                        <Table.Th>Aktion</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.users.map((user) => {
                        const busy = actionLoadingUserId === user.id;
                        const critical = user.counts.soonExpiring + user.counts.expired;

                        return (
                          <Table.Tr key={user.id}>
                            <Table.Td>
                              <Stack gap={0}>
                                <Text fw={600}>{user.name || 'Ohne Namen'}</Text>
                                <Text size="xs" c="dimmed">
                                  {user.email}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {user.id}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={user.role === 'admin' ? 'teal' : 'blue'} variant="light">
                                {user.role}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={4}>
                                <Group gap={6}>
                                  <Badge color={user.emailVerified ? 'teal' : 'gray'} variant="light">
                                    {user.emailVerified ? 'verifiziert' : 'unverifiziert'}
                                  </Badge>
                                  <Badge color={user.premium ? 'yellow' : 'gray'} variant="light">
                                    {user.premium ? 'premium' : 'free'}
                                  </Badge>
                                  {user.ban.active ? (
                                    <Badge color="red" variant="filled">
                                      gebannt
                                    </Badge>
                                  ) : (
                                    <Badge color="green" variant="light">
                                      aktiv
                                    </Badge>
                                  )}
                                </Group>
                                {user.ban.active ? (
                                  <Text size="xs" c="dimmed">
                                    {user.ban.expiresAt
                                      ? `Bis ${formatDateTime(user.ban.expiresAt)}`
                                      : 'Dauerhaft'}
                                  </Text>
                                ) : null}
                                {user.ban.active && user.ban.reason ? (
                                  <Text size="xs" c="dimmed">
                                    Grund: {user.ban.reason}
                                  </Text>
                                ) : null}
                              </Stack>
                            </Table.Td>
                            <Table.Td>{user.counts.products}</Table.Td>
                            <Table.Td>
                              <Text size="sm">{critical}</Text>
                              <Text size="xs" c="dimmed">
                                {user.counts.soonExpiring} bald / {user.counts.expired} abgelaufen
                              </Text>
                            </Table.Td>
                            <Table.Td>{user.counts.sessions}</Table.Td>
                            <Table.Td>
                              <Badge color={user.reminders.enabled ? 'teal' : 'gray'} variant="light">
                                {user.reminders.enabled ? 'an' : 'aus'}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                letzte Mail: {formatDateTime(user.reminders.lastSentAt)}
                              </Text>
                            </Table.Td>
                            <Table.Td>{formatDateTime(user.createdAt)}</Table.Td>
                            <Table.Td>
                              {user.ban.active ? (
                                <Button
                                  size="xs"
                                  color="teal"
                                  variant="light"
                                  loading={busy}
                                  onClick={() => handleUnban(user)}
                                >
                                  Entbannen
                                </Button>
                              ) : (
                                <Button
                                  size="xs"
                                  color="red"
                                  variant="light"
                                  leftSection={
                                    user.protectedIdentity ? <IconShieldLock size={14} /> : <IconBan size={14} />
                                  }
                                  loading={busy}
                                  disabled={user.protectedIdentity}
                                  onClick={() => {
                                    setBanTarget(user);
                                    setBanReason('');
                                    setBanDurationHours(168);
                                  }}
                                >
                                  {user.protectedIdentity ? 'Geschützt' : 'Bannen'}
                                </Button>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Paper>
            </>
          ) : null}
        </Stack>

        <Modal
          opened={Boolean(banTarget)}
          onClose={closeBanModal}
          centered
          title="User bannen"
          size="md"
        >
          <Stack gap="sm">
            <Text size="sm">
              Ziel: <b>{banTarget?.name || banTarget?.email}</b>
            </Text>

            <TextInput
              label="Grund"
              placeholder="Optionaler Ban-Grund"
              value={banReason}
              onChange={(event) => setBanReason(event.currentTarget.value)}
            />

            <NumberInput
              label="Dauer in Stunden (0 = unbegrenzt)"
              min={0}
              max={8760}
              step={24}
              value={banDurationHours}
              onChange={(value) => setBanDurationHours(value === '' ? '' : Number(value))}
            />

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={closeBanModal}>
                Abbrechen
              </Button>
              <Button color="red" onClick={handleBan} loading={actionLoadingUserId === banTarget?.id}>
                Bann speichern
              </Button>
            </Group>
          </Stack>
        </Modal>
      </AppShell.Main>
    </AppShell>
  );
}
