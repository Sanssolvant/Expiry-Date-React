'use client';

import { useRouter } from 'next/navigation';
import { IconArrowBack } from '@tabler/icons-react';
import { Button } from '@mantine/core';
import { authClient } from '@/app/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      size="xs"
      leftSection={<IconArrowBack size={14} />}
      variant="outline"
      onClick={() =>
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push('/'); // redirect to login page
            },
          },
        })
      }
    >
      Abmelden
    </Button>
  );
}
