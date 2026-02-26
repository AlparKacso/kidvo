import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CookieBanner } from '@/components/ui/CookieBanner'

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
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'kidvo — Activități pentru copii în Timișoara',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'kidvo — Activități pentru copii în Timișoara',
    description: 'Descoperă activități pentru copii în Timișoara. Rezervă o ședință de probă gratuită.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  alternates: {
    canonical: 'https://kidvo.eu',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}<CookieBanner /></body>
    </html>
  )
}
