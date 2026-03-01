'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

const IconAdmin = () => <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L2 4v3.5c0 3 2.5 5.5 5.5 6 3-0.5 5.5-3 5.5-6V4L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>

interface Props {
  isProvider?: boolean
  userEmail?:  string
}

const IconBrowse   = () => <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/></svg>
const IconKids     = () => <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
const IconSaved    = () => <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
const IconBookings = () => <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconSettings = () => <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
const IconListings = () => <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 5h5M5 7.5h5M5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>

function NavItem({ href, icon, label, exact, excludes }: { href: string; icon: React.ReactNode; label: string; exact?: boolean; excludes?: string[] }) {
  const pathname = usePathname()
  const active   = exact
    ? pathname === href
    : pathname.startsWith(href) && !(excludes?.some(e => pathname.startsWith(e)))

  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-1 flex-1 py-2 transition-colors',
        active ? 'text-primary' : 'text-ink-muted'
      )}
    >
      {icon}
      <span className="font-display text-[10px] font-semibold">{label}</span>
    </Link>
  )
}

export function BottomNav({ isProvider = false, userEmail = '' }: Props) {
  const isAdmin = userEmail === ADMIN_EMAIL
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border flex items-stretch safe-area-bottom">
      <NavItem href="/browse" icon={<IconBrowse />} label="Browse" exact />
      {!isProvider && (
        <>
          <NavItem href="/kids"     icon={<IconKids />}     label="My Kids"  exact />
          <NavItem href="/saved"    icon={<IconSaved />}    label="Saved"    exact />
          <NavItem href="/bookings" icon={<IconBookings />} label="Trials" exact />
        </>
      )}
      {isProvider && (
        <>
          <NavItem href="/listings"          icon={<IconListings />} label="Listings" excludes={['/listings/bookings', '/listings/analytics']} />
          <NavItem href="/listings/bookings" icon={<IconBookings />} label="Trials" exact />
        </>
      )}
      <NavItem href="/settings" icon={<IconSettings />} label="Settings" exact />
      {isAdmin && (
        <NavItem href="https://kidvo.eu/admin" icon={<IconAdmin />} label="Admin" exact />
      )}
    </nav>
  )
}
