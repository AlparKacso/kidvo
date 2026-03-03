// Shown by Next.js automatically while the browse server component streams in
export default function BrowseLoading() {
  return (
    <div className="flex-1 px-4 pt-5 pb-8 md:px-[28px] md:pt-[26px]">
      {/* Search bar skeleton */}
      <div className="flex gap-2 mb-4">
        <div className="h-10 flex-1 bg-border/60 rounded-lg animate-pulse" />
        <div className="h-10 w-24 bg-border/60 rounded-lg animate-pulse" />
      </div>
      {/* Category pills skeleton */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 bg-border/60 rounded-full animate-pulse flex-shrink-0" />
        ))}
      </div>
      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-lg overflow-hidden h-[148px] animate-pulse">
            <div className="w-1 h-full bg-border/80 absolute left-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
