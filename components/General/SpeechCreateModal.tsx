'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCheck,
  IconMicrophone,
  IconPlayerStop,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconWand,
} from '@tabler/icons-react';
import {
  alpha,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { formatDateToDisplay, parseDateFromString } from '@/app/lib/dateUtils';

type ParsedItem = {
  name: string;
  menge: number;
  einheit: string;
  kategorie: string;
  ablaufdatum: string | null;
};

type EditableItem = {
  key: string;
  name: string;
  menge: number;
  einheit: string;
  kategorie: string;
  ablaufdatum: Date | null;
  erfasstAm: Date | null;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onApply: (data: { text: string; items: ParsedItem[] }) => void;
};

function buildItemWithDefaults(source?: Partial<ParsedItem>): EditableItem {
  let expiry: Date | null = new Date();
  if (typeof source?.ablaufdatum === 'string' && source.ablaufdatum.trim()) {
    try {
      expiry = parseDateFromString(source.ablaufdatum);
    } catch {
      expiry = new Date();
    }
  }

  return {
    key: crypto.randomUUID(),
    name: (source?.name ?? '').trim(),
    menge: Number.isFinite(source?.menge) && Number(source?.menge) >= 1 ? Math.round(Number(source?.menge)) : 1,
    einheit: (source?.einheit ?? 'Stk').trim() || 'Stk',
    kategorie: (source?.kategorie ?? '').trim(),
    ablaufdatum: expiry,
    erfasstAm: new Date(),
  };
}

function mapApiItems(rawItems: unknown): EditableItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item: any) => {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (!name) {
        return null;
      }
      return buildItemWithDefaults(item);
    })
    .filter((item): item is EditableItem => Boolean(item));
}

export function SpeechCreateModal({ opened, onClose, onApply }: Props) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const [text, setText] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);

  const canApply = useMemo(
    () =>
      items.length > 0 &&
      items.every(
        (item) =>
          item.name.trim().length > 0 &&
          Number.isFinite(item.menge) &&
          item.menge >= 1 &&
          item.einheit.trim().length > 0 &&
          item.kategorie.trim().length > 0 &&
          Boolean(item.ablaufdatum) &&
          Boolean(item.erfasstAm)
      ),
    [items]
  );

  useEffect(() => {
    if (!opened) {
      setIsRecording(false);
      setIsTranscribing(false);
      setIsParsing(false);
      setText('');
      setItems([]);
      chunksRef.current = [];
    }
  }, [opened]);

  const updateItem = (key: string, patch: Partial<Omit<EditableItem, 'key'>>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const addEmptyItem = () => {
    setItems((prev) => [...prev, buildItemWithDefaults()]);
  };

  const applyParsedItems = (rawItems: unknown) => {
    const nextItems = mapApiItems(rawItems);
    setItems(nextItems);
    if (nextItems.length === 0) {
      notifications.show({
        title: 'Keine Produkte erkannt',
        message: 'Bitte Transkript anpassen oder erneut aufnehmen.',
        color: 'yellow',
      });
      return;
    }
    notifications.show({
      title: 'Fertig',
      message: `${nextItems.length} Produkt${nextItems.length === 1 ? '' : 'e'} erkannt.`,
      color: 'teal',
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start();
      setIsRecording(true);
      notifications.show({ title: 'Aufnahme', message: 'Aufnahme gestartet', color: 'blue' });
    } catch (e) {
      console.error(e);
      notifications.show({
        title: 'Mikrofon Fehler',
        message: 'Mikrofonzugriff nicht möglich (Berechtigung?)',
        color: 'red',
      });
    }
  };

  const transcribe = async (blob: Blob) => {
    try {
      setIsTranscribing(true);

      const fd = new FormData();
      fd.append('file', new File([blob], 'speech.webm', { type: 'audio/webm' }));

      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? 'Transkription fehlgeschlagen');
      }

      setText(json.text ?? '');
      applyParsedItems(json.items);
    } catch (e: any) {
      console.error(e);
      notifications.show({
        title: 'Fehler',
        message: e?.message ?? 'Unbekannter Fehler',
        color: 'red',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;
    if (!recorder || !stream) {
      return;
    }

    setIsRecording(false);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      recorder.stop();
    });

    stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;

    await transcribe(blob);
  };

  const reParse = async () => {
    try {
      setIsParsing(true);

      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? 'Auswertung fehlgeschlagen');
      }

      applyParsedItems(json.items);
      notifications.show({ title: 'Aktualisiert', message: 'Neu ausgewertet', color: 'teal' });
    } catch (e: any) {
      console.error(e);
      notifications.show({
        title: 'Fehler',
        message: e?.message ?? 'Unbekannter Fehler',
        color: 'red',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const status = isTranscribing ? 'Transkribiere...' : isRecording ? 'Aufnahme läuft...' : 'Bereit';
  const statusColor = isTranscribing ? 'blue' : isRecording ? 'orange' : 'gray';

  const headerBg = isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.7);
  const headerBorder = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (isRecording) {
          try {
            recorderRef.current?.stop();
            streamRef.current?.getTracks().forEach((t) => t.stop());
          } catch {
            /* empty */
          }
        }
        onClose();
      }}
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
              Per Sprache hinzufügen
            </Text>
            <Text size="xs" c="dimmed">
              Sprich mehrere Produkte ein. Danach kannst du alle Karten vor dem Speichern anpassen.
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
          <Group justify="space-between" align="center">
            <Group gap="sm">
              {!isRecording ? (
                <Button
                  leftSection={<IconMicrophone size={16} />}
                  onClick={startRecording}
                  disabled={isTranscribing || isParsing}
                >
                  Start
                </Button>
              ) : (
                <Button
                  color="red"
                  leftSection={<IconPlayerStop size={16} />}
                  onClick={stopRecording}
                  disabled={isTranscribing || isParsing}
                >
                  Stop
                </Button>
              )}

              <Button
                variant="light"
                leftSection={<IconWand size={16} />}
                onClick={reParse}
                disabled={!text.trim() || isTranscribing || isParsing || isRecording}
                loading={isParsing}
              >
                Neu auswerten
              </Button>
            </Group>

            <Badge color={statusColor} variant={isDark ? 'filled' : 'light'} radius="sm">
              {status}
            </Badge>
          </Group>
        </Box>

        <Textarea
          label="Transkript (bearbeitbar)"
          autosize
          minRows={4}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder='z.B. "2L Milch, 3 Eier mit Ablaufdatum morgen, 1 Joghurt in 5 Tagen"'
          disabled={isTranscribing || isRecording}
          styles={{
            input: { borderRadius: 16 },
          }}
        />

        <Divider />

        <Box>
          <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
            <Box>
              <Text fw={700} size="sm">
                Erstellte Karten
              </Text>
              <Text size="xs" c="dimmed">
                {items.length
                  ? `${items.length} Karte${items.length === 1 ? '' : 'n'} erkannt. Alle Felder sind bearbeitbar.`
                  : 'Noch keine Produkte erkannt.'}
              </Text>
            </Box>
            <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addEmptyItem}>
              Karte hinzufügen
            </Button>
          </Group>

          {items.length ? (
            <Stack gap="sm">
              {items.map((item, index) => (
                <Box
                  key={item.key}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${headerBorder}`,
                    background: headerBg,
                    padding: 12,
                  }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                      <Text fw={600} size="sm">
                        Karte {index + 1}
                      </Text>
                      <Button
                        variant="light"
                        color="red"
                        size="xs"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => removeItem(item.key)}
                      >
                        Entfernen
                      </Button>
                    </Group>

                    <TextInput
                      label="Name"
                      value={item.name}
                      onChange={(e) => updateItem(item.key, { name: e.currentTarget.value })}
                      required
                    />

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <NumberInput
                        label="Menge"
                        min={1}
                        allowDecimal={false}
                        hideControls
                        value={item.menge}
                        onChange={(value) =>
                          updateItem(item.key, {
                            menge: Number.isFinite(value) && Number(value) >= 1 ? Math.round(Number(value)) : 1,
                          })
                        }
                        required
                      />
                      <TextInput
                        label="Einheit"
                        value={item.einheit}
                        onChange={(e) => updateItem(item.key, { einheit: e.currentTarget.value })}
                        required
                      />
                    </SimpleGrid>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <TextInput
                        label="Kategorie"
                        value={item.kategorie}
                        onChange={(e) => updateItem(item.key, { kategorie: e.currentTarget.value })}
                        required
                      />
                      <DatePickerInput
                        label="Ablaufdatum"
                        valueFormat="DD.MM.YYYY"
                        value={item.ablaufdatum}
                        onChange={(value) => updateItem(item.key, { ablaufdatum: value })}
                        required
                      />
                    </SimpleGrid>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : null}
        </Box>

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Schliessen
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={() =>
              onApply({
                text,
                items: items.map((item) => ({
                  name: item.name.trim(),
                  menge: Math.max(1, Math.round(item.menge)),
                  einheit: item.einheit.trim() || 'Stk',
                  kategorie: item.kategorie.trim(),
                  ablaufdatum: item.ablaufdatum ? formatDateToDisplay(item.ablaufdatum) : null,
                })),
              })
            }
            disabled={!canApply || isTranscribing || isParsing || isRecording}
          >
            Übernehmen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
