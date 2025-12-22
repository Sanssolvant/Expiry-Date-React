'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  alpha,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { IconCamera, IconCheck, IconPhoto, IconSparkles, IconWand } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export type ParsedImageItem = {
  name: string;                 // z.B. "Milch"
  quantity: number;             // wie viele Packungen/Einheiten
  unit?: string;                // "Stk" etc.
  category?: string;            // "Milchprodukte"
  expiry_guess?: string | null; // "DD.MM.YYYY" | null
  confidence?: number;          // 0..1
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onApply: (data: { items: ParsedImageItem[]; notes?: string }) => void;
};

function InfoTile({ label, value }: { label: string; value: string }) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? alpha(theme.colors.dark[5], 0.35) : alpha(theme.colors.gray[1], 0.6);
  const border = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];

  return (
    <Box
      style={{
        borderRadius: 16,
        border: `1px solid ${border}`,
        background: bg,
        padding: '10px 12px',
      }}
    >
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600} size="sm" lh={1.25}>
        {value}
      </Text>
    </Box>
  );
}

export function PhotoCreateModal({ opened, onClose, onApply }: Props) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ParsedImageItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!opened) {
      setFile(null);
      setPreviewUrl('');
      setLoading(false);
      setItems([]);
      setNotes('');
    }
  }, [opened]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canAnalyze = !!file && !loading;
  const canApply = useMemo(() => items.length > 0 && !loading, [items, loading]);

  const analyze = async () => {
    if (!file) return;

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch('/api/analyze-products-image', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error ?? 'Analyse fehlgeschlagen');

      setItems(Array.isArray(json?.items) ? json.items : []);
      setNotes(json?.notes ?? '');
      notifications.show({ title: 'Fertig', message: 'Foto wurde analysiert', color: 'teal' });
    } catch (e: any) {
      console.error(e);
      notifications.show({
        title: 'Fehler',
        message: e?.message ?? 'Unbekannter Fehler',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const headerBg = isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.7);
  const headerBorder = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      overlayProps={{ blur: 6, backgroundOpacity: 0.55 }}
      radius="xl"
      padding="lg"
      title={
        <Group gap="sm" align="center">
          <ThemeIcon radius="xl" variant="light">
            <IconSparkles size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={700} lh={1.1}>
              Per Foto hinzufügen
            </Text>
            <Text size="xs" c="dimmed">
              Mach ein Foto deiner Sammlung – wir erkennen Produkte, Anzahl, Kategorie & schätzen ein MHD.
            </Text>
          </Box>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Top bar */}
        <Box
          style={{
            borderRadius: 18,
            border: `1px solid ${headerBorder}`,
            background: headerBg,
            padding: 12,
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Button
                component="label"
                leftSection={<IconCamera size={16} />}
                variant="outline"
                disabled={loading}
              >
                Foto wählen
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Button>

              <Button
                leftSection={<IconWand size={16} />}
                onClick={analyze}
                disabled={!canAnalyze}
                loading={loading}
              >
                Analysieren
              </Button>
            </Group>

            <Badge color={loading ? 'blue' : 'gray'} variant={isDark ? 'filled' : 'light'} radius="sm">
              {loading ? 'Analysiere…' : file ? 'Foto bereit' : 'Kein Foto'}
            </Badge>
          </Group>
        </Box>

        {/* Preview */}
        {previewUrl ? (
          <Box
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${headerBorder}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="preview" style={{ width: '100%', display: 'block' }} />
          </Box>
        ) : (
          <Box
            style={{
              borderRadius: 16,
              border: `1px dashed ${headerBorder}`,
              padding: 18,
              textAlign: 'center',
            }}
          >
            <Group justify="center" gap="xs">
              <IconPhoto size={18} />
              <Text size="sm" c="dimmed">
                Wähle ein Foto (oder nutze die Kamera).
              </Text>
            </Group>
          </Box>
        )}

        <Divider />

        {/* Results */}
        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm">
              Erkannte Produkte
            </Text>
            <Text size="xs" c="dimmed">
              {items.length ? `${items.length} Einträge` : 'Noch nichts erkannt'}
            </Text>
          </Group>

          {items.length ? (
            <Stack gap="sm">
              {items.map((it, idx) => (
                <Box
                  key={`${it.name}-${idx}`}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${headerBorder}`,
                    padding: 12,
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={700}>{it.name}</Text>
                      <Text size="xs" c="dimmed">
                        Menge: {it.quantity} {it.unit ?? 'Stk'}
                      </Text>
                    </Box>
                    <Badge variant="light">
                      {typeof it.confidence === 'number'
                        ? `Confidence ${(it.confidence * 100).toFixed(0)}%`
                        : 'Confidence —'}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="sm">
                    <InfoTile label="Kategorie" value={it.category ?? '—'} />
                    <InfoTile label="MHD (Schätzung)" value={it.expiry_guess ?? '—'} />
                  </SimpleGrid>
                </Box>
              ))}
            </Stack>
          ) : null}

          {notes ? (
            <Text size="xs" c="dimmed" mt="sm">
              Hinweis: {notes}
            </Text>
          ) : null}
        </Box>

        {/* Footer */}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Schließen
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={() => onApply({ items, notes })}
            disabled={!canApply}
          >
            Übernehmen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
