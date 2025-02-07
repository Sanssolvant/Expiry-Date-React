'use client';

import { useRouter } from 'next/navigation';
import { IconAbacus, IconArrowBack, IconSend } from '@tabler/icons-react';
import {
  AppShell,
  Box,
  Button,
  Container,
  Flex,
  Group,
  Paper,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { hasLength, isEmail } from '@mantine/form';
import { RegisterFormProvider, useRegisterForm } from '@/app/lib/form-context';
import { ColorSchemeToggle } from '../ColorSchemeToggle/ColorSchemeToggle';
import { EmailField } from '../General/EmailField';
import { PasswordConfirmField } from '../General/PasswordConfirmField';
import { PasswordField } from '../General/PasswordField';
import classes from './registerform.module.css';

export function RegisterForm() {
  const router = useRouter();

  const form = useRegisterForm({
    mode: 'uncontrolled',
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },

    validate: {
      username: hasLength({ min: 2, max: 10 }, 'Ungültiger Benutzername'),
      email: isEmail('Ungültige E-Mail-Adresse'),
      confirmPassword: (value, values) => {
        console.error('Passwort:', values.password); // Debugging
        return value !== values.password ? 'Die Passwörter stimmen nicht überein' : null;
      },
    },
  });

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Container fluid p={0} style={{ height: '100%', alignContent: 'center' }}>
          <Flex align="center" justify="space-between" pl={50}>
            <Flex align="center">
              <IconAbacus size={40} strokeWidth={1.5} />
              <Title order={1} ml={3}>
                <Text inherit variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                  TrackShelf
                </Text>
              </Title>
            </Flex>

            <ColorSchemeToggle />
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
            <RegisterFormProvider form={form}>
              <form onSubmit={form.onSubmit((values) => console.warn(values))}>
                <Box mb="sm">
                  <TextInput
                    label="Benutzername"
                    description="2-10 Zeichen"
                    placeholder="Dein Benutzername"
                    required
                    key={form.key('username')}
                    {...form.getInputProps('username')}
                  />
                </Box>
                <Box mb="sm">
                  <EmailField />
                </Box>
                <Box mb="sm">
                  <PasswordField />
                </Box>
                <Box mb="sm">
                  <PasswordConfirmField />
                </Box>
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
            </RegisterFormProvider>
          </Paper>
        </Container>
      </Flex>
    </AppShell>
  );
}
