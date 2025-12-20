'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowBack, IconUserPlus } from '@tabler/icons-react';
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
  ThemeIcon,
  alpha,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { hasLength, isEmail, matches, useForm } from '@mantine/form';

import { authClient } from '@/app/lib/auth-client';
import { AUTH_REDIRECTS } from '@/app/lib/authRedirects';
import { useAuthStatusMessage } from '@/app/lib/useAuthStatusMessage';

import { EmailField } from './General/EmailField';
import { Logo } from './General/Logo';
import { NotificationElementError } from './General/NotificationElementError';
import { PasswordConfirmField } from './General/PasswordConfirmField';
import { PasswordField } from './General/PasswordField';
import { UsernameField } from './General/UsernameField';

import classes from './registerform.module.css';

export function RegisterForm() {
  const router = useRouter();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { type, text } = useAuthStatusMessage();

  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: '',
    },
    validate: {
      username: hasLength({ min: 2, max: 10 }, 'Ungültiger Benutzername (2–10 Zeichen)'),
      email: isEmail('Ungültige E-Mail-Adresse'),
      password: matches(
        /^(?=(.*[0-9]))(?=(.*[a-z]))(?=(.*[A-Z]))(?=(.*[$&+,:;=?@#|'<>.^*()%!-]))[A-Za-z0-9$&+,:;=?@#|'<>.^*()%!-]{8,}$/,
        'Passwort muss mind. 8 Zeichen haben inkl. Gross-/Kleinbuchstaben, Zahl und Sonderzeichen'
      ),
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (form.values.password !== confirmPassword) {
      setConfirmPasswordError('Passwörter stimmen nicht überein');
      return;
    }

    if (form.validate().hasErrors) return;

    await authClient.signUp.email(
      {
        email: form.values.email,
        password: form.values.password,
        name: form.values.username,
        username: form.values.username,
      },
      {
        onRequest: () => setLoading(true),
        onSuccess: () => router.push(AUTH_REDIRECTS.REGISTER_SUCCESS),
        onError: (ctx) => {
          setLoading(false);
          if (ctx?.error?.status === 422) {
            router.push(AUTH_REDIRECTS.REGISTER_ERROR_USER_ALREADY_EXISTS);
          } else {
            router.push(AUTH_REDIRECTS.REGISTER_GENERIC_ERROR);
          }
        },
      }
    );
  };

  const surfaceBg = isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.7);
  const surfaceBorder = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];

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
          <Group justify="center" mb="sm">
            <Logo />
          </Group>

          {type === 'error' && <NotificationElementError text={text} />}

          <Stack gap={6} mt={type ? 'sm' : 0} mb="md">
            <Group justify="center">
              <ThemeIcon radius="xl" variant="light" size={44}>
                <IconUserPlus size={20} />
              </ThemeIcon>
            </Group>

            <Title order={2} ta="center">
              Account erstellen
            </Title>

            <Text ta="center" c="dimmed" size="sm">
              Erstelle einen Account, um deine Produkte und Ablaufdaten zu speichern.
            </Text>
          </Stack>

          <Divider my="lg" />

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <Box>
                <UsernameField form={form} />
              </Box>

              <Box>
                <EmailField form={form} />
              </Box>

              <Box>
                <PasswordField form={form} />
              </Box>

              <Box>
                <PasswordConfirmField
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  confirmPasswordError={confirmPasswordError}
                  setConfirmPasswordError={setConfirmPasswordError}
                />
              </Box>

              <Group justify="space-between" mt="xs" wrap="nowrap">
                <Button
                  leftSection={<IconArrowBack size={16} />}
                  variant="default"
                  onClick={() => router.push('/')}
                >
                  Zurück
                </Button>

                <Button loading={loading} type="submit">
                  Registrieren
                </Button>
              </Group>

              <Stack align="center" gap={4} mt="md">
                <Text size="sm" c="dimmed">
                  Schon ein Account?{' '}
                  <Anchor fw={700} onClick={() => router.push('/')}>
                    Anmelden
                  </Anchor>
                </Text>
              </Stack>
            </Stack>
          </form>
        </Paper>
      </div>

      <div className={classes.imageSide} />
    </div>
  );
}
