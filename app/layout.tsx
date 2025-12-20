import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import React from 'react';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import { FloatingColorSchemeToggle } from '@/components/General/FloatingColorSchemeToggle';
import '@mantine/dates/styles.css';

export const metadata = {
  title: 'TrackShelf',
  description: 'Keep track of the expirydate of your items',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        {/* ✅ verhindert “Flash” / falsches Theme beim Reload */}
        <ColorSchemeScript defaultColorScheme="dark" />

        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>

      <body>
        {/* ✅ sorgt ebenfalls für stabilen ersten Render */}
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <Notifications position="bottom-right" />
          <FloatingColorSchemeToggle />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
