'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anchor, Button, Paper, Text, Title } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { authClient } from '@/app/lib/auth-client';
import { CheckboxLogin } from '../General/Login/CheckboxLogin';
import { EmailFieldLogin } from '../General/Login/EmailFieldLogin';
import { PasswordFieldLogin } from '../General/Login/PasswordFieldLogin';
import { NotificationElementError } from '../General/NotificationElementError';
import { NotificationElementSuccess } from '../General/NotificationElementSuccess';
import { ColorSchemeToggle } from '../Toggles/ColorSchemeToggle';
import classes from './loginform.module.css';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Zugriff auf die Query-Parameter
  const success = searchParams.get('success'); // Hole den `success`-Query-Parameter // Abfrage des `success`-Parameters aus der URL
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      checkbox: false,
    },
    validate: {
      email: isEmail('Ungültige E-Mail-Adresse'),
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Verhindert das automatische Absenden des Formulars

    if (form.validate().hasErrors) {
      console.error('Formular enthält Fehler');
    }

    await authClient.signIn.email(
      {
        email: form.values.email,
        password: form.values.password,
        /**
         * remember the user session after the browser is closed.
         * @default true
         */
        rememberMe: form.values.checkbox,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: () => {
          router.push('/dashboard');
        },
        onError: () => {
          setLoading(false);
          router.push('/?success=false');
        },
      }
    );
  };

  return (
    <div className={classes.wrapper}>
      {success === 'true' && <NotificationElementSuccess />}
      {success === 'false' && <NotificationElementError />}
      <ColorSchemeToggle />
      <Paper className={classes.form} radius={0} p={30}>
        <Title order={2} className={classes.title} ta="center" mt="md" mb={50}>
          Willkommen auf{' '}
          <Text inherit variant="gradient" component="span" gradient={{ from: 'blue', to: 'cyan' }}>
            TrackShelf
          </Text>{' '}
          !
        </Title>
        <form onSubmit={handleSubmit}>
          <EmailFieldLogin form={form} />
          <PasswordFieldLogin form={form} />
          <CheckboxLogin form={form} />
          <Button loading={loading} fullWidth mt="xl" size="md" type="submit">
            Anmelden
          </Button>
        </form>
        <Text ta="center" mt="md">
          Kein Account?{' '}
          <Anchor<'a'> href="#" fw={700} onClick={() => router.push('/register')}>
            Registrieren
          </Anchor>
        </Text>
      </Paper>
    </div>
  );
}
