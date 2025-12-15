'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconArrowBack, IconSend } from '@tabler/icons-react';
import { AppShell, Box, Button, Container, Flex, Group, Paper, Title } from '@mantine/core';
import { hasLength, isEmail, matches, useForm } from '@mantine/form';
import { authClient } from '@/app/lib/auth-client';
import { EmailField } from './General/EmailField';
import { Logo } from './General/Logo';
import { NotificationElementError } from './General/NotificationElementError';
import { PasswordConfirmField } from './General/PasswordConfirmField';
import { PasswordField } from './General/PasswordField';
import { UsernameField } from './General/UsernameField';
import { AUTH_REDIRECTS } from '@/app/lib/authRedirects';
import { useAuthStatusMessage } from '@/app/lib/useAuthStatusMessage';

export function RegisterForm() {
  const router = useRouter();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const { type, text } = useAuthStatusMessage();

  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: '',
    },
    validate: {
      username: hasLength({ min: 2, max: 10 }, 'Ungültiger Benutzername (2-10 Zeichen)'),
      email: isEmail('Ungültige E-Mail-Adresse'),
      password: matches(
        /^(?=(.*[0-9]))(?=(.*[a-z]))(?=(.*[A-Z]))(?=(.*[$&+,:;=?@#|'<>.^*()%!-]))[A-Za-z0-9$&+,:;=?@#|'<>.^*()%!-]{8,}$/,
        'Ungültiges Passwort'
      ),
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Verhindert das automatische Absenden des Formulars
    if (form.values.password !== confirmPassword) {
      setConfirmPasswordError('Passwort stimmt nicht überein');
      return;
    }

    if (form.validate().hasErrors) {
      return;
    }

    await authClient.signUp.email(
      {
        email: form.values.email,
        password: form.values.password,
        name: form.values.username,
        username: form.values.username,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: () => {
          router.push(AUTH_REDIRECTS.REGISTER_SUCCESS);
        },
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

  return (
    <AppShell header={{ height: '4.5rem' }}>
      <AppShell.Header>
        {type === 'error' && <NotificationElementError text={text} />}
        <Container fluid p={0} style={{ height: '100%', alignContent: 'center' }}>
          <Flex align="center" justify="space-between">
            <Logo />
          </Flex>
        </Container>
      </AppShell.Header>
      <Flex
        style={{ height: '100vh' }} // Volle Bildschirmhöhe
        justify="center" // Horizontale Zentrierung
        align="center" // Vertikale Zentrierung
      >
        <Container size={500}>
          <Paper shadow="md" p="xl" radius="md" withBorder style={{ minWidth: 300 }}>
            <Title order={3} mb="1.5rem" ta="center">
              Registrieren
            </Title>
            <form onSubmit={handleSubmit}>
              <Box mb="sm">
                <UsernameField form={form} />
              </Box>
              <Box mb="sm">
                <EmailField form={form} />
              </Box>
              <Box mb="sm">
                <PasswordField form={form} />
              </Box>
              <Box mb="sm">
                <PasswordConfirmField
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  confirmPasswordError={confirmPasswordError}
                  setConfirmPasswordError={setConfirmPasswordError}
                />
              </Box>
              <Group justify="center" mt="md">
                <Button
                  leftSection={<IconArrowBack size={14} />}
                  variant="light"
                  onClick={() => router.push('/')}
                >
                  Zurück
                </Button>
                <Button
                  loading={loading}
                  rightSection={<IconSend size={14} />}
                  variant="light"
                  type="submit"
                >
                  Senden
                </Button>
              </Group>
            </form>
          </Paper>
        </Container>
      </Flex>
    </AppShell>
  );
}
