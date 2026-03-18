'use client';

import { useMemo } from 'react';
import { BarChart, DonutChart, LineChart } from '@mantine/charts';
import {
  Badge,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { parseDateFromString } from '@/app/lib/dateUtils';
import { calculateWarnLevel } from '@/app/lib/warnUtils';
import { WarnLevel } from '@/app/types';

type CardForStats = {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  ablaufdatum: string;
  erfasstAm: string;
  kategorie: string;
  warnLevel?: WarnLevel;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  cards: CardForStats[];
};

const categoryBarColor = 'blue.6';
const expiryLineColor = 'teal.6';

type DonutLabelProps = {
  x?: number;
  y?: number;
  cx?: number;
  percent?: number;
};

function renderDonutPercentLabel({ x, y, cx, percent }: DonutLabelProps) {
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof cx !== 'number' ||
    typeof percent !== 'number' ||
    percent <= 0
  ) {
    return null;
  }

  const value = `${Math.round(percent * 100)}%`;
  const shiftedX = x > cx ? x - 4 : x + 4;

  return (
    <text
      x={shiftedX}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="var(--chart-labels-color, var(--mantine-color-dimmed))"
      fontFamily="var(--mantine-font-family)"
      fontSize={12}
    >
      {value}
    </text>
  );
}

function parseDisplayDate(value: string): Date | null {
  try {
    return parseDateFromString(value);
  } catch {
    return null;
  }
}

function keyForMonth(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function InventoryStatsModal({ opened, onClose, cards }: Props) {
  const total = cards.length;

  const stats = useMemo(() => {
    const now = new Date();
    const statusCounts = {
      ok: 0,
      bald: 0,
      abgelaufen: 0,
    };

    const categoryMap = new Map<string, number>();
    let next7Days = 0;
    let avgShelfLifeDays = 0;
    let shelfLifeCount = 0;

    for (const card of cards) {
      const warn = card.warnLevel ?? calculateWarnLevel(card.ablaufdatum);
      if (warn === WarnLevel.OK) {
        statusCounts.ok += 1;
      }
      if (warn === WarnLevel.BALD) {
        statusCounts.bald += 1;
      }
      if (warn === WarnLevel.ABGELAUFEN) {
        statusCounts.abgelaufen += 1;
      }

      const cat = card.kategorie?.trim() || 'Unkategorisiert';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);

      const expiry = parseDisplayDate(card.ablaufdatum);
      if (expiry) {
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays <= 7) {
          next7Days += 1;
        }
      }

      const created = parseDisplayDate(card.erfasstAm);
      if (created && expiry) {
        const days = Math.round((expiry.getTime() - created.getTime()) / 86400000);
        if (Number.isFinite(days)) {
          avgShelfLifeDays += days;
          shelfLifeCount += 1;
        }
      }
    }

    const categoryChartData = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, anzahl: count }))
      .sort((a, b) => b.anzahl - a.anzahl)
      .slice(0, 8);

    const monthFormatter = new Intl.DateTimeFormat('de-CH', {
      month: 'short',
      year: '2-digit',
    });

    const monthBuckets = new Map<string, { month: string; abläufe: number }>();
    for (let offset = -3; offset <= 3; offset += 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      monthBuckets.set(keyForMonth(monthDate), {
        month: monthFormatter.format(monthDate),
        abläufe: 0,
      });
    }

    for (const card of cards) {
      const expiry = parseDisplayDate(card.ablaufdatum);
      if (!expiry) {
        continue;
      }

      const key = keyForMonth(expiry);
      const bucket = monthBuckets.get(key);
      if (bucket) {
        bucket.abläufe += 1;
      }
    }

    const expiryTrendData = Array.from(monthBuckets.values());
    const avgShelfLife =
      shelfLifeCount > 0 ? Math.round(avgShelfLifeDays / shelfLifeCount) : null;

    return {
      statusCounts,
      categoryChartData,
      expiryTrendData,
      next7Days,
      avgShelfLife,
    };
  }, [cards]);

  const statusChartData = [
    { name: 'Frisch', value: stats.statusCounts.ok, color: 'green.6' },
    { name: 'Bald', value: stats.statusCounts.bald, color: 'yellow.6' },
    { name: 'Abgelaufen', value: stats.statusCounts.abgelaufen, color: 'red.6' },
  ];
  const statusChartDataForChart =
    total > 0 ? statusChartData.filter((item) => item.value > 0) : statusChartData;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Statistik"
      centered
      size="xl"
      overlayProps={{ blur: 4 }}
    >
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Produkte gesamt
            </Text>
            <Title order={3}>{total}</Title>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Bald ablaufend
            </Text>
            <Title order={3}>{stats.statusCounts.bald}</Title>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Abgelaufen
            </Text>
            <Title order={3}>{stats.statusCounts.abgelaufen}</Title>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Ablauf in 7 Tagen
            </Text>
            <Title order={3}>{stats.next7Days}</Title>
          </Paper>
        </SimpleGrid>

        <Group gap="xs">
          <Badge color="teal" variant="light">
            Durchschnitt Haltbarkeit: {stats.avgShelfLife == null ? 'n/a' : `${stats.avgShelfLife} Tage`}
          </Badge>
          <Badge color="blue" variant="light">
            Kategorien: {stats.categoryChartData.length}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Status-Verteilung
            </Text>
            <DonutChart
              h={260}
              data={statusChartDataForChart}
              chartLabel={total}
              withLabels
              withLabelsLine={false}
              pieProps={{ label: renderDonutPercentLabel }}
              tooltipDataSource="segment"
            />
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Top-Kategorien
            </Text>
            {stats.categoryChartData.length > 0 ? (
              <BarChart
                h={260}
                data={stats.categoryChartData}
                dataKey="name"
                series={[{ name: 'anzahl', color: categoryBarColor, label: 'Produkte' }]}
                withLegend={false}
                withXAxis
                withYAxis
              />
            ) : (
              <Text size="sm" c="dimmed">
                Keine Daten vorhanden.
              </Text>
            )}
          </Paper>
        </SimpleGrid>

        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">
            Abläufe pro Monat (3 Monate zurück bis 3 Monate voraus)
          </Text>
          <LineChart
            h={260}
            data={stats.expiryTrendData}
            dataKey="month"
            series={[{ name: 'abläufe', color: expiryLineColor, label: 'Abläufe' }]}
            withDots
            withLegend={false}
            withXAxis
            withYAxis
          />
        </Paper>
      </Stack>
    </Modal>
  );
}
