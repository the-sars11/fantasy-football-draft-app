import type { Metadata, Viewport } from 'next'
import { Kanit, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

// SHIELD v4 type system (D0-locked, 2026-08-14):
// Kanit = athletic broadcast display (names, big stats, verdicts, section heads),
// Hanken Grotesk = body/UI default, JetBrains Mono = every number (tabular).
// CSS-var NAMES kept stable from v3 (--font-anton / --font-saira / --font-saira-cond)
// so every screen re-types at once — only the loaded families changed.
const anton = Kanit({
  variable: '--font-anton',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

const saira = Hanken_Grotesk({
  variable: '--font-saira',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const sairaCondensed = Kanit({
  variable: '--font-saira-cond',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FFI Gridiron',
  description: 'AI-powered fantasy football draft intelligence',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FFI Gridiron',
  },
  icons: {
    icon: [
      { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
    shortcut: '/icons/icon-32.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#A63C41',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${anton.variable} ${saira.variable} ${sairaCondensed.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
