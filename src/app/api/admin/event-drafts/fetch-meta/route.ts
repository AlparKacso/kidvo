import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// Admin-only: fetch a public URL and return its OpenGraph tags to prefill an
// assisted event draft. Read-only — does NOT insert anything. No Facebook
// crawler; this just reads the public OG meta a page already exposes.
export async function POST(request: Request) {
  const { url } = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let target: URL
  try {
    target = new URL(url)
    if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error('bad protocol')
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(target.toString(), {
      headers: { 'User-Agent': 'kidvo-events-bot/1.0 (+https://kidvo.eu)' },
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) return NextResponse.json({ error: `Source returned ${res.status}` }, { status: 502 })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'Could not fetch the URL' }, { status: 502 })
  }

  const $ = cheerio.load(html)
  const og = (p: string) =>
    $(`meta[property="og:${p}"]`).attr('content') ||
    $(`meta[name="og:${p}"]`).attr('content') || null

  return NextResponse.json({
    title:       og('title') || $('title').first().text().trim() || '',
    description: og('description') || $('meta[name="description"]').attr('content') || '',
    coverImageUrl: og('image') || '',
    eventUrl:    target.toString(),
  })
}
