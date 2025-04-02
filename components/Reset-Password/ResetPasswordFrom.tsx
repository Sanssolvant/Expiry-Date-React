'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell, Box, Button, Container, Flex, Group, Paper, Text, Title } from '@mantine/core';
import { matches, useForm } from '@mantine/form';
import { authClient } from '@/app/lib/auth-client';
import { Logo } from '../General/Logo';
import { NotificationElementError } from '../General/NotificationElementError';
import { PasswordConfirmField } from '../General/Register/PasswordConfirmField';
import { PasswordField } from '../General/Register/PasswordField';
import { ColorSchemeToggle } from '../General/Toggles/ColorSchemeToggle';

export function ResetPasswordForm() {
  const router = useRouter();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const searchParams = useSearchParams(); // Zugriff auf die Query-Parameter
  const success = searchParams.get('success'); // Hole den `success`-Query-Parameter // Abfrage des `success`-Parameters aus der URL
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const token = searchParams.get('token');

  const form = useForm({
    initialValues: {
      password: '',
    },
    validate: {
      password: matches(
        /^(?=(.*[0-9]))(?=(.*[a-z]))(?=(.*[A-Z]))(?=(.*[$&+,:;=?@#|'<>.^*()%!-]))[A-Za-z0-9$&+,:;=?@#|'<>.^*()%!-]{8,}$/,
        'Ungültiges Passwort'
      ),
    },
  });

  if (!token) {
    return (
      <AppShell header={{ height: '4.5rem' }}>
        <AppShell.Header>
          {success === 'false' && <NotificationElementError text={text} />}
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
                Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen
              </Title>
            </Paper>
          </Container>
          <ColorSchemeToggle />
        </Flex>
      </AppShell>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Verhindert das automatische Absenden des Formulars
    if (form.values.password !== confirmPassword) {
      setConfirmPasswordError('Passwort stimmt nicht überein');
      return;
    }

    if (form.validate().hasErrors) {
      console.error('Formular enthält Fehler');
    }

    await authClient.resetPassword(
      {
        newPassword: form.values.password,
        token,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: () => {
          router.push('/?success=true&reset=true');
        },
        onError: () => {
          setLoading(false);
          setText('Da ist etwas schief gelaufen');
        },
      }
    );
  };

  return (
    <AppShell header={{ height: '4.5rem' }}>
      <AppShell.Header>
        {success === 'false' && <NotificationElementError text={text} />}
        <Container fluid p={0} style={{ height: '100%', alignContent: 'center' }}>
          <Flex align="center" justify="space-between">
            <Title order={1} ml="1.5rem">
              <Text inherit variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                TrackShelf
              </Text>
            </Title>
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
              Passwort zurücksetzen
            </Title>
            <form onSubmit={handleSubmit}>
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
                <Button loading={loading} variant="light" type="submit" fullWidth>
                  Ändern
                </Button>
              </Group>
            </form>
          </Paper>
        </Container>
        <ColorSchemeToggle />
      </Flex>
    </AppShell>
  );
}
