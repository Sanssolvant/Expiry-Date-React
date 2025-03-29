import React from 'react';
import { TextInput } from '@mantine/core';

export const UsernameField = ({ form }: { form: any }) => {
  return (
    <>
      <TextInput
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
