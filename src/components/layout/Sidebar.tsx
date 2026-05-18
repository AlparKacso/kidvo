'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { FeedbackForm } from '@/app/main/FeedbackForm'
import { LegalModal } from '@/components/ui/LegalModal'
import { TermsContent, PrivacyContent } from '@/components/ui/LegalContent'

/* Logo — prototype: padding 2px 8px 22px inside the aside's 14px base */
interface NavItemProps {
  href:          string
  icon:          React.ReactNode
  label:         string
  badge?:        number
  badgeVariant?: 'purple' | 'blue'
  newBadge?:     string
  exact?:        boolean
  excludes?:     string[]
  collapsed?:    boolean
}

function NavItem({ href, icon, label, badge, badgeVariant = 'purple', newBadge, exact, excludes, collapsed }: NavItemProps) {
  const pathname = usePathname()
  const active   = exact
    ? pathname === href
    : pathname.startsWith(href) && !(excludes?.some(e => pathname.startsWith(e)))
  const hasBadge = (badge !== undefined && badge > 0) || !!newBadge

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex items-center rounded-[8px] font-display text-[13.5px] font-medium transition-colors',
        collapsed ? 'justify-center px-0 py-[10px]' : 'gap-[9px] px-[10px] py-[9px]',
        active
          ? 'bg-ink text-white'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-ink'
      )}
    >
      {/* Prototype: 16×16 icons at 0.65 opacity inactive */}
      <span className={cn('relative w-4 h-4 flex items-center justify-center flex-shrink-0', active ? 'opacity-100' : 'opacity-[.65]')}>
        {icon}
        {collapsed && hasBadge && (
          <span className={cn(
            'absolute -top-1 -right-1.5 w-2 h-2 rounded-full ring-2',
            active ? 'ring-ink' : 'ring-white',
            newBadge && !(badge && badge > 0) ? 'bg-gold' : 'bg-primary',
          )} />
        )}
      </span>
      {!collapsed && label}
      {!collapsed && badge !== undefined && badge > 0 && (
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
      {!collapsed && newBadge && !(badge && badge > 0) && (
        <span className="ml-auto font-display text-[9px] font-bold tracking-[0.08em] uppercase px-[7px] py-px rounded-full bg-gold text-ink pulse-gold">
          {newBadge}
        </span>
      )}
    </Link>
  )
}

/* Prototype: nav-section margin-bottom 20px, nav-label margin-bottom 4px */
function NavSection({ label, children, collapsed }: { label: string; children: React.ReactNode; collapsed?: boolean }) {
  return (
    <div className="mb-[20px]">
      {collapsed
        ? <div className="h-px bg-border/70 mx-[10px] mb-[8px]" />
        : <span className="block font-display text-[10.5px] font-bold tracking-[.1em] uppercase text-ink-muted px-[10px] mb-[4px]">{label}</span>}
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  )
}

/* ── SVG icons (16×16, currentColor, matching prototype stroke widths) ── */
const IconHome      = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l7-7 7 7M3.5 8v7a1 1 0 0 0 1 1H8V12h4v4h3.5a1 1 0 0 0 1-1V8"/></svg>
const IconBrowse    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="5.5"/><path d="M13 13l3 3"/></svg>
const IconSaved     = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 14.5S2.5 10 2.5 6a4 4 0 0 1 6.5-3.1A4 4 0 0 1 15.5 6C15.5 10 9 14.5 9 14.5Z"/></svg>
const IconEvents    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="3.5" width="13" height="12" rx="1.5"/><path d="M2.5 7h13M6 2v3M12 2v3"/><path d="M9 9.3l.7 1.5 1.6.2-1.2 1.1.3 1.6L9 13l-1.4.7.3-1.6-1.2-1.1 1.6-.2z"/></svg>
const IconKids      = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="5.5" r="3"/><path d="M2.5 16c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5"/></svg>
const IconTrials    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3.5" width="14" height="11" rx="1.5"/><path d="M6 3.5V2M12 3.5V2M2 7.5h14"/></svg>
const IconListings  = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2.5" y="2" width="13" height="14" rx="1.5"/><path d="M6 6h6M6 9h6M6 12h4"/></svg>
const IconAnalytics = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13.5l4-4.5 3.5 3L13 5"/><path d="M13 5h3v3"/></svg>
const IconSettings  = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="2.5"/></svg>
const IconAdmin     = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 1.5L2.5 4.5v4c0 3.5 2.9 6.5 6.5 7 3.6-.5 6.5-3.5 6.5-7v-4L9 1.5Z"/><path d="M6 9l2 2 4-4"/></svg>

function FeedbackNudge({ isProvider }: { isProvider: boolean }) {
  const [open,     setOpen]     = useState(false)
  const [expanded, setExpanded] = useState(false)
  const t = useTranslations('nav')

  const title    = isProvider ? t('feedbackProvider') : t('feedbackParent')
  const subtitle = isProvider ? t('feedbackProviderSub') : t('feedbackParentSub')

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
            {t('shareFeedback')}
          </button>
        </div>
      )}

      {/* Modal — portal to escape sidebar stacking context */}
      {open && createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
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
        </div>,
        document.body
      )}
    </>
  )
}

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

interface SidebarProps {
  isProvider?:             boolean
  pendingBookings?:        number
  providerPendingTrials?:  number
  userEmail?:              string
  hasEvents?:              boolean
}

export function Sidebar({
  isProvider             = false,
  pendingBookings        = 0,
  providerPendingTrials  = 0,
  userEmail              = '',
  hasEvents              = false,
}: SidebarProps) {
  const isAdmin = userEmail === ADMIN_EMAIL
  const [legalOpen, setLegalOpen] = useState<'terms' | 'privacy' | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const t = useTranslations('nav')

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('kidvo:sidebar-collapsed') === '1') } catch { /* ignore */ }
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('kidvo:sidebar-collapsed', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  /* Prototype aside: padding 20px 14px 16px, flex column */
  return (
    <aside className={cn(
      'bg-white border-r border-border flex flex-col sticky top-0 h-screen overflow-y-auto overflow-x-hidden pt-[20px] pb-[16px] transition-[width] duration-150',
      collapsed ? 'w-[68px] min-w-[68px] px-[10px]' : 'w-sidebar min-w-sidebar px-[14px]',
    )}>

      {(() => {
        const ToggleBtn = (
          <button
            onClick={toggleCollapsed}
            title={collapsed ? t('expand') : t('collapse')}
            aria-label={collapsed ? t('expand') : t('collapse')}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-ink-muted hover:bg-sidebar-hover hover:text-ink transition-colors flex-shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
              className={cn('transition-transform', collapsed && 'rotate-180')}>
              <path d="M11 4l-5 5 5 5" />
            </svg>
          </button>
        )
        return collapsed ? (
          <div className="flex flex-col items-center gap-2.5 pt-[2px] pb-[18px]">
            <Link href={isProvider ? '/dashboard' : '/browse'} className="hover:opacity-80 transition-opacity">
              <span className="font-display font-black leading-none" style={{ fontSize: '20px', letterSpacing: '-1px' }}>
                <span className="text-ink">k</span><span className="text-primary">v</span>
              </span>
            </Link>
            {ToggleBtn}
          </div>
        ) : (
          <div className="flex items-center justify-between pt-[2px] pb-[22px] pl-[8px]">
            <Link href={isProvider ? '/dashboard' : '/browse'} className="flex items-center hover:opacity-80 transition-opacity">
              <span className="font-display font-black leading-none" style={{ fontSize: '22px', letterSpacing: '-1px' }}>
                <span className="text-ink">kid</span><span className="text-primary">vo</span>
              </span>
            </Link>
            {ToggleBtn}
          </div>
        )
      })()}

      <nav className="flex-1 flex flex-col">

        <NavSection label={t('discover')} collapsed={collapsed}>
          <NavItem href="/dashboard" icon={<IconHome />}   label={t('dashboard')} exact collapsed={collapsed} />
          <NavItem href="/browse"    icon={<IconBrowse />} label={t('browse')}    exact collapsed={collapsed} />
          {hasEvents && (
            <NavItem href="/events"  icon={<IconEvents />} label={t('events')}    newBadge={t('new')} collapsed={collapsed} />
          )}
        </NavSection>

        {!isProvider && (
          <NavSection label={t('myFamily')} collapsed={collapsed}>
            <NavItem href="/kids" icon={<IconKids />} label={t('kidsActivities')} badge={pendingBookings} badgeVariant="blue" exact collapsed={collapsed} />
          </NavSection>
        )}

        {isProvider && (
          <NavSection label={t('myListings')} collapsed={collapsed}>
            <NavItem href="/listings" icon={<IconListings />} label={t('activities')} badge={providerPendingTrials} badgeVariant="purple" collapsed={collapsed} />
          </NavSection>
        )}

        <NavSection label={t('account')} collapsed={collapsed}>
          <NavItem href="/settings" icon={<IconSettings />} label={t('settings')} exact collapsed={collapsed} />
          {isAdmin && (
            <NavItem href="/admin" icon={<IconAdmin />} label={t('admin')} exact collapsed={collapsed} />
          )}
        </NavSection>

        <div className="mt-auto pt-3 flex flex-col">
          {!collapsed && (
            <>
              <FeedbackNudge isProvider={isProvider} />
              <div className="flex items-center gap-3 px-[10px] pt-4">
                <button onClick={() => setLegalOpen('terms')}   className="font-display text-[11px] font-medium text-ink-muted hover:text-ink-mid transition-colors">{t('terms')}</button>
                <span className="text-border select-none">·</span>
                <button onClick={() => setLegalOpen('privacy')} className="font-display text-[11px] font-medium text-ink-muted hover:text-ink-mid transition-colors">{t('privacy')}</button>
              </div>
            </>
          )}

      {legalOpen === 'terms'   && <LegalModal title="Terms of Use"    onClose={() => setLegalOpen(null)}><TermsContent /></LegalModal>}
      {legalOpen === 'privacy' && <LegalModal title="Privacy Policy"  onClose={() => setLegalOpen(null)}><PrivacyContent /></LegalModal>}
        </div>

      </nav>
    </aside>
  )
}
