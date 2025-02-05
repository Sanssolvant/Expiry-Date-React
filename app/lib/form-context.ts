import { createFormContext } from '@mantine/form';

interface RegisterFormValues {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

// You can give context variables any name
export const [RegisterFormProvider, useRegisterFormContext, useRegisterForm] =
  createFormContext<RegisterFormValues>();
