import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Manrope, JetBrains_Mono, Oswald } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

// Stadium Primetime v2.0 type system (UX-1.3):
// Space Grotesk = headlines/labels/numbers, Manrope = body, JetBrains Mono = stats, Oswald = condensed display.
// Distinct variable names so the .font-* custom classes resolve to the loaded families at runtime.
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fantasy Football Intelligence',
  description: 'AI-powered fantasy football draft intelligence',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} ${oswald.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
