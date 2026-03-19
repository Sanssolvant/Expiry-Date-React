'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconKey, IconLogout2, IconSettings, IconShieldLock, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import {
  Avatar,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { authClient } from '@/app/lib/auth-client';
import { useAdminAccess } from '@/app/lib/use-admin-access';

import { SettingsMenu } from './SettingsMenu';

type Props = {
  baldAb: number;
  abgelaufenAb: number;
  calendarUpcomingDays: number;
  setBaldAb: (n: number) => void;
  setAbgelaufenAb: (n: number) => void;
  setCalendarUpcomingDays: (n: number) => void;
};

const STRONG_PASSWORD_REGEX =
  /^(?=(.*[0-9]))(?=(.*[a-z]))(?=(.*[A-Z]))(?=(.*[$&+,:;=?@#|'<>.^*()%!-]))[A-Za-z0-9$&+,:;=?@#|'<>.^*()%!-]{8,}$/;

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function UserProfileMenu({
  baldAb,
  abgelaufenAb,
  calendarUpcomingDays,
  setBaldAb,
  setAbgelaufenAb,
  setCalendarUpcomingDays,
}: Props) {
  const { data } = authClient.useSession();
  const { canAccess: canAccessAdmin } = useAdminAccess();
  const [menuOpened, setMenuOpened] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [accountOpened, setAccountOpened] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const user = data?.user;
  const displayName =
    user?.name?.trim() || user?.username?.trim() || user?.email?.trim() || 'Benutzer';

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  useEffect(() => {
    if (!accountOpened) {
      return;
    }

    setNewEmail(user?.email || '');
    setEmailConfirmPassword('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  }, [accountOpened, user?.email]);

  const handleChangeEmail = async () => {
    const nextEmail = newEmail.trim().toLowerCase();
    const currentEmail = (user?.email || '').trim().toLowerCase();

    if (!currentEmail) {
      notifications.show({
        title: 'Benutzerdaten fehlen',
        message: 'Aktuelle E-Mail konnte nicht gelesen werden. Bitte neu anmelden.',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    if (!nextEmail) {
      notifications.show({
        title: 'E-Mail fehlt',
        message: 'Bitte eine neue E-Mail-Adresse eingeben.',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      notifications.show({
        title: 'Ungültige E-Mail',
        message: 'Bitte eine gültige E-Mail-Adresse eingeben.',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    if (nextEmail === currentEmail) {
      notifications.show({
        title: 'Keine Änderung',
        message: 'Die neue E-Mail entspricht bereits deiner aktuellen E-Mail.',
        color: 'yellow',
      });
      return;
    }

    if (!emailConfirmPassword) {
      notifications.show({
        title: 'Passwort fehlt',
        message: 'Bitte dein Passwort zur Bestätigung eingeben.',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    setEmailLoading(true);
    let errorMessage = '';
    const payload: { newEmail: string; callbackURL?: string } = { newEmail: nextEmail };

    if (typeof window !== 'undefined') {
      payload.callbackURL = `${window.location.origin}/dashboard`;
    }

    try {
      let passwordCheckError = '';
      await authClient.signIn.email(
        {
          email: currentEmail,
          password: emailConfirmPassword,
          rememberMe: true,
        },
        {
          onError: (ctx: any) => {
            passwordCheckError =
              ctx?.error?.message || 'Passwort-Bestätigung fehlgeschlagen.';
          },
        }
      );

      if (passwordCheckError) {
        errorMessage = passwordCheckError;
      } else {
        await authClient.changeEmail(payload, {
          onError: (ctx: any) => {
            errorMessage = ctx?.error?.message || 'E-Mail konnte nicht geändert werden.';
          },
        });
      }
    } catch {
      errorMessage = 'E-Mail konnte nicht geändert werden.';
    } finally {
      setEmailLoading(false);
    }

    if (errorMessage) {
      notifications.show({
        title: 'E-Mail Änderung fehlgeschlagen',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    notifications.show({
      title: 'E-Mail Änderung gestartet',
      message: 'Bitte bestätige die neue E-Mail über den Aktivierungslink im neuen Postfach.',
      color: 'teal',
    });
    setEmailConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      notifications.show({
        title: 'Aktuelles Passwort fehlt',
        message: 'Bitte dein aktuelles Passwort eingeben.',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      notifications.show({
        title: 'Passwörter stimmen nicht überein',
        message: 'Bitte prüfe die neue Passwort-Bestätigung.',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      notifications.show({
        title: 'Passwort zu schwach',
        message:
          'Mind. 8 Zeichen inkl. Gross-/Kleinbuchstaben, Zahl und Sonderzeichen erforderlich.',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    setPasswordLoading(true);
    let errorMessage = '';

    try {
      await authClient.changePassword(
        {
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        },
        {
          onError: (ctx: any) => {
            errorMessage = ctx?.error?.message || 'Passwort konnte nicht geändert werden.';
          },
        }
      );
    } catch {
      errorMessage = 'Passwort konnte nicht geändert werden.';
    } finally {
      setPasswordLoading(false);
    }

    if (errorMessage) {
      notifications.show({
        title: 'Passwort Änderung fehlgeschlagen',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setAccountOpened(false);

    notifications.show({
      title: 'Passwort aktualisiert',
      message: 'Dein Passwort wurde erfolgreich geändert.',
      color: 'teal',
    });
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      window.location.href = '/';
    } catch {
      notifications.show({
        title: 'Fehler beim Abmelden',
        message: 'Abmelden fehlgeschlagen. Versuche es erneut.',
        color: 'red',
        icon: <IconX size={18} />,
      });
    }
  };

  return (
    <>
      <Menu
        trigger="click-hover"
        openDelay={80}
        closeDelay={140}
        position="bottom-end"
        withArrow
        withinPortal
        opened={menuOpened}
        onChange={setMenuOpened}
      >
        <Menu.Target>
          <UnstyledButton
            aria-label="Profilmenü öffnen"
            style={{ borderRadius: 999, display: 'inline-flex' }}
          >
            <Avatar src={user?.image || undefined} radius="xl" size={38}>
              {initials}
            </Avatar>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            <Text size="xs" c="dimmed">
              {displayName}
            </Text>
          </Menu.Label>

          <Menu.Item
            leftSection={<IconKey size={16} />}
            onClick={() => {
              setMenuOpened(false);
              setAccountOpened(true);
            }}
          >
            Login-Daten ändern
          </Menu.Item>

          <Menu.Item
            leftSection={<IconSettings size={16} />}
            onClick={() => {
              setMenuOpened(false);
              setSettingsOpened(true);
            }}
          >
            Einstellungen
          </Menu.Item>

          {canAccessAdmin ? (
            <Menu.Item
              component={Link}
              href="/admin"
              leftSection={<IconShieldLock size={16} />}
              onClick={() => setMenuOpened(false)}
            >
              Adminbereich
            </Menu.Item>
          ) : null}

          <Menu.Item color="red" leftSection={<IconLogout2 size={16} />} onClick={handleSignOut}>
            Abmelden
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <SettingsMenu
        baldAb={baldAb}
        abgelaufenAb={abgelaufenAb}
        calendarUpcomingDays={calendarUpcomingDays}
        setBaldAb={setBaldAb}
        setAbgelaufenAb={setAbgelaufenAb}
        setCalendarUpcomingDays={setCalendarUpcomingDays}
        hideTrigger
        opened={settingsOpened}
        onOpenedChange={setSettingsOpened}
      />

      <Modal
        opened={accountOpened}
        onClose={() => setAccountOpened(false)}
        centered
        size="md"
        title="Login-Daten ändern"
      >
        <Stack gap="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              E-Mail-Adresse
            </Text>
            <TextInput
              label="Neue E-Mail"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.currentTarget.value)}
              placeholder="name@beispiel.ch"
            />
            <PasswordInput
              label="Passwort bestätigen"
              value={emailConfirmPassword}
              onChange={(event) => setEmailConfirmPassword(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="light" onClick={handleChangeEmail} loading={emailLoading}>
                E-Mail ändern
              </Button>
            </Group>
          </Stack>

          <Divider />

          <Stack gap="xs">
            <Text fw={600} size="sm">
              Passwort
            </Text>
            <PasswordInput
              label="Aktuelles Passwort"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.currentTarget.value)}
            />
            <PasswordInput
              label="Neues Passwort"
              description="Mind. 8 Zeichen inkl. Gross/Klein, Zahl und Sonderzeichen."
              value={newPassword}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
            />
            <PasswordInput
              label="Neues Passwort bestätigen"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button onClick={handleChangePassword} loading={passwordLoading}>
                Passwort ändern
              </Button>
            </Group>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
}
