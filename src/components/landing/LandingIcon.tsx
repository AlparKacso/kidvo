/**
 * Line-icon set for the landing pages — clean stroked glyphs, 24×24 viewBox,
 * color inherited via `currentColor`. Ported from the design handoff `shared.jsx`.
 */
import type { CSSProperties, ReactNode } from 'react'

export type IconName =
  | 'list' | 'edit' | 'raiseHand' | 'users' | 'parent' | 'check' | 'target'
  | 'clipboard' | 'split' | 'sparkle' | 'hourglass' | 'send' | 'search'
  | 'calendar' | 'calendarPlus' | 'bell' | 'alert' | 'palette' | 'layers'
  | 'heart' | 'sliders'

const PATHS: Record<IconName, (color: string) => ReactNode> = {
  list: () => <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  edit: () => <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  raiseHand: () => <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6v-3a2 2 0 0 0-4 0" />,
  users: () => <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  parent: () => <><circle cx="9" cy="6" r="3" /><path d="M4 21v-2a5 5 0 0 1 10 0v2" /><circle cx="17.5" cy="9.5" r="2" /><path d="M15 21v-1.5a3.5 3.5 0 0 1 6-2.4" /></>,
  check: () => <path d="M20 6 9 17l-5-5" />,
  target: (c) => <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill={c} stroke="none" /></>,
  clipboard: () => <><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><path d="M9 13l2 2 4-4" /></>,
  split: () => <><path d="M5 21V9m0 0 4 4M5 9 1 13" /><path d="M5 9h7a4 4 0 0 0 4-4V3m0 0 3 3m-3-3-3 3" /></>,
  sparkle: () => <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  hourglass: () => <><path d="M6 3h12M6 21h12" /><path d="M7 3c0 4 3 5 5 9 2-4 5-5 5-9M7 21c0-4 3-5 5-9 2 4 5 5 5 9" /></>,
  send: () => <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />,
  search: () => <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  calendar: () => <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  calendarPlus: () => <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 14v4M10 16h4" /></>,
  bell: () => <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  alert: () => <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
  palette: (c) => <><circle cx="13.5" cy="6.5" r="1.3" fill={c} stroke="none" /><circle cx="17.5" cy="10.5" r="1.3" fill={c} stroke="none" /><circle cx="8.5" cy="7.5" r="1.3" fill={c} stroke="none" /><circle cx="6.5" cy="12.5" r="1.3" fill={c} stroke="none" /><path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h2a4 4 0 0 0 4-4 10 10 0 0 0-10-8Z" /></>,
  layers: () => <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 12 10 5 10-5M2 17l10 5 10-5" /></>,
  heart: () => <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.9 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8Z" />,
  sliders: () => <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>,
}

interface IconProps {
  name: IconName
  size?: number
  stroke?: number
  color?: string
  style?: CSSProperties
  className?: string
}

export function Icon({ name, size = 22, stroke = 1.6, color = 'currentColor', style, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {PATHS[name](color)}
    </svg>
  )
}

/** Bare check glyph — used in reassurance strips and checklists. */
export function Check({ color = '#1A7A4A', size = 14, stroke = 2.5 }: { color?: string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
