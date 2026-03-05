'use client';

import { useMemo, useState } from 'react';
import { IconLogout2, IconSettings, IconX } from '@tabler/icons-react';
import { Avatar, Menu, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { authClient } from '@/app/lib/auth-client';

import { SettingsMenu } from './SettingsMenu';

type Props = {
  baldAb: number;
  abgelaufenAb: number;
  setBaldAb: (n: number) => void;
  setAbgelaufenAb: (n: number) => void;
};

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

export function UserProfileMenu({ baldAb, abgelaufenAb, setBaldAb, setAbgelaufenAb }: Props) {
  const { data } = authClient.useSession();
  const [menuOpened, setMenuOpened] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);

  const user = data?.user;
  const displayName =
    user?.name?.trim() || user?.username?.trim() || user?.email?.trim() || 'Benutzer';

  const initials = useMemo(() => getInitials(displayName), [displayName]);

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
          aria-label="Profilmenue oeffnen"
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
          leftSection={<IconSettings size={16} />}
          onClick={() => {
            setMenuOpened(false);
            setSettingsOpened(true);
          }}
        >
          Einstellungen
        </Menu.Item>

        <Menu.Item color="red" leftSection={<IconLogout2 size={16} />} onClick={handleSignOut}>
          Abmelden
        </Menu.Item>
      </Menu.Dropdown>
      </Menu>
      <SettingsMenu
        baldAb={baldAb}
        abgelaufenAb={abgelaufenAb}
        setBaldAb={setBaldAb}
        setAbgelaufenAb={setAbgelaufenAb}
        hideTrigger
        opened={settingsOpened}
        onOpenedChange={setSettingsOpened}
      />
    </>
  );
}
