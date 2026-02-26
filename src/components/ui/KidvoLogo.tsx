// Logo variants:
// 'dark'  — on dark/purple backgrounds: kid=white, vo=gold
// 'light' — on light backgrounds: kid=primary purple, vo=gold

interface Props {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'text-[18px]',
  md: 'text-[22px]',
  lg: 'text-[26px]',
}

export function KidvoLogo({ variant = 'dark', size = 'md' }: Props) {
  const kidColor = variant === 'dark' ? 'rgba(255,255,255,0.92)' : '#523650'

  return (
    <span
      className={`font-display ${sizes[size]} leading-none`}
      style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
    >
      <span style={{ color: kidColor }}>kid</span>
      <span style={{ color: '#F0A500' }}>vo</span>
    </span>
  )
}
