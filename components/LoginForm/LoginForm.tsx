'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Anchor, Button, Paper, Text, Title } from '@mantine/core';
import { hasLength, matches, useForm } from '@mantine/form';
import { CheckboxLogin } from '../General/Login/CheckboxLogin';
import { PasswordFieldLogin } from '../General/Login/PasswordFieldLogin';
import { UsernameFieldLogin } from '../General/Login/UsernameFieldLogin';
import { NotificationElement } from '../General/NotificationElement';
import { ColorSchemeToggle } from '../Toggles/ColorSchemeToggle';
import classes from './loginform.module.css';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Zugriff auf die Query-Parameter
  const success = searchParams.get('success'); // Hole den `success`-Query-Parameter // Abfrage des `success`-Parameters aus der URL

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      checkbox: '',
    },
    validate: {
      username: hasLength({ min: 2, max: 10 }, 'Ungültiger Benutzername (2-10 Zeichen)'),
      password: matches(
        /^(?=(.*[0-9]))(?=(.*[a-z]))(?=(.*[A-Z]))(?=(.*[$&+,:;=?@#|'<>.^*()%!-]))[A-Za-z0-9$&+,:;=?@#|'<>.^*()%!-]{8,}$/,
        'Ungültiges Passwort'
      ),
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Verhindert das automatische Absenden des Formulars

    if (form.validate().hasErrors) {
      console.error('Formular enthält Fehler');
      return;
    }

    try {
      // Sicherer Call zur API
      const response = await fetch('/api/login', {
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
        console.error(data.error); // Fehler beim Einfügen in die DB
      }
    } catch (error) {
      console.error('Ein Fehler ist aufgetreten.');
    }
  };

  return (
    <div className={classes.wrapper}>
      {success === 'true' && <NotificationElement />}
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
          <UsernameFieldLogin form={form} />
          <PasswordFieldLogin form={form} />
          <CheckboxLogin form={form} />
          <Button fullWidth mt="xl" size="md" type="submit">
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
