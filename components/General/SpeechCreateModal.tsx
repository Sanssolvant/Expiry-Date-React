'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCheck,
  IconMicrophone,
  IconPlayerStop,
  IconWand,
  IconSparkles,
} from '@tabler/icons-react';
import {
  alpha,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

type ParsedItem = {
  name?: string;
  menge?: number;
  einheit?: string;
  kategorie?: string;
  ablaufdatum?: string | null; // "DD.MM.YYYY" | null
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onApply: (data: { text: string; parsed: ParsedItem }) => void;
};

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
      <Text fw={600} size="sm" lh={1.25} lineClamp={1}>
        {value}
      </Text>
    </Box>
  );
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
  const [parsed, setParsed] = useState<ParsedItem>({});

  const canApply = useMemo(() => {
    const nameOk = (parsed?.name ?? '').trim().length > 0;
    return nameOk;
  }, [parsed]);

  useEffect(() => {
    if (!opened) {
      setIsRecording(false);
      setIsTranscribing(false);
      setIsParsing(false);
      setText('');
      setParsed({});
      chunksRef.current = [];
    }
  }, [opened]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
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

      if (!res.ok) throw new Error(json?.error ?? 'Transkription fehlgeschlagen');

      setText(json.text ?? '');
      setParsed(json.parsed ?? {});
      notifications.show({ title: 'Fertig', message: 'Transkription abgeschlossen', color: 'teal' });
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
    if (!recorder || !stream) return;

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

      if (!res.ok) throw new Error(json?.error ?? 'Auswertung fehlgeschlagen');

      setParsed(json.parsed ?? {});
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

  const status = isTranscribing ? 'Transkribiere…' : isRecording ? 'Aufnahme läuft…' : 'Bereit';
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
              Sprich ein Produkt ein – wir transkribieren & füllen Felder automatisch.
            </Text>
          </Box>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Top action bar */}
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

        {/* Transcript */}
        <Textarea
          label="Transkript (bearbeitbar)"
          autosize
          minRows={4}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder='z.B. "2 Milch 1 Liter Kategorie Milchprodukte Ablauf am 14.12.2025"'
          disabled={isTranscribing || isRecording}
          styles={{
            input: { borderRadius: 16 },
          }}
        />

        <Divider />

        {/* Parsed tiles */}
        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm">
              Erkannte Daten
            </Text>
            <Text size="xs" c="dimmed">
              Du kannst das Transkript oben anpassen und „Neu auswerten“ klicken.
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <InfoTile label="Name" value={(parsed?.name ?? '—') as string} />
            <InfoTile
              label="Menge"
              value={`${parsed?.menge ?? '—'} ${parsed?.einheit ?? ''}`.trim()}
            />
            <InfoTile label="Kategorie" value={(parsed?.kategorie ?? '—') as string} />
            <InfoTile label="Ablaufdatum" value={(parsed?.ablaufdatum ?? '—') as string} />
          </SimpleGrid>
        </Box>

        {/* Footer */}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Schließen
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={() => onApply({ text, parsed })}
            disabled={!canApply || isTranscribing || isParsing || isRecording}
          >
            Übernehmen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
