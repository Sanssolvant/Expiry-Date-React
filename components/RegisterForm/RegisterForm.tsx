'use client';

import { useRouter } from 'next/navigation';
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
        <Flex
          direction="column"
          justify="center"
          ml={50}
          style={{
            height: '100%',
          }}
        >
          <Title order={1} className={classes.title}>
            <Text
              inherit
              variant="gradient"
              component="span"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              TrackShelf
            </Text>
          </Title>
        </Flex>
      </AppShell.Header>

      <Flex
        style={{ height: '100vh' }} // Volle Bildschirmhöhe
        justify="center" // Horizontale Zentrierung
        align="center" // Vertikale Zentrierung
      >
        <Container size={400}>
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
                    variant="gradient"
                    onClick={() => router.push('/')}
                    gradient={{ from: 'indigo', to: 'cyan', deg: 270 }}
                  >
                    Zurück
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'cyan', deg: 90 }}
                  >
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
