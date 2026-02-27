const GOLD = '#F0A500'
const EMPTY = '#DDD6E8'

interface StarRatingProps {
  rating: number      // 1–5 average
  count?: number      // number of reviews
  size?: 'sm' | 'md'
}

export function StarRating({ rating, count, size = 'sm' }: StarRatingProps) {
  const filled = Math.round(rating)
  const starSize = size === 'md' ? 14 : 11

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <svg key={n} width={starSize} height={starSize} viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1l1.27 2.57 2.84.41-2.05 2 .48 2.82L6 7.44 3.46 8.8l.48-2.82-2.05-2 2.84-.41L6 1z"
              fill={n <= filled ? GOLD : EMPTY}
            />
          </svg>
        ))}
      </div>
      <span className={`font-display font-semibold ${size === 'md' ? 'text-xs' : 'text-[10px]'} text-ink-muted`}>
        {rating.toFixed(1)}{count !== undefined && ` (${count})`}
      </span>
    </div>
  )
}
