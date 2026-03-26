// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')

  const listingUrls: MetadataRoute.Sitemap = (listings ?? []).map(l => ({
    url: `https://kidvo.eu/browse/${l.id}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: 'https://kidvo.eu',             lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: 'https://kidvo.eu/browse',       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: 'https://kidvo.eu/auth/signup',  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...listingUrls,
  ]
}
