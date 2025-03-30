import React from 'react';
import { TextInput } from '@mantine/core';

export const EmailFieldLogin = ({ form }: { form: any }) => {
  return (
    <>
      <TextInput
        mt="md"
        size="md"
        label="E-Mail"
        autoComplete="true"
        placeholder="Deine E-Mail-Adresse"
        withAsterisk
        {...form.getInputProps('email')}
        error={form.errors.email}
        required
      />
    </>
  );
};
