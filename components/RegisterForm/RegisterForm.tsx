'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowBack, IconSend } from '@tabler/icons-react';
import { AppShell, Box, Button, Container, Flex, Group, Paper, Text, Title } from '@mantine/core';
import { hasLength, isEmail, matches, useForm } from '@mantine/form';
import { EmailField } from '../General/Register/EmailField';
import { PasswordConfirmField } from '../General/Register/PasswordConfirmField';
import { PasswordField } from '../General/Register/PasswordField';
import { UsernameField } from '../General/Register/UsernameField';
import { ColorSchemeToggle } from '../Toggles/ColorSchemeToggle';

export function RegisterForm() {
  const router = useRouter();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');

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
      console.error('Formular enthält Fehler');
      return;
    }

    try {
      // Sicherer Call zur API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/?success=true');
      } else {
        setError(data.error); // Fehler beim Einfügen in die DB
      }
    } catch (error) {
      setError('Ein Fehler ist aufgetreten.');
    }
  };

  return (
    <AppShell header={{ height: '4.5rem' }}>
      <AppShell.Header>
        <Container fluid p={0} style={{ height: '100%', alignContent: 'center' }}>
          <Flex align="center" justify="space-between">
            <Title order={1} ml="1.5rem">
              <Text inherit variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                TrackShelf
              </Text>
            </Title>
          </Flex>
        </Container>
        <ColorSchemeToggle />
      </AppShell.Header>
      <Flex
        style={{ height: '100vh' }} // Volle Bildschirmhöhe
        justify="center" // Horizontale Zentrierung
        align="center" // Vertikale Zentrierung
      >
        <Container size={500}>
          <Paper shadow="md" p="xl" radius="md" withBorder style={{ minWidth: 300 }}>
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
              {error && <p style={{ color: 'red' }}>{error}</p>}
              <Group justify="center" mt="md">
                <Button
                  leftSection={<IconArrowBack size={14} />}
                  variant="light"
                  onClick={() => router.push('/')}
                >
                  Zurück
                </Button>
                <Button rightSection={<IconSend size={14} />} variant="light" type="submit">
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
