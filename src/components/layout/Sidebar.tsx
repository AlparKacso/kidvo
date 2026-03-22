'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FeedbackForm } from '@/app/main/FeedbackForm'
import { LegalModal } from '@/components/ui/LegalModal'
import { TermsContent, PrivacyContent } from '@/components/ui/LegalContent'

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

function FeedbackNudge({ isProvider }: { isProvider: boolean }) {
  const [open,     setOpen]     = useState(false)
  const [expanded, setExpanded] = useState(false)

  const title    = isProvider ? 'Help us improve for providers' : "How's kidvo working for you?"
  const subtitle = isProvider
    ? 'What would make managing your listings easier?'
    : 'Tell us what would help you find the right activities for your kids.'

  const BubbleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 9.5c0 3-2.9 5-6.5 5a7.7 7.7 0 0 1-3-.6L2.5 15l1-3.3A5.3 5.3 0 0 1 2.5 9c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6Z"/>
    </svg>
  )

  return (
    <>
      {/* Collapsed: icon bubble only */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          aria-label="Share feedback"
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white active:scale-95 transition-transform"
          style={{ background: '#1c1c27', color: 'rgba(255,255,255,0.75)' }}
        >
          <BubbleIcon />
        </button>
      )}

      {/* Expanded: full card */}
      {expanded && (
        <div className="feedback-expand rounded-[16px] p-4 text-white" style={{ background: '#1c1c27' }}>
          {/* Icon + close row */}
          <div className="flex items-center justify-between mb-2.5">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}
            >
              <BubbleIcon />
            </div>
            <button
              onClick={() => setExpanded(false)}
              aria-label="Collapse"
              className="w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="font-display text-[14px] font-bold mb-1 leading-snug">{title}</div>
          <div className="font-display text-[12px] leading-[1.5] mb-3" style={{ color: 'rgba(255,255,255,0.50)' }}>
            {subtitle}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 font-display text-[12px] font-semibold text-white rounded-[8px] hover:opacity-85 transition-opacity"
            style={{ background: '#7c3aed', padding: '7px 13px' }}
          >
            Share feedback →
          </button>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:bg-surface transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <h2 className="font-display text-base font-bold text-ink mb-1">{title}</h2>
            <p className="text-sm text-ink-muted mb-4">{subtitle}</p>
            <FeedbackForm />
          </div>
        </div>
      )}
    </>
  )
}

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

interface SidebarProps {
  isProvider?:         boolean
  pendingBookings?:    number
  userEmail?:          string
}

export function Sidebar({
  isProvider       = false,
  pendingBookings  = 0,
  userEmail        = '',
}: SidebarProps) {
  const isAdmin = userEmail === ADMIN_EMAIL
  const [legalOpen, setLegalOpen] = useState<'terms' | 'privacy' | null>(null)

  /* Prototype aside: padding 20px 14px 16px, flex column */
  return (
    <aside className="w-sidebar min-w-sidebar bg-white border-r border-border flex flex-col sticky top-0 h-screen overflow-y-auto px-[14px] pt-[20px] pb-[16px]">

      <KidvoLogo />

      <nav className="flex-1 flex flex-col">

        <NavSection label="Discover">
          <NavItem href="/dashboard" icon={<IconHome />}   label="Dashboard" exact />
          <NavItem href="/browse"    icon={<IconBrowse />} label="Browse"    exact />
        </NavSection>

        {!isProvider && (
          <NavSection label="My Family">
            <NavItem href="/kids" icon={<IconKids />} label="Kids & Activities" badge={pendingBookings} badgeVariant="blue" exact />
          </NavSection>
        )}

        {isProvider && (
          <NavSection label="My Listings">
            <NavItem href="/listings" icon={<IconListings />} label="Activities" />
          </NavSection>
        )}

        <NavSection label="Account">
          <NavItem href="/settings" icon={<IconSettings />} label="Settings" exact />
          {isAdmin && (
            <NavItem href="/admin" icon={<IconAdmin />} label="Admin" exact />
          )}
        </NavSection>

        {/* Feedback nudge — pushed to bottom, shown for all roles */}
        <div className="mt-auto pt-3">
          <FeedbackNudge isProvider={isProvider} />
          <div className="flex items-center gap-3 px-[10px] pt-4">
            <button onClick={() => setLegalOpen('terms')}   className="font-display text-[11px] font-medium text-ink-muted hover:text-ink-mid transition-colors">Terms</button>
            <span className="text-border select-none">·</span>
            <button onClick={() => setLegalOpen('privacy')} className="font-display text-[11px] font-medium text-ink-muted hover:text-ink-mid transition-colors">Privacy</button>
          </div>

      {legalOpen === 'terms'   && <LegalModal title="Terms of Use"    onClose={() => setLegalOpen(null)}><TermsContent /></LegalModal>}
      {legalOpen === 'privacy' && <LegalModal title="Privacy Policy"  onClose={() => setLegalOpen(null)}><PrivacyContent /></LegalModal>}
        </div>

      </nav>
    </aside>
  )
}
