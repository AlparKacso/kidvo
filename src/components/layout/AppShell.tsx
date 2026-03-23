import Link           from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Sidebar }    from './Sidebar'
import { Topbar }     from './Topbar'
import { BottomNav }  from './BottomNav'
import { getTranslations } from 'next-intl/server'
import { LocaleToggle } from '@/components/ui/LocaleToggle'

interface AppShellProps {
  children:     React.ReactNode
  showListCta?: boolean
}

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const t = await getTranslations('appshell')

  // Guest shell — for public browse pages when not logged in
  if (!authUser) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="bg-white border-b border-border h-topbar flex items-center px-4 md:px-[28px] sticky top-0 z-20">
          <Link href="/browse" className="font-display font-black leading-none hover:opacity-80 transition-opacity" style={{ fontSize: '22px', letterSpacing: '-1px' }}>
            <span style={{ color: '#1c1c27' }}>kid</span><span style={{ color: '#7c3aed' }}>vo</span>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <Link href="/auth/login" className="font-display text-sm font-semibold text-ink-mid hover:text-ink px-3 py-1.5 transition-colors">
              {t('signIn')}
            </Link>
            <Link href="/auth/signup" className="font-display text-sm font-semibold bg-primary text-white px-4 py-1.5 rounded-full hover:bg-primary-deep transition-colors">
              {t('getStarted')}
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 pt-5 pb-8 md:px-[28px] md:pt-[26px]">
          {children}
        </main>
      </div>
    )
  }

  let userName   = ''
  let initials   = '?'
  let isProvider = false
  let userEmail  = authUser.email ?? ''

  const [profileRes, bookingsRes, listingsRes] = await Promise.all([
    supabase.from('users').select('full_name, role').eq('id', authUser.id).single(),
    supabase.from('trial_requests').select('*', { count: 'exact', head: true }).eq('user_id', authUser.id).eq('status', 'pending'),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const profile = profileRes.data as unknown as { full_name: string; role: string } | null

  if (profile) {
    userName   = profile.full_name ?? ''
    isProvider = profile.role === 'provider' || profile.role === 'both'
    initials   = (profile.full_name ?? '?').split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const pendingBookings = bookingsRes.count ?? 0
  const listingsCount   = listingsRes.count ?? 0

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar
          isProvider={isProvider}
          pendingBookings={pendingBookings}
          userEmail={userEmail}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          isProvider={isProvider}
          userName={userName}
          initials={initials}
          userEmail={userEmail}
          listingsCount={listingsCount}
        />
        {/* Extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 px-4 pt-5 pb-24 md:px-[28px] md:pt-[26px] md:pb-14">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav isProvider={isProvider} userEmail={userEmail} />
    </div>
  )
}
