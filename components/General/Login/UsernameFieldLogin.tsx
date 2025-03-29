import React from 'react';
import { TextInput } from '@mantine/core';

export const UsernameFieldLogin = ({ form }: { form: any }) => {
  return (
    <>
      <TextInput
        mt="md"
        size="md"
        label="Benutzername"
        placeholder="Dein Benutzername"
        autoComplete="true"
        withAsterisk
        {...form.getInputProps('username')}
        error={form.errors.username}
        required
      />
    </>
  );
};
