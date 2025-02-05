import { TextInput } from '@mantine/core';
import { useRegisterFormContext } from '@/app/lib/form-context';

export function EmailField() {
  const form = useRegisterFormContext();

  return (
    <TextInput
      label="E-Mail"
      placeholder="Deine E-Mail-Adresse"
      key={form.key('email')}
      {...form.getInputProps('email')}
      withAsterisk
    />
  );
}
