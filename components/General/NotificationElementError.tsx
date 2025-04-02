import { IconX } from '@tabler/icons-react';
import { Notification } from '@mantine/core';

export const NotificationElementError = ({ text }: { text: string }) => {
  return (
    <Notification
      icon={<IconX size={20} />}
      m={0}
      p="1rem"
      color="red"
      style={{ zIndex: 10, width: '100%', borderRadius: 0 }}
      withCloseButton={false}
    >
      {text}
    </Notification>
  );
};
