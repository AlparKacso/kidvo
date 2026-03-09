'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const KidvoLogo = () => (
  <Link href="/main" className="flex items-center px-[18px] py-[22px] border-b border-border hover:opacity-80 transition-opacity">
    <span className="font-display font-black leading-none" style={{ fontSize: '22px', letterSpacing: '-1px' }}>
      <span className="text-ink">kid</span>
      <span className="text-primary">vo</span>
    </span>
  </Link>
)

interface NavItemProps {
  href:         string
  icon:         React.ReactNode
  label:        string
  badge?:       string | number
  badgeVariant?: 'purple' | 'blue'
  exact?:       boolean
  excludes?:    string[]
}

function NavItem({ href, icon, label, badge, badgeVariant = 'purple', exact, excludes }: NavItemProps) {
  const pathname = usePathname()
  const active   = exact
    ? pathname === href
    : pathname.startsWith(href) && !(excludes?.some(e => pathname.startsWith(e)))

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-[9px] px-[10px] py-[9px] rounded-[8px] text-[13.5px] font-display font-medium transition-colors relative',
        active
          ? 'bg-ink text-white'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-ink'
      )}
    >
      <span className={cn('w-[15px] h-[15px] flex items-center justify-center flex-shrink-0', active ? 'opacity-100' : 'opacity-55')}>
        {icon}
      </span>
      {label}
      {badge !== undefined && (
        <span
          className={cn(
            'ml-auto font-display text-[10.5px] font-bold px-[7px] py-px rounded-full',
            badgeVariant === 'blue'
              ? 'bg-[#e0f2ff] text-[#0369a1]'
              : 'bg-[#f0e8ff] text-primary'
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[18px]">
      <span className="block font-display text-[10.5px] font-bold tracking-[.1em] uppercase text-ink-muted px-[10px] mb-1.5">
        {label}
      </span>
      <div className="flex flex-col gap-px">
        {children}
      </div>
    </div>
  )
}

/* ── SVG icons (15×15, currentColor) ── */
const IconHome      = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l5.5-5.5L13 8M3.5 7v5.5a.5.5 0 0 0 .5.5h3V10h3v3h3a.5.5 0 0 0 .5-.5V7"/></svg>
const IconBrowse    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IconSaved     = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
const IconKids      = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
const IconTrials    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconListings  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 5h5M5 7.5h5M5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconAnalytics = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 12l3.5-4 3 2.5L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IconSettings  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
const IconAdmin     = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L2 4v3.5c0 3 2.5 5.5 5.5 6 3-0.5 5.5-3 5.5-6V4L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>

function SignOutButton() {
  async function signOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={signOut}
      title="Sign out"
      className="w-6 h-6 rounded flex items-center justify-center text-ink-muted hover:text-ink hover:bg-border transition-colors flex-shrink-0"
    >
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
        <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-3-3-3M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function NudgeWidget() {
  return (
    <div
      className="rounded-[16px] p-4 text-white"
      style={{ background: '#1c1c27' }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2.5"
        style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="9" cy="4.5" r="1.5"/>
          <path d="M9 6.5V10M6.5 10c0 3 5 3 5 0"/>
          <path d="M4 15.5l2.5-4 2.5 1 2.5-1 2.5 4"/>
        </svg>
      </div>

      <div className="font-display text-[14px] font-bold mb-1 leading-snug">
        Book a free trial
      </div>
      <div
        className="font-display text-[12px] leading-[1.5] mb-3"
        style={{ color: 'rgba(255,255,255,0.50)' }}
      >
        Find your child's perfect activity and reserve a free trial in seconds.
      </div>
      <Link
        href="/browse"
        className="inline-flex items-center gap-1 font-display text-[12px] font-semibold text-white rounded-[8px] hover:opacity-85 transition-opacity"
        style={{ background: '#2aa7ff', padding: '7px 13px' }}
      >
        Browse now →
      </Link>
    </div>
  )
}

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

interface SidebarProps {
  isProvider?: boolean
  userName?:   string
  userSub?:    string
  initials?:   string
  userEmail?:  string
}

export function Sidebar({
  isProvider = false,
  userName   = '',
  userSub    = 'Timișoara',
  initials   = '?',
  userEmail  = '',
}: SidebarProps) {
  const isAdmin = userEmail === ADMIN_EMAIL

  return (
    <aside className="w-sidebar min-w-sidebar bg-white border-r border-border flex flex-col sticky top-0 h-screen">
      <KidvoLogo />

      <nav className="flex-1 px-2.5 py-4 flex flex-col overflow-y-auto">

        <NavSection label="Discover">
          <NavItem href="/main"   icon={<IconHome />}   label="Home" exact />
          <NavItem href="/browse" icon={<IconBrowse />} label="Browse" exact />
          <NavItem href="/saved"  icon={<IconSaved />}  label="Saved" exact />
        </NavSection>

        {!isProvider && (
          <NavSection label="My Family">
            <NavItem href="/kids"     icon={<IconKids />}   label="My Kids"  exact />
            <NavItem href="/bookings" icon={<IconTrials />} label="Bookings" exact />
          </NavSection>
        )}

        {isProvider && (
          <NavSection label="My Listings">
            <NavItem href="/listings"           icon={<IconListings />}  label="Activities" excludes={['/listings/bookings', '/listings/analytics']} />
            <NavItem href="/listings/bookings"  icon={<IconTrials />}    label="Bookings"   exact />
            <NavItem href="/listings/analytics" icon={<IconAnalytics />} label="Analytics"  exact />
          </NavSection>
        )}

        <NavSection label="Account">
          <NavItem href="/settings" icon={<IconSettings />} label="Settings" exact />
          {isAdmin && (
            <NavItem href="/admin" icon={<IconAdmin />} label="Admin" exact />
          )}
        </NavSection>

        {/* Nudge widget — parents only */}
        {!isProvider && (
          <div className="mt-auto pt-3">
            <NudgeWidget />
          </div>
        )}
      </nav>

      {/* User profile */}
      <div className="px-2.5 py-3.5 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-sidebar-hover transition-colors">
          <div className="w-7 h-7 rounded-full bg-[#f0e8ff] border border-[#ddd6fe] flex items-center justify-center font-display text-[10px] font-bold text-primary flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xs font-semibold text-ink leading-tight truncate">{userName}</div>
            <div className="text-[10.5px] text-ink-muted leading-tight">{userSub}</div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  )
}
