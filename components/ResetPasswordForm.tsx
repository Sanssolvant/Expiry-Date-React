'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconArrowBack, IconKey, IconLock, IconShieldCheck } from '@tabler/icons-react';
import {
  Anchor,
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
import { matches, useForm } from '@mantine/form';

import { authClient } from '@/app/lib/auth-client';
import { AUTH_REDIRECTS } from '@/app/lib/authRedirects';
import { useAuthStatusMessage } from '@/app/lib/useAuthStatusMessage';

import { Logo } from './General/Logo';
import { NotificationElementError } from './General/NotificationElementError';
import { NotificationElementSuccess } from './General/NotificationElementSuccess';
import { PasswordField } from './General/PasswordField';
import { PasswordConfirmField } from './General/PasswordConfirmField';

import classes from './resetpasswordform.module.css';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { type, text } = useAuthStatusMessage();

  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Je nach deiner API kann das token "token" oder "code" heißen.
  // Wir lesen beides – und nutzen dann das, was vorhanden ist.
  const token = searchParams.get('token') || searchParams.get('code') || '';

  const form = useForm({
    initialValues: {
      password: '',
    },
    validate: {
      password: matches(
        /^(?=(.*[0-9]))(?=(.*[a-z]))(?=(.*[A-Z]))(?=(.*[$&+,:;=?@#|'<>.^*()%!-]))[A-Za-z0-9$&+,:;=?@#|'<>.^*()%!-]{8,}$/,
        'Passwort muss mind. 8 Zeichen haben inkl. Gross-/Kleinbuchstaben, Zahl und Sonderzeichen'
      ),
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      router.push(AUTH_REDIRECTS.ERROR_GENERIC);
      return;
    }

    if (form.values.password !== confirmPassword) {
      setConfirmPasswordError('Passwörter stimmen nicht überein');
      return;
    }

    if (form.validate().hasErrors) return;

    setLoading(true);

    try {
      await authClient.resetPassword(
        { newPassword: form.values.password, token },
        {
          onSuccess: () => router.push(AUTH_REDIRECTS.PASSWORD_RESET_SUCCESS),
          onError: () => router.push(AUTH_REDIRECTS.ERROR_GENERIC),
        }
      );
    } finally {
      setLoading(false);
    }
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

          {type === 'success' && <NotificationElementSuccess text={text} />}
          {type === 'error' && <NotificationElementError text={text} />}

          <Stack gap={6} mt={type ? 'sm' : 0} mb="md">
            <Group justify="center">
              <ThemeIcon radius="xl" variant="light" size={44}>
                <IconKey size={20} />
              </ThemeIcon>
            </Group>

            <Title order={2} ta="center">
              Neues Passwort setzen
            </Title>

            <Text ta="center" c="dimmed" size="sm">
              Wähle ein neues Passwort für deinen Account.
            </Text>
          </Stack>

          <Divider my="lg" />

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              {/* Passwort */}
              <div>
                {/* nutzt deine bestehende PasswordField-Komponente */}
                <PasswordField form={form} />
              </div>

              {/* Passwort bestätigen */}
              <div>
                <PasswordConfirmField
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  confirmPasswordError={confirmPasswordError}
                  setConfirmPasswordError={setConfirmPasswordError}
                />
              </div>

              <Button
                type="submit"
                loading={loading}
                leftSection={<IconShieldCheck size={16} />}
                mt="xs"
                radius="lg"
                fullWidth
              >
                Passwort speichern
              </Button>

              <Stack align="center" gap={4} mt="md">
                <Text size="sm" c="dimmed">
                  Zurück zum{' '}
                  <Anchor fw={700} onClick={() => router.push('/')}>
                    Login
                  </Anchor>
                </Text>

                <Button
                  variant="subtle"
                  leftSection={<IconArrowBack size={16} />}
                  onClick={() => router.push('/')}
                >
                  Zurück
                </Button>
              </Stack>
            </Stack>
          </form>

          {!token && (
            <Group mt="lg" justify="center">
              <ThemeIcon radius="xl" variant="light">
                <IconLock size={16} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Link ungültig oder abgelaufen. Bitte erneut „Passwort vergessen“ nutzen.
              </Text>
            </Group>
          )}
        </Paper>
      </div>

      <div className={classes.imageSide} />
    </div>
  );
}
