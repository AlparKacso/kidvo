'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { dismissOnboarding } from './actions'

export interface OnboardingStep {
  label: string
  done:  boolean
  href?: string
}

export function OnboardingWidget({ steps }: { steps: OnboardingStep[] }) {
  const router = useRouter()

  async function handleDismiss() {
    await dismissOnboarding()
    router.refresh()
  }

  return (
    <div
      className="bg-white rounded-[22px] p-[22px] relative"
      style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}
    >
      {/* Dismiss × */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-[15px] right-[18px] text-ink-muted hover:text-ink transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 2l10 10M12 2L2 12" />
        </svg>
      </button>

      <div className="font-display text-[11px] font-bold tracking-[.08em] uppercase text-ink-muted mb-[14px]">
        Get started
      </div>

      <div className="flex flex-col gap-[11px]">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-[10px]">
            {/* Status dot */}
            {step.done ? (
              <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4.5l2.5 2.5 4.5-4.5" />
                </svg>
              </span>
            ) : (
              <span className="w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0" style={{ borderColor: '#d1cce8' }} />
            )}

            {/* Label — clickable when pending and href available */}
            {!step.done && step.href ? (
              <Link href={step.href} className="font-display text-[13px] flex-1 leading-snug text-ink font-semibold hover:text-primary transition-colors">
                {step.label}
              </Link>
            ) : (
              <span className={`font-display text-[13px] flex-1 leading-snug ${step.done ? 'text-ink-muted line-through' : 'text-ink-muted'}`}>
                {step.label}
              </span>
            )}

            {/* Arrow for pending+linked steps */}
            {!step.done && step.href && (
              <Link href={step.href} className="font-display text-[12px] font-bold text-blue hover:opacity-75 flex-shrink-0">
                →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
