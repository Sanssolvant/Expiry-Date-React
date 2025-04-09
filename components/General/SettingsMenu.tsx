'use client';

import { useState } from 'react';
import { IconSettings } from '@tabler/icons-react';
import { Button, NumberInput, Popover, Stack, Text } from '@mantine/core';

type Props = {
  baldAb: number;
  abgelaufenAb: number;
  setBaldAb: (n: number) => void;
  setAbgelaufenAb: (n: number) => void;
};

export function SettingsMenu({ baldAb, abgelaufenAb, setBaldAb, setAbgelaufenAb }: Props) {
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
          warnLevelBald: baldAb,
          warnLevelExpired: abgelaufenAb,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Fehler beim Speichern');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={300}
      position="bottom-end"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <Button
          variant="default"
          leftSection={<IconSettings size={18} />}
          onClick={() => setOpened((o) => !o)}
        >
          Einstellungen
        </Button>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Warnlevel (Tage)
          </Text>

          <NumberInput
            label="Bald ablaufend ab"
            min={1}
            max={30}
            value={baldAb}
            onChange={(val) => setBaldAb(Number(val))}
          />

          <NumberInput
            label="Abgelaufen ab"
            min={0}
            max={baldAb - 1}
            value={abgelaufenAb}
            onChange={(val) => setAbgelaufenAb(Number(val))}
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

          <Button variant="light" color="blue" onClick={handleSave} loading={saving} size="xs">
            Speichern
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
