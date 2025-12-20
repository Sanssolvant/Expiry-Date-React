'use client';

import { useState } from 'react';
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
import { IconLogin2 } from '@tabler/icons-react';

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
        if (v.length < 2) return 'Bitte Benutzername oder E-Mail eingeben';

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
    if (form.validate().hasErrors) return;

    const identifier = form.values.identifier.trim();
    const password = form.values.password;

    const onError = (ctx: any) => {
      setLoading(false);

      if (ctx?.error?.status === 403) {
        router.push(AUTH_REDIRECTS.ERROR_EMAIL_NOT_VERIFIED);
      } else {
        router.push(AUTH_REDIRECTS.ERROR_INVALID_CREDENTIALS);
      }
    };

    const onSuccess = () => {
      router.push('/dashboard');
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
              Willkommen bei{' '}
              <Text
                inherit
                variant="gradient"
                component="span"
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                TrackShelf
              </Text>
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

      <div className={classes.imageSide} />
    </div>
  );
}
