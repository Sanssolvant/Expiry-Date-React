'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Anchor, Button, Paper, Text, Title } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';

import { authClient } from '@/app/lib/auth-client';
import { useAuthStatusMessage } from '@/app/lib/useAuthStatusMessage';

import { CheckboxLogin } from './General/CheckboxLogin';
import { IdentifierFieldLogin } from './General/IdentifierFieldLogin';
import { PasswordFieldLogin } from './General/PasswordFieldLogin';
import { NotificationElementError } from './General/NotificationElementError';
import { NotificationElementSuccess } from './General/NotificationElementSuccess';

import classes from './loginform.module.css';
import { AUTH_REDIRECTS } from '@/app/lib/authRedirects';

export function LoginForm() {
  const router = useRouter();
  const { type, text } = useAuthStatusMessage();
  const [loading, setLoading] = useState(false);

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
        {
          email: identifier,
          password,
          rememberMe: form.values.checkbox,
        },
        { onSuccess, onError }
      );
    } else {
      await authClient.signIn.username(
        {
          username: identifier,
          password,
          rememberMe: form.values.checkbox,
        },
        { onSuccess, onError }
      );
    }
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.form}>
        <Paper radius={0} p={30}>
          {type === 'success' && <NotificationElementSuccess text={text} />}
          {type === 'error' && <NotificationElementError text={text} />}

          <Title order={2} ta="center" mt="md" mb={20}>
            Willkommen auf{' '}
            <Text
              inherit
              variant="gradient"
              component="span"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              TrackShelf
            </Text>
            !
          </Title>

          <form onSubmit={handleSubmit} className={classes.formular}>
            <IdentifierFieldLogin form={form} />
            <PasswordFieldLogin form={form} />
            <CheckboxLogin form={form} />

            <Button loading={loading} fullWidth mt="xl" size="md" type="submit">
              Anmelden
            </Button>
          </form>

          <Text ta="center" mt="md">
            Kein Account?{' '}
            <Anchor fw={700} onClick={() => router.push('/register')}>
              Registrieren
            </Anchor>
          </Text>

          <Text ta="center" mt="sm">
            <Anchor fw={700} onClick={() => router.push('/forgot-password')}>
              Passwort vergessen?
            </Anchor>
          </Text>
        </Paper>
      </div>
      <div className={classes.imageSide} />
    </div>
  );
}
