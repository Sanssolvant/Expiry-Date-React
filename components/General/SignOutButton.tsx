'use client';

import { IconLogout2, IconX } from '@tabler/icons-react';
import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { authClient } from '@/app/lib/auth-client';

export function SignOutButton() {
  const handleSignOut = async () => {
    try {
      await authClient.signOut(); // Kein Callback!
      window.location.href = '/';
    } catch (error) {
      notifications.show({
        title: 'Fehler beim Abmelden',
        message: 'Abmelden fehlgeschlagen. Versuche es erneut.',
        color: 'red',
        icon: <IconX size={18} />,
      });
    }
  };

  return (
    <Button
      size="xs"
      leftSection={<IconLogout2 size={14} />}
      variant="filled"
      onClick={handleSignOut}
    >
      Abmelden
    </Button>
  );
}
