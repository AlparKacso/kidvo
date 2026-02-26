// src/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/browse'],
        disallow: ['/settings', '/kids', '/saved', '/bookings', '/listings', '/auth'],
      },
    ],
    sitemap: 'https://kidvo.eu/sitemap.xml',
  }
}
