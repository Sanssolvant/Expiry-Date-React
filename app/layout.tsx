import '@mantine/core/styles.css';

import React from 'react';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';

import '@mantine/notifications/styles.css';

import { ColorSchemeToggle } from '@/components/General/ColorSchemeToggle';

export const metadata = {
  title: 'TrackShelf',
  description: 'Keep track of the expirydate of your items',
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>

      <body>
        <MantineProvider theme={theme}>
          <Notifications position="bottom-right" />
          <div
            style={{
              position: 'fixed',
              bottom: '1rem',
              right: '1rem',
              zIndex: 9999,
            }}
          >
            <ColorSchemeToggle />
          </div>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
