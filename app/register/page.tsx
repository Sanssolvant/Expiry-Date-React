import { Suspense } from 'react';
import { RegisterForm } from '@/components/RegisterForm';

export default async function RegisterPage() {
  return (
    <>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </>
  );
}
