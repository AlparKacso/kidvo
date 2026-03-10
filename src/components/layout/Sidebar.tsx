'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/* Logo — prototype: padding 2px 8px 22px inside the aside's 14px base */
const KidvoLogo = () => (
  <Link href="/dashboard" className="flex items-center px-[8px] pt-[2px] pb-[22px] hover:opacity-80 transition-opacity">
    <span className="font-display font-black leading-none" style={{ fontSize: '22px', letterSpacing: '-1px' }}>
      <span className="text-ink">kid</span>
      <span className="text-primary">vo</span>
    </span>
  </Link>
)

interface NavItemProps {
  href:          string
  icon:          React.ReactNode
  label:         string
  badge?:        number
  badgeVariant?: 'purple' | 'blue'
  exact?:        boolean
  excludes?:     string[]
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
        'flex items-center gap-[9px] px-[10px] py-[9px] rounded-[8px] font-display text-[13.5px] font-medium transition-colors',
        active
          ? 'bg-ink text-white'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-ink'
      )}
    >
      {/* Prototype: 16×16 icons at 0.65 opacity inactive */}
      <span className={cn('w-4 h-4 flex items-center justify-center flex-shrink-0', active ? 'opacity-100' : 'opacity-[.65]')}>
        {icon}
      </span>
      {label}
      {badge !== undefined && badge > 0 && (
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

/* Prototype: nav-section margin-bottom 20px, nav-label margin-bottom 4px */
function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[20px]">
      <span className="block font-display text-[10.5px] font-bold tracking-[.1em] uppercase text-ink-muted px-[10px] mb-[4px]">
        {label}
      </span>
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  )
}

/* ── SVG icons (16×16, currentColor, matching prototype stroke widths) ── */
const IconHome      = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l7-7 7 7M3.5 8v7a1 1 0 0 0 1 1H8V12h4v4h3.5a1 1 0 0 0 1-1V8"/></svg>
const IconBrowse    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="5.5"/><path d="M13 13l3 3"/></svg>
const IconSaved     = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 14.5S2.5 10 2.5 6a4 4 0 0 1 6.5-3.1A4 4 0 0 1 15.5 6C15.5 10 9 14.5 9 14.5Z"/></svg>
const IconKids      = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="5.5" r="3"/><path d="M2.5 16c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5"/></svg>
const IconTrials    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3.5" width="14" height="11" rx="1.5"/><path d="M6 3.5V2M12 3.5V2M2 7.5h14"/></svg>
const IconListings  = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2.5" y="2" width="13" height="14" rx="1.5"/><path d="M6 6h6M6 9h6M6 12h4"/></svg>
const IconAnalytics = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13.5l4-4.5 3.5 3L13 5"/><path d="M13 5h3v3"/></svg>
const IconSettings  = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="2.5"/></svg>
const IconAdmin     = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 1.5L2.5 4.5v4c0 3.5 2.9 6.5 6.5 7 3.6-.5 6.5-3.5 6.5-7v-4L9 1.5Z"/><path d="M6 9l2 2 4-4"/></svg>

function NudgeWidget() {
  return (
    <div className="rounded-[16px] p-4 text-white" style={{ background: '#1c1c27' }}>
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
      <div className="font-display text-[14px] font-bold mb-1 leading-snug">Book a free trial</div>
      <div className="font-display text-[12px] leading-[1.5] mb-3" style={{ color: 'rgba(255,255,255,0.50)' }}>
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
  isProvider?:    boolean
  savedCount?:    number
  bookingsCount?: number
  userEmail?:     string
}

export function Sidebar({
  isProvider    = false,
  savedCount    = 0,
  bookingsCount = 0,
  userEmail     = '',
}: SidebarProps) {
  const isAdmin = userEmail === ADMIN_EMAIL

  /* Prototype aside: padding 20px 14px 16px, flex column */
  return (
    <aside className="w-sidebar min-w-sidebar bg-white border-r border-border flex flex-col sticky top-0 h-screen overflow-y-auto px-[14px] pt-[20px] pb-[16px]">

      <KidvoLogo />

      <nav className="flex-1 flex flex-col">

        <NavSection label="Discover">
          <NavItem href="/dashboard" icon={<IconHome />} label="Dashboard" exact />
          <NavItem href="/browse" icon={<IconBrowse />} label="Browse" exact />
          <NavItem href="/saved"  icon={<IconSaved />}  label="Saved"  badge={savedCount} badgeVariant="purple" exact />
        </NavSection>

        {!isProvider && (
          <NavSection label="My Family">
            <NavItem href="/kids"     icon={<IconKids />}   label="My Kids"  exact />
            <NavItem href="/bookings" icon={<IconTrials />} label="Bookings" badge={bookingsCount} badgeVariant="blue" exact />
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

        {/* Nudge widget — parents only, pushed to bottom */}
        {!isProvider && (
          <div className="mt-auto pt-3">
            <NudgeWidget />
          </div>
        )}

      </nav>
    </aside>
  )
}
