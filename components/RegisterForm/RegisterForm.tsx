'use client';

import { useRouter } from 'next/navigation';
import { Anchor } from '@mantine/core';
import classes from './registerform.module.css';

export function RegisterForm() {
  const router = useRouter();

  return (
    <Anchor<'a'> fw={700} onClick={() => router.push('/')}>
      Register
    </Anchor>
  );
}
