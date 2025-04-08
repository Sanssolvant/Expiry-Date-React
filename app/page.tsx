import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';

export default async function HomePage() {
  return (
    <>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
