'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconMicrophone, IconPlayerStop, IconWand } from '@tabler/icons-react';
import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
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

  // wird aufgerufen, wenn User "Übernehmen" klickt
  onApply: (data: { text: string; parsed: ParsedItem }) => void;
};

export function SpeechCreateModal({ opened, onClose, onApply }: Props) {
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
      // Reset wenn Modal geschlossen wird
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

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;

    if (!recorder || !stream) {
      return;
    }

    setIsRecording(false);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      recorder.stop();
    });

    stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;

    await transcribe(blob);
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
      setParsed(json.parsed ?? {});
      notifications.show({
        title: 'Fertig',
        message: 'Transkription abgeschlossen',
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
      setIsTranscribing(false);
    }
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

  return (
    <Modal
      opened={opened}
      onClose={() => {
        // Safety: Aufnahme stoppen, falls Modal geschlossen wird
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
      title="Per Sprache hinzufügen"
      centered
      size="lg"
      overlayProps={{ blur: 3, backgroundOpacity: 0.5 }}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Group>
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

          <Text size="sm" c="dimmed">
            {isTranscribing ? 'Transkribiere…' : isRecording ? 'Aufnahme läuft…' : 'Bereit'}
          </Text>
        </Group>

        <Textarea
          label="Transkript (bearbeitbar)"
          autosize
          minRows={4}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder='z.B. "2 Milch 1 Liter Kategorie Milchprodukte Ablauf am 14.12.2025"'
          disabled={isTranscribing || isRecording}
        />

        <Stack gap={4}>
          <Text fw={600} size="sm">
            Erkannte Daten
          </Text>
          <Text size="sm">Name: {parsed?.name ?? '—'}</Text>
          <Text size="sm">
            Menge: {parsed?.menge ?? '—'} {parsed?.einheit ?? ''}
          </Text>
          <Text size="sm">Kategorie: {parsed?.kategorie ?? '—'}</Text>
          <Text size="sm">Ablaufdatum: {parsed?.ablaufdatum ?? '—'}</Text>
        </Stack>

        <Group justify="flex-end" mt="sm">
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
