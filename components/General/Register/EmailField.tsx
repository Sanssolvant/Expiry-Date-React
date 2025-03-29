import React from 'react';
import { TextInput } from '@mantine/core';

export const EmailField = ({ form }: { form: any }) => {
  return (
    <>
      <TextInput
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
