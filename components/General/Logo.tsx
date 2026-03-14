'use client';

import Link from 'next/link';
import { Text } from '@mantine/core';

export function Logo() {
  return (
    <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex' }}>
      <Text
        fw={800}
        fz={{ base: 'lg', sm: 'xl' }}
        ml={{ base: 0, sm: 'xs', md: 'md' }}
        lh={1}
        variant="gradient"
        gradient={{ from: 'blue', to: 'cyan' }}
      >
        TrackShelf
      </Text>
    </Link>
  );
}
