import { IconEyeCheck, IconEyeOff, IconLock } from '@tabler/icons-react';
import { PasswordInput } from '@mantine/core';
import { useRegisterFormContext } from '@/app/lib/form-context';

const VisibilityToggleIcon = ({ reveal }: { reveal: boolean }) =>
  reveal ? (
    <IconEyeOff style={{ width: 'var(--psi-icon-size)', height: 'var(--psi-icon-size)' }} />
  ) : (
    <IconEyeCheck style={{ width: 'var(--psi-icon-size)', height: 'var(--psi-icon-size)' }} />
  );

export function PasswordConfirmField() {
  const form = useRegisterFormContext();
  return (
    <PasswordInput
      label="Passwort bestätigen"
      withAsterisk
      placeholder="Dein Passwort"
      visibilityToggleIcon={VisibilityToggleIcon}
      leftSection={<IconLock size={18} />}
      key={form.key('confirmPassword')}
      {...form.getInputProps('confirmPassword')}
    />
  );
}
