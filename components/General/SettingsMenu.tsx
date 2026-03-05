'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconMail, IconSettings } from '@tabler/icons-react';
import {
  alpha,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';

type Props = {
  baldAb: number;
  abgelaufenAb: number;
  setBaldAb: (n: number) => void;
  setAbgelaufenAb: (n: number) => void;
  iconOnly?: boolean;
};

const intervalUnitData = [
  { value: 'day', label: 'Tag(e)' },
  { value: 'week', label: 'Woche(n)' },
  { value: 'month', label: 'Monat(e)' },
];

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function SettingsMenu({
  baldAb,
  abgelaufenAb,
  setBaldAb,
  setAbgelaufenAb,
  iconOnly,
}: Props) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [localBald, setLocalBald] = useState<number | ''>(baldAb);
  const [localExpired, setLocalExpired] = useState<number | ''>(abgelaufenAb);

  const [localReminderEnabled, setLocalReminderEnabled] = useState(false);
  const [localReminderTime, setLocalReminderTime] = useState('08:00');
  const [localIntervalValue, setLocalIntervalValue] = useState<number | ''>(1);
  const [localIntervalUnit, setLocalIntervalUnit] = useState<'day' | 'week' | 'month'>('day');
  const [localReminderTimeZone, setLocalReminderTimeZone] = useState('Europe/Zurich');

  useEffect(() => {
    if (!opened) {
      return;
    }

    setLocalBald(baldAb);
    setLocalExpired(abgelaufenAb);
    setError('');
    setSuccess(false);

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/user-settings', { method: 'GET', credentials: 'include' });
        if (!res.ok) {
          return;
        }

        const settings = await res.json();
        if (cancelled) {
          return;
        }

        if (settings.warnLevelBald != null) {
          setLocalBald(Number(settings.warnLevelBald));
        }
        if (settings.warnLevelExpired != null) {
          setLocalExpired(Number(settings.warnLevelExpired));
        }

        setLocalReminderEnabled(Boolean(settings.emailRemindersEnabled));

        const loadedTime =
          typeof settings.emailReminderTime === 'string' && isValidTime(settings.emailReminderTime)
            ? settings.emailReminderTime
            : `${String(Number(settings.emailReminderHour ?? 8)).padStart(2, '0')}:00`;
        setLocalReminderTime(loadedTime);

        const loadedIntervalValue = Number(settings.emailReminderIntervalValue ?? 1);
        setLocalIntervalValue(Number.isFinite(loadedIntervalValue) ? Math.max(1, loadedIntervalValue) : 1);

        const loadedUnit =
          settings.emailReminderIntervalUnit === 'week' ||
          settings.emailReminderIntervalUnit === 'month'
            ? settings.emailReminderIntervalUnit
            : 'day';
        setLocalIntervalUnit(loadedUnit);

        setLocalReminderTimeZone(settings.emailReminderTimeZone || 'Europe/Zurich');
      } catch {
        // keep defaults
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [opened, baldAb, abgelaufenAb]);

  const tileBg = isDark ? alpha(theme.colors.dark[5], 0.35) : alpha(theme.colors.gray[1], 0.6);
  const tileBorder = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];
  const headerBg = isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.7);

  const maxExpired = useMemo(() => {
    const bald = typeof localBald === 'number' ? localBald : 1;
    return Math.max(0, bald - 1);
  }, [localBald]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    if (localBald === '' || localExpired === '') {
      setError('Bitte beide Warnstufen-Werte eingeben.');
      setSaving(false);
      return;
    }

    if (localReminderEnabled) {
      if (!isValidTime(localReminderTime)) {
        setError('Bitte eine gueltige Uhrzeit im Format HH:mm eingeben.');
        setSaving(false);
        return;
      }

      if (localIntervalValue === '' || Number(localIntervalValue) < 1) {
        setError('Bitte ein Intervall grösser oder gleich 1 setzen.');
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          warnLevelBald: Number(localBald),
          warnLevelExpired: Number(localExpired),
          emailRemindersEnabled: localReminderEnabled,
          emailReminderTime: localReminderTime,
          emailReminderIntervalValue: Number(localIntervalValue || 1),
          emailReminderIntervalUnit: localIntervalUnit,
          emailReminderTimeZone: localReminderTimeZone,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Fehler beim Speichern');
      }

      setBaldAb(Number(localBald));
      setAbgelaufenAb(Number(localExpired));
      setSuccess(true);
      setTimeout(() => setOpened(false), 900);
    } catch (err: any) {
      setError(err?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="default" onClick={() => setOpened(true)}>
        {iconOnly ? (
          <IconSettings size={18} />
        ) : (
          <>
            <IconSettings size={18} style={{ marginRight: 10 }} />
            Einstellungen
          </>
        )}
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        centered
        size="md"
        radius="xl"
        overlayProps={{ blur: 6, backgroundOpacity: 0.45 }}
        title={
          <Group gap="sm" align="center">
            <ThemeIcon radius="xl" variant="light">
              <IconAlertTriangle size={18} />
            </ThemeIcon>
            <Box>
              <Text fw={700} lh={1.1}>
                Einstellungen
              </Text>
              <Text size="xs" c="dimmed">
                Warnstufen und E-Mail Erinnerungen verwalten.
              </Text>
            </Box>
          </Group>
        }
      >
        <Stack gap="md">
          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: headerBg,
              padding: 12,
            }}
          >
            <Text size="sm" fw={600}>
              Hinweise
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              - Bald ablaufend: Ablauf in den nächsten X Tagen.{'\n'}
              - Abgelaufen: seit Y Tagen vorbei.{'\n'}
              - Erinnerung: z.B. alle 2 Wochen um 22:13 oder alle 1 Monat.
            </Text>
          </Box>

          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: tileBg,
              padding: 12,
            }}
          >
            <Text fw={700} size="sm" mb="xs">
              Warnstufen
            </Text>

            <NumberInput
              label="Bald ablaufend in ... Tagen"
              description="Beispiel: 3 -> Ablauf in 0-3 Tagen wird markiert."
              min={1}
              max={30}
              value={localBald}
              onChange={(val) => setLocalBald(val === '' ? '' : Number(val))}
            />

            <NumberInput
              mt="sm"
              label="Abgelaufen seit ... Tagen"
              description="Beispiel: 0 -> direkt nach Ablauf als abgelaufen."
              min={0}
              max={maxExpired}
              value={localExpired}
              onChange={(val) => setLocalExpired(val === '' ? '' : Number(val))}
            />
          </Box>

          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: tileBg,
              padding: 12,
            }}
          >
            <Group gap="xs" mb="xs">
              <IconMail size={16} />
              <Text fw={700} size="sm">
                E-Mail Erinnerungen
              </Text>
            </Group>

            <Switch
              checked={localReminderEnabled}
              onChange={(e) => setLocalReminderEnabled(e.currentTarget.checked)}
              label="E-Mail Erinnerungen aktivieren"
            />

            <TextInput
              mt="sm"
              type="time"
              label="Uhrzeit"
              description="Format HH:mm, z.B. 22:13"
              value={localReminderTime}
              onChange={(e) => setLocalReminderTime(e.currentTarget.value)}
              disabled={!localReminderEnabled}
            />

            <Group mt="sm" grow>
              <NumberInput
                label="Intervall"
                min={1}
                max={365}
                value={localIntervalValue}
                onChange={(val) => setLocalIntervalValue(val === '' ? '' : Number(val))}
                disabled={!localReminderEnabled}
              />

              <Select
                label="Einheit"
                data={intervalUnitData}
                value={localIntervalUnit}
                onChange={(val) => setLocalIntervalUnit((val as 'day' | 'week' | 'month') || 'day')}
                allowDeselect={false}
                disabled={!localReminderEnabled}
              />
            </Group>

            <Text size="xs" c="dimmed" mt={6}>
              Zeitzone: {localReminderTimeZone}
            </Text>
          </Box>

          {error ? (
            <Text c="red" size="xs">
              {error}
            </Text>
          ) : null}

          {success ? (
            <Text c="teal" size="xs">
              Gespeichert.
            </Text>
          ) : null}

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setOpened(false)}>
              Schliessen
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
