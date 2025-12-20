'use client';

import { useEffect, useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconCategory,
  IconClockExclamation,
  IconEraser,
} from '@tabler/icons-react';
import {
  alpha,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { einheiten, kategorien, WarnLevel } from '@/app/types';
import type { Filters } from '@/app/types';
import type { Dispatch, SetStateAction } from 'react';

type Props = {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  iconOnly?: boolean;
};

const DEFAULT_FILTERS: Filters = {
  name: '',
  kategorie: '',
  einheit: '',
  warnLevel: '',
  ablaufVon: null,
  ablaufBis: null,
  mengeVon: null,
  mengeBis: null,
  sort: 'expiry_asc',
};

export function CardFilterMenu({ filters, setFilters, iconOnly }: Props) {
  const [opened, setOpened] = useState(false);

  // 🔥 Lokaler State (damit Reset wirklich die Input-Felder leert)
  const [local, setLocal] = useState<Filters>(filters);

  // NumberInputs brauchen oft '' statt null, sonst bleibt die Anzeige „hängen“
  const [localMengeVon, setLocalMengeVon] = useState<number | ''>(filters.mengeVon ?? '');
  const [localMengeBis, setLocalMengeBis] = useState<number | ''>(filters.mengeBis ?? '');

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const tileBg = isDark ? alpha(theme.colors.dark[5], 0.35) : alpha(theme.colors.gray[1], 0.6);
  const tileBorder = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];

  // Beim Öffnen immer den aktuellen globalen Filter in lokal kopieren
  useEffect(() => {
    if (opened) {
      setLocal(filters);
      setLocalMengeVon(filters.mengeVon ?? '');
      setLocalMengeBis(filters.mengeBis ?? '');
    }
  }, [opened, filters]);

  const handleReset = () => {
    setLocal(DEFAULT_FILTERS);
    setLocalMengeVon(''); // ✅ Anzeige wirklich leer
    setLocalMengeBis(''); // ✅ Anzeige wirklich leer
  };

  const handleApply = () => {
    setFilters({
      ...local,
      mengeVon: localMengeVon === '' ? null : Number(localMengeVon),
      mengeBis: localMengeBis === '' ? null : Number(localMengeBis),
    });
    setOpened(false);
  };

  return (
    <>
      <Button variant="default" onClick={() => setOpened(true)}>
        {iconOnly ? (
          <IconAdjustmentsHorizontal size={18} />
        ) : (
          <>
            <IconAdjustmentsHorizontal size={18} style={{ marginRight: 10 }} /> Filtern
          </>
        )}
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        centered
        size="lg"
        radius="xl"
        overlayProps={{ blur: 6, backgroundOpacity: 0.45 }}
        title={
          <Group gap="sm" align="center">
            <ThemeIcon radius="xl" variant="light">
              <IconAdjustmentsHorizontal size={18} />
            </ThemeIcon>
            <Box>
              <Text fw={700} lh={1.1}>
                Filter
              </Text>
              <Text size="xs" c="dimmed">
                Wähle Kriterien – „Übernehmen“ aktiviert sie. „Zurücksetzen“ leert alles.
              </Text>
            </Box>
          </Group>
        }
      >
        <Stack gap="md">
          {/* SECTION: Auswahl */}
          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: tileBg,
              padding: 12,
            }}
          >
            <Stack gap="sm">
              <Select
                leftSection={<IconCategory size={18} stroke={1.5} />}
                label="Kategorie"
                data={kategorien}
                clearable
                value={local.kategorie}
                onChange={(value) => setLocal((f) => ({ ...f, kategorie: value || '' }))}
              />

              <Select
                label="Einheit"
                data={einheiten}
                clearable
                value={local.einheit}
                onChange={(value) => setLocal((f) => ({ ...f, einheit: value || '' }))}
              />

              <Select
                leftSection={<IconClockExclamation size={18} stroke={1.5} />}
                label="Status"
                description="Filtern nach Frisch / Bald / Abgelaufen"
                data={[
                  { value: WarnLevel.OK, label: 'Frisch' },
                  { value: WarnLevel.BALD, label: 'Bald abgelaufen' },
                  { value: WarnLevel.ABGELAUFEN, label: 'Abgelaufen' },
                ]}
                clearable
                value={local.warnLevel}
                onChange={(value) => setLocal((f) => ({ ...f, warnLevel: value || '' }))}
              />
            </Stack>
          </Box>

          {/* SECTION: Menge */}
          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: tileBg,
              padding: 12,
            }}
          >
            <Text fw={700} size="sm" mb="xs">
              Menge
            </Text>
            <SimpleGrid cols={{ base: 2 }} spacing="sm">
              <NumberInput
                label="Von"
                min={0}
                value={localMengeVon}
                onChange={(v) => setLocalMengeVon(v === '' ? '' : Number(v))}
                placeholder="z.B. 1"
                hideControls
              />
              <NumberInput
                label="Bis"
                min={0}
                value={localMengeBis}
                onChange={(v) => setLocalMengeBis(v === '' ? '' : Number(v))}
                placeholder="z.B. 10"
                hideControls
              />
            </SimpleGrid>
          </Box>

          {/* SECTION: Ablaufdatum */}
          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: tileBg,
              padding: 12,
            }}
          >
            <Text fw={700} size="sm" mb="xs">
              Ablaufdatum
            </Text>
            <SimpleGrid cols={{ base: 2 }} spacing="sm">
              <DatePickerInput
                label="Von"
                valueFormat="DD.MM.YYYY"
                leftSection={<IconCalendar size={16} />}
                value={local.ablaufVon}
                onChange={(v) => setLocal((f) => ({ ...f, ablaufVon: v }))}
                clearable
              />
              <DatePickerInput
                label="Bis"
                valueFormat="DD.MM.YYYY"
                leftSection={<IconCalendar size={16} />}
                value={local.ablaufBis}
                onChange={(v) => setLocal((f) => ({ ...f, ablaufBis: v }))}
                clearable
              />
            </SimpleGrid>
          </Box>

          {/* Footer */}
          <Group justify="space-between" mt="xs">
            <Button
              variant="default"
              leftSection={<IconEraser size={16} />}
              onClick={handleReset}
            >
              Zurücksetzen
            </Button>

            <Group gap="sm">
              <Button variant="default" onClick={() => setOpened(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleApply}>Übernehmen</Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
