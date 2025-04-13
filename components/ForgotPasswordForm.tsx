'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconArrowBack, IconSend } from '@tabler/icons-react';
import { AppShell, Box, Button, Container, Flex, Group, Paper, Title } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { authClient } from '@/app/lib/auth-client';
import { EmailField } from './General/EmailField';
import { Logo } from './General/Logo';
import { NotificationElementError } from './General/NotificationElementError';
import { NotificationElementSuccess } from './General/NotificationElementSuccess';

export function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Zugriff auf die Query-Parameter
  const success = searchParams.get('success'); // Hole den `success`-Query-Parameter // Abfrage des `success`-Parameters aus der URL
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: isEmail('Ungültige E-Mail-Adresse'),
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Verhindert das automatische Absenden des Formulars

    if (form.validate().hasErrors) {
      console.error('Formular enthält Fehler');
      return;
    }

    await authClient.forgetPassword(
      {
        email: form.values.email,
        redirectTo: '/reset-password',
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: () => {
          setLoading(false);
          setText('Erfolgreich versendet');
          router.push('/forgot-password?success=true');
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
        {success === 'true' && <NotificationElementSuccess text={text} />}
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
              Passwort vergessen
            </Title>
            <form onSubmit={handleSubmit}>
              <Box mb="sm">
                <EmailField form={form} />
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
                  rightSection={<IconSend size={14} />}
                  loading={loading}
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
