import { IconLock } from '@tabler/icons-react';
import { PasswordInput } from '@mantine/core';
import VisibilityIconToggle from '../../Toggles/VisibilityIconToggle';

export const PasswordFieldLogin = ({ form }: { form: any }) => {
  return (
    <PasswordInput
      mt="md"
      size="md"
      label="Passwort"
      autoComplete="true"
      withAsterisk
      placeholder="Dein Passwort"
      visibilityToggleIcon={VisibilityIconToggle}
      leftSection={<IconLock size={18} />}
      {...form.getInputProps('password')}
      error={form.errors.password}
    />
  );
};
