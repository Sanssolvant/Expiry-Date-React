import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/ResetPasswordFrom';

export default async function RegisterPage() {
  return (
    <>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
