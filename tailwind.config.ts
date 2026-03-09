import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — replaces old primary (#523650) with new brand purple (#7c3aed)
        // All existing `text-primary`, `bg-primary`, `border-primary` classes
        // now automatically render in the new brand purple.
        primary: {
          DEFAULT: '#7c3aed',
          deep:    '#6d28d9',
          lt:      '#f0e8ff',
          border:  'rgba(124,58,237,0.15)',
        },
        gold: {
          DEFAULT: '#f5c542',
          deep:    '#d4a017',
          lt:      '#fef9e6',
          text:    '#a07800',
        },
        // Blue CTA — used for "Book trial" buttons, primary actions
        blue: {
          DEFAULT: '#2aa7ff',
          deep:    '#0090e0',
          soft:    '#e0f2ff',
        },
        // Neutrals
        bg:      '#ece8f5',
        surface: '#ffffff',
        border: {
          DEFAULT: '#e8e4f0',
          mid:     '#d5d0e0',
        },
        // Text — new ink scale (slightly purple-tinted)
        ink: {
          DEFAULT: '#1c1c27',
          mid:     '#55527a',
          muted:   '#9590b3',
        },
        // Status
        success: {
          DEFAULT: '#1A7A4A',
          lt:      '#D6F5E5',
        },
        danger: {
          DEFAULT: '#C0392B',
          lt:      '#FDECEA',
        },
        info: {
          DEFAULT: '#2563EB',
          lt:      '#DBEAFE',
        },
        zinc: {
          DEFAULT: '#6B6B72',
          lt:      '#F0F0F2',
        },
        // Category accents — kept for per-category tinting on cards/pills
        cat: {
          sport:    '#523650',
          dance:    '#be123c',
          music:    '#0369a1',
          coding:   '#065f46',
          arts:     '#7c3aed',
          language: '#92400e',
          chess:    '#374151',
          gym:      '#b45309',
        },
        // Sidebar tokens — updated for white sidebar
        sidebar: {
          text:   '#55527a',
          hover:  '#f0e8ff',
          muted:  '#9590b3',
          active: 'rgba(28,28,39,0.06)',
        },
      },
      fontFamily: {
        // Both display and body now use Onest (single font family)
        display: ['Onest', 'sans-serif'],
        body:    ['Onest', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12px', { lineHeight: '18px' }],
        'base':['13.5px', { lineHeight: '21px' }],
        'md':  ['15px', { lineHeight: '23px' }],
        'lg':  ['17px', { lineHeight: '25px' }],
        'xl':  ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
      },
      borderRadius: {
        DEFAULT: '10px',
        'sm':    '6px',
        'md':    '14px',
        'lg':    '18px',
        'xl':    '22px',
        'full':  '9999px',
      },
      width: {
        sidebar: '248px',
      },
      minWidth: {
        sidebar: '248px',
      },
      height: {
        topbar: '54px',
      },
      spacing: {
        'content-x': '28px',
        'content-y': '26px',
      },
      boxShadow: {
        'card':       '0 2px 12px rgba(124,58,237,0.06)',
        'card-hover': '0 8px 28px rgba(124,58,237,0.13)',
        'focus':      '0 0 0 3px rgba(124,58,237,0.08)',
      },
      letterSpacing: {
        'label': '0.12em',
        'nav':   '0.16em',
      },
    },
  },
  plugins: [],
}

export default config
