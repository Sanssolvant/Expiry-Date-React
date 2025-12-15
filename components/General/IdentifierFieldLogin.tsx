import React from 'react';
import { TextInput } from '@mantine/core';

export const IdentifierFieldLogin = ({ form }: { form: any }) => {
  return (
    <>
      <TextInput
        mt="md"
        size="md"
        label="Benutzername/E-Mail"
        autoComplete="true"
        placeholder="Deine Benutzername/E-Mail-Adresse"
        withAsterisk
        {...form.getInputProps('identifier')}
        error={form.errors.identifier}
        required
      />
    </>
  );
};
