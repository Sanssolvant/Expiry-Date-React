'use client';

import { useState } from 'react';
import { Button, Paper, Stack, Text, Title } from '@mantine/core';
import { useForm, isEmail } from '@mantine/form';

import classes from './forgotpasswordform.module.css';

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: isEmail('Ungültige E-Mail-Adresse'),
    },
  });

  const handleSubmit = async (_values: typeof form.values) => {
    setLoading(true);

    // deine bestehende Logik bleibt hier
    await new Promise((r) => setTimeout(r, 800));

    setLoading(false);
  };

  return (
    <div className={classes.wrapper}>
      <Paper radius="xl" p="xl" className={classes.card}>
        <Stack gap="sm">
          <Title order={2} ta="center">
            Passwort zurücksetzen
          </Title>

          <Text ta="center" c="dimmed" size="sm">
            Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deines Passworts.
          </Text>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
              <input
                type="email"
                placeholder="E-Mail-Adresse"
                {...form.getInputProps('email')}
                className={classes.input}
              />

              <Button type="submit" loading={loading} fullWidth radius="lg">
                Link senden
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </div>
  );
}
