import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { readTheme } from '@/lib/theme';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'StackBase',
    template: '%s · StackBase',
  },
  description:
    'StackBase is a self-hostable personal cloud drive: organize, encrypt and preview your files, with ciphertext stored in your own Telegram account.',
  applicationName: 'StackBase',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'StackBase',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await readTheme();

  return (
    <html lang="en" data-theme={theme} className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
