'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { formatDateToDisplay } from '@/app/lib/dateUtils';
import { loadProductsCached } from '@/app/lib/products-client-cache';
import { calculateWarnLevel } from '@/app/lib/warnUtils';
import { WarnLevel } from '@/app/types';

type ExpiryCalendarProps = {
  warnBaldAb: number;
  warnAbgelaufenAb: number;
};

type StoredCard = {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  ablaufdatum: string;
  kategorie: string;
};

type CalendarCard = StoredCard & {
  expiryDate: Date;
  warnLevel: WarnLevel;
  daysUntilExpiry: number;
};

type StatusFilter = 'all' | WarnLevel;
type UpcomingLimit = '10' | '25' | 'all';

type DaySummary = {
  count: number;
  worstLevel: WarnLevel;
};

const warnPriority: Record<WarnLevel, number> = {
  [WarnLevel.ABGELAUFEN]: 0,
  [WarnLevel.BALD]: 1,
  [WarnLevel.OK]: 2,
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseDisplayDate(value: string): Date | null {
  const parts = value.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysUntil(expiryDate: Date) {
  const today = startOfDay(new Date());
  return Math.round((expiryDate.getTime() - today.getTime()) / 86400000);
}

function getRelativeExpiryLabel(daysUntilExpiry: number) {
  if (daysUntilExpiry < 0) {
    return `Seit ${Math.abs(daysUntilExpiry)} Tagen abgelaufen`;
  }

  if (daysUntilExpiry === 0) {
    return 'Läuft heute ab';
  }

  if (daysUntilExpiry === 1) {
    return 'Läuft morgen ab';
  }

  return `Läuft in ${daysUntilExpiry} Tagen ab`;
}

function warnBadge(level: WarnLevel) {
  if (level === WarnLevel.ABGELAUFEN) {
    return { color: 'red' as const, label: 'Abgelaufen' };
  }

  if (level === WarnLevel.BALD) {
    return { color: 'yellow' as const, label: 'Bald' };
  }

  return { color: 'green' as const, label: 'Frisch' };
}

function formatLongDate(value: Date | null) {
  if (!value) {
    return 'Kein Datum gewählt';
  }

  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

export function ExpiryCalendar({ warnBaldAb, warnAbgelaufenAb }: ExpiryCalendarProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const showTwoMonths = useMediaQuery('(min-width: 1200px)');
  const calendarColumns = showTwoMonths ? 2 : 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawCards, setRawCards] = useState<StoredCard[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [upcomingLimit, setUpcomingLimit] = useState<UpcomingLimit>('10');

  useEffect(() => {
    let mounted = true;

    const loadCards = async () => {
      setLoading(true);
      setError(null);

      try {
        const products = await loadProductsCached();

        if (!mounted) {
          return;
        }

        const cardsFromDb: StoredCard[] = products.map((prod: any) => ({
          id: String(prod.id),
          name: String(prod.name ?? '').trim(),
          menge: Number(prod.menge ?? 0),
          einheit: String(prod.einheit ?? 'Stk'),
          ablaufdatum: formatDateToDisplay(prod.ablaufdatum),
          kategorie: String(prod.kategorie ?? '').trim(),
        }));

        setRawCards(cardsFromDb);
      } catch (loadError: any) {
        if (!mounted) {
          return;
        }
        setError(loadError?.message || 'Produkte konnten nicht geladen werden.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCards();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    const mapped = rawCards
      .map((card) => {
        const expiryDate = parseDisplayDate(card.ablaufdatum);
        if (!expiryDate) {
          return null;
        }

        return {
          ...card,
          expiryDate,
          warnLevel: calculateWarnLevel(card.ablaufdatum, warnBaldAb, warnAbgelaufenAb),
          daysUntilExpiry: getDaysUntil(expiryDate),
        };
      })
      .filter((card): card is CalendarCard => card != null);

    mapped.sort((a, b) => {
      const byDate = a.expiryDate.getTime() - b.expiryDate.getTime();
      if (byDate !== 0) {
        return byDate;
      }
      return a.name.localeCompare(b.name, 'de');
    });

    return mapped;
  }, [rawCards, warnBaldAb, warnAbgelaufenAb]);

  const filteredCards = useMemo(() => {
    if (statusFilter === 'all') {
      return cards;
    }
    return cards.filter((card) => card.warnLevel === statusFilter);
  }, [cards, statusFilter]);

  const cardsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarCard[]>();
    for (const card of filteredCards) {
      const key = toDayKey(card.expiryDate);
      const bucket = grouped.get(key) ?? [];
      bucket.push(card);
      grouped.set(key, bucket);
    }
    return grouped;
  }, [filteredCards]);

  const daySummary = useMemo(() => {
    const summary = new Map<string, DaySummary>();
    cardsByDay.forEach((items, key) => {
      const worstLevel = items.reduce<WarnLevel>((acc, item) => {
        return warnPriority[item.warnLevel] < warnPriority[acc] ? item.warnLevel : acc;
      }, WarnLevel.OK);

      summary.set(key, { count: items.length, worstLevel });
    });
    return summary;
  }, [cardsByDay]);

  useEffect(() => {
    if (filteredCards.length === 0) {
      return;
    }

    if (!selectedDate) {
      const fallbackDate = filteredCards[0].expiryDate;
      setSelectedDate(fallbackDate);
      setDisplayMonth(fallbackDate);
      return;
    }

    const selectedKey = toDayKey(selectedDate);
    if (!cardsByDay.has(selectedKey)) {
      const fallbackDate = filteredCards[0].expiryDate;
      setSelectedDate(fallbackDate);
      setDisplayMonth(fallbackDate);
    }
  }, [cardsByDay, filteredCards, selectedDate]);

  const selectedDayCards = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return cardsByDay.get(toDayKey(selectedDate)) ?? [];
  }, [cardsByDay, selectedDate]);

  const stats = useMemo(() => {
    let expired = 0;
    let soon = 0;
    let fresh = 0;
    let next7Days = 0;

    for (const card of cards) {
      if (card.warnLevel === WarnLevel.ABGELAUFEN) {
        expired += 1;
      } else if (card.warnLevel === WarnLevel.BALD) {
        soon += 1;
      } else {
        fresh += 1;
      }

      if (card.daysUntilExpiry >= 0 && card.daysUntilExpiry <= 7) {
        next7Days += 1;
      }
    }

    return {
      total: cards.length,
      expired,
      soon,
      fresh,
      next7Days,
    };
  }, [cards]);

  const upcomingCards = useMemo(() => {
    const near = cards.filter(
      (card) => card.daysUntilExpiry >= -7 && card.daysUntilExpiry <= Math.max(14, warnBaldAb + 7)
    );

    if (near.length > 0) {
      return near;
    }

    return cards;
  }, [cards, warnBaldAb]);

  const visibleUpcomingCards = useMemo(() => {
    if (upcomingLimit === 'all') {
      return upcomingCards;
    }

    return upcomingCards.slice(0, Number(upcomingLimit));
  }, [upcomingCards, upcomingLimit]);

  const getWarnAccent = (level: WarnLevel) => {
    if (level === WarnLevel.ABGELAUFEN) {
      return theme.colors.red[isDark ? 4 : 6];
    }

    if (level === WarnLevel.BALD) {
      return theme.colors.yellow[isDark ? 4 : 6];
    }

    return theme.colors.green[isDark ? 4 : 6];
  };

  const getCalendarDayProps = (date: Date) => {
    const summary = daySummary.get(toDayKey(date));
    if (!summary) {
      return {};
    }

    const accent = getWarnAccent(summary.worstLevel);
    const label =
      summary.count === 1 ? '1 Produkt läuft an diesem Tag ab' : `${summary.count} Produkte laufen ab`;

    return {
      title: label,
      style: {
        boxShadow: `inset 0 0 0 1px ${alpha(accent, isDark ? 0.55 : 0.35)}`,
      },
    };
  };

  const renderCalendarDay = (date: Date) => {
    const summary = daySummary.get(toDayKey(date));
    const accent = summary ? getWarnAccent(summary.worstLevel) : 'transparent';

    return (
      <Box
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 14,
        }}
      >
        {date.getDate()}
        {summary ? (
          <Box
            style={{
              position: 'absolute',
              bottom: 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: accent,
            }}
          />
        ) : null}
      </Box>
    );
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Paper withBorder p="md" radius="lg">
        <Text fw={600} c="red">
          Fehler beim Laden des Kalenders
        </Text>
        <Text size="sm" c="dimmed" mt={4}>
          {error}
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Paper
        withBorder
        radius="xl"
        p="md"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(34,139,230,0.22), rgba(18,184,134,0.14))'
            : 'linear-gradient(135deg, rgba(34,139,230,0.12), rgba(18,184,134,0.10))',
          borderColor: isDark ? theme.colors.dark[4] : theme.colors.blue[2],
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Mindesthaltbarkeit
            </Text>
            <Title order={2}>Kalender</Title>
            <Text size="sm" c="dimmed">
              Alle Ablaufdaten als Monatsansicht mit Tagesdetails.
            </Text>
          </Stack>

          <Group gap="xs" wrap="wrap">
            <Badge variant="light" color="blue">
              Gesamt: {stats.total}
            </Badge>
            <Badge variant="light" color="red">
              Abgelaufen: {stats.expired}
            </Badge>
            <Badge variant="light" color="yellow">
              Bald: {stats.soon}
            </Badge>
            <Badge variant="light" color="teal">
              Nächste 7 Tage: {stats.next7Days}
            </Badge>
          </Group>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Paper withBorder p="md" radius="lg">
          <Group justify="space-between" align="center" wrap="wrap" mb="sm" gap="sm">
            <Title order={4}>Kalender</Title>
            <SegmentedControl
              size="xs"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              data={[
                { label: 'Alle', value: 'all' },
                { label: 'Frisch', value: WarnLevel.OK },
                { label: 'Bald', value: WarnLevel.BALD },
                { label: 'Abgelaufen', value: WarnLevel.ABGELAUFEN },
              ]}
            />
          </Group>

          <Box
            mt="sm"
            p="sm"
            style={{
              borderRadius: 12,
              border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
              backgroundColor: isDark ? alpha(theme.colors.dark[6], 0.35) : alpha(theme.white, 0.75),
            }}
          >
            <Center>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                date={displayMonth}
                onDateChange={setDisplayMonth}
                firstDayOfWeek={1}
                locale="de"
                highlightToday
                numberOfColumns={calendarColumns}
                columnsToScroll={calendarColumns}
                size={showTwoMonths ? 'lg' : 'md'}
                getDayProps={getCalendarDayProps}
                renderDay={renderCalendarDay}
                styles={{
                  day: {
                    width: showTwoMonths ? 44 : 38,
                    height: showTwoMonths ? 44 : 38,
                    fontSize: showTwoMonths ? 16 : 14,
                  },
                }}
              />
            </Center>
          </Box>

          <Group mt="sm" gap="sm" wrap="wrap" justify="center">
            <Badge variant="dot" color="green">
              Frisch
            </Badge>
            <Badge variant="dot" color="yellow">
              Bald
            </Badge>
            <Badge variant="dot" color="red">
              Abgelaufen
            </Badge>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="lg">
          <Text size="sm" c="dimmed">
            Ausgewählter Tag
          </Text>
          <Title order={4} mt={4}>
            {formatLongDate(selectedDate)}
          </Title>
          <Text size="sm" c="dimmed" mt={2}>
            {selectedDayCards.length} Produkt{selectedDayCards.length === 1 ? '' : 'e'} an diesem Datum
          </Text>

          <Box mt="md" style={{ height: 420, overflowY: 'auto', paddingRight: 4 }}>
            {selectedDayCards.length === 0 ? (
              <Center h="100%">
                <Text c="dimmed" ta="center">
                  Keine Produkte für diesen Tag im aktuellen Filter.
                </Text>
              </Center>
            ) : (
              <Stack gap="sm">
                {selectedDayCards.map((card) => {
                  const badge = warnBadge(card.warnLevel);
                  const accent = getWarnAccent(card.warnLevel);

                  return (
                    <Paper
                      key={card.id}
                      withBorder
                      p="sm"
                      radius="md"
                      style={{
                        borderLeft: `4px solid ${accent}`,
                      }}
                    >
                      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} style={{ wordBreak: 'break-word' }}>
                            {card.name}
                          </Text>
                          <Text size="sm" c="dimmed" style={{ wordBreak: 'break-word' }}>
                            {card.menge} {card.einheit} | {card.kategorie || 'Ohne Kategorie'}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {getRelativeExpiryLabel(card.daysUntilExpiry)}
                          </Text>
                        </Stack>
                        <Badge color={badge.color} variant="light">
                          {badge.label}
                        </Badge>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Stack gap={2}>
            <Title order={4}>Nächste Fälligkeiten</Title>
            <Text size="sm" c="dimmed">
              Zeitnah ablaufende Produkte inklusive kürzlich abgelaufener Einträge.
            </Text>
          </Stack>
          <Group gap="xs" align="center">
            <Badge color="gray" variant="light">
              Angezeigt: {visibleUpcomingCards.length} / {upcomingCards.length}
            </Badge>
            <SegmentedControl
              size="xs"
              value={upcomingLimit}
              onChange={(value) => setUpcomingLimit(value as UpcomingLimit)}
              data={[
                { label: '10', value: '10' },
                { label: '25', value: '25' },
                { label: 'Alle', value: 'all' },
              ]}
            />
          </Group>
        </Group>

        {upcomingCards.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">Noch keine Produkte vorhanden.</Text>
          </Center>
        ) : (
          <Box mt="md" style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
            <Stack gap="xs">
              {visibleUpcomingCards.map((card) => {
                const badge = warnBadge(card.warnLevel);
                return (
                  <Paper key={`upcoming-${card.id}`} withBorder radius="md" p="xs">
                    <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
                      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} size="sm" style={{ wordBreak: 'break-word' }}>
                          {card.name}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>
                          Ablauf: {card.ablaufdatum} | {card.menge} {card.einheit}
                        </Text>
                      </Stack>
                      <Badge color={badge.color} variant="light">
                        {getRelativeExpiryLabel(card.daysUntilExpiry)}
                      </Badge>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
