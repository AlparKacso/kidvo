import { AppShell } from '@/components/layout/AppShell'

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">Analytics</h1>
        <p className="text-sm text-ink-muted mb-8">Performance insights for your listings.</p>

        <div className="bg-white border border-border rounded-lg p-12 text-center">
          <div className="text-3xl mb-3">📊</div>
          <div className="font-display text-sm font-semibold text-ink-mid mb-1">Coming soon</div>
          <p className="text-sm text-ink-muted">Views, saves, and trial request stats will appear here.</p>
        </div>
      </div>
    </AppShell>
  )
}
