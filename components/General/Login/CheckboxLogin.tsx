import React from 'react';
import { Checkbox } from '@mantine/core';

export const CheckboxLogin = ({ form }: { form: any }) => {
  return (
    <>
      <Checkbox
        label="Angemeldet bleiben"
        mt="xl"
        size="md"
        {...form.getInputProps('checkbox')}
        error={form.errors.checkbox}
      />
    </>
  );
};
