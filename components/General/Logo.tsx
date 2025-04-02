'use client';

import Link from 'next/link';
import { Text, Title } from '@mantine/core';

export function Logo() {
  return (
    <Link href="/" style={{ textDecoration: 'none' }}>
      <Title order={1} ml="1.5rem">
        <Text inherit variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
          TrackShelf
        </Text>
      </Title>
    </Link>
  );
}
