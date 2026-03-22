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
import { useMediaQuery } from '@mantine/hooks';
import { IconCamera, IconCheck, IconPhoto, IconSparkles, IconWand } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export type ParsedImageItem = {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  expiry_guess?: string | null;
  confidence?: number;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onApply: (data: { items: ParsedImageItem[]; notes?: string }) => void;
};

type ExpiryReadResponse = {
  expiry_date: string | null;
  notes?: string;
  confidence?: number;
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
  const isSmallScreen = useMediaQuery('(max-width: 36em)') ?? false;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ParsedImageItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  const [expiryFile, setExpiryFile] = useState<File | null>(null);
  const [expiryPreviewUrl, setExpiryPreviewUrl] = useState<string>('');
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [detectedExpiryDate, setDetectedExpiryDate] = useState<string | null>(null);
  const [expiryNotes, setExpiryNotes] = useState<string>('');

  useEffect(() => {
    if (!opened) {
      setFile(null);
      setPreviewUrl('');
      setLoading(false);
      setItems([]);
      setNotes('');
      setExpiryFile(null);
      setExpiryPreviewUrl('');
      setExpiryLoading(false);
      setDetectedExpiryDate(null);
      setExpiryNotes('');
    }
  }, [opened]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!expiryFile) {
      setExpiryPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(expiryFile);
    setExpiryPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [expiryFile]);

  const canAnalyze = !!file && !loading && !expiryLoading;
  const canReadExpiry = !!expiryFile && items.length > 0 && !loading && !expiryLoading;
  const hasExpiryForAllItems = useMemo(
    () =>
      items.length > 0 &&
      items.every((it) => typeof it.expiry_guess === 'string' && it.expiry_guess.trim().length > 0),
    [items]
  );
  const canApply = hasExpiryForAllItems && !loading && !expiryLoading;

  const analyzeProducts = async () => {
    if (!file) {
      return;
    }

    try {
      setLoading(true);
      setDetectedExpiryDate(null);
      setExpiryNotes('');
      setExpiryFile(null);

      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch('/api/analyze-products-image', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? 'Analyse fehlgeschlagen');
      }

      setItems(Array.isArray(json?.items) ? json.items : []);
      setNotes(json?.notes ?? '');
      notifications.show({ title: 'Fertig', message: 'Produktfoto wurde analysiert.', color: 'teal' });
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

  const readExpiryDate = async () => {
    if (!expiryFile) {
      return;
    }

    try {
      setExpiryLoading(true);
      const fd = new FormData();
      fd.append('image', expiryFile);

      const res = await fetch('/api/read-expiry-date-image', { method: 'POST', body: fd });
      const json = (await res.json()) as ExpiryReadResponse & { error?: string };

      if (!res.ok) {
        throw new Error(json?.error ?? 'MHD konnte nicht gelesen werden');
      }

      const nextDate = typeof json?.expiry_date === 'string' ? json.expiry_date : null;
      setDetectedExpiryDate(nextDate);
      setExpiryNotes(typeof json?.notes === 'string' ? json.notes : '');

      if (!nextDate) {
        notifications.show({
          title: 'Kein Datum erkannt',
          message: 'Auf dem zweiten Foto wurde kein klares MHD gefunden.',
          color: 'yellow',
        });
        return;
      }

      setItems((prev) => prev.map((it) => ({ ...it, expiry_guess: nextDate })));
      notifications.show({
        title: 'MHD erkannt',
        message: `Ablaufdatum ${nextDate} wurde übernommen.`,
        color: 'teal',
      });
    } catch (e: any) {
      console.error(e);
      notifications.show({
        title: 'Fehler',
        message: e?.message ?? 'Unbekannter Fehler',
        color: 'red',
      });
    } finally {
      setExpiryLoading(false);
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
              Schritt 1: Produktfoto. Schritt 2: Extra Foto vom MHD für automatisches Ablaufdatum.
            </Text>
          </Box>
        </Group>
      }
    >
      <Stack gap="md">
        <Box
          style={{
            borderRadius: 18,
            border: `1px solid ${headerBorder}`,
            background: headerBg,
            padding: 12,
          }}
        >
          <Stack gap="xs">
            <Group justify="space-between" align="center" wrap={isSmallScreen ? 'wrap' : 'nowrap'} gap="sm">
              <Text fw={600} size="sm">
                Schritt 1: Produktfoto
              </Text>
              <Badge
                color={loading ? 'blue' : file ? 'teal' : 'gray'}
                variant={isDark ? 'filled' : 'light'}
                radius="sm"
                style={isSmallScreen ? { width: '100%', textAlign: 'center' } : undefined}
              >
                {loading ? 'Analysiere...' : file ? 'Foto bereit' : 'Kein Foto'}
              </Badge>
            </Group>

            <Group gap="sm" wrap="nowrap" style={isSmallScreen ? { width: '100%' } : undefined}>
              <Button
                component="label"
                leftSection={<IconCamera size={16} />}
                variant="outline"
                disabled={loading || expiryLoading}
                size={isSmallScreen ? 'xs' : 'sm'}
                style={isSmallScreen ? { flex: 1 } : undefined}
              >
                Produktfoto
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
                onClick={analyzeProducts}
                disabled={!canAnalyze}
                loading={loading}
                size={isSmallScreen ? 'xs' : 'sm'}
                style={isSmallScreen ? { flex: 1 } : undefined}
              >
                Analysieren
              </Button>
            </Group>
          </Stack>
        </Box>

        {previewUrl ? (
          <Box
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${headerBorder}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Produktfoto Vorschau" style={{ width: '100%', display: 'block' }} />
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
                Wähle zuerst ein Produktfoto.
              </Text>
            </Group>
          </Box>
        )}

        {items.length > 0 ? (
          <>
            <Box
              style={{
                borderRadius: 18,
                border: `1px solid ${headerBorder}`,
                background: headerBg,
                padding: 12,
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between" align="center" wrap={isSmallScreen ? 'wrap' : 'nowrap'} gap="sm">
                  <Text fw={600} size="sm">
                    Schritt 2: Foto vom Ablaufdatum (MHD)
                  </Text>
                  <Badge
                    color={expiryLoading ? 'blue' : detectedExpiryDate ? 'teal' : 'gray'}
                    variant={isDark ? 'filled' : 'light'}
                    radius="sm"
                    style={isSmallScreen ? { width: '100%', textAlign: 'center' } : undefined}
                  >
                    {expiryLoading ? 'Lese MHD...' : detectedExpiryDate ? detectedExpiryDate : 'Noch kein MHD'}
                  </Badge>
                </Group>

                <Group gap="sm" wrap="nowrap" style={isSmallScreen ? { width: '100%' } : undefined}>
                  <Button
                    component="label"
                    leftSection={<IconCamera size={16} />}
                    variant="outline"
                    disabled={loading || expiryLoading}
                    size={isSmallScreen ? 'xs' : 'sm'}
                    style={isSmallScreen ? { flex: 1 } : undefined}
                  >
                    MHD-Foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={(e) => {
                        setDetectedExpiryDate(null);
                        setExpiryNotes('');
                        setExpiryFile(e.target.files?.[0] ?? null);
                      }}
                    />
                  </Button>

                  <Button
                    leftSection={<IconWand size={16} />}
                    onClick={readExpiryDate}
                    disabled={!canReadExpiry}
                    loading={expiryLoading}
                    size={isSmallScreen ? 'xs' : 'sm'}
                    style={isSmallScreen ? { flex: 1 } : undefined}
                  >
                    MHD lesen
                  </Button>
                </Group>
              </Stack>
            </Box>

            {expiryPreviewUrl ? (
              <Box
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: `1px solid ${headerBorder}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={expiryPreviewUrl} alt="MHD Foto Vorschau" style={{ width: '100%', display: 'block' }} />
              </Box>
            ) : null}
          </>
        ) : null}

        <Divider />

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
                        : 'Confidence -'}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="sm">
                    <InfoTile label="Kategorie" value={it.category ?? '-'} />
                    <InfoTile label="MHD" value={it.expiry_guess ?? '-'} />
                  </SimpleGrid>
                </Box>
              ))}
            </Stack>
          ) : null}

          {notes ? (
            <Text size="xs" c="dimmed" mt="sm">
              Hinweis Produktanalyse: {notes}
            </Text>
          ) : null}
          {expiryNotes ? (
            <Text size="xs" c="dimmed" mt="sm">
              Hinweis MHD-Foto: {expiryNotes}
            </Text>
          ) : null}
        </Box>

        {!hasExpiryForAllItems && items.length > 0 ? (
          <Text size="xs" c="dimmed">
            Für jedes Produkt wird ein Ablaufdatum benötigt. Nutze Schritt 2, um ein MHD-Foto zu lesen.
          </Text>
        ) : null}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose} disabled={loading || expiryLoading}>
            Schliessen
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
