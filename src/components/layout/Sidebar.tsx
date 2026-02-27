'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const KidvoLogo = () => (
  <div className="flex items-center px-[18px] py-[22px] border-b border-white/[0.06]">
    <span className="font-display font-bold text-[19px] leading-none tracking-tight" style={{ letterSpacing: '-0.03em' }}>
      <span className="text-white">kid</span>
      <span className="text-gold">vo</span>
    </span>
  </div>
)

interface NavItemProps {
  href:    string
  icon:    React.ReactNode
  label:   string
  badge?:  string | number
  exact?:  boolean
}

function NavItem({ href, icon, label, badge, exact }: NavItemProps) {
  const pathname = usePathname()
  const active   = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded text-[12.5px] font-display font-semibold transition-colors relative',
        active
          ? 'bg-sidebar-active text-white'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white/85'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-gold rounded-r-[3px]" />
      )}
      <span className={cn('w-4 h-4 flex items-center justify-center flex-shrink-0', active ? 'opacity-100' : 'opacity-65')}>
        {icon}
      </span>
      {label}
      {badge && (
        <span className="ml-auto bg-gold text-primary-deep font-display text-[10px] font-bold px-1.5 py-px rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}

const IconBrowse    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/></svg>
const IconSearch    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IconKids      = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
const IconSaved     = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
const IconTrials  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
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
      className="w-6 h-6 rounded flex items-center justify-center text-sidebar-muted hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
    >
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
        <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-3-3-3M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
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
    <aside className="w-sidebar min-w-sidebar bg-primary flex flex-col sticky top-0 h-screen">
      <KidvoLogo />

      <nav className="flex-1 px-2.5 py-3.5 flex flex-col gap-px overflow-y-auto">
        <div className="nav-label">Discover</div>
        <NavItem href="/browse" icon={<IconBrowse />} label="Browse" badge={24} exact />

        {!isProvider && (
          <>
            <div className="nav-label">My Family</div>
            <NavItem href="/kids"     icon={<IconKids />}   label="My Kids" exact />
            <NavItem href="/saved"    icon={<IconSaved />}  label="Saved"   exact />
            <NavItem href="/bookings" icon={<IconTrials />} label="Trials"  exact />
          </>
        )}

        {isProvider && (
          <>
            <div className="nav-label">My Listings</div>
            <NavItem href="/listings"           icon={<IconListings />}  label="Activities" />
            <NavItem href="/listings/bookings"  icon={<IconTrials />}    label="Trials"     exact />
            <NavItem href="/listings/analytics" icon={<IconAnalytics />} label="Analytics"  exact />
          </>
        )}

        <div className="nav-label">Account</div>
        <NavItem href="/settings" icon={<IconSettings />} label="Settings" exact />
        {isAdmin && (
          <NavItem href="https://kidvo.eu/admin" icon={<IconAdmin />} label="Admin" exact />
        )}
      </nav>

      <div className="px-2.5 py-3.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded hover:bg-sidebar-hover transition-colors">
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/[0.12] flex items-center justify-center font-display text-[10px] font-bold text-white/75 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xs font-semibold text-white/[0.72] leading-tight truncate">{userName}</div>
            <div className="text-[10.5px] text-sidebar-muted leading-tight">{userSub}</div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  )
}
