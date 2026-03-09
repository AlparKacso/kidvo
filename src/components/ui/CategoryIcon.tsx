/**
 * CategoryIcon — monochrome SVG icons per category slug, rendered with currentColor.
 * CategoryIconChip — icon + label in a per-category tinted container.
 */

interface CategoryIconProps {
  slug:      string
  className?: string
  size?:     number
}

export function CategoryIcon({ slug, className, size = 14 }: CategoryIconProps) {
  const s = { width: size, height: size, viewBox: '0 0 15 15', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (slug) {
    case 'sport':
      // Ball / football shape
      return (
        <svg {...s} className={className}>
          <circle cx="7.5" cy="7.5" r="5.5" />
          <path d="M7.5 2 L5 5.5 L7.5 7 L10 5.5 Z" />
          <path d="M5 5.5 L2.5 8 M10 5.5 L12.5 8 M7.5 7 L7.5 11" />
        </svg>
      )
    case 'dance':
      // Figure with arms raised
      return (
        <svg {...s} className={className}>
          <circle cx="7.5" cy="3" r="1.5" />
          <path d="M7.5 4.5v4" />
          <path d="M4.5 6l3-1.5 3 1.5" />
          <path d="M7.5 8.5l-2 3.5M7.5 8.5l2 3.5" />
        </svg>
      )
    case 'music':
      // Eighth note
      return (
        <svg {...s} className={className}>
          <ellipse cx="5" cy="11.5" rx="2" ry="1.5" />
          <ellipse cx="11" cy="10" rx="2" ry="1.5" />
          <path d="M7 11.5V4l6-1.5v6.5" />
        </svg>
      )
    case 'coding':
      // Code brackets </>
      return (
        <svg {...s} className={className}>
          <path d="M5 4.5L1.5 7.5 5 10.5" />
          <path d="M10 4.5L13.5 7.5 10 10.5" />
          <path d="M9 3l-3 9" />
        </svg>
      )
    case 'arts':
      // Palette circle with color dots
      return (
        <svg {...s} className={className}>
          <path d="M7.5 2a5.5 5.5 0 1 0 4 9.5" strokeLinecap="round" />
          <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="9.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'language':
      // Globe with meridian lines
      return (
        <svg {...s} className={className}>
          <circle cx="7.5" cy="7.5" r="5.5" />
          <path d="M7.5 2c-2 1.5-3 3-3 5.5s1 4 3 5.5" />
          <path d="M7.5 2c2 1.5 3 3 3 5.5s-1 4-3 5.5" />
          <path d="M2 7.5h11" />
        </svg>
      )
    case 'chess':
      // Pawn shape
      return (
        <svg {...s} className={className}>
          <circle cx="7.5" cy="4" r="2" />
          <path d="M6 6l-.5 5h4L9 6" />
          <path d="M5 11h5" />
        </svg>
      )
    case 'gym':
      // Gymnastics figure / dumbbell
      return (
        <svg {...s} className={className}>
          <path d="M2 7.5h11" />
          <rect x="1" y="6" width="2" height="3" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="12" y="6" width="2" height="3" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="3" y="5.5" width="2" height="4" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="10" y="5.5" width="2" height="4" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'all':
      // 4-square grid
      return (
        <svg width={size} height={size} viewBox="0 0 15 15" fill="none" className={className}>
          <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
          <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
        </svg>
      )
    default:
      // Generic sparkle / star
      return (
        <svg {...s} className={className}>
          <path d="M7.5 2v2.5M7.5 10.5V13M2 7.5h2.5M10.5 7.5H13" />
          <path d="M4 4l1.8 1.8M9.2 9.2L11 11M11 4l-1.8 1.8M5.8 9.2L4 11" />
          <circle cx="7.5" cy="7.5" r="2" />
        </svg>
      )
  }
}

/**
 * A pill-shaped chip showing a category icon + name,
 * tinted with the category's accent color.
 */
interface CategoryIconChipProps {
  slug:         string
  name:         string
  accentColor?: string
  size?:        'sm' | 'md'
}

// Convert hex color to rgba with specified alpha (0–1)
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(124,58,237,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

export function CategoryIconChip({ slug, name, accentColor = '#7c3aed', size = 'sm' }: CategoryIconChipProps) {
  const bg   = hexToRgba(accentColor, 0.10)
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-display text-[11px] font-semibold"
      style={{ background: bg, color: accentColor, padding: '3px 9px' }}
    >
      <CategoryIcon slug={slug} size={iconSize} />
      {name}
    </span>
  )
}
