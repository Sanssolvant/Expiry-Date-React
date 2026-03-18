'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
  alpha,
} from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import {
  IconBarcode,
  IconCalendar,
  IconChartPie,
  IconChefHat,
  IconKey,
  IconLogin2,
  IconSettings,
  IconShoppingCart,
  IconSparkles,
  IconWand,
} from '@tabler/icons-react';

import { authClient } from '@/app/lib/auth-client';
import { useAuthStatusMessage } from '@/app/lib/useAuthStatusMessage';
import { AUTH_REDIRECTS } from '@/app/lib/authRedirects';

import { CheckboxLogin } from './General/CheckboxLogin';
import { IdentifierFieldLogin } from './General/IdentifierFieldLogin';
import { PasswordFieldLogin } from './General/PasswordFieldLogin';
import { NotificationElementError } from './General/NotificationElementError';
import { NotificationElementSuccess } from './General/NotificationElementSuccess';

import classes from './loginform.module.css';

export function LoginForm() {
  const router = useRouter();
  const { type, text } = useAuthStatusMessage();
  const [loading, setLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const form = useForm({
    initialValues: {
      identifier: '',
      password: '',
      checkbox: false,
    },
    validate: {
      identifier: (value) => {
        const v = (value ?? '').trim();
        if (v.length < 2) {return 'Bitte Benutzername oder E-Mail eingeben';}

        if (v.includes('@')) {
          return isEmail('Ungültige E-Mail-Adresse')(v);
        }

        if (v.length < 2 || v.length > 10) {
          return 'Ungültiger Benutzername (2–10 Zeichen)';
        }

        return null;
      },
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.validate().hasErrors) {return;}
    setCustomError(null);

    const identifier = form.values.identifier.trim();
    const password = form.values.password;

    const onError = (ctx: any) => {
      setLoading(false);
      const status = Number(ctx?.error?.status);
      const code = typeof ctx?.error?.code === 'string' ? ctx.error.code : '';
      const rawMessage = typeof ctx?.error?.message === 'string' ? ctx.error.message : '';
      const isBanned = code === 'USER_BANNED' || /gesperrt|sperre|banned/i.test(rawMessage);

      if (isBanned) {
        setCustomError(rawMessage || 'Dein Account ist derzeit gesperrt.');
        return;
      }

      if (status === 403) {
        router.push(AUTH_REDIRECTS.ERROR_EMAIL_NOT_VERIFIED);
      } else {
        router.push(AUTH_REDIRECTS.ERROR_INVALID_CREDENTIALS);
      }
    };

    const resolveRedirectTarget = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const adminRes = await fetch('/api/admin/access', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          });
          const payload = await adminRes.json().catch(() => ({}));

          if (payload?.canAccess) {
            return '/admin';
          }
          if (payload?.authenticated) {
            return '/dashboard';
          }
        } catch {
          // Retry below
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 180);
        });
      }

      return '/dashboard';
    };

    const onSuccess = async () => {
      try {
        const target = await resolveRedirectTarget();
        router.push(target);
      } catch {
        router.push('/dashboard');
      }
    };

    setLoading(true);

    if (identifier.includes('@')) {
      await authClient.signIn.email(
        { email: identifier, password, rememberMe: form.values.checkbox },
        { onSuccess, onError }
      );
    } else {
      await authClient.signIn.username(
        { username: identifier, password, rememberMe: form.values.checkbox },
        { onSuccess, onError }
      );
    }
  };

  const surfaceBg = isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.7);
  const surfaceBorder = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];
  const featureItems = [
    {
      icon: IconBarcode,
      text: 'Inventar: Produkte manuell, per Sprache, Foto oder Barcode erfassen und verwalten',
    },
    {
      icon: IconCalendar,
      text: 'Ablaufdaten: Warnstufen für bald fällig und abgelaufen mit smarten Statusanzeigen',
    },
    { icon: IconChartPie, text: 'Kalender: Monatsansicht mit nächsten Fälligkeiten und Tagesdetails' },
    {
      icon: IconShoppingCart,
      text: 'Einkaufsliste: Gruppen, Mengen, Abhaken, Drag-and-drop und Direkt-Import aus Produkten',
    },
    {
      icon: IconChefHat,
      text: 'Rezepte: Auswahlbasierte Suche mit Webquellen und schnellerer, optimierter Verarbeitung',
    },
    {
      icon: IconSparkles,
      text: 'Nährwertblick: KI-gestützte Schätzung für kcal, Protein, Carbs und Fett',
    },
    {
      icon: IconSettings,
      text: 'Einstellungen: E-Mail-Erinnerungen, Intervalle, Zeitzone, Kategorien und Einheiten',
    },
    { icon: IconKey, text: 'Konto: Login per Benutzername/E-Mail, Passwort-Reset, Profilpflege und Sicherheit' },
  ];

  const heroCards = [
    {
      icon: IconWand,
      title: 'Inventar Workflow',
      text: 'Erfassen, sortieren, filtern und speichern - inklusive Barcode-Vorlagen und Bild-Upload.',
    },
    {
      icon: IconSparkles,
      title: 'Planung mit KI',
      text: 'Rezepte und Nährwerte greifen direkt auf deinen aktuellen Bestand zu.',
    },
    {
      icon: IconCalendar,
      title: 'Erinnerungen',
      text: 'Zeitgesteuerte E-Mail-Reminder helfen dir, weniger zu verschwenden.',
    },
  ];

  return (
    <div className={classes.wrapper}>
      <div className={classes.formSide}>
        <Paper
          radius="xl"
          p="xl"
          className={classes.card}
          style={{
            background: surfaceBg,
            border: `1px solid ${surfaceBorder}`,
          }}
        >
          {/* Status messages */}
          {customError && <NotificationElementError text={customError} />}
          {type === 'success' && <NotificationElementSuccess text={text} />}
          {type === 'error' && <NotificationElementError text={text} />}

          <Stack gap="xs" mt={type ? 'sm' : 0}>
            <Group gap="sm" justify="center">
              <Box
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: isDark
                    ? alpha(theme.colors[theme.primaryColor][9], 0.25)
                    : alpha(theme.colors[theme.primaryColor][2], 0.6),
                  border: `1px solid ${isDark
                    ? alpha(theme.colors[theme.primaryColor][6], 0.35)
                    : alpha(theme.colors[theme.primaryColor][4], 0.35)
                    }`,
                }}
              >
                <IconLogin2 size={20} />
              </Box>
            </Group>

            <Title order={2} ta="center">
              Anmelden
            </Title>

            <Text ta="center" c="dimmed" size="sm">
              Melde dich mit <b>Benutzername</b> oder <b>E-Mail</b> an.
            </Text>
          </Stack>

          <Divider my="lg" />

          <form onSubmit={handleSubmit} className={classes.formular}>
            <Stack gap="sm">
              <IdentifierFieldLogin form={form} />
              <PasswordFieldLogin form={form} />
              
              <Box style={{ display: 'flex', alignItems: 'center' }}>
                <CheckboxLogin form={form} />
              </Box>

              <Button
                loading={loading}
                fullWidth
                size="md"
                type="submit"
                mt="sm"
                radius="lg"
              >
                Anmelden
              </Button>
            </Stack>
          </form>

          <Stack align="center" gap={4} mt="lg">
            <Text size="sm" c="dimmed">
              Noch kein Account?{' '}
              <Anchor fw={700} onClick={() => router.push('/register')}>
                Registrieren
              </Anchor>
            </Text>

            <Anchor
              size="sm"
              fw={600}
              onClick={() => router.push('/forgot-password')}
            >
              Passwort vergessen?
            </Anchor>
          </Stack>
        </Paper>
      </div>

      <div className={classes.imageSide}>
        <div className={classes.heroContent}>
          <Title order={1} className={classes.heroTitle}>
            Willkommen bei <span className={classes.heroAccent}>TrackShelf</span>
          </Title>

          <Text className={classes.heroSubtitle}>
            TrackShelf ist dein zentraler Hub für Vorrat, Ablaufdaten, Einkauf und KI-gestützte
            Planung.
          </Text>

          <Group gap="xs" className={classes.heroChipRow}>
            <div className={classes.heroChip}>
              <IconSparkles size={14} />
              <span>Live Features</span>
            </div>
            <div className={classes.heroChipAlt}>
              <IconWand size={14} />
              <span>KI-gestützt</span>
            </div>
          </Group>

          <ul className={classes.heroList}>
            {featureItems.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <li
                  key={item.text}
                  className={classes.heroListItem}
                  style={{ '--feature-delay': `${120 + idx * 60}ms` } as CSSProperties}
                >
                  <span className={classes.heroListIcon}>
                    <ItemIcon size={16} stroke={1.8} />
                  </span>
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>

          <div className={classes.heroCards}>
            {heroCards.map((card, idx) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={card.title}
                  className={classes.heroCard}
                  style={{ '--card-delay': `${220 + idx * 90}ms` } as CSSProperties}
                >
                  <Group gap={8} align="center" wrap="nowrap">
                    <span className={classes.heroCardIcon}>
                      <CardIcon size={16} stroke={1.9} />
                    </span>
                    <Text fw={700}>{card.title}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {card.text}
                  </Text>
                </div>
              );
            })}
          </div>

          <Text className={classes.heroFootnote}>
            Alles an einem Ort: Von der Erfassung bis zur Auswertung, damit Planung im Alltag
            schneller und verlässlicher wird.
          </Text>

        </div>
      </div>
    </div>
  );
}
