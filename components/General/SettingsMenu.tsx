'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconSettings } from '@tabler/icons-react';
import {
  alpha,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
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

  useEffect(() => {
    if (opened) {
      setLocalBald(baldAb);
      setLocalExpired(abgelaufenAb);
      setError('');
      setSuccess(false);
    }
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
      setError('Bitte beide Werte eingeben.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          warnLevelBald: Number(localBald),
          warnLevelExpired: Number(localExpired),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Fehler beim Speichern');
      }

      setBaldAb(Number(localBald));
      setAbgelaufenAb(Number(localExpired));
      setSuccess(true);
      setTimeout(() => setOpened(false), 800);
    } catch (err: any) {
      setError(err.message);
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
                Warnstufen einstellen
              </Text>
              <Text size="xs" c="dimmed">
                Bestimme, ab wann Karten als „Bald ablaufend“ oder „Abgelaufen“ gelten.
              </Text>
            </Box>
          </Group>
        }
      >
        <Stack gap="md">
          {/* Erklärung */}
          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: headerBg,
              padding: 12,
            }}
          >
            <Text size="sm" fw={600}>
              Wie funktioniert das?
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              • „Bald ablaufend“ = Ablaufdatum liegt in den nächsten X Tagen. <br />
              • „Abgelaufen“ = Ablaufdatum ist seit Y Tagen vorbei.
            </Text>

            <Group mt="sm" gap="xs">
              <Badge variant="filled" color="yellow" radius="sm">
                Bald
              </Badge>
              <Text size="xs" c="dimmed">
                z.B. Ablauf in 2 Tagen
              </Text>

              <Badge variant="filled" color="red" radius="sm" ml="md">
                Abgelaufen
              </Badge>
              <Text size="xs" c="dimmed">
                z.B. seit 1 Tag abgelaufen
              </Text>
            </Group>
          </Box>

          {/* Input 1 */}
          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: tileBg,
              padding: 12,
            }}
          >
            <NumberInput
              label="„Bald ablaufend“, wenn Ablauf in … Tagen"
              description="Beispiel: 3 → Alles mit Ablauf in 0–3 Tagen wird gelb markiert."
              min={1}
              max={30}
              value={localBald}
              onChange={(val) => setLocalBald(val === '' ? '' : Number(val))}
            />
          </Box>

          {/* Input 2 */}
          <Box
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: tileBg,
              padding: 12,
            }}
          >
            <NumberInput
              label="„Abgelaufen“, wenn seit … Tagen vorbei"
              description="Beispiel: 0 → Ab dem Tag nach Ablauf ist es sofort rot."
              min={0}
              max={maxExpired}
              value={localExpired}
              onChange={(val) => setLocalExpired(val === '' ? '' : Number(val))}
            />
            <Text size="xs" c="dimmed" mt={6}>
              Tipp: Der Wert muss kleiner sein als „Bald“, damit sich die Bereiche nicht überschneiden.
            </Text>
          </Box>

          {error && (
            <Text c="red" size="xs">
              {error}
            </Text>
          )}
          {success && (
            <Text c="teal" size="xs">
              Gespeichert ✅
            </Text>
          )}

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setOpened(false)}>
              Schließen
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
