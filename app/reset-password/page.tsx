import { ResetPasswordForm } from '@/components/ResetPasswordForm';
import { Suspense } from 'react';

export default async function RegisterPage() {
  return (
    <>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
