import type { Metadata, Viewport } from 'next'
import { Anton, Saira, Saira_Condensed, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

// GRIDIRON v3 type system (UXV2-2):
// Anton = broadcast hero (names, big stats, verdicts), Saira = body/UI default,
// Saira Condensed = labels/section heads, JetBrains Mono = every number (tabular).
// Distinct variable names so the .font-* custom classes resolve to the loaded families at runtime.
const anton = Anton({
  variable: '--font-anton',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
})

const saira = Saira({
  variable: '--font-saira',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const sairaCondensed = Saira_Condensed({
  variable: '--font-saira-cond',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
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
