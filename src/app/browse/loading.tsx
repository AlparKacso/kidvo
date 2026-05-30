// Shown instantly on navigation to /browse while the server renders the real
// page (which fetches listings + reviews). Gives immediate feedback instead of
// a frozen previous page.
export default function BrowseLoading() {
  return (
    <div className="px-4 pt-5 pb-8 md:px-[28px] md:pt-[26px]">
      <div className="flex flex-col gap-5 animate-pulse">
        {/* Title */}
        <div className="h-5 w-48 rounded bg-border/60" />

        {/* Search + filter bar */}
        <div className="flex flex-col gap-2">
          <div className="h-11 w-full rounded-lg bg-border/50" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-full bg-border/50 flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* Card grid */}
        <div className="bg-white rounded-[22px] p-[22px] shadow-card">
          <div className="h-4 w-40 rounded bg-border/60 mb-[18px]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[16px] border border-border overflow-hidden">
                <div className="aspect-[4/3] bg-border/50" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 w-20 rounded bg-border/50" />
                  <div className="h-4 w-3/4 rounded bg-border/60" />
                  <div className="h-3 w-1/2 rounded bg-border/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
