'use client';

import { useEffect, useState } from 'react';
import { IconSettings } from '@tabler/icons-react';
import { Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';

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
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [localBald, setLocalBald] = useState(baldAb);
  const [localExpired, setLocalExpired] = useState(abgelaufenAb);

  useEffect(() => {
    if (opened) {
      setLocalBald(baldAb);
      setLocalExpired(abgelaufenAb);
      setError('');
      setSuccess(false);
    }
  }, [opened, baldAb, abgelaufenAb]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          warnLevelBald: localBald,
          warnLevelExpired: localExpired,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Fehler beim Speichern');
      }

      setBaldAb(localBald);
      setAbgelaufenAb(localExpired);
      setSuccess(true);
      setTimeout(() => setOpened(false), 800); // nach kurzem Erfolg schließen
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
        title="Warnlevel-Einstellungen"
        centered
        size="md"
        overlayProps={{ blur: 3, backgroundOpacity: 0.4 }}
      >
        <Stack>
          <NumberInput
            label="Bald ablaufend ab (Tage)"
            min={1}
            max={30}
            value={localBald}
            onChange={(val) => setLocalBald(Number(val))}
          />

          <NumberInput
            label="Abgelaufen seit (Tage)"
            min={0}
            max={localBald - 1}
            value={localExpired}
            onChange={(val) => setLocalExpired(Number(val))}
          />

          {error && (
            <Text c="red" size="xs">
              {error}
            </Text>
          )}
          {success && (
            <Text c="green" size="xs">
              Gespeichert ✅
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setOpened(false)}>
              Abbrechen
            </Button>
            <Button variant="filled" color="blue" onClick={handleSave} loading={saving}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
