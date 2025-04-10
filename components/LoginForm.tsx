'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anchor, Button, Paper, Text, Title } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { authClient } from '@/app/lib/auth-client';
import { CheckboxLogin } from './General/CheckboxLogin';
import { ColorSchemeToggle } from './General/ColorSchemeToggle';
import { EmailFieldLogin } from './General/EmailFieldLogin';
import { NotificationElementError } from './General/NotificationElementError';
import { NotificationElementSuccess } from './General/NotificationElementSuccess';
import { PasswordFieldLogin } from './General/PasswordFieldLogin';
import classes from './loginform.module.css';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Zugriff auf die Query-Parameter
  const success = searchParams.get('success');
  const reset = searchParams.get('reset'); // Hole den `success`-Query-Parameter // Abfrage des `success`-Parameters aus der URL
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

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

  useEffect(() => {
    if (success === 'true' && reset === 'true') {
      setText('Passwort erfolgreich geändert');
    } else if (success !== 'false') {
      setText(
        'Erfolgreich registriert! Bitte verifiziere deine E-Mail, um dich anmelden zu können.'
      );
    }
  }, [success, reset]);

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
        onError: (ctx) => {
          setLoading(false);
          router.push('/?success=false');
          if (ctx.error.status === 403) {
            setText('Email noch nicht verifiziert');
          } else {
            setText('Logindaten nicht korrekt');
          }
        },
      }
    );
  };

  return (
    <div className={classes.wrapper}>
      {success === 'true' && <NotificationElementSuccess text={text} />}
      {success === 'false' && <NotificationElementError text={text} />}
      <ColorSchemeToggle />
      <div className={classes.form}>
        <Paper className={classes.form} radius={0} p={30}>
          <Title order={2} className={classes.title} ta="center" mt="md" mb={50}>
            Willkommen auf{' '}
            <Text
              inherit
              variant="gradient"
              component="span"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
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
          <Text ta="center" mt="sm">
            <Anchor<'a'> href="#" fw={700} onClick={() => router.push('/forgot-password')}>
              Passwort vergessen?
            </Anchor>
          </Text>
        </Paper>
      </div>
      <div className={classes.imageSide} />
    </div>
  );
}
