import { IconCheck } from '@tabler/icons-react';
import { Notification } from '@mantine/core';

export function NotificationElement() {
  return (
    <Notification
      icon={<IconCheck size={20} />}
      m={0}
      p="1rem"
      color="teal"
      style={{ zIndex: 10, width: '100%', borderRadius: 0 }}
      withCloseButton={false}
    >
      Erfolgreich registriert!
    </Notification>
  );
}
