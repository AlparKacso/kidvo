// Catch-all instant loading state for any route without its own loading.tsx
// (dashboard, saved, bookings, settings, …). Replaces the frozen-previous-page
// feel on menu navigations with immediate feedback while the server renders.
export default function RootLoading() {
  return (
    <div className="px-4 pt-5 pb-8 md:px-[28px] md:pt-[26px]">
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="h-6 w-56 rounded bg-border/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-[16px] border border-border bg-white p-4">
              <div className="h-3 w-24 rounded bg-border/50 mb-3" />
              <div className="h-4 w-3/4 rounded bg-border/60 mb-2" />
              <div className="h-3 w-1/2 rounded bg-border/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
