import React from 'react';
import { TextInput } from '@mantine/core';

export const UsernameField = ({ form }: { form: any }) => {
  return (
    <>
      <TextInput
        maxLength={15}
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
