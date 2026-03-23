import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CookieBanner } from '@/components/ui/CookieBanner'
import { getLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://kidvo.eu'),
  title: {
    default: 'kidvo — Activități pentru copii în Timișoara',
    template: '%s · kidvo',
  },
  description: 'Descoperă cele mai bune activități pentru copii în Timișoara — sport, dans, muzică, arte, programare și mai mult. Rezervă o ședință de probă gratuită în 2 minute.',
  keywords: [
    'activitati copii timisoara',
    'activități copii timișoara',
    'sport copii timisoara',
    'dans copii timisoara',
    'muzica copii timisoara',
    'programare copii timisoara',
    'after school timisoara',
    'cursuri copii timisoara',
    'kidvo',
  ],
  authors: [{ name: 'kidvo', url: 'https://kidvo.eu' }],
  creator: 'kidvo',
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: 'https://kidvo.eu',
    siteName: 'kidvo',
    title: 'kidvo — Activități pentru copii în Timișoara',
    description: 'Descoperă activități pentru copii în Timișoara. Sport, dans, muzică, arte, programare. Rezervă o ședință de probă gratuită.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'kidvo — Activități pentru copii în Timișoara',
    description: 'Descoperă activități pentru copii în Timișoara. Rezervă o ședință de probă gratuită.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: 'https://kidvo.eu' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale   = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
