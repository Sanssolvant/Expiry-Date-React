'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  alpha,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBarcode,
  IconCamera,
  IconPlayerStop,
  IconRefresh,
  IconScan,
  IconSearch,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

type BarcodeTemplateData = {
  name: string;
  kategorie: string;
  image: string;
  einheit: string;
};

type BarcodeLookupResponse = {
  found: boolean;
  barcode: string;
  template?: BarcodeTemplateData;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onApply: (data: { barcode: string; template?: BarcodeTemplateData }) => void;
};

type DetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): DetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

const RELEVANT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

function normalizeBarcode(value: string) {
  return value.replace(/\s+/g, '').replace(/[^\dA-Za-z\-]/g, '').toUpperCase();
}

export function BarcodeCreateModal({ opened, onClose, onApply }: Props) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const isSmallScreen = useMediaQuery('(max-width: 36em)') ?? false;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<DetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectTsRef = useRef(0);
  const stableCandidateRef = useRef<{ value: string; hits: number } | null>(null);

  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraState, setCameraState] = useState<
    'idle' | 'starting' | 'ready' | 'camera_only' | 'blocked' | 'unsupported'
  >('idle');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Starte die Kamera per Button oder gib den Barcode manuell ein.');
  const [lookup, setLookup] = useState<BarcodeLookupResponse | null>(null);

  const cardBg = useMemo(
    () => (isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.75)),
    [isDark, theme]
  );
  const cardBorder = useMemo(
    () => (isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3]),
    [isDark, theme]
  );

  const stopCamera = () => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    detectorRef.current = null;
    stableCandidateRef.current = null;
  };

  const handleLookup = async (barcodeValue: string) => {
    const normalized = normalizeBarcode(barcodeValue);
    if (normalized.length < 6) {
      notifications.show({
        title: 'Barcode ungültig',
        message: 'Bitte einen gültigen Barcode eingeben oder erneut scannen.',
        color: 'red',
      });
      return;
    }

    setBusy(true);
    setMessage('Suche gespeicherte Produktvorlage...');

    try {
      const res = await fetch(`/api/barcode-template?barcode=${encodeURIComponent(normalized)}`, {
        method: 'GET',
        credentials: 'include',
      });

      const json = (await res.json().catch(() => ({}))) as BarcodeLookupResponse & { error?: string };

      if (!res.ok) {
        throw new Error(json?.error || 'Barcode konnte nicht aufgelöst werden.');
      }

      setLookup(json);
      if (json.found) {
        setMessage('Vorlage gefunden. Du kannst direkt übernehmen.');
      } else {
        setMessage('Dieser Barcode ist neu. Bitte Produktdaten einmalig erfassen.');
      }
    } catch (error: any) {
      setLookup(null);
      setMessage('Suche fehlgeschlagen. Du kannst den Barcode trotzdem manuell verwenden.');
      notifications.show({
        title: 'Suche fehlgeschlagen',
        message: error?.message || 'Unbekannter Fehler',
        color: 'red',
      });
    } finally {
      setBusy(false);
    }
  };

  const startDetectionLoop = () => {
    const tick = async () => {
      const detector = detectorRef.current;
      const video = videoRef.current;

      if (!opened || !detector || !video) {
        return;
      }

      const now = Date.now();
      if (video.readyState >= 2 && now - lastDetectTsRef.current > 260) {
        lastDetectTsRef.current = now;

        try {
          const detected = await detector.detect(video);
          const raw = detected?.[0]?.rawValue;
          const normalized = raw ? normalizeBarcode(raw) : '';

          if (normalized.length >= 6) {
            const prev = stableCandidateRef.current;
            if (!prev || prev.value !== normalized) {
              stableCandidateRef.current = { value: normalized, hits: 1 };
            } else {
              stableCandidateRef.current = { value: normalized, hits: prev.hits + 1 };
            }

            if ((stableCandidateRef.current?.hits ?? 0) >= 2) {
              stopCamera();
              setCameraState('idle');
              void handleLookup(normalized);
              return;
            }
          } else {
            stableCandidateRef.current = null;
          }
        } catch {
          // detector frame error ignorieren
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    setLookup(null);
    setMessage('Starte Kamera...');
    setCameraState('starting');

    if (typeof window === 'undefined') {
      setCameraState('unsupported');
      setMessage('Scanner ist in dieser Umgebung nicht verfügbar.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      setMessage('Kamera wird von diesem Gerät oder Browser nicht unterstützt.');
      return;
    }

    if (!videoRef.current) {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    if (!videoRef.current) {
      setCameraState('blocked');
      setMessage('Video wird initialisiert. Bitte Kamera starten nochmals tippen.');
      return;
    }

    stopCamera();

    const constraintsList: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    for (const constraints of constraintsList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) {
          break;
        }
      } catch {
        // nächster Versuch
      }
    }

    if (!stream) {
      setCameraState('blocked');
      if (!window.isSecureContext) {
        setMessage('Kamera benötigt HTTPS oder localhost.');
      } else {
        setMessage('Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.');
      }
      return;
    }

    try {
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      await video.play().catch(() => {});

      if (!window.BarcodeDetector) {
        setCameraState('camera_only');
        setMessage('Kamera aktiv. Automatisches Scannen wird von diesem Browser nicht unterstützt. Bitte Barcode manuell eingeben.');
        return;
      }

      const supported = window.BarcodeDetector.getSupportedFormats
        ? await window.BarcodeDetector.getSupportedFormats()
        : [];
      const formats = supported.length
        ? RELEVANT_FORMATS.filter((format) => supported.includes(format))
        : RELEVANT_FORMATS;

      detectorRef.current = formats.length
        ? new window.BarcodeDetector({ formats })
        : new window.BarcodeDetector();

      setCameraState('ready');
      setMessage('Kamera aktiv. Richte auf den Barcode und halte kurz still.');
      startDetectionLoop();
    } catch {
      stopCamera();
      setCameraState('blocked');
      setMessage('Kamera wurde gestartet, aber Vorschau konnte nicht angezeigt werden. Bitte erneut versuchen.');
    }
  };

  const resetAndRescan = async () => {
    setLookup(null);
    await startCamera();
  };

  useEffect(() => {
    if (!opened) {
      stopCamera();
      setManualBarcode('');
      setLookup(null);
      setBusy(false);
      setCameraState('idle');
      setMessage('Starte die Kamera per Button oder gib den Barcode manuell ein.');
    }

    return () => {
      if (!opened) {
        stopCamera();
      }
    };
  }, [opened]);

  const statusColor =
    cameraState === 'ready'
      ? 'teal'
      : cameraState === 'camera_only'
        ? 'yellow'
        : cameraState === 'starting'
          ? 'blue'
          : cameraState === 'idle'
            ? 'gray'
            : 'orange';

  const statusLabel =
    cameraState === 'ready'
      ? 'Scanner aktiv'
      : cameraState === 'camera_only'
        ? 'Kamera aktiv'
        : cameraState === 'starting'
          ? 'Starte...'
          : cameraState === 'blocked'
            ? 'Kamera blockiert'
            : cameraState === 'unsupported'
              ? 'Nicht unterstützt'
              : 'Bereit';

  const shouldShowVideo =
    cameraState === 'ready' || cameraState === 'camera_only' || cameraState === 'starting';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      radius="xl"
      padding="lg"
      overlayProps={{ blur: 6, backgroundOpacity: 0.55 }}
      title={
        <Group gap="sm" align="center">
          <ThemeIcon radius="xl" variant="light">
            <IconBarcode size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={700} lh={1.1}>
              Per Barcode hinzufügen
            </Text>
            <Text size="xs" c="dimmed">
              Einfach: Kamera starten, scannen, übernehmen.
            </Text>
          </Box>
        </Group>
      }
    >
      <Stack gap="md">
        <Box
          style={{
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            background: cardBg,
            padding: 10,
          }}
        >
          <Group justify="space-between" align="center" wrap={isSmallScreen ? 'wrap' : 'nowrap'} gap="xs">
            <Badge color={statusColor} variant={isDark ? 'filled' : 'light'}>
              {statusLabel}
            </Badge>
            <Text size="xs" c="dimmed">
              1. Kamera starten 2. Barcode scannen 3. Karte übernehmen
            </Text>
          </Group>
        </Box>

        <Box
          style={{
            position: 'relative',
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            overflow: 'hidden',
            background: isDark ? alpha(theme.colors.dark[7], 0.55) : theme.white,
            minHeight: isSmallScreen ? 240 : 280,
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            style={{
              width: '100%',
              display: 'block',
              minHeight: isSmallScreen ? 240 : 280,
              maxHeight: isSmallScreen ? 320 : 360,
              objectFit: 'cover',
              visibility: shouldShowVideo ? 'visible' : 'hidden',
            }}
          />

          {!shouldShowVideo ? (
            <Group
              justify="center"
              p="xl"
              gap="sm"
              style={{ position: 'absolute', inset: 0 }}
            >
              <ThemeIcon radius="xl" variant="light">
                <IconCamera size={18} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                {message}
              </Text>
            </Group>
          ) : null}

          {cameraState === 'starting' ? (
            <Group
              justify="center"
              p="xl"
              style={{
                position: 'absolute',
                inset: 0,
                background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)',
              }}
            >
              <Loader size="sm" />
              <Text size="sm">Kamera wird gestartet...</Text>
            </Group>
          ) : null}
        </Box>

        <Group grow wrap="nowrap" gap="sm">
          <Button
            size={isSmallScreen ? 'xs' : 'sm'}
            leftSection={<IconCamera size={16} />}
            onClick={() => void startCamera()}
          >
            {isSmallScreen ? 'Starten' : 'Kamera starten'}
          </Button>
          <Button
            size={isSmallScreen ? 'xs' : 'sm'}
            variant="default"
            leftSection={<IconPlayerStop size={16} />}
            onClick={() => {
              stopCamera();
              setCameraState('idle');
              setMessage('Kamera gestoppt. Du kannst jederzeit neu starten.');
            }}
          >
            {isSmallScreen ? 'Stoppen' : 'Kamera stoppen'}
          </Button>
        </Group>

        <Text size="sm" c="dimmed">
          {message}
        </Text>

        <Group align="flex-end" grow>
          <TextInput
            label="Barcode manuell"
            placeholder="z.B. 761..."
            value={manualBarcode}
            onChange={(event) => setManualBarcode(event.currentTarget.value)}
            leftSection={<IconScan size={16} />}
          />
          <Button
            leftSection={<IconSearch size={16} />}
            onClick={() => void handleLookup(manualBarcode)}
            loading={busy}
          >
            Suchen
          </Button>
        </Group>

        {lookup ? (
          <Box
            style={{
              borderRadius: 14,
              border: `1px solid ${cardBorder}`,
              background: cardBg,
              padding: 12,
            }}
          >
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                Barcode
              </Text>
              <Text fw={700}>{lookup.barcode}</Text>

              {lookup.found && lookup.template ? (
                <>
                  <Text size="xs" c="dimmed">
                    Gefundene Vorlage
                  </Text>
                  <Text size="sm">Name: {lookup.template.name}</Text>
                  <Text size="sm">Kategorie: {lookup.template.kategorie}</Text>
                  <Text size="sm">Einheit-Vorschlag: {lookup.template.einheit || 'Stk'}</Text>
                </>
              ) : (
                <Text size="sm">
                  Keine Vorlage gefunden. Du kannst jetzt ein neues Produkt mit diesem Barcode anlegen.
                </Text>
              )}

              <Group justify="space-between" wrap="wrap" mt="xs">
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => void resetAndRescan()}
                >
                  Erneut scannen
                </Button>
                <Button onClick={() => onApply({ barcode: lookup.barcode, template: lookup.template })}>
                  Übernehmen
                </Button>
              </Group>
            </Stack>
          </Box>
        ) : null}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Schliessen
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
