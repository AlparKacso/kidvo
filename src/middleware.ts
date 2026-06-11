import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ── Cron endpoints ────────────────────────────────────────────────────────
  // /api/cron/* authenticate themselves via `Authorization: Bearer
  // CRON_SECRET` and are hit by Vercel Cron / manual triggers that carry no
  // session cookie. They must bypass BOTH the staging password gate and the
  // auth redirect below — otherwise they 307 to /staging-login (staging) or
  // /auth/login (prod) and never run.
  if (request.nextUrl.pathname.startsWith('/api/cron/')) {
    return NextResponse.next()
  }

  // ── Staging password gate ─────────────────────────────────────────────────
  if (process.env.STAGING_PASSWORD) {
    const cookie = request.cookies.get('staging_auth')?.value
    if (cookie !== process.env.STAGING_PASSWORD) {
      const { pathname } = request.nextUrl
      if (pathname === '/staging-login') return NextResponse.next()
      // Tokenized waitlist offer links are clicked by parents straight from email
      // (no account, no staging password) — let them past the gate, mirroring prod
      // where no gate exists. The unguessable token is the access control. Without
      // this, email CTAs opened in an isolated browser (e.g. the Gmail app's
      // in-app browser, which has no staging_auth cookie) bounce to /staging-login.
      if (pathname.startsWith('/offer/') || pathname.startsWith('/api/offers/')) {
        return NextResponse.next()
      }
      return NextResponse.redirect(new URL('/staging-login', request.url))
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { pathname } = request.nextUrl

  // ── Public routes — short-circuit BEFORE the auth round-trip ──────────────
  // These render fine without a session, so we skip supabase.auth.getUser()
  // (a network call to the auth server) entirely. This is the hot path:
  // home, /browse and every /browse/<id> detail page. Logged-in display state
  // is still resolved per-page by AppShell; token refresh still happens on the
  // protected routes below, which is the only place it can be persisted anyway.
  const alwaysPublic = ['/', '/providers', '/privacy', '/terms', '/teaser']
  if (alwaysPublic.includes(pathname)) return NextResponse.next()
  if (pathname === '/browse' || pathname.startsWith('/browse/')) return NextResponse.next()
  if (pathname === '/events' || pathname.startsWith('/events/')) return NextResponse.next()
  // Tokenized waitlist offer — parents respond by email link without an account.
  // The page and its token API are public; the provider's POST /api/offers
  // (no trailing slash) stays protected by the auth check below.
  if (pathname.startsWith('/offer/')) return NextResponse.next()
  if (pathname.startsWith('/api/offers/')) return NextResponse.next()
  if (pathname === '/auth/callback') return NextResponse.next()
  if (pathname === '/opengraph-image' || pathname.endsWith('/opengraph-image')) return NextResponse.next()
  // Reset/forgot password pages must stay accessible regardless of auth state
  // (recovery token arrives as a hash fragment — the server never sees it, so we
  //  must not redirect logged-in users away before the client can consume it)
  if (pathname === '/auth/forgot-password' || pathname === '/auth/reset-password') {
    return NextResponse.next()
  }
  // Public auth API routes — must be accessible without a session
  if (pathname === '/api/auth/forgot-password' || pathname === '/api/auth/create-profile') {
    return NextResponse.next()
  }

  // ── Authenticated routes — validate (and refresh) the session ─────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const authRoutes = ['/auth/login', '/auth/signup']
  if (authRoutes.includes(pathname)) {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return supabaseResponse
  }
  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url))
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
