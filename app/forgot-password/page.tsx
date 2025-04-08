import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';

export default async function RegisterPage() {
  return (
    <>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </>
  );
}
