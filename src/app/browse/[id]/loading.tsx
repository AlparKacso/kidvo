// Shown instantly when a card is clicked, while the server fetches the listing,
// its relations, reviews and the viewer's save/trial state.
export default function ActivityDetailLoading() {
  return (
    <div className="px-4 pt-5 pb-8 md:px-[28px] md:pt-[26px]">
      <div className="animate-pulse">
        {/* Breadcrumb */}
        <div className="h-4 w-64 rounded bg-border/50 mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Left column */}
          <div className="order-2 md:order-1 flex flex-col gap-4">
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="h-3 w-40 rounded bg-border/50 mb-3" />
              <div className="h-7 w-2/3 rounded bg-border/60 mb-4" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-7 w-24 rounded bg-border/40" />
                ))}
              </div>
            </div>
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="h-3 w-24 rounded bg-border/50 mb-3" />
              <div className="flex flex-col gap-2">
                <div className="h-3 w-full rounded bg-border/40" />
                <div className="h-3 w-full rounded bg-border/40" />
                <div className="h-3 w-4/5 rounded bg-border/40" />
              </div>
            </div>
          </div>

          {/* Right sticky column */}
          <div className="order-1 md:order-2 flex flex-col gap-3">
            <div className="aspect-[4/3] rounded-lg bg-border/50" />
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="h-7 w-32 rounded bg-border/60 mb-4" />
              <div className="h-10 w-full rounded bg-border/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
